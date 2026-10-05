"""Kit mínimo para desenhar pixel art em grade, no formato da skill pixel-art-gen.

Os desenhos são feitos com formas simples (retângulos, elipses, linhas, polígonos e
carimbos em ASCII) numa grade de cores. Depois, `outline()` desenha o contorno escuro e
`shade()` dá volume (luz no alto à esquerda, sombra embaixo à direita). `to_skill_json()`
devolve o JSON esparso que o script render_pixel_art.py da skill transforma em PNG.
"""

from __future__ import annotations

import math
import random

OUTLINE = "#1a1410"

# Paleta mestre: cada cor base tem um tom de luz e um de sombra.
RAMPS: dict[str, tuple[str, str]] = {}


def ramp(base: str, light: str, dark: str) -> str:
    RAMPS[base.lower()] = (light, dark)
    return base


class Canvas:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.px: list[list[str | None]] = [[None] * w for _ in range(h)]
        # pixels marcados como "não sombrear" (olhos, brilho, contorno)
        self.lock: set[tuple[int, int]] = set()

    # ---------- primitivas ----------
    def put(self, x: int, y: int, c: str | None, lock: bool = False) -> None:
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c
            if lock:
                self.lock.add((x, y))
            else:
                self.lock.discard((x, y))

    def get(self, x: int, y: int) -> str | None:
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x]
        return None

    def rect(self, x0: int, y0: int, x1: int, y1: int, c: str, lock: bool = False) -> None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c, lock)

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, c: str, lock: bool = False) -> None:
        for y in range(self.h):
            for x in range(self.w):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                if dx * dx + dy * dy <= 1.0:
                    self.put(x, y, c, lock)

    def poly(self, pts: list[tuple[float, float]], c: str, lock: bool = False) -> None:
        """Preenche um polígono (regra par-ímpar, pelo centro do pixel)."""
        n = len(pts)
        for y in range(self.h):
            py = y + 0.5
            for x in range(self.w):
                px = x + 0.5
                inside = False
                j = n - 1
                for i in range(n):
                    xi, yi = pts[i]
                    xj, yj = pts[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                        inside = not inside
                    j = i
                if inside:
                    self.put(x, y, c, lock)

    def line(self, x0: int, y0: int, x1: int, y1: int, c: str, lock: bool = False) -> None:
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            self.put(x0, y0, c, lock)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def stamp(self, art: str, x: int, y: int, pal: dict[str, str], lock: bool = True) -> None:
        """Carimbo em ASCII: '.' não pinta; '_' apaga; demais letras usam `pal`."""
        rows = [r for r in art.strip("\n").split("\n")]
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row.strip("|")):
                if ch == ".":
                    continue
                if ch == "_":
                    self.put(x + dx, y + dy, None)
                    continue
                self.put(x + dx, y + dy, pal[ch], lock)

    def mirror(self) -> None:
        """Copia a metade esquerda para a direita (simetria vertical)."""
        for y in range(self.h):
            for x in range(self.w // 2):
                self.px[y][self.w - 1 - x] = self.px[y][x]
                if (x, y) in self.lock:
                    self.lock.add((self.w - 1 - x, y))

    def replace(self, a: str, b: str) -> None:
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] == a:
                    self.px[y][x] = b

    # ---------- acabamento ----------
    def shade(self) -> None:
        """Luz no alto à esquerda, sombra embaixo à direita, só nas bordas de cada cor."""
        src = [row[:] for row in self.px]
        for y in range(self.h):
            for x in range(self.w):
                c = src[y][x]
                if c is None or (x, y) in self.lock or c.lower() not in RAMPS:
                    continue
                light, dark = RAMPS[c.lower()]

                def other(nx: int, ny: int) -> bool:
                    if not (0 <= nx < self.w and 0 <= ny < self.h):
                        return True
                    return src[ny][nx] != c

                if other(x + 1, y) or other(x, y + 1):
                    self.px[y][x] = dark
                elif other(x - 1, y) or other(x, y - 1):
                    self.px[y][x] = light

    def outline(self, color: str = OUTLINE, diagonal: bool = False) -> None:
        """Contorno de 1 px em volta de tudo o que foi pintado."""
        src = [row[:] for row in self.px]
        neigh = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        if diagonal:
            neigh += [(1, 1), (-1, -1), (1, -1), (-1, 1)]
        for y in range(self.h):
            for x in range(self.w):
                if src[y][x] is not None:
                    continue
                for dx, dy in neigh:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h and src[ny][nx] not in (None, color):
                        self.put(x, y, color, lock=True)
                        break

    def paste(self, other: "Canvas", ox: int, oy: int) -> None:
        for y in range(other.h):
            for x in range(other.w):
                c = other.px[y][x]
                if c is not None:
                    self.put(ox + x, oy + y, c, (x, y) in other.lock)

    # ---------- saída ----------
    def to_skill_json(self, background: str = "transparent", pixel_size: int = 1) -> dict:
        pixels = []
        for y in range(self.h):
            for x in range(self.w):
                c = self.px[y][x]
                if c is not None:
                    pixels.append({"x": x, "y": y, "color": c})
        return {
            "width": self.w,
            "height": self.h,
            "background": background,
            "grid_lines": False,
            "pixel_size": pixel_size,
            "pixels": pixels,
        }


def rng(seed: int) -> random.Random:
    return random.Random(seed)


def dist(ax: float, ay: float, bx: float, by: float) -> float:
    return math.hypot(ax - bx, ay - by)
