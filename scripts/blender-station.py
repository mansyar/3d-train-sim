"""Build the Tiny Tracks station GLBs (deterministic, re-runnable).

The station asset source lives only in a live Blender session, so this script
is the authoritative recipe: run it inside any Blender session to recreate
and export the assets identically.

Usage inside Blender's Python console (or via an MCP bridge):

    exec(open(r"<repo>/scripts/blender-station.py", encoding="utf-8").read())
    build_station()      # (re)create the station_* objects + cargo_crate
    render_checks()      # optional: render three-quarter / deck / side views
    export_station()     # write public/assets/train-kit/station.glb
    export_crate()       # write public/assets/train-kit/crate.glb
    verify_glb()         # print the exported node/material names

Coordinate convention (matches scenery mounting in track-renderer.ts):
scenery models mount with scale = CELL_SIZE * sceneryScale(station) = 3.75 *
0.7, origin at the cell centre, y=0 on the ground (+0.02 lift). Author in
"scenery units" (1 unit = one mounted unit): the old Kenney station measured
~2.0 wide x 2.4 deep x 1.6 tall, so this rebuild matches that presence.
Blender z is up; export_yup turns it into glTF y. Base sits at z = 0.

Layout: cream building with a pitched terracotta roof at the back, wooden
cargo deck in front under a post canopy, and eight named crate slots
(station_crate_1..8) in a 2x4 grid on the deck. The crate slots are the
delivery counter: the renderer toggles slot visibility from the station's
persisted delivered count. cargo_crate is the wagon-load crate, exported
separately so every wagon can carry one.
"""

import math

import bmesh
import bpy
from mathutils import Vector

REPO = r"D:/Projects/3d-train-sim"
STATION_PATH = REPO + "/public/assets/train-kit/station.glb"
CRATE_PATH = REPO + "/public/assets/train-kit/crate.glb"

# Footprint (scenery units, origin at cell centre, z = 0 on the ground).
BUILDING = (-0.55, 0.55, -1.10, -0.25, 0.0, 0.85)  # x0,x1, y0,y1, z0,z1
ROOF_RIDGE_Z = 1.45
ROOF_EAVE_X = 0.68
ROOF_EAVE_Y0, ROOF_EAVE_Y1 = -1.25, -0.10
DOOR = (-0.12, 0.12, -0.25, -0.19, 0.0, 0.50)  # proud of the front wall
WINDOWS = ((-0.42, -0.28), (0.28, 0.42))  # x spans on the front wall
WINDOW_Y = (-0.25, -0.19)
WINDOW_Z = (0.45, 0.65)
DECK = (-0.90, 0.90, 0.05, 0.95, 0.0, 0.18)
# Canopy: thin sloping slab from the building wall out over the deck.
CANOPY_X = 0.95
CANOPY_Y0, CANOPY_Y1 = -0.19, 1.00
CANOPY_Z_BACK, CANOPY_Z_FRONT = 1.18, 1.02
CANOPY_THICK = 0.07
CANOPY_POSTS = (-0.85, 0.85)  # x of the two posts, at the deck's front edge
POST_Y = (0.82, 0.90)

CRATE = 0.30  # cube side, deck slots
CRATE_LID = 0.04  # lid lip overhang and thickness
CRATE_XS = (-0.615, -0.205, 0.205, 0.615)
CRATE_YS = (0.28, 0.70)  # two rows on the deck
CRATE_NAMES = tuple(f"station_crate_{i}" for i in range(1, 9))

STATION_NAMES = (
    "station_body",
    "station_roof",
    "station_door",
    "station_windows",
    "station_platform",
    "station_canopy",
    "station_canopy_posts",
) + CRATE_NAMES

MATERIALS = {
    "station_cream": (0.960, 0.930, 0.850, 1.0),
    "station_roof": (0.780, 0.300, 0.220, 1.0),
    "station_trim": (0.250, 0.180, 0.140, 1.0),
    "station_wood": (0.550, 0.380, 0.240, 1.0),
    "station_crate": (0.920, 0.580, 0.220, 1.0),
    "crate_wood": (0.920, 0.580, 0.220, 1.0),
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


def _link(bm, name, materials):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    for mat in materials:
        me.materials.append(_material(mat))
    return obj


def _box_verts(bm, x0, x1, y0, y1, z0, z1):
    pts = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    vs = [bm.verts.new(p) for p in pts]
    # vert index = x*4 + y*2 + z over the (x0,x1)(y0,y1)(z0,z1) ordering above
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 2, 6, 4), (1, 5, 7, 3), (0, 4, 5, 1), (2, 3, 7, 6)):
        bm.faces.new([vs[i] for i in q])


def _box(name, span, material):
    bm = bmesh.new()
    _box_verts(bm, *span)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(bm, name, [material])


def _prism_yz(name, prof, x0, x1, materials):
    """Closed prism: a (y, z) profile extruded along x, end caps closed."""
    bm = bmesh.new()
    ring0 = [bm.verts.new((x0, py, pz)) for py, pz in prof]
    ring1 = [bm.verts.new((x1, py, pz)) for py, pz in prof]
    n = len(prof)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([ring0[i], ring0[j], ring1[j], ring1[i]])
    bm.faces.new(ring0[::-1])
    bm.faces.new(ring1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(bm, name, materials)


def _roof():
    """Pitched roof: a triangle profile from eave to eave over the wall tops."""
    wall_top = BUILDING[5]
    prof = [
        (ROOF_EAVE_Y0, wall_top),
        (ROOF_EAVE_Y1, wall_top),
        ((ROOF_EAVE_Y0 + ROOF_EAVE_Y1) / 2, ROOF_RIDGE_Z),
    ]
    return _prism_yz(
        "station_roof", prof, -ROOF_EAVE_X, ROOF_EAVE_X, ["station_roof"]
    )


def _windows():
    bm = bmesh.new()
    for x0, x1 in WINDOWS:
        _box_verts(bm, x0, x1, WINDOW_Y[0], WINDOW_Y[1], WINDOW_Z[0], WINDOW_Z[1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(bm, "station_windows", ["station_trim"])


def _canopy():
    """Awning: a thin slab sloping down from the wall, posts at the deck edge."""
    prof = [
        (CANOPY_Y0, CANOPY_Z_BACK),
        (CANOPY_Y1, CANOPY_Z_FRONT),
        (CANOPY_Y1, CANOPY_Z_FRONT - CANOPY_THICK),
        (CANOPY_Y0, CANOPY_Z_BACK - CANOPY_THICK),
    ]
    canopy = _prism_yz(
        "station_canopy", prof, -CANOPY_X, CANOPY_X, ["station_roof"]
    )
    bm = bmesh.new()
    for px in CANOPY_POSTS:
        _box_verts(bm, px - 0.04, px + 0.04, POST_Y[0], POST_Y[1], DECK[5], CANOPY_Z_FRONT)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    posts = _link(bm, "station_canopy_posts", ["station_trim"])
    return canopy, posts


def _crate_bm(bm, x, y, z0, side, lid):
    """One crate: body box plus a proud lid lip, base at z0."""
    half = side / 2
    _box_verts(bm, x - half, x + half, y - half, y + half, z0, z0 + side * 0.82)
    _box_verts(
        bm,
        x - half - lid,
        x + half + lid,
        y - half - lid,
        y + half + lid,
        z0 + side * 0.82,
        z0 + side * 0.82 + lid * 1.5,
    )


def _crate(name, x, y):
    bm = bmesh.new()
    _crate_bm(bm, x, y, DECK[5], CRATE, CRATE_LID)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(bm, name, ["station_crate"])


def build_station():
    """Recreate the station and cargo crate from scratch. Safe to re-run."""
    cube = bpy.data.objects.get("Cube")
    if cube and len(bpy.data.objects) <= 4:
        bpy.data.objects.remove(cube, do_unlink=True)
    for name in STATION_NAMES + ("cargo_crate",):
        obj = bpy.data.objects.get(name)
        if obj:
            me = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if me:
                bpy.data.meshes.remove(me)

    _box("station_body", BUILDING, "station_cream")
    _roof()
    _box("station_door", DOOR, "station_trim")
    _windows()
    _box("station_platform", DECK, "station_wood")
    _canopy()
    slots = [(x, y) for y in CRATE_YS for x in CRATE_XS]
    for name, (x, y) in zip(CRATE_NAMES, slots):
        _crate(name, x, y)

    bm = bmesh.new()
    _crate_bm(bm, 0.0, 0.0, 0.0, CRATE * 1.1, CRATE_LID * 1.1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _link(bm, "cargo_crate", ["crate_wood"])
    print("built:", ", ".join(STATION_NAMES + ("cargo_crate",)))


def _ensure_check_rig():
    cam = bpy.data.objects.get("StationCam")
    if cam is None:
        cam = bpy.data.objects.new("StationCam", bpy.data.cameras.new("StationCam"))
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
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=12)
        for v in bm.verts:
            v.co.z -= 0.02
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ground = _link(bm, "check_ground", ["station_cream"])
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.75, 0.85, 1.0, 1.0)
    bg.inputs[1].default_value = 0.7
    return cam


def render_checks():
    cam = _ensure_check_rig()
    scene = bpy.context.scene
    scene.camera = cam
    # The session may still hold the tunnel check scene — hide everything
    # that is not part of this recipe so the station renders alone.
    for obj in bpy.data.objects:
        if obj.name not in STATION_NAMES + ("cargo_crate",):
            obj.hide_render = True
    views = (
        ("station_quarter.png", (4.4, 4.6, 3.0), (0.0, -0.1, 0.6), 45.0),
        ("station_deck.png", (0.0, 4.6, 2.2), (0.0, 0.4, 0.35), 40.0),
        ("station_side.png", (5.6, -0.4, 1.6), (0.0, -0.1, 0.6), 45.0),
    )
    import os
    import tempfile

    for fname, loc, target, lens in views:
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = 900
        scene.render.resolution_y = 600
        scene.render.filepath = os.path.join(tempfile.gettempdir(), fname)
        bpy.ops.render.render(write_still=True)
        print("rendered:", scene.render.filepath)


def _export(path, names, active):
    for obj in bpy.data.objects:
        obj.select_set(obj.name in names)
    bpy.context.view_layer.objects.active = bpy.data.objects[active]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
    )
    import os

    print("exported:", path, os.path.getsize(path), "bytes")


def export_station():
    _export(STATION_PATH, STATION_NAMES, "station_body")


def export_crate():
    _export(CRATE_PATH, ("cargo_crate",), "cargo_crate")


def _verify(path):
    import json
    import os
    import struct

    with open(path, "rb") as fh:
        data = fh.read()
    chunk_len = struct.unpack_from("<I", data, 12)[0]
    js = json.loads(data[20 : 20 + chunk_len])
    print(path)
    print("  size:", os.path.getsize(path))
    print("  nodes:", sorted(n["name"] for n in js.get("nodes", [])))
    print("  materials:", sorted(m["name"] for m in js.get("materials", [])))
    print("  meshes:", len(js.get("meshes", [])))


def verify_glb():
    _verify(STATION_PATH)
    _verify(CRATE_PATH)
