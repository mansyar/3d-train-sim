"""Build the Tiny Tracks river barge GLB (deterministic, re-runnable).

The River Life Expansion (FR1) adds a drifting cargo barge to the river.
Unlike the kit pieces it is not anchored to the track mount — it is a
scene prop loaded by `src/scene/barge.ts`, so its contract is the
WATERLINE, not the mat:

- the model origin (Blender z = 0) IS the waterline. The scene places the
  barge with position.y = 0.02 (the river surface's world height — the
  same value `bridge-model.ts` and `duck.ts` use) and everything above
  the origin reads as freeboard;
- the bow points Blender +y, which export_yup turns into glTF -z — the
  same "forward" convention `duck.ts` faces travel with;
- the draft (below the waterline, Blender z -0.30..-0.02) is hidden by
  the opaque river film — the same "geometry below the visible surface"
  licence the kit uses for undersides below the mat.

Node contract (the scene resolves these by name):

- `barge_hull`   keel + floor + four walls + gunwale rim, one mesh;
- `barge_cargo`  deck crates + a barrel sitting on the hull floor;
- `barge_wheel`  the stern paddle wheel as its OWN mesh — the scene spins
  it about glTF x while the barge drifts.

Why so low? The trestle deck sits essentially AT the waterline: the
measured straight GLB crowns at world y ≈ 0.094 (rails), the deck planks'
bottom is ≈ 0.024 and the cross-beam bottoms ≈ -0.031 (below water) —
there is no under-deck gap to author into. Per the approved deviation
(2026-09-05, "low-profile barge, duck precedent") the barge passes
through bridge cells at water level between the stilt legs, exactly the
shipped behaviour of the duck on the same `riverDriftPath()`. Hence the
low freeboard (gunwale at +0.17), low deck load (crate tops ≤ +0.34) and
a half-submerged stern wheel — everything keeps its head down.

Usage inside Blender's Python console (or headless:

    blender --background --python scripts/blender-barge.py

with a `main()` guard below):

    exec(open(r"<repo>/scripts/blender-barge.py", encoding="utf-8").read())
    build_barge()     # (re)create the barge from scratch
    render_checks()   # optional: top / three-quarter / side / bridge pass
    export_barge()    # write public/assets/train-kit/barge.glb
    verify_glb()      # print exported node/material names + size
"""

import bmesh
import bpy

import math

from mathutils import Matrix

REPO = r"D:/Projects/clever-tiger"
KIT_DIR = REPO + "/public/assets/train-kit"

# Barge footprint (model units = world units at load scale 1.0).
HULL_LEN = 3.8      # y: stern -1.9 .. bow +1.9 (bow = glTF -z forward)
HULL_BEAM = 1.8     # x: -0.9 .. +0.9
WALL_T = 0.09
WALL_TOP = 0.14     # walls rise from the floor top (+0.02) to +0.14
RIM_TOP = 0.17      # gunwale lip above the walls
KEEL_BOTTOM = -0.30  # hidden under the water film (see docstring)
FLOOR_TOP = 0.02

# Stern paddle wheel: axle + hub + 6 spokes + octagonal rim (a spoked
# waterwheel — the rim gives the circular read from every angle),
# half-submerged, tucked close to the transom.
WHEEL_Y = -1.66
WHEEL_Z = 0.04      # hub centre: wheel spans +0.34 up, -0.26 under
WHEEL_R = 0.09      # hub radius
WHEEL_DEPTH = 0.44  # axle sticks out past the blades on both sides
BLADE_R = 0.175     # spoke centre radius (spokes span 0.09 .. 0.26)
BLADE_HALF = (0.16, 0.085, 0.035)  # along axis, radial (long), tangential
BLADES = 6
RIM_R = 0.28        # rim ring radius (boards tangent to the circle)
RIM_HALF = (0.16, 0.02, 0.13)     # along axis, radial (thin), tangential
RIM_SEGMENTS = 8

# Deck cargo on the hull floor (+0.02): three crates + a barrel. Each
# sits 8mm INTO the floor so no face is coplanar (z-fighting).
CARGO_SINK = 0.008
CRATES = (
    ((-0.45, 0.90), (0.22, 0.22, 0.15)),
    ((0.42, 0.95), (0.20, 0.20, 0.13)),
    ((0.05, 0.15), (0.28, 0.28, 0.17)),
    ((-0.30, -0.75), (0.18, 0.18, 0.12)),
)
BARREL = ((0.45, -0.60), 0.16, 0.28)  # (x, y), radius, height

MATERIALS = {
    "barge_red": (0.72, 0.18, 0.14, 1.0),   # hull walls + floor
    "barge_trim": (0.93, 0.90, 0.78, 1.0),  # gunwale lip
    "barge_dark": (0.22, 0.20, 0.19, 1.0),  # keel (under the waterline)
    "barge_crate": (0.82, 0.66, 0.42, 1.0), # deck cargo wood
    "barge_wheel": (0.55, 0.38, 0.24, 1.0), # paddle wheel wood
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
    """Accumulates primitives in one bmesh, one material slot per named
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

    def add(self, center, half, material, pre=None):
        index = self.slot(material)
        self._next_faces()  # refresh baseline before the op
        # `pre` is applied BEFORE the translation (R @ T @ S): a rotation
        # about the group origin swings the already-offset part around it
        # (e.g. fanning wheel blades around the hub).
        local = (
            (pre if pre is not None else Matrix()) @ Matrix.Translation(center)
        ) @ Matrix.Diagonal((half[0] * 2, half[1] * 2, half[2] * 2, 1.0))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=local)
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


def _hull(coll):
    """`barge_hull`: keel + floor + four walls + gunwale rim, one mesh.
    The floor top (+0.02) is the cargo deck; the keel hangs under the
    waterline where the river film hides it."""
    boxes = _JoinedBoxes()
    beam_half = HULL_BEAM / 2
    len_half = HULL_LEN / 2
    # Keel: an inset slab from the riverbed up to the floor underside.
    boxes.add(
        (0.0, 0.0, (KEEL_BOTTOM + -0.02) / 2),
        (beam_half - 0.18, len_half - 0.2, (-0.02 - KEEL_BOTTOM) / 2),
        "barge_dark",
    )
    # Floor: the cargo deck, flush with the waterline top.
    boxes.add((0.0, 0.0, 0.0), (beam_half, len_half, 0.02), "barge_red")
    # Walls: two long sides + two end walls, floor top up to WALL_TOP.
    for x in (-1, 1):
        boxes.add(
            (x * (beam_half - WALL_T / 2), 0.0, (FLOOR_TOP + WALL_TOP) / 2),
            (WALL_T / 2, len_half, (WALL_TOP - FLOOR_TOP) / 2),
            "barge_red",
        )
    for y in (-1, 1):
        boxes.add(
            (0.0, y * (len_half - WALL_T / 2), (FLOOR_TOP + WALL_TOP) / 2),
            (beam_half, WALL_T / 2, (WALL_TOP - FLOOR_TOP) / 2),
            "barge_red",
        )
    # Gunwale rim: a proud cream lip capping the walls.
    rim_z = (WALL_TOP + RIM_TOP) / 2
    rim_h = (RIM_TOP - WALL_TOP) / 2
    for x in (-1, 1):
        boxes.add(
            (x * (beam_half - 0.015), 0.0, rim_z),
            (0.03, len_half + 0.03, rim_h),
            "barge_trim",
        )
    for y in (-1, 1):
        boxes.add(
            (0.0, y * (len_half - 0.015), rim_z),
            (beam_half + 0.03, 0.03, rim_h),
            "barge_trim",
        )
    return boxes.finish(coll, "barge_hull")


def _cargo(coll):
    """`barge_cargo`: crates + a barrel resting on the hull floor — the
    low deck load keeps every top at or below +0.34 (bridge cells)."""
    boxes = _JoinedBoxes()
    for (x, y), (hx, hy, hz) in CRATES:
        boxes.add((x, y, FLOOR_TOP - CARGO_SINK + hz / 2), (hx, hy, hz), "barge_crate")
    (bx, by), br, bh = BARREL
    boxes.cylinder((bx, by, FLOOR_TOP + bh / 2 - CARGO_SINK), br, bh, 16, "barge_crate")
    return boxes.finish(coll, "barge_cargo")


def _wheel(coll):
    """`barge_wheel`: the stern paddle wheel as its own mesh (origin on
    the hub centre) — the scene spins it about glTF x while drifting.
    The hub cylinder runs along x; blades fan out radially, dipping
    below the waterline like a real paddle steamer's."""
    boxes = _JoinedBoxes()
    boxes.cylinder(
        (0.0, 0.0, 0.0), WHEEL_R, WHEEL_DEPTH, 20, "barge_wheel", axis="x"
    )
    for i in range(BLADES):
        angle = i * math.tau / BLADES
        boxes.add(
            (0.0, BLADE_R, 0.0), BLADE_HALF, "barge_wheel",
            pre=Matrix.Rotation(angle, 4, "X"),
        )
    # Rim: tangential boards fanned into an octagon ring at the tips.
    for i in range(RIM_SEGMENTS):
        angle = (i + 0.5) * math.tau / RIM_SEGMENTS
        boxes.add(
            (0.0, RIM_R, 0.0), RIM_HALF, "barge_wheel",
            pre=Matrix.Rotation(angle, 4, "X"),
        )
    wheel = boxes.finish(coll, "barge_wheel")
    wheel.location = (0.0, WHEEL_Y, WHEEL_Z)
    return wheel


def _barge_collection():
    old = bpy.data.collections.get("Barge")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("Barge")
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
    coll = bpy.data.collections["Barge"]
    for label, names in (
        ("hull", ["barge_hull"]),
        ("cargo", ["barge_cargo"]),
        ("wheel", ["barge_wheel"]),
    ):
        objs = [coll.objects[n] for n in names]
        lo, hi = _world_bbox(objs)
        print(
            f"bbox {label}: x [{lo.x:+.2f},{hi.x:+.2f}] y [{lo.y:+.2f},{hi.y:+.2f}] z [{lo.z:+.2f},{hi.z:+.2f}]"
        )


def build_barge():
    """Recreate the barge from scratch. Safe to re-run."""
    coll = _barge_collection()
    _hull(coll)
    _cargo(coll)
    _wheel(coll)
    _sanity_print()
    print("built: barge_hull, barge_cargo, barge_wheel")


def _setup_check_env():
    """Sun, river surface, camera, and world for the render checks."""
    for name in ("Cube", "Camera", "Light"):
        ob = bpy.data.objects.get(name)
        if ob:
            data = getattr(ob, "data", None)
            bpy.data.objects.remove(ob, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    cam = bpy.data.objects.get("BargeCheckCam")
    if cam is None:
        cam = bpy.data.objects.new(
            "BargeCheckCam", bpy.data.cameras.new("BargeCheckCam")
        )
        bpy.context.collection.objects.link(cam)
    sun = bpy.data.objects.get("check_sun")
    if sun is None:
        sun = bpy.data.objects.new("check_sun", bpy.data.lights.new("check_sun", "SUN"))
        bpy.context.collection.objects.link(sun)
        sun.data.energy = 3.0
        sun.rotation_euler = (math.radians(55), 0, math.radians(25))
    water = bpy.data.objects.get("check_water")
    if water is None:
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=14)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new("check_water")
        bm.to_mesh(me)
        bm.free()
        water = _mesh_object(bpy.context.collection, me, "check_water", [])
        mat = bpy.data.materials.new("check_water_mat")
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Base Color"].default_value = (0.35, 0.55, 0.68, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.25
        me.materials.append(mat)
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.75, 0.85, 1.0, 1.0)
    bg.inputs[1].default_value = 0.7
    return cam


def _mock_bridge(coll):
    """A plank deck strip + stilt legs at the MEASURED trestle heights
    (planks z 0.02..0.09, legs down past the waterline) so the renders
    show the barge against the real bridge geometry."""
    boxes = _JoinedBoxes()
    boxes.add((0.0, 0.6, 0.055), (1.6, 0.16, 0.035), "barge_crate")
    for x in (-1.4, 1.4):
        for y in (0.35, 0.85):
            boxes.add((x, y, -0.25), (0.05, 0.05, 0.3), "barge_dark")
    return boxes.finish(coll, "check_bridge_mock")


def render_checks():
    """Top, three-quarter, side, and a bridge-pass fit (house rules:
    real renders — the render is the acceptance test)."""
    import os
    import tempfile

    cam = _setup_check_env()
    coll = bpy.data.collections["Barge"]
    mock = _mock_bridge(bpy.context.collection)
    scene = bpy.context.scene
    scene.camera = cam

    def shoot(fname, loc, target, lens, with_mock=True):
        mock.hide_render = not with_mock
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

    shoot("barge_top.png", (0.0, 0.0, 9.0), (0.0, 0.0, 0.0), 50.0)
    shoot("barge_quarter.png", (-4.5, -5.0, 3.0), (0.0, 0.0, 0.05), 45.0)
    shoot("barge_side.png", (6.0, -1.0, 0.9), (0.0, -0.4, 0.05), 45.0)
    # Bridge pass: the mock trestle deck rides at the measured plank
    # heights across the barge's midsection — the approved low-profile
    # overlap reads here.
    shoot("barge_bridge_pass.png", (-3.4, -4.6, 2.0), (0.2, 0.6, 0.1), 42.0)

    # Cleanup: the mock is a check-only prop.
    data = mock.data
    bpy.data.objects.remove(mock, do_unlink=True)
    if data and data.users == 0:
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


def export_barge():
    names = {ob.name for ob in bpy.data.collections["Barge"].objects}
    _export_selected(f"{KIT_DIR}/barge.glb", names)


def verify_glb():
    import json
    import os
    import struct

    path = f"{KIT_DIR}/barge.glb"
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
    build_barge()
    render_checks()
    export_barge()
    verify_glb()
