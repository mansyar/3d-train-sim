"""Build the Tiny Tracks carousel GLB (deterministic, re-runnable).

Scenery-delight toy #2: a merry-go-round whose canopy and horses turn.
Authored on the scenery mount (1 unit ~= 1 meadow cell, mat top at
z = -1), z-up, exported with export_yup.

Node-name contract (runtime finds these via getObjectByName; each appears
exactly once in the GLB — renaming any of them is a breaking change):
- carousel_spin      empty at the platform centre (platform-top height);
                     the scene spins it about local +z ~0.25 rev/s
- carousel_snow_cap  white blanket over the canopy; scene hides at load,
                     shows when the meadow freezes

Static dressing: carousel_base, carousel_rim, carousel_column. The spin
group carries carousel_canopy, carousel_knob, carousel_pole_0..5 and
carousel_horse_0..2 (+ carousel_saddle_0..2).

Usage headless:

    blender --background --python scripts/blender-carousel.py

or from a Blender session's Python console:

    exec(open(r"<repo>/scripts/blender-carousel.py", encoding="utf-8").read())
    build_carousel()    # (re)create the carousel from scratch
    render_checks()     # top / quarter / side-by-side fit / winter stills
    export_carousel()   # write public/assets/train-kit/carousel.glb
    verify_glb()        # print exported node/material names + size
"""

import bmesh
import bpy
import math
import os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT_DIR = REPO + "/public/assets/train-kit"

GROUND_Z = -1.0
PLATFORM_R = 0.55
PLATFORM_H = 0.12
CANOPY_R = 0.7
CANOPY_H = 0.4
POLE_R = 0.018
POLE_COUNT = 6
HORSE_COUNT = 3
HORSE_R = 0.4  # horses orbit at this radius, between the poles

PLATFORM_TOP = GROUND_Z + PLATFORM_H  # -0.88
CANOPY_TOP = GROUND_Z + 1.35  # toy-scale ceiling from the measurement table

MATERIALS = {
    "carousel_cream": (0.95, 0.86, 0.68, 1.0),
    "carousel_red": (0.78, 0.18, 0.1, 1.0),
    "carousel_orange": (1.0, 0.62, 0.11, 1.0),
    "carousel_steel": (0.55, 0.6, 0.68, 1.0),
    "carousel_snow": (0.94, 0.96, 0.93, 1.0),
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


def _mesh_object(coll, me, name, material=None):
    obj = bpy.data.objects.new(name, me)
    coll.objects.link(obj)
    if material:
        me.materials.clear()
        me.materials.append(_material(material))
    return obj


def _bm_to_mesh(bm, name):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def _cone(coll, name, material, radius1, radius2, depth, location, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, segments=24,
        radius1=radius1, radius2=radius2, depth=depth,
    )
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material)
    obj.location = location
    if parent is not None:
        obj.parent = parent
    return obj


def _sphere(coll, name, material, radius, location, scale=(1.0, 1.0, 1.0), parent=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=radius)
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material)
    obj.location = location
    obj.scale = scale
    if parent is not None:
        obj.parent = parent
    return obj


def _box(coll, name, material, half, location, rotation=(0.0, 0.0, 0.0), parent=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= half[0] * 2
        v.co.y *= half[1] * 2
        v.co.z *= half[2] * 2
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material)
    obj.location = location
    obj.rotation_euler = rotation
    if parent is not None:
        obj.parent = parent
    return obj


def _carousel_collection():
    old = bpy.data.collections.get("Carousel")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("Carousel")
    bpy.context.scene.collection.children.link(coll)
    return coll


def _horse(coll, index, angle, parent=None):
    """A chunky toy horse facing counter-clockwise around the orbit."""
    cx = math.cos(angle) * HORSE_R
    cy = math.sin(angle) * HORSE_R
    yaw = angle + math.pi / 2  # tangent-facing
    body = _sphere(coll, f"carousel_horse_{index}", "carousel_cream", 0.09,
                   (cx, cy, 0.16), scale=(1.4, 0.7, 1.0),
                   parent=parent)
    body.rotation_euler = (0.0, 0.0, yaw)
    # Head: a small box at the front, plus a saddle blanket on top.
    hx = cx + math.cos(yaw) * 0.13
    hy = cy + math.sin(yaw) * 0.13
    _box(coll, f"carousel_horse_{index}_head", "carousel_cream",
         (0.045, 0.035, 0.055), (hx, hy, 0.26),
         rotation=(0.0, 0.0, yaw), parent=parent)
    _box(coll, f"carousel_saddle_{index}", "carousel_orange",
         (0.05, 0.06, 0.025), (cx, cy, 0.24),
         rotation=(0.0, 0.0, yaw), parent=parent)


def build_carousel():
    """Recreate the carousel from scratch. Safe to re-run."""
    coll = _carousel_collection()

    # Static: cream platform, red candy rim, centre column.
    _cone(coll, "carousel_base", "carousel_cream",
          PLATFORM_R, PLATFORM_R, PLATFORM_H, (0.0, 0.0, GROUND_Z + PLATFORM_H / 2))
    _cone(coll, "carousel_rim", "carousel_red",
          PLATFORM_R, PLATFORM_R, 0.05, (0.0, 0.0, PLATFORM_TOP - 0.025))
    column_top = CANOPY_TOP - CANOPY_H / 2
    _cone(coll, "carousel_column", "carousel_steel",
          0.05, 0.05, column_top - PLATFORM_TOP,
          (0.0, 0.0, (PLATFORM_TOP + column_top) / 2))

    # The spinner: named empty at platform centre carrying canopy + poles +
    # horses. The scene turns it about local +z. NOTE: children are positioned
    # in the empty's LOCAL space (z measured up from PLATFORM_TOP).
    spin = bpy.data.objects.new("carousel_spin", None)
    spin.empty_display_size = 0.15
    spin.location = (0.0, 0.0, PLATFORM_TOP)
    coll.objects.link(spin)

    _cone(coll, "carousel_canopy", "carousel_red",
          CANOPY_R, 0.1, CANOPY_H,
          (0.0, 0.0, CANOPY_TOP - PLATFORM_TOP - CANOPY_H / 2), parent=spin)
    _sphere(coll, "carousel_knob", "carousel_orange", 0.07,
            (0.0, 0.0, CANOPY_TOP - PLATFORM_TOP + 0.05), parent=spin)
    for i in range(POLE_COUNT):
        angle = i * 2 * math.pi / POLE_COUNT
        px = math.cos(angle) * (CANOPY_R - 0.14)
        py = math.sin(angle) * (CANOPY_R - 0.14)
        _cone(coll, f"carousel_pole_{i}", "carousel_steel",
              POLE_R, POLE_R, 0.8,
              (px, py, 0.4), parent=spin)
    for i in range(HORSE_COUNT):
        angle = (i + 0.5) * 2 * math.pi / POLE_COUNT
        _horse(coll, i, angle, spin)

    # Winter tell: snow blanket over the canopy (scene hides it at load).
    _cone(coll, "carousel_snow_cap", "carousel_snow",
          CANOPY_R + 0.05, 0.12, CANOPY_H + 0.04,
          (0.0, 0.0, CANOPY_TOP - CANOPY_H / 2))

    print("built: carousel_base, carousel_rim, carousel_column, carousel_spin "
          "(+ canopy, knob, 6 poles, 3 horses), carousel_snow_cap")


def _setup_check_env():
    """Sun, ground, camera, and world for the render checks (house rules,
    windmill-accepted settings: Standard transform, sun 2.0)."""
    for name in ("Cube", "Camera", "Light"):
        ob = bpy.data.objects.get(name)
        if ob:
            data = getattr(ob, "data", None)
            bpy.data.objects.remove(ob, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    cam = bpy.data.objects.get("CarouselCheckCam")
    if cam is None:
        cam = bpy.data.objects.new("CarouselCheckCam", bpy.data.cameras.new("CarouselCheckCam"))
        bpy.context.collection.objects.link(cam)
    sun = bpy.data.objects.get("check_sun")
    if sun is None:
        sun = bpy.data.objects.new("check_sun", bpy.data.lights.new("check_sun", "SUN"))
        bpy.context.collection.objects.link(sun)
        sun.data.energy = 2.0
        sun.rotation_euler = (math.radians(55), 0, math.radians(25))
    ground = bpy.data.objects.get("check_ground")
    if ground is None:
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=14)
        for v in bm.verts:
            v.co.z += GROUND_Z - 0.02
        me = _bm_to_mesh(bm, "check_ground")
        ground = _mesh_object(bpy.context.collection, me, "check_ground")
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.75, 0.85, 1.0, 1.0)
    bg.inputs[1].default_value = 0.5
    # Match the app's tone response (see blender-windmill.py note).
    bpy.context.scene.view_settings.view_transform = "Standard"
    return cam


def _import_loco():
    """The kit locomotive at ride scale x1.6 for the side-by-side fit render."""
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.gltf(filepath=KIT_DIR + "/train-locomotive-a.glb")
    except Exception:
        return None
    roots = [o for o in set(bpy.data.objects) - before
             if o.parent is None or o.parent not in set(bpy.data.objects) - before]
    root = roots[0]
    root.scale = (1.6, 1.6, 1.6)
    for ob in set(bpy.data.objects) - before:
        ob.hide_render = True
    return root


def render_checks():
    """Top, three-quarter, side-by-side fit (loco at ride scale), winter."""
    import tempfile

    from mathutils import Vector

    cam = _setup_check_env()
    coll = bpy.data.collections.get("Carousel")
    scene = bpy.context.scene
    scene.camera = cam
    spin = coll.objects["carousel_spin"]
    snow = coll.objects["carousel_snow_cap"]
    loco = _import_loco()

    def shoot(fname, loc, target, lens, turn=0.0, winter=False, loco_at=None):
        spin.rotation_euler = (0.0, 0.0, turn)
        snow.hide_render = not winter
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

    shoot("carousel_top.png", (0.0, 0.0, 9.0), (0.0, 0.0, -1.0), 50.0)
    shoot("carousel_quarter.png", (-5.0, -5.5, 2.8), (0.2, 0.2, -0.5), 45.0, turn=0.6)
    # Side-by-side fit: locomotive (ride x1.6) on the neighboring cell.
    shoot("carousel_fit.png", (4.2, -5.5, 2.2), (0.9, -0.4, -0.5), 40.0,
          turn=0.6, loco_at=(2.2, -1.0, -1.0))
    shoot("carousel_winter.png", (-5.0, -5.5, 2.8), (0.2, 0.2, -0.3), 45.0, winter=True)
    if loco is not None:
        for ob in list(loco.children_recursive) + [loco]:
            bpy.data.objects.remove(ob, do_unlink=True)


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


def export_carousel():
    names = {"carousel_base", "carousel_rim", "carousel_column", "carousel_spin",
             "carousel_canopy", "carousel_knob", "carousel_snow_cap"}
    for i in range(POLE_COUNT):
        names.add(f"carousel_pole_{i}")
    for i in range(HORSE_COUNT):
        names.add(f"carousel_horse_{i}")
        names.add(f"carousel_horse_{i}_head")
        names.add(f"carousel_saddle_{i}")
    _export_selected(f"{KIT_DIR}/carousel.glb", names)


def verify_glb():
    import json
    import struct

    path = f"{KIT_DIR}/carousel.glb"
    with open(path, "rb") as fh:
        data = fh.read()
    chunk_len = struct.unpack_from("<I", data, 12)[0]
    js = json.loads(data[20: 20 + chunk_len])
    print(
        os.path.basename(path),
        os.path.getsize(path),
        "bytes | nodes:",
        sorted(n["name"] for n in js.get("nodes", [])),
        "| materials:",
        sorted(m["name"] for m in js.get("materials", [])),
    )


if __name__ == "__main__":
    build_carousel()
    render_checks()
    export_carousel()
    verify_glb()
