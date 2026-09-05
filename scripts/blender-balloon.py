"""Blender recipe: chunky toy hot-air balloon for the Tiny Tracks town tab.

Run headless from the repo root:
    blender --background --python scripts/blender-balloon.py

Authors z-up (Blender space); exports Y-up GLB via export_yup=True.

Node-name contract (each appears exactly once in balloon.glb; the scene
finds them with getObjectByName):
  balloon_basket   Named empty at the toy's ground anchor. The assembly
                   (basket, ropes, envelope, band) is parented to it; the
                   scene drives the wander state machine's transforms on
                   this node (landed <-> flying bob/sway), so its origin
                   MUST stay at ground centre.
  balloon_snow_cap White cap on the envelope top; scene hides it at load
                   and shows it when winter is active.

Static dressing: balloon_basket_box, balloon_rope_0..3, balloon_envelope,
balloon_band. Materials are flat Principled, double-sided.

Export target: public/assets/train-kit/balloon.glb, <= 150 KB.
"""

import math
import os
import struct
import tempfile

import bmesh
import bpy
from mathutils import Vector

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, "public", "assets", "train-kit")

GROUND_Z = -1.0  # meadow mat top, matching the kit convention

BASKET_HALF = (0.15, 0.15, 0.11)
ENVELOPE_R = 0.435
ENVELOPE_Z_SCALE = 1.15
ENVELOPE_CENTER_Z = 0.85  # local (relative to balloon_basket at GROUND_Z)

MATERIALS = {
    "balloon_cream": (0.95, 0.86, 0.68, 1.0),
    "balloon_orange": (0.95, 0.42, 0.06, 1.0),
    "balloon_brown": (0.42, 0.26, 0.15, 1.0),
    "balloon_snow": (0.94, 0.96, 0.93, 1.0),
}

ASSEMBLY = (
    "balloon_basket_box",
    "balloon_rope_0",
    "balloon_rope_1",
    "balloon_rope_2",
    "balloon_rope_3",
    "balloon_envelope",
    "balloon_band",
    "balloon_snow_cap",
    "balloon_basket",
)


def _material(name):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = MATERIALS[name]
        bsdf.inputs["Roughness"].default_value = 0.9
        mat.use_backface_culling = False
    return mat


def _mesh_object(coll, me, name, material, parent=None):
    obj = bpy.data.objects.new(name, me)
    obj.data.materials.append(_material(material))
    coll.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def _bm_to_mesh(bm, name):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def _sphere(coll, name, material, radius, location, scale=None, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=radius)
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material, parent=parent)
    obj.location = location
    if scale is not None:
        obj.scale = scale
    return obj


def _cylinder(coll, name, material, r0, r1, depth, location, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        segments=16,
        radius1=r0,
        radius2=r1,
        depth=depth,
    )
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material, parent=parent)
    obj.location = location
    return obj


def _box(coll, name, material, half, location, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= half[0] * 2
        v.co.y *= half[1] * 2
        v.co.z *= half[2] * 2
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material, parent=parent)
    obj.location = location
    return obj


def _balloon_collection():
    coll = bpy.data.collections.get("Balloon")
    if coll is None:
        coll = bpy.data.collections.new("Balloon")
        bpy.context.scene.collection.children.link(coll)
    for obj in list(coll.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    return coll


def build_balloon():
    coll = _balloon_collection()

    # Wander root: scene moves this node only.
    root = bpy.data.objects.new("balloon_basket", None)
    root.empty_display_size = 0.15
    root.location = (0.0, 0.0, GROUND_Z)
    coll.objects.link(root)

    # Wicker basket resting on the mat.
    _box(coll, "balloon_basket_box", "balloon_brown", BASKET_HALF,
         (0.0, 0.0, BASKET_HALF[2]), parent=root)

    # Four ropes from the basket rim up into the envelope.
    rim = 0.12
    rope_h = 0.2
    for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        _cylinder(coll, f"balloon_rope_{i}", "balloon_brown",
                  0.012, 0.012, rope_h,
                  (sx * rim, sy * rim, BASKET_HALF[2] + rope_h / 2),
                  parent=root)

    # Envelope: a plump teardrop with a cream band at its equator.
    _sphere(coll, "balloon_envelope", "balloon_orange", ENVELOPE_R,
            (0.0, 0.0, ENVELOPE_CENTER_Z),
            scale=(1.0, 1.0, ENVELOPE_Z_SCALE), parent=root)
    _cylinder(coll, "balloon_band", "balloon_cream",
              ENVELOPE_R + 0.015, ENVELOPE_R + 0.015, 0.11,
              (0.0, 0.0, ENVELOPE_CENTER_Z), parent=root)

    # Snow cap parked on the envelope's crown.
    _sphere(coll, "balloon_snow_cap", "balloon_snow", 0.13,
            (0.0, 0.0, ENVELOPE_CENTER_Z + ENVELOPE_R * ENVELOPE_Z_SCALE - 0.03),
            scale=(1.0, 1.0, 0.6), parent=root)

    print("built:", ", ".join(obj.name for obj in coll.objects))


def _setup_check_env():
    scene = bpy.context.scene
    for name in ("Cube", "Camera", "Light"):
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
    cam_data = bpy.data.cameras.new("check_cam")
    cam = bpy.data.objects.new("check_cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    sun_data = bpy.data.lights.new("check_sun", type="SUN")
    sun_data.energy = 2.0
    sun = bpy.data.objects.new("check_sun", sun_data)
    sun.rotation_euler = (math.radians(55), 0.0, math.radians(25))
    scene.collection.objects.link(sun)
    ground_mesh = bpy.data.meshes.new("check_ground")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=7.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ground_mesh)
    bm.free()
    ground = bpy.data.objects.new("check_ground", ground_mesh)
    ground.location = (0.0, 0.0, GROUND_Z - 0.02)
    scene.collection.objects.link(ground)
    # The app renders with three.js NeutralToneMapping; Blender's default
    # AgX washes flat toy colours out, so match with Standard.
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.75, 0.85, 1.0, 1.0)
    bg.inputs[1].default_value = 0.5
    scene.world = world
    return cam


def _import_loco():
    """Park the ride-scale locomotive beside the toy for the fit check."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(
        filepath=os.path.join(REPO, "public", "assets", "train-kit",
                              "train-locomotive-a.glb"))
    imported = [o for o in bpy.data.objects if o not in before]
    for obj in imported:
        obj.hide_render = True
    root = imported[0]
    root.scale = (root.scale.x * 1.6, root.scale.y * 1.6, root.scale.z * 1.6)
    root.location = (root.location.x + 1.4, root.location.y - 1.6,
                     root.location.z)
    return imported


def render_checks():
    scene = bpy.context.scene
    cam = _setup_check_env()
    print("check scene objects:", sorted(o.name for o in scene.objects))
    print("check camera:", scene.camera.name if scene.camera else None,
          tuple(round(v, 2) for v in cam.matrix_world.translation))
    print("check balloon objs:", [
        (o.name, o.hide_render, tuple(round(v, 2) for v in o.location))
        for o in bpy.data.collections["Balloon"].objects])

    def shoot(fname, loc, target, lens=60):
        cam.location = loc
        cam.data.lens = lens
        # Look direction = target minus camera; -Z tracks it.
        look = Vector(target) - cam.location
        cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(tempfile.gettempdir(), fname)
        scene.render.resolution_x = 900
        scene.render.resolution_y = 700
        bpy.ops.render.render(write_still=True)
        print("rendered:", scene.render.filepath)

    shoot("balloon_quarter.png", (-3.2, -4.2, 2.4), (0.0, 0.0, 0.2))
    shoot("balloon_top.png", (0.0, -0.2, 4.8), (0.0, 0.0, 0.5), lens=50)
    loco = _import_loco()
    for obj in loco:
        obj.hide_render = False  # unhide only for the fit shot
    shoot("balloon_fit.png", (-3.6, -4.8, 2.6), (0.8, -0.9, 0.3), lens=50)
    for obj in loco:
        bpy.data.objects.remove(obj, do_unlink=True)
    # Winter: snow-cap node stays put; nothing else changes.
    shoot("balloon_winter.png", (-3.2, -4.2, 2.4), (0.0, 0.0, 0.2))


def _export_selected(filepath, names):
    bpy.ops.object.select_all(action="DESELECT")
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj:
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
    )


def export_balloon():
    os.makedirs(OUT_DIR, exist_ok=True)
    filepath = os.path.join(OUT_DIR, "balloon.glb")
    _export_selected(filepath, ASSEMBLY)
    print("exported:", filepath, os.path.getsize(filepath), "bytes")


def verify_glb():
    filepath = os.path.join(OUT_DIR, "balloon.glb")
    with open(filepath, "rb") as fh:
        data = fh.read()
    chunk_len = struct.unpack_from("<I", data, 12)[0]
    json_text = data[20:20 + chunk_len].decode("utf-8")
    size_kb = len(data) / 1024
    print(f"{os.path.basename(filepath)} {len(data)} bytes "
          f"({size_kb:.1f} KB) | budget: 150 KB")
    names = []
    for needle in ('"name":"', '"name": "'):
        start = 0
        while True:
            at = json_text.find(needle, start)
            if at < 0:
                break
            end = json_text.find('"', at + len(needle))
            names.append(json_text[at + len(needle):end])
            start = end + 1
    print("nodes+materials:", sorted(set(names)))
    for required in ("balloon_basket", "balloon_snow_cap"):
        status = "ok" if required in names else "MISSING"
        print(f"contract {required}: {status}")


if __name__ == "__main__":
    build_balloon()
    render_checks()
    export_balloon()
    verify_glb()
