"""Build the Tiny Tracks carousel GLB (deterministic, re-runnable).

Scenery-delight toy #2: a merry-go-round whose canopy and horses turn.
Authored on the scenery mount (1 unit ~= 1 meadow cell, mat top at
z = -1), z-up, exported with export_yup.

Node-name contract (runtime finds these via getObjectByName; each appears
exactly once in the GLB — renaming any of them is a breaking change):
- carousel_spin      empty at the platform centre (platform-top height);
                     the scene spins it about local +z ~0.125 rev/s
- carousel_snow_cap  white blanket over the canopy; scene hides at load,
                     shows when the meadow freezes

Static dressing: carousel_base, carousel_rim, carousel_column. The spin
group carries carousel_canopy, carousel_knob, carousel_valance,
carousel_pole_0..5 and carousel_horse_0..2 (each horse is one mesh:
rounded body, four grounded legs, neck, head with muzzle and ears, mane,
tail and an orange saddle).

Polish pass (delight-toys-polish_20260913): horses rebuilt so they read
unmistakably as horses (still chunky primitives), scalloped cream valance
hung under the canopy rim, smoother shells (more segments + smooth
shading), neater knob/poles, per-material finish. Flat palette unchanged.

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
from mathutils import Matrix

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

# Polish-pass constants (smoother shells, scalloped valance).
BASE_SEGMENTS = 40
CANOPY_SEGMENTS = 40
SNOW_SEGMENTS = 40
VALANCE_SCALLOPS = 12

MATERIALS = {
    "carousel_cream": ((0.95, 0.86, 0.68, 1.0), 0.95),
    "carousel_red": ((0.78, 0.18, 0.1, 1.0), 0.8),
    "carousel_orange": ((1.0, 0.62, 0.11, 1.0), 0.75),
    "carousel_steel": ((0.55, 0.6, 0.68, 1.0), 0.5),
    "carousel_snow": ((0.94, 0.96, 0.93, 1.0), 0.9),
}


def _material(name):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        color, roughness = MATERIALS[name]
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
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


def _smooth(bm):
    for face in bm.faces:
        face.smooth = True


def _cone(coll, name, material, radius1, radius2, depth, location, parent=None,
          segments=24, smooth=False):
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, segments=segments,
        radius1=radius1, radius2=radius2, depth=depth,
    )
    if smooth:
        _smooth(bm)
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material)
    obj.location = location
    if parent is not None:
        obj.parent = parent
    return obj


def _sphere(coll, name, material, radius, location, scale=(1.0, 1.0, 1.0),
            parent=None, u_segments=20, v_segments=12):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u_segments, v_segments=v_segments,
                              radius=radius)
    _smooth(bm)
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


def _bm_box(bm, center, half, rot_y=0.0):
    """Append a box (optionally leaned about its own y) to an existing bmesh.
    Returns the new faces so callers can assign a material slot."""
    before = set(bm.faces)
    bmesh.ops.create_cube(bm, size=1.0)
    faces = [f for f in bm.faces if f not in before]
    verts = {v for f in faces for v in f.verts}
    for v in verts:
        v.co.x *= half[0] * 2
        v.co.y *= half[1] * 2
        v.co.z *= half[2] * 2
    if rot_y:
        bmesh.ops.rotate(bm, verts=list(verts), cent=(0.0, 0.0, 0.0),
                         matrix=Matrix.Rotation(rot_y, 3, "Y"))
    bmesh.ops.translate(bm, verts=list(verts), vec=center)
    return faces


def _bm_sphere(bm, center, radius, scale=(1.0, 1.0, 1.0), u_segments=16, v_segments=10):
    """Append a smooth-shaded sphere to an existing bmesh."""
    before = set(bm.faces)
    bmesh.ops.create_uvsphere(bm, u_segments=u_segments, v_segments=v_segments,
                              radius=radius)
    faces = [f for f in bm.faces if f not in before]
    verts = {v for f in faces for v in f.verts}
    for v in verts:
        v.co.x *= scale[0]
        v.co.y *= scale[1]
        v.co.z *= scale[2]
    bmesh.ops.translate(bm, verts=list(verts), vec=center)
    for f in faces:
        f.smooth = True
    return faces


def _bm_cyl(bm, center, radius, depth, segments=10):
    """Append a smooth-shaded upright cylinder to an existing bmesh."""
    before = set(bm.faces)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments,
                          radius1=radius, radius2=radius, depth=depth)
    faces = [f for f in bm.faces if f not in before]
    verts = {v for f in faces for v in f.verts}
    bmesh.ops.translate(bm, verts=list(verts), vec=center)
    for f in faces:
        f.smooth = True
    return faces


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
    """A chunky toy horse that reads as a horse: rounded body, four grounded
    legs, neck, head with muzzle and ears, mane, tail, orange saddle. One
    mesh (cream + orange slots) facing counter-clockwise around the orbit."""
    bm = bmesh.new()
    orange = []

    # Rounded body.
    _bm_sphere(bm, (0.0, 0.0, 0.16), 0.095, scale=(1.21, 0.58, 0.68))
    # Four grounded legs (z = 0 is the platform top under the spin empty).
    for lx in (0.075, -0.075):
        for ly in (0.042, -0.042):
            _bm_cyl(bm, (lx, ly, 0.0775), 0.016, 0.165)  # 5 mm sunk into the floor
    # Neck leaning up-forward, head, muzzle, two ears.
    _bm_box(bm, (0.125, 0.0, 0.245), (0.045, 0.03, 0.065), rot_y=0.45)
    _bm_box(bm, (0.165, 0.0, 0.29), (0.045, 0.032, 0.035))
    _bm_box(bm, (0.208, 0.0, 0.272), (0.03, 0.022, 0.022))
    for ey in (0.021, -0.021):
        _bm_box(bm, (0.152, ey, 0.338), (0.01, 0.008, 0.022))
    # Orange mane along the neck's back edge, and a hanging tail.
    orange += _bm_box(bm, (0.075, 0.0, 0.269), (0.012, 0.0075, 0.05), rot_y=0.45)
    orange += _bm_box(bm, (-0.112, 0.0, 0.15), (0.009, 0.012, 0.042), rot_y=0.65)
    # Orange rounded saddle pad on the back.
    orange += _bm_sphere(bm, (0.0, 0.0, 0.215), 0.075, scale=(0.72, 0.78, 0.35), u_segments=12, v_segments=8)

    for f in bm.faces:
        f.material_index = 0
    for f in orange:
        f.material_index = 1

    me = _bm_to_mesh(bm, f"carousel_horse_{index}")
    me.materials.append(_material("carousel_cream"))
    me.materials.append(_material("carousel_orange"))
    obj = bpy.data.objects.new(me.name, me)
    coll.objects.link(obj)
    obj.location = (math.cos(angle) * HORSE_R, math.sin(angle) * HORSE_R, 0.0)
    obj.rotation_euler = (0.0, 0.0, angle + math.pi / 2)  # tangent-facing
    if parent is not None:
        obj.parent = parent
    return obj


def _valance(coll, parent):
    """Scalloped cream valance hanging under the canopy rim (one mesh:
    a flared band plus a ring of scallop beads along its lower edge)."""
    bm = bmesh.new()
    before = set(bm.faces)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=BASE_SEGMENTS,
                          radius1=0.64, radius2=0.70, depth=0.11)
    band = [f for f in bm.faces if f not in before]
    verts = {v for f in band for v in f.verts}
    bmesh.ops.translate(bm, verts=list(verts), vec=(0.0, 0.0, 0.775))
    for f in band:
        f.smooth = True
    for i in range(VALANCE_SCALLOPS):
        angle = i * 2 * math.pi / VALANCE_SCALLOPS
        _bm_sphere(bm,
                   (math.cos(angle) * 0.645, math.sin(angle) * 0.645, 0.715),
                   0.045, scale=(1.0, 1.0, 0.8), u_segments=10, v_segments=8)
    me = _bm_to_mesh(bm, "carousel_valance")
    me.materials.append(_material("carousel_cream"))
    obj = bpy.data.objects.new(me.name, me)
    coll.objects.link(obj)
    obj.parent = parent
    return obj


def build_carousel():
    """Recreate the carousel from scratch. Safe to re-run."""
    coll = _carousel_collection()

    # Static: cream platform, red candy rim, centre column (smoother shells).
    # Base top sits 5 mm under the rim top and the rim lip stands 4 mm proud
    # of the base side, so no faces are coplanar (kills rim z-fighting).
    _cone(coll, "carousel_base", "carousel_cream",
          PLATFORM_R, PLATFORM_R, PLATFORM_H - 0.005,
          (0.0, 0.0, GROUND_Z + (PLATFORM_H - 0.005) / 2),
          segments=BASE_SEGMENTS, smooth=True)
    _cone(coll, "carousel_rim", "carousel_red",
          PLATFORM_R + 0.004, PLATFORM_R + 0.004, 0.05,
          (0.0, 0.0, PLATFORM_TOP - 0.025),
          segments=BASE_SEGMENTS, smooth=True)
    column_top = CANOPY_TOP - CANOPY_H / 2
    column_bottom = PLATFORM_TOP - 0.02  # sunk into the rim: no coplanar caps
    _cone(coll, "carousel_column", "carousel_steel",
          0.05, 0.05, column_top - column_bottom,
          (0.0, 0.0, (column_bottom + column_top) / 2), segments=24, smooth=True)

    # The spinner: named empty at platform centre carrying canopy + valance +
    # poles + horses. The scene turns it about local +z. NOTE: children are
    # positioned in the empty's LOCAL space (z measured up from PLATFORM_TOP).
    spin = bpy.data.objects.new("carousel_spin", None)
    spin.empty_display_size = 0.15
    spin.location = (0.0, 0.0, PLATFORM_TOP)
    coll.objects.link(spin)

    _cone(coll, "carousel_canopy", "carousel_red",
          CANOPY_R, 0.1, CANOPY_H,
          (0.0, 0.0, CANOPY_TOP - PLATFORM_TOP - CANOPY_H / 2),
          parent=spin, segments=CANOPY_SEGMENTS, smooth=True)
    _sphere(coll, "carousel_knob", "carousel_orange", 0.07,
            (0.0, 0.0, CANOPY_TOP - PLATFORM_TOP + 0.05), parent=spin)
    _valance(coll, spin)
    for i in range(POLE_COUNT):
        angle = i * 2 * math.pi / POLE_COUNT
        px = math.cos(angle) * (CANOPY_R - 0.14)
        py = math.sin(angle) * (CANOPY_R - 0.14)
        _cone(coll, f"carousel_pole_{i}", "carousel_steel",
              POLE_R, POLE_R, 0.8, (px, py, 0.395),  # 5 mm sunk into the floor
              parent=spin, segments=16, smooth=True)
    for i in range(HORSE_COUNT):
        angle = (i + 0.5) * 2 * math.pi / POLE_COUNT
        _horse(coll, i, angle, spin)

    # Winter tell: snow blanket over the canopy (scene hides it at load).
    _cone(coll, "carousel_snow_cap", "carousel_snow",
          CANOPY_R + 0.05, 0.12, CANOPY_H + 0.04,
          (0.0, 0.0, CANOPY_TOP - CANOPY_H / 2),
          segments=SNOW_SEGMENTS, smooth=True)

    print("built: carousel_base, carousel_rim, carousel_column, carousel_spin "
          "(+ canopy, knob, valance, 6 poles, 3 horses), carousel_snow_cap")


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
             "carousel_canopy", "carousel_knob", "carousel_valance",
             "carousel_snow_cap"}
    for i in range(POLE_COUNT):
        names.add(f"carousel_pole_{i}")
    for i in range(HORSE_COUNT):
        names.add(f"carousel_horse_{i}")
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
