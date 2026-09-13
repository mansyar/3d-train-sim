"""Build the Tiny Tracks three-way switch GLB (deterministic, re-runnable).

The third junction piece: one stem (south) and three roads — through
(north), right (east), and left (west) — built from the kit's own rail
geometry like its two Y siblings so the look and the runtime contracts
transfer unchanged:

- the through-road is the kit straight's own sleepers + rails, unmoved
  (stem south, y=-4, to straight north, y=0);
- the right-hand road is the kit corner-small flipped onto the
  south-east quarter-arc exactly like blender-switch.py (both x and y
  flipped; ends at the south edge midpoint (0,-4) and the east edge
  midpoint (2,-2));
- the left-hand road is the same corner-small flipped y-only onto the
  south-west quarter-arc exactly like blender-switch-mirror.py (ends at
  the south edge midpoint (0,-4) and the west edge midpoint (-2,-2));
- the point blades keep the SAME named `switch_blades` node contract as
  the Y switches: 0 = closed for the through road, -0.21 about +z tips
  them east toward the right-hand road, +0.21 tips them west toward the
  left-hand road (arrives as glTF +y via export_yup);
- the new `switch_lever` node is a chunky signal lever (ground pad +
  post + pointer arm) on the north-west side, clear of the rail bed and
  of the locomotive envelope: its arm
  points north (toward y=0) in the neutral pose, and the renderer turns
  the node about its vertical (authored about +z, arriving as glTF +y)
  to point at whichever road the points are set for — two poses on the
  Y switches, three here.

No ballast base: bare sleepers + rails on the meadow mat, like the kit.

Usage headless:

    blender --background --python scripts/blender-switch-3way.py

Coordinate convention (matches the straight kit / KIT_ANCHORS in
track-renderer.ts): Blender y -4..0 becomes glTF z 0..4 after export_yup;
world north (grid -z) is Blender y = 0, east is +x. The ride plane is
0.1 above the model origin's ground line, so the renderer's KIT_ANCHOR
[0, -1, 2] lands the rails exactly where the kit straight's sit.
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
# edge, tips reaching toward the south edge where all three roads meet.
# Symmetric about x = 0, so identical to both Y switches.
BLADE_HEEL = (0.0, -3.62, -0.95)  # the switch_blades node origin
BLADE_HALF_LEN = 0.26
BLADE_HALF_W = 0.035
BLADE_HALF_H = 0.045
BLADE_OFFSET_X = 0.16  # the pair straddles the through road's rails
BLADE_Y_OFFSET = -0.08  # bars span y [-0.34, +0.18] local: toe near the edge
BLADE_RISE = 0.06  # blade tops ride just proud of the rail crowns

# Signal lever: a wooden base pad + post with a steel arm + knob, rooted
# on the north-west side. The pivot clears the through road's bed
# (|x| <= 0.5) and the locomotive envelope (2.3 wide at ride scale =>
# |x| <= ~1.23 asset units) even with the arm swung east; the arm reads
# as a pointer at tablet distance (0.36 long with a chunky knob), and
# the pad keeps it planted instead of floating in the grass.
LEVER_PIVOT = (-1.78, -0.5, -1.0)  # the switch_lever node origin (ground)
LEVER_PAD_W = 0.44  # ground pad: a planted footprint under the post
LEVER_PAD_H = 0.12
LEVER_POST_W = 0.16
LEVER_POST_H = 0.55  # post top sits at z = -0.33
LEVER_ARM_LEN = 0.36  # arm spans local y [0.02, 0.38]: points north
LEVER_ARM_W = 0.12
LEVER_ARM_H = 0.14  # arm top at z = -0.19
LEVER_KNOB = 0.2

MATERIALS = {
    "switch_steel": (0.53, 0.56, 0.62, 1.0),  # rail steel, slightly blue
    "lever_wood": (0.52, 0.38, 0.26, 1.0),  # sleeper brown for the post
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


def _diverge_east_road(coll):
    """The kit corner-small's own sleepers + rails, rotated from its native
    north-west quarter-arc onto the south-east quarter-arc (pivot the SE
    corner at (2, -4)): a 180 degree turn about the cell centre (0, -2).
    Ends land on the south edge midpoint (0, -4) and the east edge
    midpoint (2, -2) — the exact right switch diverge (blender-switch.py)."""
    me = _import_kit_mesh(CORNER_GLB, "switch_diverge_east")
    for v in me.vertices:
        v.co.x = -v.co.x
        v.co.y = -4.0 - v.co.y
    return _mesh_object(coll, me, "switch_diverge_east")


def _diverge_west_road(coll):
    """The kit corner-small's own sleepers + rails flipped onto the
    south-west quarter-arc (pivot the SW corner at (-2, -4)): a vertical
    flip about the cell mid-line y = -2. Ends land on the south edge
    midpoint (0, -4) and the west edge midpoint (-2, -2) — the exact
    mirror switch diverge (blender-switch-mirror.py)."""
    me = _import_kit_mesh(CORNER_GLB, "switch_diverge_west")
    for v in me.vertices:
        v.co.y = -4.0 - v.co.y
    return _mesh_object(coll, me, "switch_diverge_west")


def _blades(coll):
    """The point blades: a named node the renderer flips toward the chosen
    road. An empty at the heel, carrying two thin steel bars pointing
    north (toward the toe at the south edge of the roads). Symmetric, so
    shared verbatim with both Y switches — 0 closed, -0.21 tips the pair
    east, +0.21 west."""
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


def _lever(coll):
    """The signal lever: a named `switch_lever` node at its ground pivot,
    carrying a wooden base pad + post and a steel arm + knob. The arm
    points north (toward y=0) in the neutral pose; the renderer rotates
    the node about its vertical to point at the chosen road (0 through /
    -90 east / +90 west in glTF +y terms — same sign convention as the
    blades)."""
    root = bpy.data.objects.new("switch_lever", None)
    root.empty_display_size = 0.2
    root.location = LEVER_PIVOT
    coll.objects.link(root)

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)  # ground pad
    for v in bm.verts:
        v.co.x = v.co.x * LEVER_PAD_W
        v.co.y = v.co.y * LEVER_PAD_W
        v.co.z = v.co.z * LEVER_PAD_H + LEVER_PAD_H / 2
    bmesh.ops.create_cube(bm, size=1.0)  # post on the pad
    for v in bm.verts[-8:]:
        v.co.x = v.co.x * LEVER_POST_W
        v.co.y = v.co.y * LEVER_POST_W
        v.co.z = v.co.z * LEVER_POST_H + LEVER_PAD_H + LEVER_POST_H / 2
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("switch_lever_base")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(_material("lever_wood"))
    base = bpy.data.objects.new("switch_lever_base", me)
    base.parent = root
    coll.objects.link(base)

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)  # arm
    for v in bm.verts:
        v.co.x = v.co.x * LEVER_ARM_W
        v.co.y = v.co.y * LEVER_ARM_LEN + LEVER_ARM_LEN / 2 + 0.02
        v.co.z = v.co.z * LEVER_ARM_H + LEVER_PAD_H + LEVER_POST_H + LEVER_ARM_H / 2
    bmesh.ops.create_cube(bm, size=1.0)  # knob at the tip
    for v in bm.verts[-8:]:
        v.co.x = v.co.x * LEVER_KNOB
        v.co.y = v.co.y * LEVER_KNOB + LEVER_ARM_LEN + 0.04
        v.co.z = v.co.z * LEVER_KNOB + LEVER_PAD_H + LEVER_POST_H + LEVER_ARM_H / 2
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("switch_lever_arm")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(_material("switch_steel"))
    arm = bpy.data.objects.new("switch_lever_arm", me)
    arm.parent = root
    coll.objects.link(arm)
    return root


def _switch_collection():
    old = bpy.data.collections.get("Switch3Way")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("Switch3Way")
    bpy.context.scene.collection.children.link(coll)
    return coll


def build_switch_3way():
    """Recreate the three-way switch piece from scratch. Safe to re-run."""
    coll = _switch_collection()
    _through_road(coll)
    _diverge_east_road(coll)
    _diverge_west_road(coll)
    _blades(coll)
    _lever(coll)
    print("built: switch_through, switch_diverge_east, switch_diverge_west, switch_blades, switch_lever")


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
    cam = bpy.data.objects.get("Switch3WayCheckCam")
    if cam is None:
        cam = bpy.data.objects.new("Switch3WayCheckCam", bpy.data.cameras.new("Switch3WayCheckCam"))
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
    """Top, quarter, and both diverge-set fit views per the house rules."""
    import os
    import tempfile

    from mathutils import Vector

    cam = _setup_check_env()
    coll = bpy.data.collections.get("Switch3Way")
    scene = bpy.context.scene
    scene.camera = cam

    def shoot(
        fname,
        loc,
        target,
        lens,
        blade_angle=0.0,
        lever_angle=0.0,
        loco=None,
        loco_at=None,
        loco_rot=-2.356,
    ):
        coll.objects["switch_blades"].rotation_euler = (0.0, 0.0, blade_angle)
        coll.objects["switch_lever"].rotation_euler = (0.0, 0.0, lever_angle)
        if loco is not None and loco_at is not None:
            loco.location = loco_at
            loco.rotation_euler = (0.0, 0.0, loco_rot)
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
    # 0 / neutral: through road set, blades closed, arm pointing north.
    shoot("switch_3way_top.png", (0.0, -2.0, 9.0), (0.0, -2.0, -1.0), 50.0)
    # East set: blades tip east, arm swung east, seen from the south-west.
    shoot(
        "switch_3way_quarter_east.png",
        (-5.5, -9.5, 5.5),
        (0.2, -2.0, -0.6),
        45.0,
        blade_angle=-0.21,
        lever_angle=-1.5708,
    )
    # Lever close-up (east pose): the arm should point east, toward the
    # right-hand road, so the pointer reads at toddler-eye height.
    shoot(
        "switch_3way_lever_close.png",
        (-4.6, -4.2, 0.6),
        (-1.78, -0.5, -0.55),
        50.0,
        blade_angle=-0.21,
        lever_angle=-1.5708,
    )
    # East fit: the kit locomotive mid-way on the east arc, wheels on the
    # kit rails, nothing clipping the tipped blades (arc pivot (2, -4),
    # radius 2, mid-arc at 135 deg -> (0.59, -2.59), tangent -135 deg).
    shoot(
        "switch_3way_east_fit.png",
        (-4.0, -7.0, 1.4),
        (1.2, -2.4, -0.85),
        40.0,
        blade_angle=-0.21,
        lever_angle=-1.5708,
        loco=loco,
        loco_at=(0.59, -2.59, -1.0),
    )
    # West fit: same checkpoint on the west arc (pivot (-2, -4), mid-arc
    # at (-0.59, -2.59), tangent +135 deg), blades and arm swung west.
    shoot(
        "switch_3way_west_fit.png",
        (4.0, -7.0, 1.4),
        (-1.2, -2.4, -0.85),
        40.0,
        blade_angle=0.21,
        lever_angle=1.5708,
        loco=loco,
        loco_at=(-0.59, -2.59, -1.0),
        loco_rot=2.356,
    )
    if loco is not None:
        for ob in list(loco.children_recursive) + [loco]:
            bpy.data.objects.remove(ob, do_unlink=True)


def _import_loco():
    """The kit locomotive (asset scale x1.6 per tech-stack rule 3) for the
    fit-check renders, parked on whichever arc the shot names."""
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.gltf(filepath=KIT_DIR + "/train-locomotive-a.glb")
    except Exception:
        return None
    roots = [o for o in set(bpy.data.objects) - before if o.parent is None or o.parent not in set(bpy.data.objects) - before]
    root = roots[0]
    root.scale = (1.6, 1.6, 1.6)
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


def export_switch_3way():
    # Park the control nodes at their authored neutral before export: the
    # last render shot leaves its pose on them, and the shipped GLB must
    # rest at 0 (blades closed, arm pointing north).
    coll = bpy.data.collections["Switch3Way"]
    for name in ("switch_blades", "switch_lever"):
        node = coll.objects.get(name)
        if node is not None:
            node.rotation_euler = (0.0, 0.0, 0.0)
    _export_selected(
        f"{KIT_DIR}/switch-3way.glb",
        {
            "switch_through",
            "switch_diverge_east",
            "switch_diverge_west",
            "switch_blades",
            "switch_blade_-1",
            "switch_blade_1",
            "switch_lever",
            "switch_lever_base",
            "switch_lever_arm",
        },
    )


def verify_glb():
    import json
    import os
    import struct

    path = f"{KIT_DIR}/switch-3way.glb"
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
    build_switch_3way()
    render_checks()
    export_switch_3way()
    verify_glb()
