"""Build the Tiny Tracks mirror-switch GLB (deterministic, re-runnable).

The left-hand twin of scripts/blender-switch.py: the same kit-measured
turnout with the diverging road mirrored, so the branch peels WEST
(stem south -> through north / diverge west) instead of east.

Construction mirrors the right switch exactly:
- the through-road is the kit straight's own sleepers + rails, unmoved;
- the diverging road is the kit corner-small's sleepers + rails flipped
  onto the south-west quarter-arc (pivot the SW corner at (-2, -4)):
  ends land on the south edge midpoint (0, -4) and the west edge
  midpoint (-2, -2) — the x-mirror of the right switch's diverge, hence
  the same corner-style ride arc the solver and ride-motion share;
- the point blades keep the SAME named `switch_blades` node contract so
  the renderer reuses the flip path untouched: 0 = closed for the
  through road, positive about +z tips them west toward the diverging
  road (arrives as glTF +y via export_yup, mirrored from the right
  switch's -0.21).

No ballast base: bare sleepers + rails on the meadow mat, like the kit.

Usage headless:

    blender --background --python scripts/blender-switch-mirror.py

Coordinate convention (matches the straight kit / KIT_ANCHORS in
track-renderer.ts): Blender y -4..0 becomes glTF z 0..4 after export_yup;
world north (grid -z) is Blender y = 0, west is -x.
"""

import bmesh
import bpy

import math

REPO = r"D:/Projects/3d-train-sim"
KIT_DIR = REPO + "/public/assets/train-kit"

BED_Y0, BED_Y1 = -4.0, 0.0
GROUND_Z = -1.0

STRAIGHT_GLB = KIT_DIR + "/railroad-straight.glb"
CORNER_GLB = KIT_DIR + "/railroad-corner-small.glb"

# Point blades: two thin bars hinged at the heel just north of the south
# edge, tips reaching toward the south edge where both roads meet.
# Symmetric about x = 0, so identical to the right switch.
BLADE_HEEL = (0.0, -3.62, -0.95)  # the switch_blades node origin
BLADE_HALF_LEN = 0.26
BLADE_HALF_W = 0.035
BLADE_HALF_H = 0.045
BLADE_OFFSET_X = 0.16  # the pair straddles the through road's rails
BLADE_Y_OFFSET = -0.08  # bars span y [-0.34, +0.18] local: toe near the edge
BLADE_RISE = 0.06  # blade tops ride just proud of the rail crowns

MATERIALS = {
    "switch_steel": (0.53, 0.56, 0.62, 1.0),  # rail steel, slightly blue
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


def _mesh_object(coll, me, name, material=None):
    obj = bpy.data.objects.new(name, me)
    coll.objects.link(obj)
    if material:
        me.materials.clear()
        me.materials.append(_material(material))
    return obj


def _through_road(coll):
    """The kit straight's own sleepers + rails, unmoved: stem south (y=-4)
    to straight branch north (y=0)."""
    me = _import_kit_mesh(STRAIGHT_GLB, "switch_through")
    return _mesh_object(coll, me, "switch_through")


def _diverge_road(coll):
    """The kit corner-small's own sleepers + rails, flipped from its native
    north-west quarter-arc (pivot the NW corner at (-2, 0)) onto the
    south-west quarter-arc (pivot the SW corner at (-2, -4)): a vertical
    flip about the cell mid-line y = -2. Ends land on the south edge
    midpoint (0, -4) and the west edge midpoint (-2, -2) — the exact
    x-mirror of the right switch's diverge (which flips both x and y),
    so the renderer mount and the solver's corner-style arc transfer
    unchanged."""
    me = _import_kit_mesh(CORNER_GLB, "switch_diverge")
    for v in me.vertices:
        v.co.y = -4.0 - v.co.y
    return _mesh_object(coll, me, "switch_diverge")


def _blades(coll):
    """The point blades: a named node the renderer flips toward the chosen
    road. An empty at the heel, carrying two thin steel bars pointing
    north (toward the toe at the south edge of the roads). Symmetric, so
    shared verbatim with the right switch — only the flip angle differs
    (+0.21 tips the pair west)."""
    root = bpy.data.objects.new("switch_blades", None)
    root.empty_display_size = 0.2
    root.location = BLADE_HEEL
    coll.objects.link(root)
    for side in (-1, 1):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co.x = v.co.x * BLADE_HALF_W * 2 + side * BLADE_OFFSET_X
            v.co.y = v.co.y * BLADE_HALF_LEN * 2 + BLADE_Y_OFFSET
            v.co.z = v.co.z * BLADE_HALF_H * 2 + BLADE_HALF_H + BLADE_RISE
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(f"switch_blade_{side}")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(_material("switch_steel"))
        blade = bpy.data.objects.new(me.name, me)
        blade.parent = root
        coll.objects.link(blade)
    return root


def _switch_collection():
    old = bpy.data.collections.get("SwitchMirror")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("SwitchMirror")
    bpy.context.scene.collection.children.link(coll)
    return coll


def build_switch():
    """Recreate the mirror-switch piece from scratch. Safe to re-run."""
    coll = _switch_collection()
    _through_road(coll)
    _diverge_road(coll)
    _blades(coll)
    print("built: switch_through, switch_diverge, switch_blades (mirror)")


def _setup_check_env():
    """Sun, ground, camera, and world for the render checks (tunnel recipe).
    Headless Blender starts with the default Cube/Camera/Light — remove
    them so only the switch and the check props render."""
    for name in ("Cube", "Camera", "Light"):
        ob = bpy.data.objects.get(name)
        if ob:
            data = getattr(ob, "data", None)
            bpy.data.objects.remove(ob, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    cam = bpy.data.objects.get("SwitchMirrorCheckCam")
    if cam is None:
        cam = bpy.data.objects.new("SwitchMirrorCheckCam", bpy.data.cameras.new("SwitchMirrorCheckCam"))
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
        ground = _mesh_object(bpy.context.collection, me, "check_ground")
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.75, 0.85, 1.0, 1.0)
    bg.inputs[1].default_value = 0.7
    return cam


def render_checks():
    """Top, three-quarter, and a diverge-set fit view per the house rules."""
    import os
    import tempfile

    from mathutils import Vector

    cam = _setup_check_env()
    coll = bpy.data.collections.get("SwitchMirror")
    scene = bpy.context.scene
    scene.camera = cam

    def shoot(fname, loc, target, lens, blade_angle=0.0, loco=None, loco_at=None):
        root = coll.objects["switch_blades"]
        root.rotation_euler = (0.0, 0.0, blade_angle)
        if loco is not None and loco_at is not None:
            loco.location = loco_at
            loco.hide_render = False
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = 900
        scene.render.resolution_y = 700
        scene.render.filepath = os.path.join(tempfile.gettempdir(), fname)
        bpy.ops.render.render(write_still=True)
        print("rendered:", scene.render.filepath)
        if loco is not None:
            loco.hide_render = True

    loco = _import_loco()
    shoot("switch_mirror_top.png", (0.0, -2.0, 9.0), (0.0, -2.0, -1.0), 50.0)
    shoot("switch_mirror_quarter.png", (6.5, -9.0, 4.5), (-0.8, -2.0, -0.6), 45.0)
    # Blades set for the diverge (positive z rotation points them west),
    # with the kit locomotive standing mid-way on the diverging road's
    # arc — the fit check: wheels on the kit rails, nothing clipping the
    # blades. The arc: pivot (-2, -4), radius 2, mid-arc at 45° ->
    # (-0.59, -2.59); its tangent there heads (-0.71, +0.71), i.e. the
    # x-mirror of the right switch's fit pose, rotation z = +135°.
    shoot(
        "switch_mirror_diverge_fit.png",
        (4.0, -7.0, 1.4),
        (-1.2, -2.4, -0.85),
        40.0,
        blade_angle=0.21,
        loco=loco,
        loco_at=(-0.59, -2.59, -1.0),
    )
    if loco is not None:
        for ob in list(loco.children_recursive) + [loco]:
            bpy.data.objects.remove(ob, do_unlink=True)


def _import_loco():
    """The kit locomotive (asset scale x1.6 per tech-stack rule 3) for the
    fit-check render, parked on the diverging road."""
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.gltf(filepath=KIT_DIR + "/train-locomotive-a.glb")
    except Exception:
        return None
    roots = [o for o in set(bpy.data.objects) - before if o.parent is None or o.parent not in set(bpy.data.objects) - before]
    root = roots[0]
    root.scale = (1.6, 1.6, 1.6)
    root.rotation_euler = (0.0, 0.0, 2.356)  # aligned with the diverge tangent
    for ob in set(bpy.data.objects) - before:
        ob.hide_render = True
    return root


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


def export_switch():
    _export_selected(
        f"{KIT_DIR}/switch-mirror.glb",
        {"switch_through", "switch_diverge", "switch_blades", "switch_blade_-1", "switch_blade_1"},
    )


def verify_glb():
    import json
    import os
    import struct

    path = f"{KIT_DIR}/switch-mirror.glb"
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
    build_switch()
    render_checks()
    export_switch()
    verify_glb()
