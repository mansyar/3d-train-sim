"""Build the Tiny Tracks windmill GLB (deterministic, re-runnable).

Scenery-delight toy #1: a chunky toy windmill that turns its sails in the
breeze. Authored on the scenery mount (1 unit ~= 1 meadow cell, mat top at
z = -1), z-up, exported with export_yup.

Node-name contract (runtime finds these via getObjectByName; each appears
exactly once in the GLB — renaming any of them is a breaking change):
- windmill_sails     empty at the hub; the scene spins it about glTF local
                     z (export flips the authored +y hub to -z)
                     (the horizontal hub axis pointing away from the tower
                     face) ~0.25 rev/s
- windmill_snow_cap  white roof cap; scene hides at load, shows when the
                     meadow freezes (tunnel_snow_cap precedent)

Everything else is static dressing: windmill_tower, windmill_cap,
windmill_door, windmill_door_frame, windmill_window, windmill_window_frame,
windmill_finial_post, windmill_finial_ball, windmill_blade_0..3, and
windmill_hub (a child of the sails node like the blades).

Polish pass (delight-toys-polish_20260913): smoother shells (higher segment
counts + smooth shading), chunky lattice-slat sails, framed door/window,
roof finial, and a per-material finish (roughness) so painted wood reads
apart. The flat palette is unchanged.

Usage headless:

    blender --background --python scripts/blender-windmill.py

or from a Blender session's Python console:

    exec(open(r"<repo>/scripts/blender-windmill.py", encoding="utf-8").read())
    build_windmill()    # (re)create the windmill from scratch
    render_checks()     # top / quarter / side-by-side fit / winter stills
    export_windmill()   # write public/assets/train-kit/windmill.glb
    verify_glb()        # print exported node/material names + size
"""

import bmesh
import bpy
import math
import os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT_DIR = REPO + "/public/assets/train-kit"

GROUND_Z = -1.0
TOWER_H = 1.9
TOWER_R0 = 0.5
TOWER_R1 = 0.36
CAP_H = 0.4
HUB_Z = GROUND_Z + TOWER_H - 0.18  # hub sits just under the cap
HUB_Y = -0.44  # sails ride proud of the tower's south face (-y)
BLADE_LEN = 0.84
BLADE_HALF_W = 0.09
BLADE_HALF_T = 0.02

# Polish-pass constants (smoother shells, chunky lattice sails).
TOWER_SEGMENTS = 48
CAP_SEGMENTS = 48
SNOW_SEGMENTS = 40
BLADE_RAIL_HALF_Z = 0.018     # rails ride the outer edges of the old slab
BLADE_RUNG_XS = (0.16, 0.36, 0.56, 0.74)
BLADE_RUNG_HALF_X = 0.028

MATERIALS = {
    "windmill_cream": ((0.95, 0.86, 0.68, 1.0), 0.95),
    "windmill_red": ((0.78, 0.18, 0.1, 1.0), 0.8),
    "windmill_orange": ((1.0, 0.62, 0.11, 1.0), 0.75),
    "windmill_brown": ((0.42, 0.26, 0.15, 1.0), 0.7),
    "windmill_snow": ((0.94, 0.96, 0.93, 1.0), 0.9),
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


def _cone(coll, name, material, radius1, radius2, depth, location,
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
    return obj


def _box(coll, name, material, half, location, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= half[0] * 2
        v.co.y *= half[1] * 2
        v.co.z *= half[2] * 2
    if bevel > 0.0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2,
                        profile=0.5, affect="EDGES", clamp_overlap=True)
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material)
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def _sphere(coll, name, material, radius, location,
            u_segments=24, v_segments=12):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u_segments, v_segments=v_segments,
                              radius=radius)
    _smooth(bm)
    me = _bm_to_mesh(bm, name)
    obj = _mesh_object(coll, me, name, material)
    obj.location = location
    return obj


def _add_box(bm, center, half):
    """Append an axis-aligned box to an existing bmesh (blade part helper)."""
    before = set(bm.faces)
    bmesh.ops.create_cube(bm, size=1.0)
    verts = {v for f in bm.faces if f not in before for v in f.verts}
    for v in verts:
        v.co.x *= half[0] * 2
        v.co.y *= half[1] * 2
        v.co.z *= half[2] * 2
    bmesh.ops.translate(bm, verts=list(verts), vec=center)


def _windmill_collection():
    old = bpy.data.collections.get("Windmill")
    if old:
        for ob in list(old.objects):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new("Windmill")
    bpy.context.scene.collection.children.link(coll)
    return coll


def _lattice_blade(coll, name, sails, index):
    """One chunky lattice sail: two rails + four cross rungs in a single
    mesh, so the whole blade turns as one child of windmill_sails. Rails
    stay parallel (chunky and aliasing-safe at toy distance)."""
    bm = bmesh.new()
    rail_center_x = 0.04 + BLADE_LEN / 2
    for side in (1.0, -1.0):
        _add_box(bm, (rail_center_x, 0.0, side * (BLADE_HALF_W - BLADE_RAIL_HALF_Z)),
                 (BLADE_LEN / 2, BLADE_HALF_T, BLADE_RAIL_HALF_Z))
    for rung_x in BLADE_RUNG_XS:
        _add_box(bm, (rung_x, 0.0, 0.0),
                 (BLADE_RUNG_HALF_X, BLADE_HALF_T, BLADE_HALF_W - 0.012))
    me = _bm_to_mesh(bm, name)
    me.materials.append(_material("windmill_red"))
    blade = bpy.data.objects.new(me.name, me)
    blade.parent = sails
    blade.rotation_euler = (0.0, index * math.pi / 2, 0.0)
    coll.objects.link(blade)


def build_windmill():
    """Recreate the windmill from scratch. Safe to re-run."""
    coll = _windmill_collection()

    # Cream tower, chunky and tapered, standing on the mat. Smoother shell:
    # more segments + smooth faces so the toy reads as turned wood.
    _cone(coll, "windmill_tower", "windmill_cream",
          TOWER_R0, TOWER_R1, TOWER_H, (0.0, 0.0, GROUND_Z + TOWER_H / 2),
          segments=TOWER_SEGMENTS, smooth=True)

    # Toy-red cap cone on top, smoothed to match.
    _cone(coll, "windmill_cap", "windmill_red",
          TOWER_R1 + 0.06, 0.0, CAP_H,
          (0.0, 0.0, GROUND_Z + TOWER_H + CAP_H / 2),
          segments=CAP_SEGMENTS, smooth=True)

    # Roof finial: a short cream post with an orange ball at the peak.
    _cone(coll, "windmill_finial_post", "windmill_cream",
          0.022, 0.022, 0.06,
          (0.0, 0.0, GROUND_Z + TOWER_H + CAP_H + 0.02),
          segments=16, smooth=True)
    _sphere(coll, "windmill_finial_ball", "windmill_orange", 0.044,
            (0.0, 0.0, GROUND_Z + TOWER_H + CAP_H + 0.065),
            u_segments=20, v_segments=10)

    # Framed door (brown surround, cream panel) and framed window (brown
    # surround, orange pane), both proud of the south face (-y). The panel
    # and pane sit slightly proud of their surrounds so they stay visible:
    # two solid slabs, not a ring with a hole. Light bevels round the edges.
    _box(coll, "windmill_door_frame", "windmill_brown",
         (0.115, 0.032, 0.19), (0.0, -0.485, GROUND_Z + 0.2), bevel=0.012)
    _box(coll, "windmill_door", "windmill_cream",
         (0.082, 0.033, 0.152), (0.0, -0.492, GROUND_Z + 0.2), bevel=0.008)
    _box(coll, "windmill_window_frame", "windmill_brown",
         (0.093, 0.028, 0.093), (0.0, -0.42, GROUND_Z + 1.2), bevel=0.01)
    _box(coll, "windmill_window", "windmill_orange",
         (0.062, 0.03, 0.062), (0.0, -0.428, GROUND_Z + 1.2), bevel=0.006)

    # The sails: a named empty at the hub carrying four lattice blades and
    # an orange hub ball.
    sails = bpy.data.objects.new("windmill_sails", None)
    sails.empty_display_size = 0.15
    sails.location = (0.0, HUB_Y, HUB_Z)
    coll.objects.link(sails)
    _sphere(coll, "windmill_hub", "windmill_orange", 0.06, (0.02, 0.0, 0.0),
            u_segments=20, v_segments=10).parent = sails
    for i in range(4):
        _lattice_blade(coll, f"windmill_blade_{i}", sails, i)

    # Winter tell: a snow cap blanket over the roof cone (scene hides it at load).
    _cone(coll, "windmill_snow_cap", "windmill_snow",
          TOWER_R1 + 0.12, 0.04, CAP_H + 0.04,
          (0.0, 0.0, GROUND_Z + TOWER_H + CAP_H / 2),
          segments=SNOW_SEGMENTS, smooth=True)

    print("built: windmill_tower, windmill_cap, windmill_door(+frame), "
          "windmill_window(+frame), finial post+ball, windmill_sails "
          "(4 lattice blades + hub), windmill_snow_cap")


def _setup_check_env():
    """Sun, ground, camera, and world for the render checks (house rules)."""
    for name in ("Cube", "Camera", "Light"):
        ob = bpy.data.objects.get(name)
        if ob:
            data = getattr(ob, "data", None)
            bpy.data.objects.remove(ob, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    cam = bpy.data.objects.get("WindmillCheckCam")
    if cam is None:
        cam = bpy.data.objects.new("WindmillCheckCam", bpy.data.cameras.new("WindmillCheckCam"))
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
    # Match the app's tone response: Blender 5.x defaults to AgX, which
    # desaturates flat toy colors; three.js uses NeutralToneMapping.
    bpy.context.scene.view_settings.view_transform = "Standard"
    return cam


def _import_loco():
    """The kit locomotive at ride scale x1.6 (tech-stack rule 3) for the
    side-by-side fit render, parked on the neighboring cell."""
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
    coll = bpy.data.collections.get("Windmill")
    scene = bpy.context.scene
    scene.camera = cam
    sails = coll.objects["windmill_sails"]
    snow = coll.objects["windmill_snow_cap"]
    loco = _import_loco()

    def shoot(fname, loc, target, lens, spin=0.0, winter=False, loco_at=None):
        sails.rotation_euler = (0.0, spin, 0.0)
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

    shoot("windmill_top.png", (0.0, 0.0, 9.0), (0.0, 0.0, -1.0), 50.0)
    shoot("windmill_quarter.png", (-5.5, -6.5, 3.5), (0.3, 0.3, -0.2), 45.0)
    # Side-by-side fit: locomotive (ride x1.6) on the neighboring cell —
    # reads the toy scale and proves nothing clips (scenery cells carry no rail).
    shoot("windmill_fit.png", (4.5, -6.0, 2.6), (0.9, -0.4, 0.2), 40.0,
          loco_at=(2.2, -1.0, -1.0))
    shoot("windmill_winter.png", (-5.5, -6.5, 3.5), (0.3, 0.3, 0.0), 45.0, winter=True)
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


def export_windmill():
    _export_selected(
        f"{KIT_DIR}/windmill.glb",
        {"windmill_tower", "windmill_cap", "windmill_door", "windmill_door_frame",
         "windmill_window", "windmill_window_frame", "windmill_finial_post",
         "windmill_finial_ball", "windmill_sails", "windmill_blade_0",
         "windmill_blade_1", "windmill_blade_2", "windmill_blade_3",
         "windmill_hub", "windmill_snow_cap"},
    )


def verify_glb():
    import json
    import struct

    path = f"{KIT_DIR}/windmill.glb"
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
    build_windmill()
    render_checks()
    export_windmill()
    verify_glb()
