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

The hill is a Brio-style vault: a half-cylinder of the kit's rounded-arch
profile extruded the full 4-unit module, end faces flat (adjacent tunnels
inset 0.01 per end so merged runs never z-fight), with proud portal frames
on each face. Sized to swallow the biggest kit train: the locomotive rides
at 1.5 model scale on a 0.9375 asset scale, i.e. local units × 1.6 —
half-width ≤ 1.14 up to height 0.8, ≤ 1.05 up to height 2.25, thin chimney
tip to height 2.66. The bore (half-width 1.30, legs to height 1.70,
semicircular cap to a crown at height 3.0) clears all of it.
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

# Tunnel bore: rounded arch — legs to the spring line, semicircular cap.
BORE_HW = 1.30
BORE_SPRING_Z = 0.70  # height 1.70 above the ground
BORE_CROWN_Z = BORE_SPRING_Z + BORE_HW  # height 3.0 above the ground

# Vault: the hill itself, same arch language, extruded the module length.
VAULT_HW = 1.68
VAULT_SPRING_Z = 1.05
VAULT_CAP_RY = 1.42  # flatter cap than the bore's semicircle
VAULT_INSET = 0.01  # per end, so merged modules never z-fight

# Portal frames: proud horseshoe bands wrapping each mouth.
PORTAL_R_OUT = 1.55
PORTAL_DEPTH = 0.35
PORTAL_ENTRY_Y = (PORTAL_DEPTH, 0.0)
PORTAL_EXIT_Y = (BED_Y0, BED_Y0 - PORTAL_DEPTH)

# Snow strip: drapes the vault crown above this world z, y-proud at both ends.
SNOW_ZCUT = 1.55
SNOW_OFFSET_MIN, SNOW_OFFSET_MAX = 0.02, 0.12
SNOW_Y0, SNOW_Y1 = 0.12, BED_Y0 - 0.12

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


def _arch_profile(half_width, spring_z, cap_rx, cap_ry, bottom_z, n=24):
    """Closed arch cross-section in (x, z): leg corners, cap, bottom edge."""
    prof = [(-half_width, bottom_z), (-half_width, spring_z)]
    for i in range(1, n + 1):
        t = math.pi * (1 - i / n)
        prof.append((cap_rx * math.cos(t), spring_z + cap_ry * math.sin(t)))
    prof.append((half_width, bottom_z))
    return prof


def _extrude_profile(prof, y0, y1):
    """Closed prism from a 2D profile: two rings, side quads, end caps."""
    bm = bmesh.new()
    ring0 = [bm.verts.new((px, y0, pz)) for px, pz in prof]
    ring1 = [bm.verts.new((px, y1, pz)) for px, pz in prof]
    n = len(prof)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([ring0[i], ring0[j], ring1[j], ring1[i]])
    bm.faces.new(ring0[::-1])
    bm.faces.new(ring1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def _portal(name, y_far, y_near):
    """A proud horseshoe frame on the vault's flat face: band around the mouth."""
    r_out, r_in, spring, n = PORTAL_R_OUT, BORE_HW, BORE_SPRING_Z, 24
    prof = [(-r_out, GROUND_Z), (-r_out, spring)]
    for i in range(1, n + 1):
        t = math.pi * (1 - i / n)
        prof.append((r_out * math.cos(t), spring + r_out * math.sin(t)))
    prof.append((r_out, GROUND_Z))
    prof.append((r_in, GROUND_Z))
    for i in range(1, n + 1):
        t = math.pi * i / n
        prof.append((r_in * math.cos(t), spring + r_in * math.sin(t)))
    prof.append((-r_in, GROUND_Z))
    bm = _extrude_profile(prof, y_far, y_near)
    return _link(bm, name, ["tunnel_dirt"])


def _vault():
    """The hill: rounded-arch prism over the full module, then bored."""
    prof = _arch_profile(VAULT_HW, VAULT_SPRING_Z, VAULT_HW, VAULT_CAP_RY, GROUND_Z)
    bm = _extrude_profile(prof, VAULT_INSET, BED_Y0 - VAULT_INSET)
    vault = _link(bm, "tunnel_dome", ["tunnel_grass"])

    cutter = _bore_cutter()
    mod = vault.modifiers.new("Bore", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.context.view_layer.objects.active = vault
    vault.select_set(True)
    bpy.ops.object.modifier_apply(modifier="Bore")
    cutter_me = cutter.data
    bpy.data.objects.remove(cutter, do_unlink=True)
    bpy.data.meshes.remove(cutter_me)

    # Bore walls read as the dark tunnel interior: reassign cut faces to dirt.
    me = vault.data
    for p in me.polygons:
        c = p.center
        wall_leg = abs(abs(c.x) - BORE_HW) < 0.01 and c.z <= BORE_SPRING_Z + 0.01 and c.z > GROUND_Z - 0.05
        wall_cap = c.z > BORE_SPRING_Z and abs(math.hypot(c.x, c.z - BORE_SPRING_Z) - BORE_HW) < 0.01
        if wall_leg or wall_cap:
            p.material_index = 1
    return vault


def _bore_cutter():
    prof = _arch_profile(BORE_HW, BORE_SPRING_Z, BORE_HW, BORE_HW, GROUND_Z - 0.3)
    bm = _extrude_profile(prof, 0.6, BED_Y0 - 0.6)
    return _link(bm, "tunnel_bore_cutter", ["tunnel_dirt"])


def _snow_cap():
    """A proud snow strip draped over the vault crown, the run's full length."""
    phic = math.asin((SNOW_ZCUT - VAULT_SPRING_Z) / VAULT_CAP_RY)
    steps = 14
    bm = bmesh.new()
    rows = []
    for y in (SNOW_Y0, SNOW_Y1):
        row = []
        for i in range(steps + 1):
            t = phic + (math.pi - 2 * phic) * i / steps
            sl, cl = math.sin(t), math.cos(t)
            px, pz = VAULT_HW * cl, VAULT_SPRING_Z + VAULT_CAP_RY * sl
            nx, nz = cl / VAULT_HW, sl / VAULT_CAP_RY
            norm = math.hypot(nx, nz)
            progress = (sl - math.sin(phic)) / (1 - math.sin(phic))
            off = SNOW_OFFSET_MIN + (SNOW_OFFSET_MAX - SNOW_OFFSET_MIN) * progress
            row.append(
                bm.verts.new((px + nx / norm * off, y, pz + nz / norm * off))
            )
        rows.append(row)
    for i in range(steps):
        bm.faces.new([rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]])
    # Winding above already points the strip outward; recalc_face_normals is
    # unreliable on an open shell and can flip the whole strip's lighting.
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

    _vault()
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
        ("tunnel_head.png", (0.0, 6.5, 1.4), (0.0, -2.0, 0.9), 35.0),
        ("tunnel_quarter.png", (6.5, 5.5, 4.5), (0.0, -2.0, 0.7), 40.0),
        ("tunnel_side.png", (9.0, -2.0, 2.2), (0.0, -2.0, 1.0), 40.0),
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
