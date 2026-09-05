"""
Bočica laka iz Blendera (spec 12 „MODEL IZ BLENDERA", spec 13 → I).

Ovaj kod je IZVRŠEN kroz Blender MCP (Blender 5.1.1 otvoren, add-on server na localhost:9876)
i ovde je sačuvan kao zapis — reproducibilno, može i headless:

    & "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" -b -P scripts/bottle.py

Kroz MCP (`execute_blender_code`), tačno ovim redom (spec 13 → I):
    REPO = r"C:\\...\\beautybymasha"; exec(open(REPO + r"\\scripts\\bottle.py").read())
    result = build()                    # 1–2: nova scena + Glass / Liquid / Cap, apply transforms
    result = preview_render(r"...png")  # 3: Eevee render za proveru siluete (prozor Blendera je bio
                                        #    zaklonjen, snimak viewporta crn — render ne zavisi od toga)
    result = export_glb()               # 4: modifikatori → mesh (imena ostaju), GLB Draco, Y-up

Geometrija po specu 12: zaobljeni kvadrat 3,2 × 3,2 sa radijusom uglova 0,9, telo 5,2, vrat
d 1,1 / h 0,8, Solidify 0,12, Subdivision 2; zatvarač d 1,9 → 1,7, h 3,6, bevel 0,15,
10 žlebova; ukupno 9,48 (spec „~9,6" — tačno `TOTAL_HEIGHT` iz components/three/bottleGeometry.ts,
da raspored u kadru, anker kapi i nivo tečnosti ostanu isti). JEDNA izmena: `Liquid` = PUNA
unutrašnjost stakla (nivo daje clipping ravan iz koda, ne geometrija). Dno u y = 0, centrirano
po X/Z, 1 jedinica = 1 cm, Y gore rešava exporter. Bez etikete, teksta, armature, animacija.
"""
import math
import os

import bmesh
import bpy

REPO = globals().get("REPO") or os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(REPO, "public", "models", "bocica.glb")

# --- mere (cm) -------------------------------------------------------------
BODY_HALF = 1.6        # 3,2 × 3,2
CORNER_R = 0.9
BOTTOM_R = 0.25
BODY_TOP = 5.2         # visina tela; rame 4,55 → 5,2 se sažima u vrat
SHOULDER_FROM = 4.55
NECK_R = 0.55          # d 1,1
NECK_TOP = 6.0         # vrat h 0,8
LIP_R = 0.58
WALL = 0.12            # Solidify (staklo) i inset tečnosti
LIQUID_GAP = 0.02
LIQUID_TOP = 5.9
CAP_BOTTOM = 5.88
CAP_TOP = 9.48         # h 3,6
CAP_R_BOTTOM = 0.95    # d 1,9
CAP_R_TOP = 0.85       # d 1,7
CAP_BEVEL = 0.15
GROOVES = 10
GROOVE_DEPTH = 0.035

GLASS_SEGMENTS = 24    # + Subdivision 2 = glatko; više segmenata sa subdiv 2 probija 40k trouglova
LIQUID_SEGMENTS = 32
CAP_SEGMENTS = 80      # žlebovi traže gustinu po obimu

# --- četkica (spec 14 → B0) — iste formule kao lib/bottleDims.ts ------------
LIQUID_LEVEL_Y = 6.0 * 0.78          # nivo tečnosti, 78 % tela
INNER_BOTTOM_Y = 0.14                # zid 0,12 + razmak 0,02
BRUSH_DEPTH_RATIO = 0.92             # vrh dlačica na 92 % dubine tečnosti
BRUSH_TIP_Y = LIQUID_LEVEL_Y - BRUSH_DEPTH_RATIO * (LIQUID_LEVEL_Y - INNER_BOTTOM_Y)
HAIR_LENGTH = 1.5
HAIR_TOP_Y = BRUSH_TIP_Y + HAIR_LENGTH
STEM_TOP_Y = 6.2                     # stem ulazi u zatvarač (spoj sakriven)
STEM_R = 0.14                        # d 0,28
HAIR_R_TOP = 0.25                    # d 0,5
HAIR_R_TIP = 0.09                    # d 0,18
HAIR_FLAT_X = 1.35                   # ravna četkica: elipsa, x osa 1,35×
STEM_SEGMENTS = 16
HAIR_SEGMENTS = 24


def smoothstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def rounded_square_radius(theta, half=BODY_HALF, r=CORNER_R):
    """Rastojanje od centra do ivice zaobljenog kvadrata u pravcu theta (simetrija na oktant)."""
    t = math.atan2(abs(math.sin(theta)), abs(math.cos(theta)))
    if t > math.pi / 4:
        t = math.pi / 2 - t
    inner = half - r
    if math.tan(t) * half <= inner:
        return half / math.cos(t)
    # zrak seče luk ugla: |t·d − c| = r, c = (inner, inner)
    dx, dy = math.cos(t), math.sin(t)
    cd = inner * (dx + dy)
    return cd + math.sqrt(max(0.0, cd * cd - 2 * inner * inner + r * r))


def glass_radius(theta, y, inset=0.0):
    """Presek stakla na visini y: zaobljeni kvadrat → krug vrata; `inset` za unutrašnjost."""
    square = rounded_square_radius(theta, BODY_HALF - inset, max(0.05, CORNER_R - inset))
    if y < BOTTOM_R:
        # zaobljeno dno: profil prati četvrt kruga radijusa BOTTOM_R
        dip = BOTTOM_R - math.sqrt(max(0.0, BOTTOM_R * BOTTOM_R - (BOTTOM_R - y) ** 2))
        square *= 1 - dip / BODY_HALF
    blend = smoothstep(SHOULDER_FROM, BODY_TOP, y)
    neck = NECK_R - inset
    if y >= 5.94 and inset == 0.0:
        neck = LIP_R
    return lerp(square, neck, blend)


def cap_radius(theta, y):
    r = lerp(CAP_R_BOTTOM, CAP_R_TOP, (y - CAP_BOTTOM) / (CAP_TOP - CAP_BOTTOM))
    if y > CAP_TOP - CAP_BEVEL:
        r -= CAP_BEVEL - math.sqrt(max(0.0, CAP_BEVEL ** 2 - (y - (CAP_TOP - CAP_BEVEL)) ** 2))
    fade = smoothstep(6.15, 6.4, y) * (1 - smoothstep(8.85, 9.1, y))
    r -= GROOVE_DEPTH * max(0.0, math.cos(GROOVES * theta)) ** 4 * fade
    return r


def loft(name, ys, radius_fn, segments, close_bottom=True, close_top=True):
    """Prstenovi po visini → zatvoren mesh. Blender je Z-gore; exporter (Y-up) mapira (x, y, z) → (x, z, −y)."""
    bm = bmesh.new()
    rings = []
    for y in ys:
        ring = []
        for j in range(segments):
            th = 2 * math.pi * j / segments
            r = radius_fn(th, y)
            ring.append(bm.verts.new((r * math.cos(th), -r * math.sin(th), y)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for j in range(segments):
            k = (j + 1) % segments
            bm.faces.new((a[j], a[k], b[k], b[j]))
    if close_bottom:
        c = bm.verts.new((0, 0, ys[0]))
        for j in range(segments):
            bm.faces.new((rings[0][(j + 1) % segments], rings[0][j], c))
    if close_top:
        c = bm.verts.new((0, 0, ys[-1]))
        for j in range(segments):
            bm.faces.new((rings[-1][j], rings[-1][(j + 1) % segments], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def material(name, **inputs):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    for key, value in inputs.items():
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = value
    return m


def build():
    """Korak 1–2 speca: nova scena, tri mesha, materijali, modifikatori, apply transforms."""
    bpy.ops.wm.read_homefile(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "CENTIMETERS"
    scene.unit_settings.scale_length = 0.01

    glass_ys = [0.0, 0.03, 0.1, 0.18, BOTTOM_R, 0.6, 1.5, 3.0, 4.2, SHOULDER_FROM, 4.66, 4.79, 4.93, 5.07, BODY_TOP, 5.55, 5.9, 5.94, NECK_TOP]
    glass = loft("Glass", glass_ys, lambda th, y: glass_radius(th, y), GLASS_SEGMENTS)
    solid = glass.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = WALL
    solid.offset = -1.0
    subdiv = glass.modifiers.new("Subdivision", "SUBSURF")
    subdiv.levels = 2
    subdiv.render_levels = 2

    inset = WALL + LIQUID_GAP
    liquid_ys = [inset, 0.22, BOTTOM_R + 0.05, 0.6, 1.5, 3.0, 4.2, SHOULDER_FROM, 4.66, 4.79, 4.93, 5.07, BODY_TOP, 5.5, LIQUID_TOP]
    liquid = loft("Liquid", liquid_ys, lambda th, y: glass_radius(th, y, inset), LIQUID_SEGMENTS)
    lsub = liquid.modifiers.new("Subdivision", "SUBSURF")
    lsub.levels = 1
    lsub.render_levels = 1

    cap_ys = [CAP_BOTTOM, 6.0, 6.2, 6.4, 7.0, 7.7, 8.4, 8.9, 9.1, 9.25, 9.36, 9.43, 9.47, CAP_TOP]
    cap = loft("Cap", cap_ys, cap_radius, CAP_SEGMENTS)

    # Četkica (spec 14 → B0): stem od donje strane zatvarača, dlačice = zarubljena kupa spljoštena
    # po x (elipsa u preseku, ne scale — pa su normale tačne). Oba su DECA zatvarača: hero ih
    # odvrće, diže i naginje zajedno sa njim. Imena TAČNO ova (čita ih bottleGlb.ts).
    stem = loft("BrushStem", [HAIR_TOP_Y, STEM_TOP_Y], lambda th, y: STEM_R, STEM_SEGMENTS)
    hair = loft("BrushHair", [BRUSH_TIP_Y + HAIR_LENGTH * k / 6 for k in range(7)], hair_radius, HAIR_SEGMENTS)
    for child in (stem, hair):
        child.parent = cap
        child.matrix_parent_inverse = cap.matrix_world.inverted()

    glass.data.materials.append(material("Glass", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.04, "IOR": 1.45, "Transmission Weight": 1.0}))
    liquid.data.materials.append(material("Liquid", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.12}))
    cap.data.materials.append(material("Cap", **{"Base Color": (0.006, 0.005, 0.004, 1), "Roughness": 0.35, "Metallic": 0.1}))
    brush = material("Brush", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.25, "Coat Weight": 0.6})
    stem.data.materials.append(brush)
    hair.data.materials.append(brush)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = glass
    return {
        "objects": [o.name for o in scene.objects],
        "parents": {o.name: (o.parent.name if o.parent else None) for o in scene.objects},
        "glass_faces": len(glass.data.polygons),
        "liquid_faces": len(liquid.data.polygons),
        "cap_faces": len(cap.data.polygons),
        "stem_faces": len(stem.data.polygons),
        "hair_faces": len(hair.data.polygons),
        "brush_tip_y": BRUSH_TIP_Y,
    }


def hair_radius(theta, y):
    """Zarubljena kupa (vrh dole) sa eliptičnim presekom: x osa 1,35× — ravna četkica za lak."""
    r = lerp(HAIR_R_TIP, HAIR_R_TOP, (y - BRUSH_TIP_Y) / HAIR_LENGTH)
    a = r * HAIR_FLAT_X
    b = r
    c, s = math.cos(theta), math.sin(theta)
    return 1.0 / math.sqrt((c * c) / (a * a) + (s * s) / (b * b))


def evaluated_triangles():
    """Trouglovi posle modifikatora (ono što ide u GLB)."""
    dg = bpy.context.evaluated_depsgraph_get()
    out = {}
    for o in bpy.context.scene.objects:
        mesh = o.evaluated_get(dg).to_mesh()
        out[o.name] = sum(len(p.vertices) - 2 for p in mesh.polygons)
        o.evaluated_get(dg).to_mesh_clear()
    out["total"] = sum(out.values())
    return out


def preview_render(path):
    """Korak 3 speca: kamera, sunce i svetao svet samo za proveru siluete; briše ih posle rendera."""
    from mathutils import Vector

    scene = bpy.context.scene
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.9, 0.9, 0.9, 1)
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 60
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = Vector((11.0, -14.0, 7.5))
    cam.rotation_euler = (Vector((0, 0, 4.74)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    sun_data = bpy.data.lights.new("PreviewSun", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("PreviewSun", sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), math.radians(-20), math.radians(35))
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 720, 960
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o in (cam, sun):
        bpy.data.objects.remove(o, do_unlink=True)
    return {"rendered": os.path.exists(path)}


def _ui_context():
    """MCP izvršava kod BEZ prozora: `bpy.context` tamo nema `active_object`, a operatori
    (convert, glTF export) ga traže. Pravi prozor/area/region za `temp_override`; headless ({})."""
    wm = bpy.context.window_manager
    if not wm or not wm.windows:
        return {}
    win = wm.windows[0]
    area = next((a for a in win.screen.areas if a.type == "VIEW_3D"), win.screen.areas[0])
    region = next((r for r in area.regions if r.type == "WINDOW"), area.regions[0])
    return {"window": win, "screen": win.screen, "area": area, "region": region}


def apply_modifiers():
    """Modifikatori → mesh kroz depsgraph (bez operatora, radi i bez prozora): imena Glass/Liquid
    ostaju na primitivima, a broj trouglova je tačno ono što ide u GLB."""
    dg = bpy.context.evaluated_depsgraph_get()
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH" or not o.modifiers:
            continue
        mesh = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
        old = o.data
        o.modifiers.clear()
        o.data = mesh
        mesh.name = o.name
        if old.users == 0:
            bpy.data.meshes.remove(old)


def export_glb(path=OUT):
    """Korak 4 speca: modifikatori → mesh, pa GLB, Draco, Y-up, bez kamera/svetala/animacija.
    Hijerarhija (BrushStem/BrushHair kao deca Cap-a) preživljava export."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    apply_modifiers()
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    with bpy.context.temp_override(**_ui_context(), active_object=objs[0], selected_objects=objs):
        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format="GLB",
            export_draco_mesh_compression_enable=True,
            export_yup=True,
            export_apply=True,
            export_cameras=False,
            export_lights=False,
            export_animations=False,
            export_skins=False,
            export_morph=False,
        )
    for o in objs:
        o.select_set(False)
    return {"path": path, "bytes": os.path.getsize(path), "triangles": evaluated_triangles()}


if __name__ == "__main__":
    print(build())
    print(export_glb())  # headless: bez probnog rendera
