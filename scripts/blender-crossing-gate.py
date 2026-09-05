"""Build the Tiny Tracks crossing-gate GLB (deterministic, re-runnable).

The kit has no level crossing, so the crossing-gate follows the switch
precedent: an original piece authored in Blender on the kit's own
measurements, carrying the kit's actual rail geometry so the look stays
Kenney:

- the rails are the kit straight's own sleepers + rails, unmoved (the
  piece rides as a plain straight — spec FR1);
- a toy road strip runs east-west under the rails (asphalt + cream
  centre dashes, dashing skipped around the rail bed; road + dashes are
  one joined mesh with two material slots);
- a white crossbuck post with a red circle sign stands on the road's
  north shoulder (one joined mesh);
- a named `crossing_lantern` empty on top of the post carries the two
  red lamps (`crossing_lamp_0` / `crossing_lamp_1`, separate materials
  `crossing_lamp_a` / `crossing_lamp_b` so the scene can alternate the
  emissive blink);
- a named `crossing_gates` empty groups the two barrier arms:
  `crossing_gate_east` / `crossing_gate_west`, one mesh each, origin on
  the shoulder post, authored in the CLOSED pose (arm across the road
  lane, pointing +y). The scene swings each arm about its local z
  (glTF +y) to open it: east -90 deg (points +x along the shoulder),
  west +90 deg (points -x). The spec's squash-and-stretch bounce is
  scene-side; the authored pose is simply "gates down".
- a named `crossing_snow_cap` empty carries the winter tell (snow banks
  along both road edges + a cap on the crossbuck), shown only in winter
  (tunnel_snow_cap precedent; hidden by the scene at load).

Usage inside Blender's Python console (or headless:

    blender --background --python scripts/blender-crossing-gate.py

with a `main()` guard below):

    exec(open(r"<repo>/scripts/blender-crossing-gate.py", encoding="utf-8").read())
    build_crossing()    # (re)create the crossing-gate piece from scratch
    render_checks()     # optional: top / three-quarter / open+snow / fit
    export_crossing()   # write public/assets/train-kit/crossing-gate.glb
    verify_glb()        # print exported node/material names + size

Coordinate convention (matches the straight kit / KIT_ANCHORS in
track-renderer.ts): Blender y -4..0 becomes glTF z 0..4 after export_yup;
world north (grid -z) is Blender y = 0, east is +x. The ride plane is
0.1 above the model origin's ground line, so the renderer's KIT_ANCHOR
[0, -1, 2] lands the rails exactly where the kit straight's sit.
"""

import bmesh
import bpy

import math

from mathutils import Matrix

REPO = r"D:/Projects/curious-engine"
KIT_DIR = REPO + "/public/assets/train-kit"

BED_Y0, BED_Y1 = -4.0, 0.0
GROUND_Z = -1.0

STRAIGHT_GLB = KIT_DIR + "/railroad-straight.glb"

# Road strip: east-west across the full cell, centred on y = -2.
ROAD_HALF_W = 0.85  # road spans y [-2.85, -1.15]
ROAD_TOP_Z = -0.96  # just under the kit straight's sleepers
ROAD_DEPTH = 0.06  # box from GROUND_Z - 0.02 up to ROAD_TOP_Z
DASH_HALF_W = 0.05
DASH_LEN = 0.32
DASH_STEP = 0.5
DASH_Z = ROAD_TOP_Z + 0.005
# Dashes skip the rail bed (sleepers + rails own the middle).
DASH_GAP_X = 0.62

# Crossbuck: white X post with a red circle sign, on the north shoulder.
BUCK_X, BUCK_Y = 0.9, -1.05
BUCK_POST_HALF = 0.045
BUCK_POST_TOP = -0.28
BUCK_ARM_LEN = 0.46
BUCK_ARM_Z = -0.42
BUCK_SIGN_R = 0.085
BUCK_SIGN_Z = -0.6

# Lantern: two red lamps on a small crossarm atop the post.
LANTERN_ARM_Z = -0.24
LANTERN_ARM_LEN = 0.22
LAMP_R = 0.045
LAMP_GAP_X = 0.09

# Barrier gates: striped arms hanging from posts on the south shoulder,
# authored in the CLOSED pose (arms across the road lane, pointing +y).
GATE_POST_X = 1.1
GATE_POST_Y = -2.95
GATE_ARM_Z = -0.82
GATE_ARM_LEN = 0.8
GATE_ARM_HALF_W = 0.05
GATE_ARM_HALF_H = 0.035
GATE_SEGMENTS = 3  # red / white / red toy stripes
GATE_OPEN_ANGLE = math.pi / 2  # scene-side swing per arm, mirrored

MATERIALS = {
    "crossing_road": (0.16, 0.16, 0.18, 1.0),  # asphalt
    "crossing_dash": (0.94, 0.90, 0.78, 1.0),  # cream paint
    "crossing_white": (0.93, 0.93, 0.92, 1.0),
    "crossing_red": (0.72, 0.16, 0.12, 1.0),
    "crossing_snow": (0.93, 0.95, 0.97, 1.0),
    "crossing_lamp_a": (0.75, 0.10, 0.08, 1.0),
    "crossing_lamp_b": (0.75, 0.10, 0.08, 1.0),
}


def _material(name):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Base Color"].default_value = MATERIALS[name]
        bsdf.inputs["Roughness"].default_value = 0.9
    mat.use_backface_culling = False
    return mat


def _import_kit_mesh(filepath, name):
    """A copy of the kit mesh with the GLB root's node offset baked in, so
    scene-space measurements match what the renderer anchors against."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=filepath)
    src = sorted((set(bpy.data.objects) - before), key=lambda o: o.name)[-1]
    me = src.data.copy()
    me.name = name
    dz = src.matrix_world.translation.z
    for ob in sorted(set(bpy.data.objects) - before, key=lambda o: o.name):
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if data and data.users == 0:
            bpy.data.meshes.remove(data)
    for v in me.vertices:
        v.co.z += dz
    return me


def _mesh_object(coll, me, name, materials=None):
    obj = bpy.data.objects.new(name, me)
    coll.objects.link(obj)
    if materials and not me.materials:
        # Appending only — clearing slots would clamp every polygon's
        # material_index back to 0.
        for material in materials:
            me.materials.append(_material(material))
    return obj


class _JoinedBoxes:
    """Accumulates boxes in one bmesh, one material slot per named
    material — keeps the node count (and the GLB) small."""

    def __init__(self):
        self.bm = bmesh.new()
        self.materials = []  # slot order
        self._face_count = 0

    def slot(self, material):
        if material not in self.materials:
            self.materials.append(material)
        return self.materials.index(material)

    def _next_faces(self):
        """Faces appended by the last op (ops append; lookups refreshed)."""
        self.bm.faces.ensure_lookup_table()
        start = self._face_count
        self._face_count = len(self.bm.faces)
        return self.bm.faces[start:]

    def add(self, center, half, material):
        index = self.slot(material)
        self._next_faces()  # refresh baseline before the op
        bmesh.ops.create_cube(
            self.bm,
            size=1.0,
            matrix=Matrix.Translation(center)
            @ Matrix.Diagonal((half[0] * 2, half[1] * 2, half[2] * 2, 1.0)),
        )
        for face in self._next_faces():
            face.material_index = index

    def sphere(self, center, radius, material):
        index = self.slot(material)
        bmesh.ops.create_uvsphere(
            self.bm, u_segments=12, v_segments=8, radius=radius, matrix=Matrix.Translation(center)
        )
        for face in self._next_faces():
            face.material_index = index

    def cylinder(self, center, radius, depth, segments, material, axis="z"):
        index = self.slot(material)
        rot = {
            "z": Matrix(),
            "x": Matrix.Rotation(math.pi / 2, 4, "Y"),
            "y": Matrix.Rotation(-math.pi / 2, 4, "X"),
        }[axis]
        matrix = Matrix.Translation(center) @ rot
        bmesh.ops.create_cone(
            self.bm,
            cap_ends=True,
            cap_tris=True,
            segments=segments,
            radius1=radius,
            radius2=radius,
            depth=depth,
            matrix=matrix,
        )
        for face in self._next_faces():
            face.material_index = index

    def finish(self, coll, name):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        return _mesh_object(coll, me, name, self.materials)


def _rails(coll):
    """The kit straight's own sleepers + rails, unmoved: north (y=0) to
    south (y=-4) — the piece rides as a plain straight."""
    me = _import_kit_mesh(STRAIGHT_GLB, "crossing_rail")
    return _mesh_object(coll, me, "crossing_rail", ["colormap"])


def _road(coll):
    """Asphalt strip east-west under the rails, with cream centre dashes
    skipped around the rail bed — one joined mesh."""
    boxes = _JoinedBoxes()
    boxes.add(
        (0.0, -2.0, (GROUND_Z - 0.02 + ROAD_TOP_Z) / 2),
        (2.0, ROAD_HALF_W, ROAD_DEPTH / 2),
        "crossing_road",
    )
    x = -1.95 + DASH_LEN / 2
    while x < -DASH_GAP_X:
        for cx in (x, -x):
            boxes.add(
                (cx, -2.0, DASH_Z),
                (DASH_LEN / 2, DASH_HALF_W, 0.012),
                "crossing_dash",
            )
        x += DASH_STEP
    return boxes.finish(coll, "crossing_road")


def _crossbuck(coll):
    """White post on the north shoulder; the tilted X arms + red circle
    sign are the separate `crossing_buck_arms` mesh."""
    boxes = _JoinedBoxes()
    boxes.add(
        (BUCK_X, BUCK_Y, (GROUND_Z + BUCK_POST_TOP) / 2),
        (BUCK_POST_HALF, BUCK_POST_HALF, (BUCK_POST_TOP - GROUND_Z) / 2),
        "crossing_white",
    )
    return boxes.finish(coll, "crossing_buck")


def _crossbuck_arms(coll, name):
    """The two tilted X arms as their own joined mesh (rotated boxes)."""
    cx, cy = BUCK_X, BUCK_Y
    boxes = _JoinedBoxes()
    for tilt in (1, -1):
        matrix = (
            Matrix.Translation((cx, cy, BUCK_ARM_Z))
            @ Matrix.Rotation(math.radians(tilt * 35), 4, "Y")
        )
        index = boxes.slot("crossing_white")
        bmesh.ops.create_cube(
            boxes.bm,
            size=1.0,
            matrix=matrix
            @ Matrix.Diagonal((BUCK_ARM_LEN, 0.04, 0.07, 1.0)),
        )
        for face in boxes._next_faces():
            face.material_index = index
    # Red circle sign (flat cylinder reads as a sign from any angle).
    boxes.cylinder(
        (cx, cy, BUCK_SIGN_Z), BUCK_SIGN_R, 0.02, 24, "crossing_red", axis="y"
    )
    return boxes.finish(coll, name)


def _lantern(coll):
    """Named `crossing_lantern` node: a small crossarm with the two red
    lamps, each with its own material so the scene can alternate the
    blink (emissive is scene-driven)."""
    root = bpy.data.objects.new("crossing_lantern", None)
    root.empty_display_size = 0.1
    root.location = (BUCK_X, BUCK_Y, LANTERN_ARM_Z)
    coll.objects.link(root)
    arm = _JoinedBoxes()
    arm.add((0, 0, 0), (LANTERN_ARM_LEN / 2, 0.02, 0.02), "crossing_white")
    arm_obj = arm.finish(coll, "crossing_lantern_arm")
    arm_obj.parent = root  # local (0, 0, 0) = right on the crossarm
    for i, dx in enumerate((-LAMP_GAP_X, LAMP_GAP_X)):
        lamps = _JoinedBoxes()
        lamps.sphere((0, 0, 0), LAMP_R, f"crossing_lamp_{'a' if i == 0 else 'b'}")
        lamp = lamps.finish(coll, f"crossing_lamp_{i}")
        lamp.location = (dx, 0.0, 0.0)  # parent-local: beside the crossarm
        lamp.parent = root
    return root


def _gates(coll):
    """Named `crossing_gates` root grouping the two barrier arms. Each
    arm is ONE mesh (post + striped arm + red tip, three material slots)
    whose origin sits on its shoulder post — the scene rotates it about
    its local z (glTF +y) to swing: east -90 deg, west +90 deg to open."""
    root = bpy.data.objects.new("crossing_gates", None)
    root.empty_display_size = 0.2
    root.location = (0.0, -2.0, 0.0)
    coll.objects.link(root)
    for side, name in ((1, "crossing_gate_east"), (-1, "crossing_gate_west")):
        boxes = _JoinedBoxes()
        # Post: short white box from the meadow up to the arm pivot.
        boxes.add(
            (0.0, 0.0, (GROUND_Z + GATE_ARM_Z) / 2 - GATE_ARM_Z),
            (0.04, 0.04, (GATE_ARM_Z - GROUND_Z) / 2),
            "crossing_white",
        )
        # Arm: red / white / red stripes pointing +y (closed pose).
        seg_len = GATE_ARM_LEN / GATE_SEGMENTS
        for i in range(GATE_SEGMENTS):
            boxes.add(
                (0.0, i * seg_len + seg_len / 2, 0.0),
                (GATE_ARM_HALF_W, seg_len / 2, GATE_ARM_HALF_H),
                "crossing_red" if i % 2 == 0 else "crossing_white",
            )
        # Red tip cap so the swing reads at a glance.
        boxes.add(
            (0.0, GATE_ARM_LEN + 0.04, 0.0),
            (GATE_ARM_HALF_W + 0.01, 0.04, GATE_ARM_HALF_H + 0.008),
            "crossing_red",
        )
        arm = boxes.finish(coll, name)
        arm.location = (side * GATE_POST_X, GATE_POST_Y + 2.0, GATE_ARM_Z)
        arm.parent = root  # root sits at (0, -2, 0): local y is world - 2
    return root


def _snow_cap(coll):
    """Named `crossing_snow_cap`: winter banks along both road edges plus
    a cap on the crossbuck post (tunnel_snow_cap precedent — the scene
    hides it at load and shows it only in winter)."""
    root = bpy.data.objects.new("crossing_snow_cap", None)
    root.empty_display_size = 0.1
    coll.objects.link(root)
    boxes = _JoinedBoxes()
    for edge_y in (-2.85 - 0.06, -1.15 + 0.06):
        boxes.add((0.0, edge_y, -0.9), (2.0, 0.06, 0.045), "crossing_snow")
    boxes.add(
        (BUCK_X, BUCK_Y, BUCK_POST_TOP + 0.03),
        (BUCK_POST_HALF + 0.03, BUCK_POST_HALF + 0.03, 0.03),
        "crossing_snow",
    )
    snow = boxes.finish(coll, "crossing_snow")
    snow.parent = root
    return root


def _crossing_collection():
    old = bpy.data.collections.get("Crossing")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("Crossing")
    bpy.context.scene.collection.children.link(coll)
    return coll


def _world_bbox(objs):
    """Deterministic placement check: world-space AABB over obj subtrees."""
    import mathutils

    lo = mathutils.Vector((1e9, 1e9, 1e9))
    hi = mathutils.Vector((-1e9, -1e9, -1e9))
    for obj in objs:
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner)
            lo = mathutils.Vector(map(min, lo, world))
            hi = mathutils.Vector(map(max, hi, world))
    return lo, hi


def _sanity_print():
    bpy.context.view_layer.update()  # matrix_world is stale before this
    coll = bpy.data.collections["Crossing"]
    for label, names in (
        ("rails", ["crossing_rail"]),
        ("road", ["crossing_road"]),
        ("gates", ["crossing_gate_east", "crossing_gate_west"]),
        ("lantern", ["crossing_lamp_0", "crossing_lamp_1"]),
        ("snow", ["crossing_snow"]),
    ):
        objs = [coll.objects[n] for n in names]
        lo, hi = _world_bbox(objs)
        print(
            f"bbox {label}: x [{lo.x:+.2f},{hi.x:+.2f}] y [{lo.y:+.2f},{hi.y:+.2f}] z [{lo.z:+.2f},{hi.z:+.2f}]"
        )


def build_crossing():
    """Recreate the crossing-gate piece from scratch. Safe to re-run."""
    coll = _crossing_collection()
    _rails(coll)
    _road(coll)
    _crossbuck(coll)
    _crossbuck_arms(coll, "crossing_buck_arms")
    _lantern(coll)
    _gates(coll)
    _snow_cap(coll)
    _sanity_print()
    print("built: crossing_rail, road+dashes, crossbuck, buck_arms, crossing_lantern, crossing_gates, crossing_snow_cap")


def _setup_check_env():
    """Sun, ground, camera, and world for the render checks (switch recipe)."""
    for name in ("Cube", "Camera", "Light"):
        ob = bpy.data.objects.get(name)
        if ob:
            data = getattr(ob, "data", None)
            bpy.data.objects.remove(ob, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    cam = bpy.data.objects.get("CrossingCheckCam")
    if cam is None:
        cam = bpy.data.objects.new(
            "CrossingCheckCam", bpy.data.cameras.new("CrossingCheckCam")
        )
        bpy.context.collection.objects.link(cam)
    sun = bpy.data.objects.get("check_sun")
    if sun is None:
        sun = bpy.data.objects.new("check_sun", bpy.data.lights.new("check_sun", "SUN"))
        bpy.context.collection.objects.link(sun)
        sun.data.energy = 3.0
        sun.rotation_euler = (math.radians(55), 0, math.radians(25))
    ground = bpy.data.objects.get("check_ground")
    if ground is None:
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=14)
        for v in bm.verts:
            v.co.z += GROUND_Z - 0.02
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new("check_ground")
        bm.to_mesh(me)
        bm.free()
        _mesh_object(bpy.context.collection, me, "check_ground", [])
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.75, 0.85, 1.0, 1.0)
    bg.inputs[1].default_value = 0.7
    return cam


def _import_loco():
    """The kit locomotive (asset scale x1.6 per tech-stack rule 3) for the
    fit-check render, parked on the straight over the road."""
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.gltf(filepath=KIT_DIR + "/train-locomotive-a.glb")
    except Exception as error:
        print("loco import failed:", type(error).__name__, error)
        return None
    imported = set(bpy.data.objects) - before
    root = next((o for o in imported if o.parent not in imported), None)
    if root is None:
        print("loco import failed: no root object found")
        return None
    root.scale = (1.6, 1.6, 1.6)
    return root


def render_checks():
    """Top, three-quarter, gates-open + snow, and a fit view with the kit
    locomotive riding the straight (house rules: real renders)."""
    import os
    import tempfile

    cam = _setup_check_env()
    coll = bpy.data.collections.get("Crossing")
    scene = bpy.context.scene
    scene.camera = cam

    def set_gates(open_amount):
        east = coll.objects["crossing_gate_east"]
        west = coll.objects["crossing_gate_west"]
        east.rotation_euler = (0.0, 0.0, -GATE_OPEN_ANGLE * open_amount)
        west.rotation_euler = (0.0, 0.0, GATE_OPEN_ANGLE * open_amount)

    def set_snow(show):
        cap = coll.objects["crossing_snow_cap"]
        for ob in [cap, *cap.children_recursive]:
            ob.hide_render = not show

    def show_loco(loco, at, show):
        if loco is None:
            return
        for ob in [loco, *loco.children_recursive]:
            ob.hide_render = not show
        if show:
            loco.location = at

    def shoot(fname, loc, target, lens, gate_open=0.0, snow=False, loco=None, loco_at=None):
        set_gates(gate_open)
        set_snow(snow)
        show_loco(loco, loco_at, loco is not None)
        cam.location = loc
        cam.data.lens = lens
        from mathutils import Vector

        cam.rotation_euler = (
            Vector(target) - Vector(loc)
        ).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = 900
        scene.render.resolution_y = 700
        scene.render.filepath = os.path.join(tempfile.gettempdir(), fname)
        bpy.ops.render.render(write_still=True)
        print("rendered:", scene.render.filepath)
        if loco is not None:
            show_loco(loco, loco_at, False)

    loco = _import_loco()
    loco_z = -1.0
    if loco is not None:
        # Drop the loco until its wheels sit on the rails (kit rail crowns
        # near z = -0.82), whatever the GLB's internal origin convention.
        bpy.context.view_layer.update()
        lo, _hi = _world_bbox([loco])
        loco_z = -1.0 + (-0.84 - lo.z)
        print("loco wheel line adjusted (dz", round(-0.84 - lo.z, 3), ")")
    show_loco(loco, (0.0, -2.0, -1.0), False)
    shoot("crossing_top.png", (0.0, -2.0, 9.0), (0.0, -2.0, -1.0), 50.0)
    shoot("crossing_quarter.png", (-6.5, -9.0, 4.5), (0.4, -2.0, -0.6), 45.0)
    # Gates fully open + snow: the swing direction and winter tell at once.
    shoot(
        "crossing_open_snow.png",
        (-5.0, -6.0, 3.0),
        (0.6, -2.2, -0.7),
        42.0,
        gate_open=1.0,
        snow=True,
    )
    # Fit check: gates closed, locomotive standing on the rails over the
    # road — wheels on rails, nothing clipping; framed wide from the
    # south-east so the crossbuck and both shoulder posts stay visible.
    shoot(
        "crossing_fit.png",
        (5.0, -6.5, 3.2),
        (0.3, -2.1, -0.85),
        40.0,
        loco=loco,
        loco_at=(0.0, -2.0, loco_z),
    )
    # Deterministic open-pose check: swing both arms and print their
    # world AABB (should run along the shoulder: x ±1.9, y ≈ -2.95).
    east = coll.objects["crossing_gate_east"]
    west = coll.objects["crossing_gate_west"]
    east.rotation_euler = (0.0, 0.0, -GATE_OPEN_ANGLE)
    west.rotation_euler = (0.0, 0.0, GATE_OPEN_ANGLE)
    bpy.context.view_layer.update()
    lo, hi = _world_bbox([east, west])
    print(
        f"open-pose bbox: x [{lo.x:+.2f},{hi.x:+.2f}] y [{lo.y:+.2f},{hi.y:+.2f}] z [{lo.z:+.2f},{hi.z:+.2f}]"
    )
    if loco is not None:
        for ob in list(loco.children_recursive) + [loco]:
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0 and isinstance(data, bpy.types.Mesh):
                bpy.data.meshes.remove(data)


def _export_selected(filepath, names):
    import os

    ordered = sorted(names)
    for obj in bpy.data.objects:
        obj.select_set(obj.name in names)
    bpy.context.view_layer.objects.active = bpy.data.objects[ordered[0]]
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
    )
    print("exported:", filepath, os.path.getsize(filepath), "bytes")


def export_crossing():
    names = {ob.name for ob in bpy.data.collections["Crossing"].objects}
    # Gates exported closed (the authored pose); the scene drives the swing.
    _export_selected(f"{KIT_DIR}/crossing-gate.glb", names)


def verify_glb():
    import json
    import os
    import struct

    path = f"{KIT_DIR}/crossing-gate.glb"
    with open(path, "rb") as fh:
        data = fh.read()
    chunk_len = struct.unpack_from("<I", data, 12)[0]
    js = json.loads(data[20 : 20 + chunk_len])
    print(
        os.path.basename(path),
        os.path.getsize(path),
        "bytes | nodes:",
        sorted(n["name"] for n in js.get("nodes", [])),
        "| materials:",
        sorted(m["name"] for m in js.get("materials", [])),
    )


if __name__ == "__main__":
    build_crossing()
    render_checks()
    export_crossing()
    verify_glb()
