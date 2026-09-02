"""Build the Tiny Tracks hill-run GLBs (deterministic, re-runnable).

The kit's own "straight-hill" GLBs are bare rail ramps — rails and sleepers
with no ground beneath (they are meant to be sunk into user-built terrain),
and their three joint heights disagree (0.1/0.25 low ends, 1.071/1.1 high
ends). Mounted as-is they would float as ladders in the meadow, so the hill
run follows the tunnel precedent: original pieces authored in Blender on the
kit's own measurements, carrying the kit's warped rail geometry so the look
stays Kenney.

Usage inside Blender's Python console (or via an MCP bridge):

    exec(open(r"<repo>/scripts/blender-hill-snow.py", encoding="utf-8").read())
    build_hills()          # (re)create the three hill pieces + snow shells
    render_checks()        # optional: side / three-quarter / winter renders
    export_hills()         # write the three hill-*.glb piece files
    export_snow_caps()     # write the three hill-snow-*.glb shell files
    verify_glbs()          # print exported node/material names + sizes

Coordinate convention (matches the straight kit / KIT_ANCHORS in
track-renderer.ts): Blender y -4..0 becomes glTF z 0..4 after export_yup;
world north (grid -z) is Blender y = 0, so a slope-up climbs south -> north
by rising from the grade rail crown at z = -0.9 to the crest crown at
z = -0.9 + HILL_HEIGHT. The ride plane is 0.1 above the model origin's
ground line, so the renderer's KIT_ANCHOR [0, -1, 2] lands the grade rails
exactly where the kit straight's sit.

Ride profiles (src/core/elevation.ts): slope-up 0 -> H, hill constant H,
slope-down H -> 0, with H = 1.1 calibrated to the kit rail line, eased by
the same smoothstep the kit's own hill ramps use (measured from the GLBs).
"""

import math

import bmesh
import bpy

REPO = r"D:/Projects/3d-train-sim"
KIT_DIR = REPO + "/public/assets/train-kit"

# Straight-kit measurements (module is 4 units long, bed 1.0 wide).
BED_Y0, BED_Y1 = -4.0, 0.0
GROUND_Z = -1.0
GRADE_CROWN_Z = -0.9  # the kit straight's rail crown in model space

# Ride profile: crest rail crown sits HILL_HEIGHT above the grade crown.
HILL_HEIGHT = 1.1

# The grass mound's top sits just under the sleepers (sleeper base -1.0).
MOUND_TOP_DZ = -1.01
MOUND_BOTTOM_Z = -1.2
MOUND_TOP_HALF_W = 0.55  # a small shoulder past the 1.0-wide sleeper bed
MOUND_BASE_HALF_W = 1.2  # sloped sides, matching the tunnel vault's mass
MOUND_INSET = 0.01  # per end, so adjacent pieces never z-fight
MOUND_ROWS = 48

# Snow crowns: a proud blanket where the ride height is high, the tunnel
# snow-cap language (proud of the surface, inset from the piece ends).
SNOW_MIN_LIFT = 0.6  # fraction of HILL_HEIGHT above which snow rests
SNOW_HALF_W = 0.5
SNOW_BURY_DZ = 0.03
SNOW_PROUD_DZ = 0.07
SNOW_END_INSET = 0.12
SNOW_ROWS = 32  # keeps each exported shell under ~15 KB

STRAIGHT_GLB = KIT_DIR + "/railroad-straight.glb"

PIECES = (
    # kind, piece root name, snow node name
    ("slope-up", "hill_slope_up", "hill_snow_slope_up"),
    ("hill", "hill_crest", "hill_snow_hill"),
    ("slope-down", "hill_slope_down", "hill_snow_slope_down"),
)

MATERIALS = {
    "hill_grass": (0.275, 0.618, 0.275, 1.0),  # the meadow's 0x8fce8f, linear
    "hill_snow": (0.922, 0.947, 1.0, 1.0),  # the tunnel snow palette
}


def _smoothstep(u):
    return u * u * (3 - 2 * u)


def _lift_of(kind, u):
    """Ride height at climb progress u (0 = south end y=-4, 1 = north y=0)."""
    if kind == "slope-up":
        return HILL_HEIGHT * _smoothstep(u)
    if kind == "hill":
        return HILL_HEIGHT
    return HILL_HEIGHT * (1 - _smoothstep(u))


def _smoothstep_solve(target):
    """Climb progress u with smoothstep(u) = target, by bisection."""
    a, b = 0.0, 1.0
    for _ in range(40):
        m = (a + b) / 2
        if _smoothstep(m) < target:
            a = m
        else:
            b = m
    return (a + b) / 2


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


def _link(coll, bm, name, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    coll.objects.link(obj)
    me.materials.append(_material(material))
    return obj


def _rails_for(coll, kind, root_name):
    """The kit straight's own rails + sleepers, warped onto the ride profile."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=STRAIGHT_GLB)
    src_meshes = [o for o in set(bpy.data.objects) - before if o.type == "MESH"]
    src = src_meshes[0]
    me = src.data.copy()
    me.name = root_name + "_rails"
    # The kit GLB's root node carries the model-space offset (the ride plane
    # is 0.1 above the origin's ground line): bake it into the mesh so the
    # copy matches the scene-space measurements the renderer anchors against.
    dz = src.matrix_world.translation.z
    dy = src.matrix_world.translation.y
    for ob in sorted((set(bpy.data.objects) - before), key=lambda o: o.name):
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if data and data.users == 0:
            bpy.data.meshes.remove(data)

    rails = bpy.data.objects.new(me.name, me)
    coll.objects.link(rails)
    for v in me.vertices:
        u = (v.co.y + dy - BED_Y0) / (BED_Y1 - BED_Y0)
        v.co.z += dz + _lift_of(kind, u)
        v.co.y += dy
    return rails


def _loft(coll, name, material, kind, dz_lo, dz_hi, lo, hi, half_w, z_top_of):
    """A loft along the module: per-row ring of 4 verts from dz_lo to dz_hi
    above the profile line, end caps closed."""
    bm = bmesh.new()
    first = None
    prev = None
    for i in range(SNOW_ROWS + 1):
        u = lo + (hi - lo) * i / SNOW_ROWS
        y = BED_Y0 + u * (BED_Y1 - BED_Y0)
        top = z_top_of(kind, u)
        ring = [
            bm.verts.new((-half_w, y, top + dz_lo)),
            bm.verts.new((half_w, y, top + dz_lo)),
            bm.verts.new((half_w, y, top + dz_hi)),
            bm.verts.new((-half_w, y, top + dz_hi)),
        ]
        if prev:
            for j in range(4):
                bm.faces.new([prev[j], prev[(j + 1) % 4], ring[(j + 1) % 4], ring[j]])
        else:
            first = ring
        prev = ring
    # Flat end caps (the snow shell stays an open-backed draping otherwise).
    bm.faces.new([first[3], first[2], first[1], first[0]])
    bm.faces.new([prev[0], prev[1], prev[2], prev[3]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(coll, bm, name, material)


def _mound_for(coll, kind, root_name):
    """The grass body: a trapezoid embankment — 1.1-wide crown under the
    sleepers, sloped sides running out to a buried base, ends inset."""
    bm = bmesh.new()
    first = None
    prev = None
    for i in range(MOUND_ROWS + 1):
        u = i / MOUND_ROWS
        y = BED_Y0 + MOUND_INSET + u * (BED_Y1 - BED_Y0 - 2 * MOUND_INSET)
        top = MOUND_TOP_DZ + _lift_of(kind, u)
        ring = [
            bm.verts.new((-MOUND_BASE_HALF_W, y, MOUND_BOTTOM_Z)),
            bm.verts.new((-MOUND_TOP_HALF_W, y, top)),
            bm.verts.new((MOUND_TOP_HALF_W, y, top)),
            bm.verts.new((MOUND_BASE_HALF_W, y, MOUND_BOTTOM_Z)),
        ]
        if prev:
            for j in range(4):
                bm.faces.new([prev[j], prev[(j + 1) % 4], ring[(j + 1) % 4], ring[j]])
        else:
            first = ring
        prev = ring
    bm.faces.new([first[3], first[2], first[1], first[0]])
    bm.faces.new([prev[0], prev[1], prev[2], prev[3]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(coll, bm, root_name + "_mound", "hill_grass")


def _snow_for(coll, kind, name):
    """A proud white blanket where the ride height is at least SNOW_MIN_LIFT."""
    if kind == "slope-up":
        lo, hi = _smoothstep_solve(SNOW_MIN_LIFT / HILL_HEIGHT), 1.0
    elif kind == "slope-down":
        lo, hi = 0.0, _smoothstep_solve(1 - SNOW_MIN_LIFT / HILL_HEIGHT)
    else:
        lo, hi = 0.0, 1.0

    def z_top(k, u):
        return MOUND_TOP_DZ + _lift_of(k, u)

    return _loft(
        coll,
        name,
        "hill_snow",
        kind,
        dz_lo=-SNOW_BURY_DZ,
        dz_hi=SNOW_PROUD_DZ,
        lo=lo + (SNOW_END_INSET / (BED_Y1 - BED_Y0)) * (hi - lo),
        hi=hi - (SNOW_END_INSET / (BED_Y1 - BED_Y0)) * (hi - lo),
        half_w=SNOW_HALF_W,
        z_top_of=z_top,
    )


def _hill_collection():
    old = bpy.data.collections.get("Hills")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("Hills")
    bpy.context.scene.collection.children.link(coll)
    return coll


def build_hills():
    """Recreate all hill pieces and snow shells from scratch. Safe to re-run."""
    coll = _hill_collection()
    for kind, root, snow_name in PIECES:
        _rails_for(coll, kind, root)
        _mound_for(coll, kind, root)
        _snow_for(coll, kind, snow_name)
    print("built:", ", ".join(n for _, n, _ in PIECES))


def _setup_check_env():
    """Sun, ground, camera, and world for the render checks (tunnel recipe)."""
    cam = bpy.data.objects.get("HillCheckCam")
    if cam is None:
        cam = bpy.data.objects.new("HillCheckCam", bpy.data.cameras.new("HillCheckCam"))
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
        ground = _link(bpy.context.collection, bm, "check_ground", "hill_grass")
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.75, 0.85, 1.0, 1.0)
    bg.inputs[1].default_value = 0.7
    return cam


def render_checks():
    """Side profile, three-quarter, and a winter (snow) view per the house rules."""
    import os
    import tempfile

    from mathutils import Vector

    cam = _setup_check_env()
    coll = bpy.data.collections.get("Hills")
    scene = bpy.context.scene

    # Lay the three pieces out along +x like a composed run, then restore.
    layout = {}
    x = 0.0
    for kind, root, _ in PIECES:
        for suffix in ("_rails", "_mound"):
            ob = coll.objects[root + suffix]
            layout[ob.name] = ob.location.copy()
            ob.location.x = x
        x += 4.2

    views = (
        ("hill_side.png", (6.3, -9.5, 0.2), (6.3, -2.0, -0.3), 50.0, False),
        ("hill_quarter.png", (13.0, -10.5, 3.0), (6.0, -2.0, -0.2), 40.0, False),
        ("hill_winter.png", (13.0, -10.5, 3.0), (6.0, -2.0, -0.2), 40.0, True),
    )
    for fname, loc, target, lens, winter in views:
        for _, _, snow in PIECES:
            coll.objects[snow].hide_render = not winter
        scene.camera = cam
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = 1000
        scene.render.resolution_y = 500
        scene.render.filepath = os.path.join(tempfile.gettempdir(), fname)
        bpy.ops.render.render(write_still=True)
        print("rendered:", scene.render.filepath)

    for _, root, _ in PIECES:
        for suffix in ("_rails", "_mound"):
            ob = coll.objects[root + suffix]
            ob.location = layout[ob.name]


def _export_selected(filepath, names):
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
    import os

    print("exported:", filepath, os.path.getsize(filepath), "bytes")


def export_hills():
    for kind, root, _ in PIECES:
        _export_selected(f"{KIT_DIR}/hill-{kind}.glb", {root + "_rails", root + "_mound"})


def export_snow_caps():
    for kind, _, snow in PIECES:
        _export_selected(f"{KIT_DIR}/hill-snow-{kind}.glb", {snow})


def verify_glbs():
    import json
    import os
    import struct

    for kind, _, _ in PIECES:
        for path in (f"{KIT_DIR}/hill-{kind}.glb", f"{KIT_DIR}/hill-snow-{kind}.glb"):
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
