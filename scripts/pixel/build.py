"""Gera os PNG de pixel art do Forja (baús, bolsa e ícones) com o renderizador da skill pixel-art-gen.

O personagem, os chefes e o mapa são ilustrações prontas em public/pixel/ e não passam por aqui.

Para cada desenho: monta a grade (pixelkit), grava o JSON esparso no formato da skill e
chama `render_pixel_art.py` para gerar o PNG em public/pixel/ (1 px de arte = 1 px de PNG;
a interface amplia com image-rendering: pixelated).

Uso:
    python scripts/pixel/build.py              # tudo
    python scripts/pixel/build.py bau icone   # só os nomes que começam com esses prefixos
    python scripts/pixel/build.py --sheet out.png   # também monta uma folha de conferência

O script da skill fica em ~/.claude/skills/pixel-art-gen/scripts/render_pixel_art.py
(ou em PIXEL_ART_RENDERER). Os PNG gerados ficam no git; não é preciso rodar no deploy.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

ROOT = HERE.parent.parent
OUT = ROOT / "public" / "pixel"
JSON_DIR = HERE / ".json"  # intermediário, fora do git
RENDERER = Path(
    os.environ.get(
        "PIXEL_ART_RENDERER",
        Path.home() / ".claude" / "skills" / "pixel-art-gen" / "scripts" / "render_pixel_art.py",
    )
)


def all_art() -> dict:
    from items import ITEMS

    return dict(ITEMS)


def render(name: str, canvas) -> Path:
    JSON_DIR.mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    data = canvas.to_skill_json()
    jpath = JSON_DIR / f"{name}.json"
    jpath.write_text(json.dumps(data), encoding="utf-8")
    png = OUT / f"{name}.png"
    subprocess.run([sys.executable, str(RENDERER), str(jpath), "-o", str(png), "-p", "1"], check=True, capture_output=True)
    return png


def sheet(paths: list[Path], out: Path, scale: int = 4) -> None:
    from PIL import Image

    imgs = [Image.open(p).convert("RGBA") for p in paths]
    small = [im for im in imgs if im.width <= 64]
    cols = 6
    cell = 32 * scale + 16
    rows = (len(small) + cols - 1) // cols
    W = cols * cell
    H = rows * cell
    big = [im for im in imgs if im.width > 64]
    for im in big:
        H += im.height * 2 + 16
    canvas = Image.new("RGBA", (W if not big else max(W, max(im.width * 2 for im in big)), H), (234, 224, 202, 255))
    for i, im in enumerate(small):
        s = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        x = (i % cols) * cell + (cell - s.width) // 2
        y = (i // cols) * cell + (cell - s.height) // 2
        canvas.alpha_composite(s, (x, y))
    y = rows * cell
    for im in big:
        s = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        canvas.alpha_composite(s, (0, y))
        y += s.height + 16
    canvas.save(out)


def main(argv: list[str]) -> None:
    sheet_out = None
    if "--sheet" in argv:
        i = argv.index("--sheet")
        sheet_out = Path(argv[i + 1])
        argv = argv[:i] + argv[i + 2 :]
    if not RENDERER.exists():
        sys.exit(f"Renderizador da skill não encontrado: {RENDERER}")
    art = all_art()
    names = [n for n in art if not argv or any(n.startswith(p) for p in argv)]
    done = []
    for n in names:
        done.append(render(n, art[n]()))
        print(f"ok {n}")
    if sheet_out:
        sheet(done, sheet_out)
        print(f"folha: {sheet_out}")


if __name__ == "__main__":
    main(sys.argv[1:])
