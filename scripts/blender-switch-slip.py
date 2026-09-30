"""Build the Tiny Tracks double-slip switch GLB (deterministic, re-runnable).

The fourth junction piece and the last item on the product roadmap: two
roads cross with two diagonal shortcuts in one tile — four open ends and
three choices per entry (straight, right, left). Built from the kit's own
rail geometry like its three junction siblings so the look and the runtime
contracts transfer unchanged:

- the through roads are the kit crossing's own sleepers + rails (north–south
  and east–west already properly diamond-crossed), imported on the straight
  mount the renderer anchors with;
- the four diagonal roads are the kit corner-small's own sleepers + rails
  placed on the four quarter-arcs (radius 2, centred on the cell corners):
  NW is the corner as-imported, NE is it rotated −90° about the cell centre,
  SE is it rotated 180°, and SW is a y-mirrored copy (the one transform that
  is not a rotation). The three rotated arcs share the native mesh as linked
  duplicates to stay inside the size budget;
- FOUR point-blade groups — one per entry edge, since every entry has a
  choice. The south group keeps the SAME named `switch_blades` node contract
  as the other switches (0 = straight-aligned, −0.21 tips toward its east
  diagonal, +0.21 toward its west diagonal, arriving as glTF +y via
  export_yup); the other three are `switch_blades_north/east/west` with the
  same local bar geometry rotated so their toes reach their own edge —
  sign conventions per group are documented in `_blade_group`;
- the `switch_lever` node is the 3-way's chunky signal lever verbatim
  (ground pad + post + pointer arm) on the north-west side, re-measured
  against the slip's four arcs: its nearest curve clearance is 1.45 asset
  units, still clear of the 2.3-wide locomotive envelope (±1.23).

No ballast base: bare sleepers + rails on the meadow mat, like the kit.

Usage headless:

    blender --background --python scripts/blender-switch-slip.py

Coordinate convention (matches the straight kit / KIT_ANCHORS in
track-renderer.ts): Blender y −4..0 becomes glTF z 0..4 after export_yup;
world north (grid −z) is Blender y = 0, east is +x. The ride plane is
0.1 above the model origin's ground line, so the renderer's KIT_ANCHOR
[0, −1, 2] lands the rails exactly where the kit straight's sit.
"""

import bmesh
import bpy

import math

REPO = r"D:/Projects/3d-train-sim"
KIT_DIR = REPO + "/public/assets/train-kit"

GROUND_Z = -1.0
CELL_CENTRE = (0.0, -2.0)

CROSSING_GLB = KIT_DIR + "/railroad-crossing.glb"
CORNER_GLB = KIT_DIR + "/railroad-corner-small.glb"

# Point blades: two thin bars hinged at the heel just inside each entry
# edge, toes reaching toward that edge where the entry's three roads
# meet. Every group shares the 3-way's local bar geometry; the group's
# rotation orients the toes at its own edge.
BLADE_HEEL_INSET = 0.38  # heel sits this far inside the edge midpoint
BLADE_HALF_LEN = 0.26
BLADE_HALF_W = 0.035
BLADE_HALF_H = 0.045
BLADE_OFFSET_X = 0.16  # the pair straddles the group's straight road
BLADE_Y_OFFSET = -0.08  # bars span local y [-0.34, +0.18]: toe near the edge
BLADE_RISE = 0.06  # blade tops ride just proud of the rail crowns
BLADE_HEEL_Z = -0.95

# Signal lever: the 3-way's lever verbatim — wooden base pad + post with a
# steel arm + knob, rooted on the north-west side. Re-measured for the
# slip: distance to the nearest curve (the NW arc) is 1.45 asset units,
# clear of the locomotive envelope (2.3 wide at ride scale => ±1.23) even
# with the arm swung.
LEVER_PIVOT = (-1.78, -0.5, -1.0)  # the switch_lever node origin (ground)
LEVER_PAD_W = 0.44
LEVER_PAD_H = 0.12
LEVER_POST_W = 0.16
LEVER_POST_H = 0.55
LEVER_ARM_LEN = 0.36
LEVER_ARM_W = 0.12
LEVER_ARM_H = 0.14
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


def _through_roads(coll):
    """The kit crossing's own sleepers + rails: north–south AND east–west
    through roads with the proper diamond in the middle, unmoved on the
    straight mount."""
    me = _import_kit_mesh(CROSSING_GLB, "switch_cross")
    return _mesh_object(coll, me, "switch_cross")


def _arc_meshes(coll):
    """The four diagonal roads as the kit corner-small's own sleepers +
    rails on the four quarter-arcs. Returns (native_mesh, mirrored_mesh):
    the NW/NE/SE arc objects share the centred native mesh via rotations;
    SW gets a baked y-mirrored copy (the one transform that is not a
    rotation)."""
    raw = _import_kit_mesh(CORNER_GLB, "switch_arc_raw")

    # Native corner arc: NW quarter-arc, centre (-2, 0), ends at the north
    # midpoint (0, 0) and the west midpoint (-2, -2). Re-centre both copies
    # on the cell centre so rotation objects pivot about (0, -2).
    native = raw.copy()
    native.name = "switch_arc_native"
    for v in native.vertices:
        v.co.x -= CELL_CENTRE[0]
        v.co.y -= CELL_CENTRE[1]

    mirrored = native.copy()
    mirrored.name = "switch_arc_mirrored"
    for v in mirrored.vertices:
        v.co.y = -v.co.y  # y-flip about the re-centred origin == the SW arc

    bpy.data.meshes.remove(raw)

    specs = (
        # (object name, mesh, rotation about +z at the cell centre)
        ("switch_arc_nw", native, 0.0),  # as-imported
        ("switch_arc_ne", native, -math.pi / 2),  # NE quarter-arc
        ("switch_arc_se", native, math.pi),  # SE quarter-arc
        ("switch_arc_sw", mirrored, 0.0),  # SW quarter-arc (baked mirror)
    )
    for name, mesh, rot_z in specs:
        obj = _mesh_object(coll, mesh, name)
        obj.location = (CELL_CENTRE[0], CELL_CENTRE[1], 0.0)
        obj.rotation_euler = (0.0, 0.0, rot_z)


def _blade_bars(coll, root, prefix):
    """The 3-way's bar pair in the group's LOCAL frame (shared by every
    group): two thin steel bars straddling the group's straight road,
    toes toward local -y. Parented to the group's empty so the renderer's
    rotation about the node's vertical flips them."""
    for side in (-1, 1):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co.x = v.co.x * BLADE_HALF_W * 2 + side * BLADE_OFFSET_X
            v.co.y = v.co.y * BLADE_HALF_LEN * 2 + BLADE_Y_OFFSET
            v.co.z = v.co.z * BLADE_HALF_H * 2 + BLADE_HALF_H + BLADE_RISE
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(f"{prefix}_{side}")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(_material("switch_steel"))
        blade = bpy.data.objects.new(me.name, me)
        blade.parent = root
        coll.objects.link(blade)


def _blade_group(coll, name, heel, orient_z):
    """One entry's point-blade group: a named empty at the heel carrying
    the shared bar pair. The group's `orient_z` rotates the local bars so
    the toes reach the group's own edge:
      south (0, -3.62) orient 0     — the legacy `switch_blades` contract
      north (0, -0.38) orient pi
      east (1.62, -2)  orient +pi/2
      west (-1.62, -2) orient -pi/2
    Pose contract per group (renderer rotates the node about its vertical;
    angles arrive as glTF +y): 0 = bars aligned with the group's
    straight-through road; then, following the 3-way's south convention
    (-0.21 east / +0.21 west) rotated into each group's frame:
      south: -0.21 -> SE arc, +0.21 -> SW arc
      north: -0.21 -> NW arc, +0.21 -> NE arc
      east:  -0.21 -> NE arc, +0.21 -> SE arc
      west:  -0.21 -> SW arc, +0.21 -> NW arc
    """
    root = bpy.data.objects.new(name, None)
    root.empty_display_size = 0.2
    root.location = (heel[0], heel[1], BLADE_HEEL_Z)
    root.rotation_euler = (0.0, 0.0, orient_z)
    coll.objects.link(root)
    _blade_bars(coll, root, f"{name}_blade")
    return root


def _lever(coll):
    """The signal lever: the 3-way's `switch_lever` node verbatim — ground
    pivot carrying a wooden base pad + post and a steel arm + knob. The arm
    points north (toward y=0) in the neutral pose; the renderer rotates the
    node about its vertical to point at the chosen road."""
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


def _slip_collection():
    old = bpy.data.collections.get("SwitchSlip")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("SwitchSlip")
    bpy.context.scene.collection.children.link(coll)
    return coll


def build_switch_slip():
    """Recreate the double-slip switch piece from scratch. Safe to re-run."""
    coll = _slip_collection()
    _through_roads(coll)
    _arc_meshes(coll)
    _blade_group(coll, "switch_blades", (0.0, -3.62), 0.0)
    _blade_group(coll, "switch_blades_north", (0.0, -0.38), math.pi)
    _blade_group(coll, "switch_blades_east", (1.62, -2.0), math.pi / 2)
    _blade_group(coll, "switch_blades_west", (-1.62, -2.0), -math.pi / 2)
    _lever(coll)
    print(
        "built: switch_cross, switch_arc_nw/ne/se/sw, "
        "switch_blades(+north/east/west), switch_lever"
    )


def _setup_check_env():
    """Sun, ground, camera, and world for the render checks (3-way recipe).
    Headless Blender starts with the default Cube/Camera/Light — remove
    them so only the slip and the check props render."""
    for name in ("Cube", "Camera", "Light"):
        ob = bpy.data.objects.get(name)
        if ob:
            data = getattr(ob, "data", None)
            bpy.data.objects.remove(ob, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    cam = bpy.data.objects.get("SwitchSlipCheckCam")
    if cam is None:
        cam = bpy.data.objects.new("SwitchSlipCheckCam", bpy.data.cameras.new("SwitchSlipCheckCam"))
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


BLADE_NODES = (
    "switch_blades",
    "switch_blades_north",
    "switch_blades_east",
    "switch_blades_west",
)

# Arc mid-arc checkpoints for the fit renders: point and tangent (deg, in
# the Blender xy plane) of each arc halfway between its two edge midpoints.
ARC_CHECKPOINTS = {
    "switch_arc_ne": ((0.59, -1.41), -45.0),  # centre (2, 0)
    "switch_arc_se": ((0.59, -2.59), -135.0),  # centre (2, -4)
    "switch_arc_sw": ((-0.59, -2.59), 135.0),  # centre (-2, -4)
    "switch_arc_nw": ((-0.59, -1.41), 45.0),  # centre (-2, 0)
}


def render_checks():
    """Top, quarter, lever close-up, and fit views per the house rules.
    Fit shots park the kit locomotive on the NE arc (the rotation-instanced
    geometry) and the SW arc (the baked mirror) — if those two are flush,
    the SE/NW arcs are the same mesh family the 3-way already proved."""
    import os
    import tempfile

    from mathutils import Quaternion, Vector

    cam = _setup_check_env()
    coll = bpy.data.collections.get("SwitchSlip")
    scene = bpy.context.scene
    scene.camera = cam

    def shoot(fname, loc, target, lens, blade_poses=None, lever_angle=0.0, loco=None, loco_at=None, loco_rot=0.0):
        for node_name in BLADE_NODES:
            node = coll.objects.get(node_name)
            if node is not None:
                node.rotation_euler = (0.0, 0.0, (blade_poses or {}).get(node_name, 0.0))
        lever = coll.objects.get("switch_lever")
        if lever is not None:
            lever.rotation_euler = (0.0, 0.0, lever_angle)
        if loco is not None and loco_at is not None:
            loco.location = loco_at
            yaw = Quaternion((0.0, 0.0, 1.0), loco_rot)
            loco.rotation_quaternion = yaw @ base_quat
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
    # glTF roots carry their Y-up correction in a QUATERNION rotation_mode,
    # so a plain euler assignment is silently ignored — compose each shot's
    # yaw against the import quaternion (captured once, applied absolutely).
    base_quat = loco.rotation_quaternion.copy() if loco is not None else None
    # Neutral: every group straight-aligned, arm pointing north.
    shoot("switch_slip_top.png", (0.0, -2.0, 9.0), (0.0, -2.0, -1.0), 50.0)
    # South group set east (-0.21), arm swung east, seen from the south-west.
    shoot(
        "switch_slip_quarter_east.png",
        (-5.5, -9.5, 5.5),
        (0.2, -2.0, -0.6),
        45.0,
        blade_poses={"switch_blades": -0.21},
        lever_angle=-1.5708,
    )
    # Lever close-up (east pose): the arm should point east at toddler-eye
    # height, clear of all four arcs.
    shoot(
        "switch_slip_lever_close.png",
        (-4.6, -4.2, 0.6),
        (-1.78, -0.5, -0.55),
        50.0,
        blade_poses={"switch_blades": -0.21},
        lever_angle=-1.5708,
    )
    # Fit: the kit locomotive mid-way on the NE arc (rotation-instanced
    # geometry): centre (2, 0), mid-arc at (0.59, -1.41), tangent -45 deg.
    (point, tangent_deg) = ARC_CHECKPOINTS["switch_arc_ne"]
    shoot(
        "switch_slip_ne_fit.png",
        (4.0, 1.0, 1.4),
        (0.8, -1.6, -0.85),
        40.0,
        blade_poses={"switch_blades_north": 0.21},
        loco=loco,
        loco_at=(point[0], point[1], -1.0),
        loco_rot=math.radians(tangent_deg),
    )
    # Fit: the kit locomotive mid-way on the SW arc (the baked mirror):
    # centre (-2, -4), mid-arc at (-0.59, -2.59), tangent +135 deg.
    (point, _tangent_deg) = ARC_CHECKPOINTS["switch_arc_sw"]
    shoot(
        "switch_slip_sw_fit.png",
        (-4.0, -7.0, 1.4),
        (-0.8, -2.4, -0.85),
        40.0,
        blade_poses={"switch_blades": 0.21},
        lever_angle=1.5708,
        loco=loco,
        loco_at=(point[0], point[1], -1.0),
        loco_rot=2.356,
    )
    if loco is not None:
        for ob in list(loco.children_recursive) + [loco]:
            bpy.data.objects.remove(ob, do_unlink=True)


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


def export_switch_slip():
    # Park the control nodes at their authored neutral before export: the
    # last render shot leaves its pose on them, and the shipped GLB must
    # rest at 0 (every group straight-aligned, arm pointing north).
    coll = bpy.data.collections["SwitchSlip"]
    for name in BLADE_NODES + ("switch_lever",):
        node = coll.objects.get(name)
        if node is not None:
            node.rotation_euler = (0.0, 0.0, 0.0)
    names = {"switch_cross", "switch_arc_nw", "switch_arc_ne", "switch_arc_se", "switch_arc_sw"}
    for group in BLADE_NODES:
        names.add(group)
        for side in (-1, 1):
            names.add(f"{group}_blade_{side}")
    names |= {"switch_lever", "switch_lever_base", "switch_lever_arm"}
    _export_selected(f"{KIT_DIR}/switch-slip.glb", names)


def verify_glb():
    import json
    import os
    import struct

    path = f"{KIT_DIR}/switch-slip.glb"
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
    build_switch_slip()
    render_checks()
    export_switch_slip()
    verify_glb()