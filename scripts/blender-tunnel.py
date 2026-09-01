"""Build the Tiny Tracks tunnel GLB (deterministic, re-runnable).

The tunnel asset source lives only in a live Blender session, so this script
is the authoritative recipe: run it inside any Blender session to recreate
and export the asset identically.

Usage inside Blender's Python console (or via an MCP bridge):

    exec(open(r"<repo>/scripts/blender-tunnel.py", encoding="utf-8").read())
    build_tunnel()      # (re)create the six tunnel_* objects
    render_checks()     # optional: render entry / three-quarter views
    export_tunnel()     # write public/assets/train-kit/tunnel.glb
    verify_glb()        # print the exported node/material names

Coordinate convention (matches the straight kit / KIT_ANCHORS in
track-renderer.ts): Blender y -4..0 becomes glTF z 0..4 after export_yup;
the mat/ground plane sits at z = -1; rails crown at z = -0.82.
"""

import math

import bmesh
import bpy
from mathutils import Vector

REPO = r"D:/Projects/3d-train-sim"
EXPORT_PATH = REPO + "/public/assets/train-kit/tunnel.glb"

# Straight-kit measurements (module is 4 units long, bed 1.0 wide).
BED_Y0, BED_Y1 = -4.0, 0.0
GROUND_Z = -1.0
RAIL_X, RAIL_W = 0.3, 0.1
RAIL_TOP_Z = -0.82

# Tunnel bore: arch radius, spring line, sized for train clearance.
BORE_R = 0.78
SPRING_Z = -0.35

# Grassy dome: hemisphere scaled per axis, centred mid-run.
DOME_RX, DOME_RY, DOME_H = 1.7, 1.9, 3.1
DOME_CX, DOME_CY, DOME_CZ = 0.0, -2.0, GROUND_Z

# Portal arch bands: annulus sector wrapped around the bore mouth.
PORTAL_R_OUT = 0.98
PORTAL_DEPTH = 0.4
PORTAL_ENTRY_Y = (0.05, -0.35)
PORTAL_EXIT_Y = (-3.65, -4.05)

# Snow shell: drapes the dome above this world z, offset grows toward apex.
SNOW_ZCUT = 1.67
SNOW_OFFSET_MIN, SNOW_OFFSET_MAX = 0.02, 0.12

NAMES = (
    "tunnel_bed",
    "tunnel_dome",
    "tunnel_portal_entry",
    "tunnel_portal_exit",
    "tunnel_rails",
    "tunnel_snow_cap",
)

MATERIALS = {
    "tunnel_grass": (0.027, 0.552, 0.468, 1.0),
    "tunnel_cream": (1.0, 0.939, 0.799, 1.0),
    "tunnel_steel": (0.102, 0.102, 0.114, 1.0),
    "tunnel_snow": (0.922, 0.947, 1.0, 1.0),
    "tunnel_dirt": (0.147, 0.054, 0.019, 1.0),
}


def _material(name):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Base Color"].default_value = MATERIALS[name]
        if name == "tunnel_steel":
            bsdf.inputs["Metallic"].default_value = 0.7
            bsdf.inputs["Roughness"].default_value = 0.45
        else:
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


def _arch_profile(r_out, r_in, n=25):
    prof = [(-r_out, GROUND_Z), (-r_out, SPRING_Z)]
    for i in range(1, n + 1):
        t = math.pi * (1 - i / n)
        prof.append((r_out * math.cos(t), SPRING_Z + r_out * math.sin(t)))
    prof.append((r_out, GROUND_Z))
    prof.append((r_in, GROUND_Z))
    for i in range(n + 1):
        t = math.pi * i / n
        prof.append((r_in * math.cos(t), SPRING_Z + r_in * math.sin(t)))
    prof.append((-r_in, GROUND_Z))
    return prof


def _portal(name, y_far, y_near):
    prof = _arch_profile(PORTAL_R_OUT, BORE_R)
    bm = bmesh.new()
    far = [bm.verts.new((px, y_far, pz)) for px, pz in prof]
    near = [bm.verts.new((px, y_near, pz)) for px, pz in prof]
    n = len(prof)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([far[i], far[j], near[j], near[i]])
    bm.faces.new(far[::-1])
    bm.faces.new(near)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(bm, name, ["tunnel_dirt"])


def _dome():
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1.0)
    lower = [v for v in bm.verts if v.co.z < -1e-4]
    bmesh.ops.delete(bm, geom=lower, context="VERTS")
    rim = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.contextual_create(bm, geom=rim)
    for v in bm.verts:
        v.co.x *= DOME_RX
        v.co.y *= DOME_RY
        v.co.z *= DOME_H
        v.co += Vector((DOME_CX, DOME_CY, DOME_CZ))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    dome = _link(bm, "tunnel_dome", ["tunnel_grass"])

    cutter = _bore_cutter()
    mod = dome.modifiers.new("Bore", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.context.view_layer.objects.active = dome
    dome.select_set(True)
    bpy.ops.object.modifier_apply(modifier="Bore")
    cutter_me = cutter.data
    bpy.data.objects.remove(cutter, do_unlink=True)
    bpy.data.meshes.remove(cutter_me)

    # Bore walls read as the dark tunnel interior: reassign cut faces to dirt.
    me = dome.data
    for p in me.polygons:
        c = p.center
        wall_leg = abs(abs(c.x) - BORE_R) < 0.01 and c.z <= SPRING_Z + 0.01 and c.z > GROUND_Z - 0.05
        wall_arch = c.z > SPRING_Z and abs(math.hypot(c.x, c.z - SPRING_Z) - BORE_R) < 0.01
        if wall_leg or wall_arch:
            p.material_index = 1
    return dome


def _bore_cutter():
    prof = [
        (BORE_R * math.cos(t), SPRING_Z + BORE_R * math.sin(t))
        for t in (math.pi * (1 - i / 24) for i in range(25))
    ]
    prof.append((BORE_R, GROUND_Z - 0.3))
    prof.append((-BORE_R, GROUND_Z - 0.3))
    bm = bmesh.new()
    y_near, y_far = 0.6, BED_Y0 - 0.6
    near = [bm.verts.new((px, y_near, pz)) for px, pz in prof]
    far = [bm.verts.new((px, y_far, pz)) for px, pz in prof]
    n = len(prof)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([near[i], near[j], far[j], far[i]])
    bm.faces.new(near)
    bm.faces.new(far[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(bm, "tunnel_bore_cutter", ["tunnel_dirt"])


def _snow_cap():
    bm = bmesh.new()
    phic = math.acos((SNOW_ZCUT - DOME_CZ) / DOME_H)
    rings = []
    for k in range(6):
        phi = phic * (1 - k / 6)
        off = SNOW_OFFSET_MIN + (SNOW_OFFSET_MAX - SNOW_OFFSET_MIN) * (phic - phi) / phic
        ring = []
        for i in range(24):
            th = 2 * math.pi * i / 24
            sl, cl = math.sin(phi), math.cos(phi)
            p = Vector((DOME_RX * sl * math.cos(th), DOME_RY * sl * math.sin(th), DOME_H * cl))
            nrm = Vector((p.x / (DOME_RX * DOME_RX), p.y / (DOME_RY * DOME_RY), p.z / (DOME_H * DOME_H)))
            q = p + nrm.normalized() * off
            ring.append(bm.verts.new((q.x, q.y + DOME_CY, q.z + DOME_CZ)))
        rings.append(ring)
    for k in range(5):
        for i in range(24):
            j = (i + 1) % 24
            bm.faces.new([rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]])
    apex = bm.verts.new((0.0, DOME_CY, DOME_CZ + DOME_H + SNOW_OFFSET_MAX))
    for i in range(24):
        j = (i + 1) % 24
        bm.faces.new([rings[-1][j], rings[-1][i], apex])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _link(bm, "tunnel_snow_cap", ["tunnel_snow"])


def build_tunnel():
    """Recreate all six tunnel_* objects from scratch. Safe to re-run."""
    cube = bpy.data.objects.get("Cube")
    if cube and len(bpy.data.objects) <= 6:
        bpy.data.objects.remove(cube, do_unlink=True)
    for name in NAMES + ("tunnel_bore_cutter",):
        obj = bpy.data.objects.get(name)
        if obj:
            me = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if me:
                bpy.data.meshes.remove(me)

    bm = bmesh.new()
    _box_verts(bm, -0.5, 0.5, BED_Y0, BED_Y1, GROUND_Z, GROUND_Z + 0.1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _link(bm, "tunnel_bed", ["tunnel_cream"])

    bm = bmesh.new()
    for side in (-1, 1):
        cx = side * RAIL_X
        _box_verts(bm, cx - RAIL_W / 2, cx + RAIL_W / 2, BED_Y0, BED_Y1, GROUND_Z + 0.1, RAIL_TOP_Z)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _link(bm, "tunnel_rails", ["tunnel_steel"])

    _dome()
    _portal("tunnel_portal_entry", *PORTAL_ENTRY_Y)
    _portal("tunnel_portal_exit", *PORTAL_EXIT_Y)
    _snow_cap()
    print("built:", ", ".join(NAMES))


def render_checks():
    cam = bpy.data.objects.get("TunnelCam")
    if cam is None:
        cam = bpy.data.objects.new("TunnelCam", bpy.data.cameras.new("TunnelCam"))
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
            v.co.z += GROUND_Z - 0.02
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ground = _link(bm, "check_ground", ["tunnel_grass"])
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.75, 0.85, 1.0, 1.0)
    bg.inputs[1].default_value = 0.7

    scene = bpy.context.scene
    scene.camera = cam
    views = (
        ("tunnel_head.png", (0.0, 3.8, 0.15), (0.0, -2.0, 0.15), 35.0),
        ("tunnel_quarter.png", (5.0, 4.5, 3.4), (0.0, -2.0, 0.3), 40.0),
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


def export_tunnel():
    for obj in bpy.data.objects:
        obj.select_set(obj.name in NAMES)
    bpy.context.view_layer.objects.active = bpy.data.objects["tunnel_dome"]
    bpy.ops.export_scene.gltf(
        filepath=EXPORT_PATH,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
    )
    import os

    print("exported:", EXPORT_PATH, os.path.getsize(EXPORT_PATH), "bytes")


def verify_glb():
    import json
    import os
    import struct

    with open(EXPORT_PATH, "rb") as fh:
        data = fh.read()
    chunk_len = struct.unpack_from("<I", data, 12)[0]
    js = json.loads(data[20 : 20 + chunk_len])
    print("size:", os.path.getsize(EXPORT_PATH))
    print("nodes:", sorted(n["name"] for n in js.get("nodes", [])))
    print("materials:", sorted(m["name"] for m in js.get("materials", [])))
    print("meshes:", len(js.get("meshes", [])))
