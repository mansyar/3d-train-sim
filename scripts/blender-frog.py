"""Build the Tiny Tracks frog-on-lily-pad GLB (deterministic, re-runnable).

The River Life Expansion (FR3) adds the frog scenery kind — the one toy
that lives on the river. Unlike the kit pieces it is not anchored to the
track mount; the scenery pipeline places it at the cell centre with
`position.y = SCENERY_LIFTS.frog` (0.01) on land, and Phase 3 will rest
it at the water surface on water cells. So its contract is:

- the model origin (Blender z = 0) is the PAD UNDERSIDE — the pad lies
  flat on the ground/water with nothing hanging below;
- the frog faces Blender +y, which export_yup turns into glTF -z — the
  same "forward" convention the kit and the duck use;
- it is authored TINY like the other nature-kit GLBs (rock_smallA is
  0.36 raw → rendered 1.35 world units): the scenery pipeline scales it
  by CELL_SIZE (3.75) × SCENERY_SCALES.frog (1.0).

Calibration targets (from the peer critters): the quaternius pig renders
1.16 world units tall — this frog lands at ~1.0 including the pad, so it
sits low beside the rails like every other critter.

Node contract (the scene resolves these by name):

- `frog_pad`   the lily pad + a little yellow flower — one mesh;
- `frog_body`  the frog itself as its OWN mesh, its object origin at the
  pad-top centre — the critter-life hop moves this node (squash &
  stretch) while the pad stays put.

Usage inside Blender's Python console (or headless:

    blender --background --python scripts/blender-frog.py

with a `main()` guard below):

    exec(open(r"<repo>/scripts/blender-frog.py", encoding="utf-8").read())
    build_frog()     # (re)create the frog from scratch
    render_checks()  # optional: front / top / side / scale-vs-pig
    export_frog()    # write public/assets/nature-kit/frog.glb
    verify_glb()     # print exported node/material names + size
"""

import bmesh
import bpy

import math

from mathutils import Matrix

REPO = r"D:/Projects/clever-tiger"
NATURE_DIR = REPO + "/public/assets/nature-kit"
PIG_GLB = REPO + "/public/assets/quaternius-farm/pig.glb"
PIG_RENDER_SCALE = 3.75  # CELL_SIZE × SCENERY_SCALES.pig

# Lily pad (model units = world units / 3.75 at render scale).
PAD_R = 0.24        # diameter 0.48 raw → ~1.8 world units across
PAD_T = 0.045       # top face at z = +0.045
PAD_NOTCH = ((0.0, -0.26, 0.045), (0.045, 0.28, 0.15))  # boolean cutter

# The frog (built around its own origin, object parked at pad-top
# centre): a chunky sitting critter — torso, head, haunches, front
# feet, yellow throat, white eyes with dark pupils.
BODY_Z = 0.10       # body-local origin sits 0.10 above the pad base
TORSO = ((0.0, -0.01, 0.03), (0.115, 0.13, 0.10))
HEAD = ((0.0, 0.10, 0.09), (0.095, 0.10, 0.085))
THROAT = ((0.0, 0.08, -0.01), (0.06, 0.05, 0.04))
HAUNCH = ((0.10, -0.07, -0.02), (0.07, 0.09, 0.065))
FOOT = ((0.06, 0.13, -0.06), (0.05, 0.03, 0.02))
EYE = ((0.055, 0.15, 0.17), 0.045)
PUPIL = ((0.055, 0.18, 0.185), 0.022)

MATERIALS = {
    "frog_green": (0.36, 0.60, 0.30, 1.0),  # torso, head, haunches
    "pad_green": (0.45, 0.66, 0.34, 1.0),   # the lily pad
    "frog_yellow": (0.95, 0.83, 0.35, 1.0), # throat + flower centre
    "frog_white": (0.96, 0.96, 0.94, 1.0),  # eyes + flower petals + feet
    "frog_dark": (0.12, 0.14, 0.12, 1.0),   # pupils
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
        # (e.g. fanning flower petals around the bloom centre).
        local = (
            (pre if pre is not None else Matrix()) @ Matrix.Translation(center)
        ) @ Matrix.Diagonal((half[0] * 2, half[1] * 2, half[2] * 2, 1.0))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=local)
        for face in self._next_faces():
            face.material_index = index

    def sphere(self, center, half, material, segments=16, rings=8):
        index = self.slot(material)
        self._next_faces()
        # A radius-1 uvsphere spans ±1 per axis, so the per-axis scale is
        # `half` directly (unlike create_cube, which spans ±0.5 and needs
        # the 2× Diagonal in `add`).
        matrix = Matrix.Translation(center) @ Matrix.Diagonal(
            (half[0], half[1], half[2], 1.0)
        )
        bmesh.ops.create_uvsphere(
            self.bm,
            u_segments=segments,
            v_segments=rings,
            radius=1.0,
            matrix=matrix,
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


def _pad(coll):
    """`frog_pad`: the lily pad disc with a classic wedge notch — one
    mesh, flat on the ground/water with nothing below z = 0."""
    boxes = _JoinedBoxes()
    boxes.cylinder((0.0, 0.0, PAD_T / 2), PAD_R, PAD_T, 20, "pad_green")
    pad = boxes.finish(coll, "frog_pad")
    # The notch: a boolean slit from the rim toward the centre (rear,
    # away from the frog's facing) — the one lily-pad tell.
    cutter_boxes = _JoinedBoxes()
    cutter_boxes.add(*PAD_NOTCH, "frog_dark")
    cutter = cutter_boxes.finish(coll, "check_pad_cutter")
    mod = pad.modifiers.new("notch", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    bpy.context.view_layer.objects.active = pad
    bpy.ops.object.modifier_apply(modifier=mod.name)
    data = cutter.data
    bpy.data.objects.remove(cutter, do_unlink=True)
    if data and data.users == 0:
        bpy.data.meshes.remove(data)
    return pad


def _frog(coll):
    """`frog_body`: the sitting frog as its own mesh (origin on the pad
    top centre) — the critter-life hop moves this node, the pad stays."""
    boxes = _JoinedBoxes()
    (tx, ty, tz), (thx, thy, thz) = TORSO
    boxes.sphere((tx, ty, tz), (thx, thy, thz), "frog_green", 14, 8)
    (hx, hy, hz), (hhx, hhy, hhz) = HEAD
    boxes.sphere((hx, hy, hz), (hhx, hhy, hhz), "frog_green", 14, 8)
    (sx, sy, sz), (shx, shy, shz) = THROAT
    boxes.sphere((sx, sy, sz), (shx, shy, shz), "frog_yellow", 14, 8)
    for x in (-1, 1):
        (ax, ay, az), (ahx, ahy, ahz) = HAUNCH
        boxes.sphere((x * ax, ay, az), (ahx, ahy, ahz), "frog_green", 14, 8)
        (px, py, pz), (phx, phy, phz) = FOOT
        boxes.add((x * px, py, pz), (phx, phy, phz), "frog_white")
        (ex, ey, ez), er = EYE
        boxes.sphere((x * ex, ey, ez), (er, er, er), "frog_white", 12, 8)
        (ox, oy, oz), orr = PUPIL
        boxes.sphere((x * ox, oy, oz), (orr, orr, orr), "frog_dark", 10, 6)
    body = boxes.finish(coll, "frog_body")
    body.location = (0.0, 0.02, BODY_Z)
    return body


def _frog_collection():
    old = bpy.data.collections.get("Frog")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("Frog")
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
    coll = bpy.data.collections["Frog"]
    for label, names in (
        ("pad", ["frog_pad"]),
        ("body", ["frog_body"]),
    ):
        objs = [coll.objects[n] for n in names]
        lo, hi = _world_bbox(objs)
        print(
            f"bbox {label}: x [{lo.x:+.2f},{hi.x:+.2f}] y [{lo.y:+.2f},{hi.y:+.2f}] z [{lo.z:+.2f},{hi.z:+.2f}]"
        )


def build_frog():
    """Recreate the frog from scratch. Safe to re-run."""
    coll = _frog_collection()
    _pad(coll)
    _frog(coll)
    _sanity_print()
    print("built: frog_pad, frog_body")


def _setup_check_env():
    """Sun, pond surface, camera, and world for the render checks."""
    for name in ("Cube", "Camera", "Light"):
        ob = bpy.data.objects.get(name)
        if ob:
            data = getattr(ob, "data", None)
            bpy.data.objects.remove(ob, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    cam = bpy.data.objects.get("FrogCheckCam")
    if cam is None:
        cam = bpy.data.objects.new(
            "FrogCheckCam", bpy.data.cameras.new("FrogCheckCam")
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


def _import_pig():
    """Import the peer critter at its rendered scale (×3.75) as a
    size reference, and scale the frog to the same render scale for
    the comparison shot. Returns the imported objects + frog originals."""
    bpy.ops.import_scene.gltf(filepath=PIG_GLB)
    imported = [ob for ob in bpy.context.selected_objects]
    for ob in imported:
        ob.scale = (PIG_RENDER_SCALE,) * 3
        ob.location = (ob.location.x + 1.1, ob.location.y, ob.location.z)
    frog = list(bpy.data.collections["Frog"].objects)
    originals = [(ob, ob.scale.copy()) for ob in frog]
    for ob in frog:
        ob.scale = (PIG_RENDER_SCALE,) * 3
    bpy.context.view_layer.update()
    return imported, originals


def render_checks():
    """Front / top / side / scale-vs-pig (house rules: real renders —
    the render is the acceptance test)."""
    import os
    import tempfile

    cam = _setup_check_env()
    scene = bpy.context.scene
    scene.camera = cam

    def shoot(fname, loc, target, lens):
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

    # Solo checks at raw scale.
    shoot("frog_front.png", (-1.6, -1.7, 1.1), (0.0, 0.05, 0.08), 50.0)
    shoot("frog_top.png", (0.0, 0.0, 2.6), (0.0, 0.0, 0.0), 50.0)
    shoot("frog_side.png", (1.8, -0.5, 0.55), (0.0, 0.0, 0.07), 45.0)

    # Scale comparison against the peer critter at render scale.
    imported, originals = _import_pig()
    shoot("frog_vs_pig.png", (-2.6, -3.1, 1.9), (0.45, 0.0, 0.45), 42.0)
    for ob, scale in originals:
        ob.scale = scale
    for ob in imported:
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
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


def export_frog():
    names = {ob.name for ob in bpy.data.collections["Frog"].objects}
    _export_selected(f"{NATURE_DIR}/frog.glb", names)


def verify_glb():
    import json
    import os
    import struct

    path = f"{NATURE_DIR}/frog.glb"
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
    build_frog()
    render_checks()
    export_frog()
    verify_glb()
