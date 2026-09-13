"""Blender recipe: chunky wooden music box for the Tiny Tracks town tab.

Run headless from the repo root:
    blender --background --python scripts/blender-music-box.py

Authors z-up (Blender space); exports Y-up GLB via export_yup=True.

Node-name contract (each appears exactly once in music-box.glb; the scene
finds them with getObjectByName):
  musicbox_figure    Named empty at the figurine's base on the lid. The
                     figurine parts are parented to it; the scene eases a
                     twirl about the vertical axis on this node, so its
                     origin MUST stay at the figure's base centre.
  musicbox_snow_cap  White blanket resting on the lid; scene hides it at
                     load and shows it when winter is active.

Static dressing: musicbox_body, musicbox_lid, musicbox_clasp,
musicbox_crank_axle, musicbox_crank_arm, musicbox_crank_handle,
musicbox_figure_dress, musicbox_figure_head, musicbox_figure_hat.
Materials are flat Principled, double-sided.

Export target: public/assets/train-kit/music-box.glb, <= 150 KB.
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

BODY_HALF = (0.34, 0.28, 0.30)
BODY_CZ = GROUND_Z + BODY_HALF[2]  # -0.70
BODY_TOP = BODY_CZ + BODY_HALF[2]  # -0.40

LID_HALF = (0.37, 0.31, 0.06)
LID_CZ = BODY_TOP + LID_HALF[2]  # -0.34
LID_TOP = LID_CZ + LID_HALF[2]  # -0.28

FIGURE_BASE_Z = LID_TOP  # figure empty origin

MATERIALS = {
    "musicbox_wood": (0.42, 0.26, 0.15, 1.0),
    "musicbox_cream": (0.95, 0.86, 0.68, 1.0),
    "musicbox_gold": (0.85, 0.65, 0.20, 1.0),
    "musicbox_red": (0.78, 0.18, 0.10, 1.0),
    "musicbox_snow": (0.94, 0.96, 0.93, 1.0),
}

ASSEMBLY = (
    "musicbox_body",
    "musicbox_lid",
    "musicbox_clasp",
    "musicbox_crank_axle",
    "musicbox_crank_arm",
    "musicbox_crank_handle",
    "musicbox_figure_dress",
    "musicbox_figure_head",
    "musicbox_figure_hat",
    "musicbox_figure",
    "musicbox_snow_cap",
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


def _cylinder(coll, name, material, r0, r1, depth, location, parent=None,
              rotation=None):
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
    if rotation is not None:
        obj.rotation_euler = rotation
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


def _musicbox_collection():
    coll = bpy.data.collections.get("MusicBox")
    if coll is None:
        coll = bpy.data.collections.new("MusicBox")
        bpy.context.scene.collection.children.link(coll)
    for obj in list(coll.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    return coll


def build_music_box():
    coll = _musicbox_collection()

    # Wooden chest body resting on the mat.
    _box(coll, "musicbox_body", "musicbox_wood", BODY_HALF,
         (0.0, 0.0, BODY_CZ))

    # Cream lid, a chunky slab overhanging the body just a touch.
    _box(coll, "musicbox_lid", "musicbox_cream", LID_HALF,
         (0.0, 0.0, LID_CZ))

    # Gold clasp straddling the lid seam on the front face.
    _box(coll, "musicbox_clasp", "musicbox_gold", (0.05, 0.02, 0.06),
         (0.0, -0.30, -0.44))

    # Winding crank on the right side: axle, vertical arm, grip.
    axle_z = -0.62
    _cylinder(coll, "musicbox_crank_axle", "musicbox_gold",
              0.025, 0.025, 0.14, (0.41, 0.0, axle_z),
              rotation=(0.0, math.radians(90.0), 0.0))
    _box(coll, "musicbox_crank_arm", "musicbox_gold", (0.024, 0.024, 0.085),
         (0.49, 0.0, -0.53))
    _cylinder(coll, "musicbox_crank_handle", "musicbox_gold",
              0.03, 0.03, 0.06, (0.525, 0.0, -0.44),
              rotation=(0.0, math.radians(90.0), 0.0))

    # Twirling figurine: empty anchor at the lid top centre; the scene
    # eases rotation on this node, so children stay in local space.
    figure = bpy.data.objects.new("musicbox_figure", None)
    figure.empty_display_size = 0.08
    figure.location = (0.0, 0.0, FIGURE_BASE_Z)
    coll.objects.link(figure)

    _cylinder(coll, "musicbox_figure_dress", "musicbox_red",
              0.095, 0.05, 0.20, (0.0, 0.0, 0.10), parent=figure)
    _sphere(coll, "musicbox_figure_head", "musicbox_cream", 0.065,
            (0.0, 0.0, 0.245), scale=(1.0, 1.0, 1.05), parent=figure)
    _cylinder(coll, "musicbox_figure_hat", "musicbox_gold",
              0.05, 0.015, 0.07, (0.0, 0.0, 0.335), parent=figure)

    # Snow blanket resting on the lid around the figure.
    _sphere(coll, "musicbox_snow_cap", "musicbox_snow", 0.27,
            (0.0, 0.0, LID_TOP + 0.02), scale=(1.05, 0.90, 0.30))

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


def _import_glb(filename, offset=(0.0, 0.0, 0.0)):
    """Import an accepted piece and park it on the mat beside the new one."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(
        filepath=os.path.join(REPO, "public", "assets", "train-kit", filename))
    imported = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in imported if o.parent is None]
    print("imported", filename, "roots:", sorted(r.name for r in roots),
          "objs:", sorted(o.name for o in imported))
    for root in roots:
        root.location = (root.location.x + offset[0],
                         root.location.y + offset[1],
                         root.location.z + offset[2])
    return imported


def _import_loco():
    """Park the ride-scale locomotive beside the toy for the fit check."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(
        filepath=os.path.join(REPO, "public", "assets", "train-kit",
                              "train-locomotive-a.glb"))
    imported = [o for o in bpy.data.objects if o not in before]
    for obj in imported:
        obj.hide_render = True
    roots = [o for o in imported if o.parent is None]
    root = roots[0] if roots else imported[0]
    print("imported loco root:", root.name,
          "objs:", sorted(o.name for o in imported))
    root.scale = (root.scale.x * 1.6, root.scale.y * 1.6, root.scale.z * 1.6)
    root.location = (root.location.x + 1.9, root.location.y - 1.9,
                     root.location.z - 0.9)
    return imported


def render_checks():
    scene = bpy.context.scene
    cam = _setup_check_env()
    print("check scene objects:", sorted(o.name for o in scene.objects))
    print("check camera:", scene.camera.name if scene.camera else None,
          tuple(round(v, 2) for v in cam.matrix_world.translation))
    print("check musicbox objs:", [
        (o.name, o.hide_render, tuple(round(v, 2) for v in o.location))
        for o in bpy.data.collections["MusicBox"].objects])

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

    shoot("musicbox_quarter.png", (-2.4, -3.2, 1.5), (0.0, 0.0, -0.40))
    # Summer look: the scene hides the snow cap outside winter.
    cap = bpy.data.objects["musicbox_snow_cap"]
    cap.hide_render = True
    shoot("musicbox_figure.png", (1.9, -2.4, 0.8), (0.0, 0.0, -0.40), lens=70)
    cap.hide_render = False
    shoot("musicbox_top.png", (0.0, -0.2, 3.4), (0.0, 0.0, -0.40), lens=50)
    loco = _import_loco()
    print("loco objects:", sorted(o.name for o in loco))
    for obj in loco:
        obj.hide_render = False  # unhide only for the fit shot
    shoot("musicbox_fit.png", (-5.2, -6.4, 3.0), (0.9, -0.9, 0.0), lens=45)
    # Winter: snow-cap close-up around the figure.
    shoot("musicbox_winter.png", (-2.0, -2.8, 0.9), (0.0, 0.0, -0.35), lens=65)
    for obj in loco:
        bpy.data.objects.remove(obj, do_unlink=True)

    # Style gate: family lineup beside accepted town toys.
    neighbors = _import_glb("balloon.glb", (-1.8, -0.3, 0.0))
    neighbors += _import_glb("carousel.glb", (2.4, -0.1, 0.0))
    shoot("musicbox_lineup.png", (-3.4, -4.2, 1.5), (0.1, -0.5, -0.35),
          lens=38)
    box = [o for o in bpy.data.objects if o.name.startswith("musicbox_")]
    for obj in box:
        obj.hide_render = True
    shoot("musicbox_lineup_none.png", (-3.4, -4.2, 1.5), (0.1, -0.5, -0.35),
          lens=38)
    for obj in box:
        obj.hide_render = False
    for obj in neighbors:
        bpy.data.objects.remove(obj, do_unlink=True)


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


def export_music_box():
    os.makedirs(OUT_DIR, exist_ok=True)
    filepath = os.path.join(OUT_DIR, "music-box.glb")
    _export_selected(filepath, ASSEMBLY)
    print("exported:", filepath, os.path.getsize(filepath), "bytes")


def verify_glb():
    filepath = os.path.join(OUT_DIR, "music-box.glb")
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
    for required in ("musicbox_figure", "musicbox_snow_cap"):
        status = "ok" if required in names else "MISSING"
        print(f"contract {required}: {status}")


if __name__ == "__main__":
    build_music_box()
    render_checks()
    export_music_box()
    verify_glb()
