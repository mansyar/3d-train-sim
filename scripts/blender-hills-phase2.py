"""Build the Hills Phase 2 GLBs: bump run + elevated corners (deterministic).

The bump run (bump-up / hill-half / bump-down) mirrors the hill run at half
height: the kit straight's own rails + sleepers warped onto a HALF profile,
on the same grassy embankment language (blender-hill-snow.py), so bumps read
as the hills' little siblings and blend to flat and full hills through the
unchanged HILL_BLEND_FRACTION easing.

The elevated corner run (corner-up / hill-corner / corner-down) carries the
kit corner-small's own rails + sleepers warped around their native arc —
north-west quarter-arc pivoting the NW corner at (-2, 0), radius 2 — onto
full-height profiles, on a matching banked embankment that follows the arc.
Progress u runs 0 at the authored north leg (Blender y = 0, the leg the
renderer lands on the world-north edge midpoint: it sits on the yaw axis so
every BASE_YAW keeps it north, matching elevation.ts' corner base-start) to
1 at the authored west leg (the leg BASE_YAW -PI/2 lands east).

Ride profiles (src/core/elevation.ts, linear in progress) vs visuals: like
the shipped hills, the rails ease on smoothstep (the kit ramps' own ease, max
~0.1H from the linear ride line — invisible at toy scale, verified in the
render checks).

Snow crowns reuse the hill_snow palette + node-name contract
(hill_snow_<type with _ for ->, matching the renderer's normalized lookup):
a proud blanket where the ride height is at least 60% of the piece's own
crest (low bumps melt first, like real snow).

Usage headless (this repo has Blender 5.2 but no GUI here):

    blender --background --python scripts/blender-hills-phase2.py -- build
    blender --background --python scripts/blender-hills-phase2.py -- renders
    blender --background --python scripts/blender-hills-phase2.py -- export
    blender --background --python scripts/blender-hills-phase2.py -- verify

or inside Blender's Python console:

    exec(open(r"<repo>/scripts/blender-hills-phase2.py", encoding="utf-8").read())
    build_all()
    render_checks()
    export_all()
    verify_glbs()
"""

import math
import os
import sys

import bmesh
import bpy

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT_DIR = os.path.join(REPO, "public", "assets", "train-kit").replace(os.sep, "/")

# Straight-kit measurements (module is 4 units long, bed 1.0 wide).
BED_Y0, BED_Y1 = -4.0, 0.0
GROUND_Z = -1.0
GRADE_CROWN_Z = -0.9  # the kit straight's rail crown in model space

# Ride profiles: full-height corners crest at HILL_HEIGHT, the bump run at half.
HILL_HEIGHT = 1.1
HALF_HEIGHT = HILL_HEIGHT / 2.0

# Corner-small native arc (measured from the kit GLB): north-west
# quarter-arc pivoting the NW corner, radius 2.
CORNER_PIVOT = (-2.0, 0.0)
CORNER_RADIUS = 2.0

# Grass mound language (blender-hill-snow.py): trapezoid embankment, crown
# under the sleepers, sloped sides, ends inset so neighbours never z-fight.
MOUND_TOP_DZ = -1.01
MOUND_BOTTOM_Z = -1.2
MOUND_TOP_HALF_W = 0.55
MOUND_BASE_HALF_W = 1.2
MOUND_INSET = 0.01
MOUND_ROWS = 48

# Snow crowns (hill_snow palette): proud where the piece's own crest is high.
SNOW_FRAC = 0.6  # fraction of the piece crest above which snow rests
SNOW_HALF_W = 0.5
SNOW_BURY_DZ = 0.03
SNOW_PROUD_DZ = 0.07
SNOW_END_INSET = 0.12
SNOW_ROWS = 32

STRAIGHT_GLB = KIT_DIR + "/railroad-straight.glb"
CORNER_GLB = KIT_DIR + "/railroad-corner-small.glb"

# kind, family, crest, piece root name, snow node name, out file, snow file
BUMPS = (
    ("bump-up", "straight", HALF_HEIGHT, "bump_up", "hill_snow_bump_up",
     "hill-bump-up.glb", "hill-snow-bump-up.glb"),
    ("hill-half", "straight", HALF_HEIGHT, "bump_half", "hill_snow_bump_half",
     "hill-hill-half.glb", "hill-snow-hill-half.glb"),
    ("bump-down", "straight", HALF_HEIGHT, "bump_down", "hill_snow_bump_down",
     "hill-bump-down.glb", "hill-snow-bump-down.glb"),
)
CORNERS = (
    ("corner-up", "corner", HILL_HEIGHT, "corner_up", "hill_snow_corner_up",
     "hill-corner-up.glb", "hill-snow-corner-up.glb"),
    ("hill-corner", "corner", HILL_HEIGHT, "corner_bank", "hill_snow_corner_bank",
     "hill-hill-corner.glb", "hill-snow-hill-corner.glb"),
    ("corner-down", "corner", HILL_HEIGHT, "corner_down", "hill_snow_corner_down",
     "hill-corner-down.glb", "hill-snow-corner-down.glb"),
)
PIECES = BUMPS + CORNERS

MATERIALS = {
    "hill_grass": (0.275, 0.618, 0.275, 1.0),  # the meadow's 0x8fce8f, linear
    "hill_snow": (0.922, 0.947, 1.0, 1.0),  # the tunnel snow palette
}


def _smoothstep(u):
    return u * u * (3 - 2 * u)


def _lift_of(kind, crest, u):
    """Visual rail lift at climb progress u (smoothstep ease, hill precedent)."""
    if kind.endswith("-up"):
        return crest * _smoothstep(u)
    if kind.endswith("-down"):
        return crest * (1 - _smoothstep(u))
    return crest


def _smoothstep_solve(target):
    a, b = 0.0, 1.0
    for _ in range(40):
        m = (a + b) / 2
        if _smoothstep(m) < target:
            a = m
        else:
            b = m
    return (a + b) / 2


def _corner_u(x, y):
    """Arc progress of a model-space point: 0 at the north leg, 1 west."""
    ang = math.atan2(y - CORNER_PIVOT[1], x - CORNER_PIVOT[0])
    u = -ang / (math.pi / 2)
    return min(1.0, max(0.0, u))


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


def _import_kit_mesh(coll, path, root_name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    src_meshes = [o for o in set(bpy.data.objects) - before if o.type == "MESH"]
    src = src_meshes[0]
    me = src.data.copy()
    me.name = root_name + "_rails"
    # Bake the kit root's model-space offset into the copy (hill precedent).
    dz = src.matrix_world.translation.z
    dy = src.matrix_world.translation.y
    for ob in sorted((set(bpy.data.objects) - before), key=lambda o: o.name):
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if data and data.users == 0:
            bpy.data.meshes.remove(data)
    rails = bpy.data.objects.new(me.name, me)
    coll.objects.link(rails)
    return rails, me, dy, dz


def _rails_for(coll, kind, family, crest, root_name):
    """The kit's own rails + sleepers, warped onto the ride profile."""
    if family == "straight":
        rails, me, dy, dz = _import_kit_mesh(coll, STRAIGHT_GLB, root_name)
        for v in me.vertices:
            u = (v.co.y + dy - BED_Y0) / (BED_Y1 - BED_Y0)
            v.co.z += dz + _lift_of(kind, crest, u)
            v.co.y += dy
    else:
        rails, me, dy, dz = _import_kit_mesh(coll, CORNER_GLB, root_name)
        for v in me.vertices:
            u = _corner_u(v.co.x, v.co.y + dy)
            v.co.z += dz + _lift_of(kind, crest, u)
            v.co.y += dy
    return rails


def _ring_mound_row(bm, cx, cy, top, half_top, half_base):
    return [
        bm.verts.new((cx - half_base, cy, MOUND_BOTTOM_Z)),
        bm.verts.new((cx - half_top, cy, top)),
        bm.verts.new((cx + half_top, cy, top)),
        bm.verts.new((cx + half_base, cy, MOUND_BOTTOM_Z)),
    ]


def _close_loft(bm, first, prev):
    for a, b in ((first, True), (prev, False)):
        if b:
            bm.faces.new([a[3], a[2], a[1], a[0]])
        else:
            bm.faces.new([a[0], a[1], a[2], a[3]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)


def _mound_for(coll, kind, family, crest, root_name):
    """The grass body: straight embankment, or a banked ring-following bend."""
    bm = bmesh.new()
    first = None
    prev = None
    for i in range(MOUND_ROWS + 1):
        u = i / MOUND_ROWS
        if family == "straight":
            y = BED_Y0 + MOUND_INSET + u * (BED_Y1 - BED_Y0 - 2 * MOUND_INSET)
            top = MOUND_TOP_DZ + _lift_of(kind, crest, u)
            ring = _ring_mound_row(bm, 0.0, y, top, MOUND_TOP_HALF_W, MOUND_BASE_HALF_W)
        else:
            inset = MOUND_INSET / CORNER_RADIUS
            ang = -(inset + u * (math.pi / 2 - 2 * inset))
            cx = CORNER_PIVOT[0] + CORNER_RADIUS * math.cos(ang)
            cy = CORNER_PIVOT[1] + CORNER_RADIUS * math.sin(ang)
            # Radial frame: ring offsets run along the radius.
            rx, ry = math.cos(ang), math.sin(ang)
            top = MOUND_TOP_DZ + _lift_of(kind, crest, u)
            ring = [
                bm.verts.new((cx - rx * MOUND_BASE_HALF_W, cy - ry * MOUND_BASE_HALF_W, MOUND_BOTTOM_Z)),
                bm.verts.new((cx - rx * MOUND_TOP_HALF_W, cy - ry * MOUND_TOP_HALF_W, top)),
                bm.verts.new((cx + rx * MOUND_TOP_HALF_W, cy + ry * MOUND_TOP_HALF_W, top)),
                bm.verts.new((cx + rx * MOUND_BASE_HALF_W, cy + ry * MOUND_BASE_HALF_W, MOUND_BOTTOM_Z)),
            ]
        if prev:
            for j in range(4):
                bm.faces.new([prev[j], prev[(j + 1) % 4], ring[(j + 1) % 4], ring[j]])
        else:
            first = ring
        prev = ring
    _close_loft(bm, first, prev)
    return _link(coll, bm, root_name + "_mound", "hill_grass")


def _snow_range(kind):
    """Progress window where the lift is at least SNOW_FRAC of crest."""
    edge = _smoothstep_solve(SNOW_FRAC)
    if kind.endswith("-up"):
        return edge, 1.0
    if kind.endswith("-down"):
        return 0.0, 1.0 - edge
    return 0.0, 1.0


def _snow_for(coll, kind, family, crest, name):
    """A proud white blanket where the piece's own crest is high."""
    lo, hi = _snow_range(kind)
    span = BED_Y1 - BED_Y0
    lo += (SNOW_END_INSET / span) * (hi - lo)
    hi -= (SNOW_END_INSET / span) * (hi - lo)

    def z_top(u):
        return MOUND_TOP_DZ + _lift_of(kind, crest, u)

    bm = bmesh.new()
    first = None
    prev = None
    for i in range(SNOW_ROWS + 1):
        u = lo + (hi - lo) * i / SNOW_ROWS
        if family == "straight":
            y = BED_Y0 + u * span
            top = z_top(u)
            ring = [
                bm.verts.new((-SNOW_HALF_W, y, top - SNOW_BURY_DZ)),
                bm.verts.new((SNOW_HALF_W, y, top - SNOW_BURY_DZ)),
                bm.verts.new((SNOW_HALF_W, y, top + SNOW_PROUD_DZ)),
                bm.verts.new((-SNOW_HALF_W, y, top + SNOW_PROUD_DZ)),
            ]
        else:
            ang = -u * math.pi / 2
            cx = CORNER_PIVOT[0] + CORNER_RADIUS * math.cos(ang)
            cy = CORNER_PIVOT[1] + CORNER_RADIUS * math.sin(ang)
            rx, ry = math.cos(ang), math.sin(ang)
            # Tangent frame across, radial frame along: the blanket drapes
            # over the bank, inset from the rails.
            tx, ty = -ry, rx
            top = z_top(u)
            ring = [
                bm.verts.new((cx - tx * SNOW_HALF_W, cy - ty * SNOW_HALF_W, top - SNOW_BURY_DZ)),
                bm.verts.new((cx + tx * SNOW_HALF_W, cy + ty * SNOW_HALF_W, top - SNOW_BURY_DZ)),
                bm.verts.new((cx + tx * SNOW_HALF_W, cy + ty * SNOW_HALF_W, top + SNOW_PROUD_DZ)),
                bm.verts.new((cx - tx * SNOW_HALF_W, cy - ty * SNOW_HALF_W, top + SNOW_PROUD_DZ)),
            ]
        if prev:
            for j in range(4):
                bm.faces.new([prev[j], prev[(j + 1) % 4], ring[(j + 1) % 4], ring[j]])
        else:
            first = ring
        prev = ring
    _close_loft(bm, first, prev)
    return _link(coll, bm, name, "hill_snow")


def _phase2_collection():
    old = bpy.data.collections.get("HillsPhase2")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("HillsPhase2")
    bpy.context.scene.collection.children.link(coll)
    return coll


def build_all():
    """Recreate all six pieces and snow shells from scratch. Safe to re-run."""
    coll = _phase2_collection()
    for kind, family, crest, root, snow, _, _ in PIECES:
        _rails_for(coll, kind, family, crest, root)
        _mound_for(coll, kind, family, crest, root)
        _snow_for(coll, kind, family, crest, snow)
    print("built:", ", ".join(k for k, _, _, _, _, _, _ in PIECES))


def _setup_check_env():
    """Sun, ground, camera, and world for the render checks (hill recipe)."""
    cam = bpy.data.objects.get("Phase2CheckCam")
    if cam is None:
        cam = bpy.data.objects.new("Phase2CheckCam", bpy.data.cameras.new("Phase2CheckCam"))
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
    """Side profile of the bump run, three-quarter of the banked corners,
    and a winter view — per the house rules, verified from real renders."""
    import tempfile

    from mathutils import Vector

    cam = _setup_check_env()
    # Headless runs start from the factory startup file, whose default
    # Cube/Light/Camera photobomb the lineup (the Cube even hides piece 1).
    # Tuck anything outside our collection out of the render — hiding (not
    # deleting) keeps interactive artist sessions safe.
    coll_names = set()
    coll = bpy.data.collections.get("HillsPhase2")
    if coll is not None:
        coll_names = {ob.name for ob in coll.objects}
    for ob in bpy.data.objects:
        if ob.name not in coll_names and not ob.name.startswith(("check_", "Phase2Check")):
            ob.hide_render = True
    if coll is None:
        # Headless one-shot run: build first (console sessions build by hand).
        build_all()
        coll = bpy.data.collections.get("HillsPhase2")
    scene = bpy.context.scene

    # Lay the bump run out along +x, the corner run along +x a lane over.
    # Each piece's rails + mound (+ snow shell) share one slot.
    layout = {}
    bump_x, corner_x = 0.0, 0.0
    for kind, family, _, root, snow, _, _ in PIECES:
        if family == "corner":
            slot_x, slot_y, corner_x = corner_x, -6.0, corner_x + 4.2
        else:
            slot_x, slot_y, bump_x = bump_x, 0.0, bump_x + 4.2
        for name in (root + "_rails", root + "_mound", snow):
            ob = coll.objects[name]
            layout[ob.name] = ob.location.copy()
            ob.location.x = slot_x
            ob.location.y = slot_y

    # One piece per view, isolated: the shared hill_grass palette makes a
    # full lineup unreadable (every mound melts into the ground plane), and a
    # near neighbour otherwise steals the frame.
    views = (
        ("phase2_bump_side.png", (6.5, -2.0, 0.3), (0.0, -2.0, -0.55), 35.0, False,
         ("bump_up_rails", "bump_up_mound")),
        ("phase2_corner_quarter.png", (4.5, -11.5, 2.5), (-1.0, -7.2, -0.4), 35.0, False,
         ("corner_up_rails", "corner_up_mound")),
        ("phase2_winter.png", (9.7, -2.0, 0.3), (4.2, -2.0, -0.5), 35.0, True,
         ("bump_half_rails", "bump_half_mound", "hill_snow_bump_half")),
    )
    for fname, loc, target, lens, winter, isolate in views:
        for ob in coll.objects:
            ob.hide_render = ob.name not in isolate
        for _, _, _, _, snow, _, _ in PIECES:
            if snow not in isolate:
                coll.objects[snow].hide_render = True
        scene.camera = cam
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = 1000
        scene.render.resolution_y = 500
        scene.render.filepath = os.path.join(tempfile.gettempdir(), fname)
        bpy.ops.render.render(write_still=True)
        print("rendered:", scene.render.filepath)

    for _, _, _, root, _, _, _ in PIECES:
        for suffix in ("_rails", "_mound"):
            ob = coll.objects[root + suffix]
            ob.location = layout[ob.name]
    for ob in coll.objects:
        ob.hide_render = False


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
    print("exported:", filepath, os.path.getsize(filepath), "bytes")


def export_all():
    if bpy.data.collections.get("HillsPhase2") is None:
        build_all()
    for _, _, _, root, _, outfile, _ in PIECES:
        _export_selected(f"{KIT_DIR}/{outfile}", {root + "_rails", root + "_mound"})
    for _, _, _, _, snow, _, snowfile in PIECES:
        _export_selected(f"{KIT_DIR}/{snowfile}", {snow})


def verify_glbs():
    import json
    import struct

    for _, _, _, _, _, outfile, snowfile in PIECES:
        for path in (f"{KIT_DIR}/{outfile}", f"{KIT_DIR}/{snowfile}"):
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
    argv = sys.argv
    arg = argv[argv.index("--") + 1] if "--" in argv else "build"
    if arg == "build":
        build_all()
    elif arg == "renders":
        render_checks()
    elif arg == "export":
        export_all()
    elif arg == "verify":
        verify_glbs()
    elif arg == "all":
        build_all()
        export_all()
        verify_glbs()
