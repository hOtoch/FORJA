"""O mapa da Temporada 1 em pixel art (640 × 352).

A estrada sai da vila da forja (embaixo, à esquerda) e atravessa:
- outubro: a Floresta da Disciplina (verde, com lago);
- novembro: as Montanhas do Esforço (outono, com rio e ponte);
- dezembro: as Terras do Gelo (neve e pinheiros);
e termina no Castelo do Réveillon, na costa, com fogos de artifício.

A mesma estrada vai para src/config/mapa.json, que a interface usa para pôr os 80 dias,
os chefes, os baús e o personagem em cima da imagem.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from palette import *  # noqa: F403
from pixelkit import Canvas, rng

W, H = 640, 352
ROOT = Path(__file__).resolve().parent.parent.parent

PATH = [
    (40, 300), (110, 300), (110, 200), (190, 200), (190, 280), (280, 280), (280, 120),
    (200, 120), (200, 60), (330, 60), (330, 180), (420, 180), (420, 290), (520, 290),
    (520, 170), (460, 170), (460, 96), (556, 96),
]
RIVER = [(296, 0), (304, 40), (298, 80), (306, 130), (300, 180), (308, 240), (300, 300), (306, 352)]
LAKE = (62, 92, 40, 28)
MOUNTAINS = [(392, 108, 34, 44), (360, 128, 24, 30), (232, 214, 22, 28)]
VILLAGE = (8, 252, 96, 340)
CASTLE = (532, 24, 600, 100)
SEA_X = 604
REGIONS = [
    {"label": "Floresta da Disciplina", "month": "outubro", "x": 112, "y": 18},
    {"label": "Montanhas do Esforço", "month": "novembro", "x": 372, "y": 338},
    {"label": "Terras do Gelo", "month": "dezembro", "x": 492, "y": 340},
]


def seg_dist(px: float, py: float, a: tuple, b: tuple) -> float:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def poly_dist(px: float, py: float, pts: list) -> float:
    return min(seg_dist(px, py, pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def region_of(x: float, y: float) -> str:
    if x >= SEA_X:
        return "sea"
    if x >= SEA_X - 14:
        return "sand"
    if x < 220:
        return "grass"
    if x < 436:
        return "autumn"
    return "snow"


def thick(c: Canvas, pts: list, r: float, color: str) -> None:
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        n = int(max(abs(bx - ax), abs(by - ay))) + 1
        for k in range(n + 1):
            t = k / max(1, n)
            cx, cy = ax + (bx - ax) * t, ay + (by - ay) * t
            for y in range(int(cy - r - 1), int(cy + r + 2)):
                for x in range(int(cx - r - 1), int(cx + r + 2)):
                    if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                        c.put(x, y, color, lock=True)


# ---------- pequenos sprites do cenário ----------

def tree(leaf: str) -> Canvas:
    t = Canvas(12, 14)
    t.rect(5, 9, 6, 13, WOOD)
    t.ellipse(6, 6, 5.2, 5.2, leaf)
    t.shade()
    t.outline("#2a2018")
    return t


def pine(snow: bool) -> Canvas:
    t = Canvas(12, 16)
    t.rect(5, 12, 6, 15, WOOD)
    for top, half, y1 in ((0, 3, 5), (3, 4.5, 9), (6, 6, 13)):
        t.poly([(6, top), (6 + half, y1), (6 - half, y1)], PINE)
    t.shade()
    if snow:
        for x, y in [(6, 1), (5, 2), (7, 2), (4, 5), (8, 5), (3, 9), (9, 9), (2, 13), (10, 13), (6, 4), (6, 8)]:
            t.put(x, y, "#ffffff", lock=True)
    t.outline("#1c2a24")
    return t


def rock() -> Canvas:
    t = Canvas(8, 6)
    t.ellipse(4, 3.5, 3.6, 2.6, ROCK)
    t.shade()
    t.outline("#2a2018")
    return t


def house(roof: str = ROOF, glow: bool = False) -> Canvas:
    h = Canvas(16, 16)
    h.rect(2, 7, 13, 15, WALL)
    h.poly([(0, 8), (8, 1), (16, 8)], roof)
    h.rect(7, 11, 8, 15, WOOD)
    h.shade()
    h.outline("#2a2018")
    if glow:
        h.rect(10, 9, 11, 10, FIRE_YEL, lock=True)
        h.rect(3, 9, 4, 10, FIRE_YEL, lock=True)
    return h


def forge() -> Canvas:
    f = Canvas(24, 22)
    f.rect(2, 9, 21, 21, STONE_DK)
    f.poly([(0, 10), (12, 2), (24, 10)], "#5e3b21")
    f.rect(17, 0, 19, 8, STONE)  # chaminé
    f.shade()
    f.outline("#1a1410")
    f.rect(5, 13, 10, 19, EMBER, lock=True)  # porta com fogo
    f.rect(6, 15, 9, 19, FIRE_YEL, lock=True)
    f.rect(13, 14, 18, 16, EYE, lock=True)  # bigorna
    f.rect(15, 17, 16, 19, EYE, lock=True)
    return f


def castle() -> Canvas:
    k = Canvas(68, 76)
    k.rect(8, 34, 59, 75, WALL)  # muralha
    for x in (0, 26, 52):  # torres
        k.rect(x, 18 if x == 26 else 26, x + 15, 75, WALL)
    for x in (0, 26, 52):
        top = 18 if x == 26 else 26
        k.poly([(x - 2, top), (x + 8, top - 16), (x + 18, top)], ROOF)
    for x in range(8, 60, 6):
        k.rect(x, 30, x + 2, 33, WALL)
    k.rect(28, 56, 39, 75, WOOD)  # portão
    k.shade()
    k.outline("#1a1410")
    for x in (7, 33, 59):  # bandeiras
        top = 2 if x == 33 else 10
        k.rect(x, top - 8 if top > 8 else 0, x, top, "#1a1410", lock=True)
    k.rect(34, 0, 39, 3, GOLD, lock=True)
    k.rect(8, 4, 12, 6, RED, lock=True)
    k.rect(60, 4, 64, 6, RED, lock=True)
    for x, y in [(6, 40), (32, 32), (58, 40), (6, 54), (58, 54)]:
        k.rect(x, y, x + 2, y + 3, FIRE_YEL, lock=True)  # janelas acesas
    return k


def mountain(rx: int, ry: int, snowy: bool) -> Canvas:
    m = Canvas(rx * 2 + 2, ry + 2)
    m.poly([(0, ry), (rx * 0.9, 0), (rx * 2, ry)], ROCK)
    m.shade()
    cap = "#ffffff" if snowy else "#e8f0f4"
    m.poly([(rx * 0.6, ry * 0.32), (rx * 0.9, 0), (rx * 1.22, ry * 0.32), (rx * 1.02, ry * 0.26), (rx * 0.9, ry * 0.38), (rx * 0.76, ry * 0.26)], cap, lock=True)
    m.outline("#2a2018")
    return m


def firework(c: Canvas, cx: int, cy: int, col: str, r: int = 11) -> None:
    for k in range(12):
        a = k * math.pi / 6
        for d in range(2, r):
            if d % 2 == 0 or d > r - 3:
                c.put(int(cx + math.cos(a) * d), int(cy + math.sin(a) * d), col, lock=True)
    c.put(cx, cy, "#ffffff", lock=True)


# ---------- o mapa ----------

def mapa() -> Canvas:
    c = Canvas(W, H)
    noise = rng(7)
    base = {"grass": GRASS, "autumn": GRASS_AUT, "snow": SNOW, "sand": SAND, "sea": WATER}
    dark = {"grass": "#4f8a36", "autumn": "#7f7a34", "snow": "#c8d8e2", "sand": "#c4ad74", "sea": "#2f62a0"}
    light = {"grass": "#8cc95e", "autumn": "#c4ba62", "snow": "#ffffff", "sand": "#f4e4b8", "sea": "#74b2e6"}
    for y in range(H):
        for x in range(W):
            # borda irregular entre regiões
            jx = x + noise.randint(-3, 3)
            reg = region_of(jx, y)
            col = base[reg]
            r = noise.random()
            if reg == "sea":
                if (x + y * 3) % 23 == 0 or (x * 2 + y) % 37 == 0:
                    col = light[reg]
            elif r < 0.07:
                col = dark[reg]
            elif r < 0.10:
                col = light[reg]
            c.put(x, y, col)

    # flores no campo
    for _ in range(140):
        x, y = noise.randint(0, 215), noise.randint(0, H - 1)
        c.put(x, y, noise.choice(["#f6efdf", "#ffd24a", "#e05a8a"]))

    # lago
    lx, ly, lrx, lry = LAKE
    c.ellipse(lx, ly, lrx + 3, lry + 3, SAND)
    c.ellipse(lx, ly, lrx, lry, WATER)
    for k in range(18):
        x = int(lx - lrx + 8 + noise.random() * (lrx * 2 - 16))
        y = int(ly - lry + 6 + noise.random() * (lry * 2 - 12))
        c.rect(x, y, x + 3, y, "#74b2e6")

    # rio
    thick(c, RIVER, 7.5, "#2f62a0")
    thick(c, RIVER, 5.5, WATER)
    for k in range(40):
        i = noise.randint(0, len(RIVER) - 2)
        (ax, ay), (bx, by) = RIVER[i], RIVER[i + 1]
        t = noise.random()
        x, y = int(ax + (bx - ax) * t), int(ay + (by - ay) * t)
        c.rect(x - 1, y, x + 1, y, "#74b2e6")

    # montanhas
    for mx, my, rx, ry in MOUNTAINS:
        m = mountain(rx, ry, snowy=mx > 300)
        c.paste(m, int(mx - rx), int(my - ry))

    # estrada: borda escura, terra e pedrinhas
    thick(c, PATH, 6.0, "#7a5a36")
    thick(c, PATH, 4.6, DIRT)
    for k in range(260):
        i = noise.randint(0, len(PATH) - 2)
        (ax, ay), (bx, by) = PATH[i], PATH[i + 1]
        t = noise.random()
        x = int(ax + (bx - ax) * t + noise.randint(-3, 3))
        y = int(ay + (by - ay) * t + noise.randint(-3, 3))
        if c.get(x, y) == DIRT:
            c.put(x, y, "#a07a4a")

    # ponte onde a estrada cruza o rio
    for i in range(len(PATH) - 1):
        (ax, ay), (bx, by) = PATH[i], PATH[i + 1]
        if ay == by and min(ax, bx) < 300 < max(ax, bx):
            c.rect(288, ay - 7, 312, ay + 7, "#5e3b21", lock=True)
            for x in range(289, 312, 3):
                c.rect(x, ay - 6, x + 1, ay + 6, WOOD, lock=True)
            c.rect(288, ay - 7, 312, ay - 7, "#2a2018", lock=True)
            c.rect(288, ay + 7, 312, ay + 7, "#2a2018", lock=True)

    # vila da forja (início)
    vx0, vy0, vx1, vy1 = VILLAGE
    c.paste(forge(), 8, 266)
    c.paste(house(), 4, 312)
    c.paste(house(ROOF, glow=True), 64, 316)
    c.paste(house("#3f63b8"), 70, 264)
    for x, y in [(18, 262), (17, 259), (19, 256), (18, 252)]:
        c.put(x + 9, y, "#c9c3ba", lock=True)  # fumaça da chaminé

    # castelo do Réveillon (fim)
    c.paste(castle(), 528, 22)
    for cx, cy, col in [(512, 16, FIRE_YEL), (618, 22, "#8fd0ff"), (616, 128, "#ff6ac1"), (624, 74, "#7dff8a"), (590, 10, FIRE_OR)]:
        firework(c, cx, cy, col)

    # árvores, pinheiros e pedras espalhados, longe da estrada, do rio e das construções
    occupied: list[tuple[int, int, int]] = []

    def free(x: int, y: int, r: int) -> bool:
        if poly_dist(x, y, PATH) < r + 9:
            return False
        if poly_dist(x, y, RIVER) < r + 9:
            return False
        if ((x - lx) / (lrx + 8)) ** 2 + ((y - ly) / (lry + 8)) ** 2 < 1:
            return False
        if vx0 - 6 <= x <= vx1 + 6 and vy0 - 10 <= y <= vy1:
            return False
        if CASTLE[0] - 16 <= x <= CASTLE[2] + 8 and y <= CASTLE[3] + 14:
            return False
        for mx, my, rx, ry in MOUNTAINS:
            if mx - rx - 6 <= x <= mx + rx + 6 and my - ry - 6 <= y <= my + 6:
                return False
        if x >= SEA_X - 18:
            return False
        for ox, oy, orr in occupied:
            if math.hypot(ox - x, oy - y) < r + orr:
                return False
        return True

    sprites = []
    for gy in range(6, H - 8, 13):
        for gx in range(4, W - 10, 13):
            x = gx + noise.randint(-4, 4)
            y = gy + noise.randint(-4, 4)
            reg = region_of(x, y)
            if reg in ("sea", "sand") or noise.random() < 0.42:
                continue
            if not free(x, y, 7):
                continue
            occupied.append((x, y, 7))
            roll = noise.random()
            if reg == "grass":
                spr = rock() if roll < 0.08 else tree(LEAF)
            elif reg == "autumn":
                spr = rock() if roll < 0.15 else (tree(LEAF_AUT) if roll < 0.75 else pine(False))
            else:
                spr = rock() if roll < 0.1 else pine(True)
            sprites.append((y, x, spr))
    for y, x, spr in sorted(sprites, key=lambda s: s[0]):
        c.paste(spr, x - spr.w // 2, y - spr.h)
    return c


def export_json() -> None:
    data = {
        "width": W,
        "height": H,
        "path": [list(p) for p in PATH],
        "start": {"x": PATH[0][0], "y": PATH[0][1], "label": "Vila da Forja"},
        "end": {"x": PATH[-1][0], "y": PATH[-1][1], "label": "Castelo do Réveillon"},
        "regions": REGIONS,
    }
    out = ROOT / "src" / "config" / "mapa.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _mapa() -> Canvas:
    export_json()
    return mapa()


MAPS = {"mapa": _mapa}
