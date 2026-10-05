"""As 6 evoluções do ferreiro, uma por título (32 × 32).

Aprendiz da forja -> Malhador -> Ferreiro -> Armeiro -> Mestre ferreiro -> Lenda da forja.
Cada nível acrescenta equipamento: túnica e martelinho; avental e bandana; barba e marreta;
cota de malha, escudo e espada; armadura, capa e martelo de guerra; armadura dourada,
coroa e martelo em chamas.
"""

from palette import *  # noqa: F403
from pixelkit import Canvas


def _head(c: Canvas, hair: str = HAIR) -> None:
    c.ellipse(16, 8.6, 7.0, 6.0, hair)  # cabelo
    c.ellipse(16, 10.8, 5.6, 4.9, SKIN)  # rosto
    c.rect(10, 6, 21, 7, hair)  # franja
    c.put(12, 8, hair)
    c.put(19, 8, hair)


def _face(c: Canvas, mouth: str = "#a0623a") -> None:
    for x in (13, 18):
        c.put(x, 10, EYE, lock=True)
        c.put(x, 11, EYE, lock=True)
    c.put(15, 13, mouth, lock=True)
    c.put(16, 13, mouth, lock=True)


def _body(c: Canvas, shirt: str, pants: str, boots: str, sleeve: str | None = None, wide_arms: bool = False) -> None:
    c.rect(15, 15, 16, 16, SKIN)  # pescoço
    c.rect(11, 16, 20, 23, shirt)  # tronco
    a0, a1 = (8, 10) if wide_arms else (9, 10)
    b0, b1 = (21, 23) if wide_arms else (21, 22)
    c.rect(a0, 17, a1, 22, SKIN)  # braços
    c.rect(b0, 17, b1, 22, SKIN)
    s = sleeve or shirt
    c.rect(a0, 17, a1, 18, s)  # mangas
    c.rect(b0, 17, b1, 18, s)
    c.rect(12, 24, 14, 27, pants)  # pernas
    c.rect(17, 24, 19, 27, pants)
    c.rect(11, 27, 14, 28, boots)  # botas
    c.rect(17, 27, 20, 28, boots)


def _belt(c: Canvas, color: str = LEATHER_DK, buckle: str = GOLD) -> None:
    c.rect(11, 22, 20, 22, color)
    c.put(15, 22, buckle, lock=True)
    c.put(16, 22, buckle, lock=True)


def _hammer(c: Canvas, x: int, top: int, head_w: int, head_h: int, handle_bottom: int, head: str = STEEL, handle: str = WOOD) -> None:
    c.rect(x, top + head_h, x, handle_bottom, handle)
    hx0 = x - head_w // 2
    c.rect(hx0, top, hx0 + head_w - 1, top + head_h - 1, head)


def _finish(c: Canvas) -> Canvas:
    c.shade()
    c.outline()
    return c


def tier1() -> Canvas:
    """Aprendiz da forja: túnica vermelha, cabelo bagunçado, martelinho."""
    c = Canvas(32, 32)
    _head(c)
    c.put(14, 2, HAIR)
    c.put(17, 2, HAIR)
    _body(c, RED, LEATHER, LEATHER_DK)
    _belt(c)
    _hammer(c, 24, 13, 5, 3, 23)
    _face(c)
    return _finish(c)


def tier2() -> Canvas:
    """Malhador: camisa cinza, avental de couro, bandana de brasa, martelo médio, braços fortes."""
    c = Canvas(32, 32)
    _head(c)
    c.rect(9, 5, 22, 6, EMBER)  # bandana
    c.put(23, 6, EMBER)
    c.put(24, 7, EMBER)
    _body(c, CLOTH, STEEL_DK, LEATHER_DK, sleeve=CLOTH, wide_arms=True)
    c.rect(12, 18, 19, 25, LEATHER)  # avental
    c.put(12, 16, LEATHER_DK)
    c.put(19, 16, LEATHER_DK)
    c.put(12, 17, LEATHER_DK)
    c.put(19, 17, LEATHER_DK)
    _hammer(c, 25, 11, 6, 3, 23)
    _face(c)
    return _finish(c)


def tier3() -> Canvas:
    """Ferreiro: barba cheia, avental escuro, luvas, marreta grande."""
    c = Canvas(32, 32)
    _head(c)
    _body(c, STEEL_DK, CLOTH, LEATHER_DK, wide_arms=True)
    c.ellipse(16, 14.2, 5.4, 3.6, BEARD)  # barba
    c.rect(12, 18, 19, 26, LEATHER_DK)  # avental
    c.put(15, 20, EMBER, lock=True)  # brasão de bigorna (brasa)
    c.put(16, 20, EMBER, lock=True)
    c.rect(8, 21, 10, 22, LEATHER_DK)  # luvas
    c.rect(21, 21, 23, 22, LEATHER_DK)
    _hammer(c, 25, 7, 8, 4, 23, head=STEEL_DK)
    _face(c, mouth=EYE)
    return _finish(c)


def tier4() -> Canvas:
    """Armeiro: elmo de aço, cota de malha, tabardo azul com cruz dourada, escudo e espada."""
    c = Canvas(32, 32)
    _head(c)
    c.ellipse(16, 7.6, 7.2, 5.4, STEEL)  # elmo
    c.rect(9, 8, 22, 8, STEEL_DK)  # aba
    c.rect(15, 8, 16, 11, STEEL)  # proteção do nariz
    _body(c, STEEL, STEEL_DK, STEEL_DK, wide_arms=True)
    # cota de malha (xadrez travado para não sumir no sombreamento)
    for y in range(16, 24):
        for x in list(range(8, 11)) + list(range(21, 24)) + list(range(11, 21)):
            if c.get(x, y) == STEEL and (x + y) % 2 == 0:
                c.put(x, y, STEEL_DK, lock=True)
    c.rect(13, 17, 18, 25, BLUE)  # tabardo
    c.rect(15, 18, 16, 23, GOLD)
    c.rect(14, 19, 17, 19, GOLD)
    _belt(c)
    # escudo na mão esquerda (lado esquerdo da imagem)
    c.poly([(2, 16), (10, 16), (10, 23), (6, 27), (2, 23)], BLUE)
    c.rect(5, 17, 6, 25, GOLD)
    c.rect(3, 19, 9, 20, GOLD)
    # espada na direita
    c.rect(25, 7, 25, 19, STEEL)
    c.rect(23, 20, 27, 20, GOLD)
    c.rect(25, 21, 25, 23, LEATHER_DK)
    _face(c)
    # o rosto fica dentro do elmo
    c.rect(11, 9, 20, 9, SKIN)
    _face(c)
    return _finish(c)


def tier5() -> Canvas:
    """Mestre ferreiro: armadura completa com friso dourado, capa vermelha, penacho e martelo de guerra."""
    c = Canvas(32, 32)
    c.rect(9, 16, 22, 28, RED)  # capa por trás
    _head(c)
    c.ellipse(16, 7.6, 7.2, 5.4, STEEL)  # elmo
    c.rect(9, 8, 22, 8, GOLD)
    c.rect(15, 8, 16, 11, STEEL)
    c.rect(15, 0, 16, 2, RED)  # penacho
    c.rect(14, 1, 17, 2, RED)
    _body(c, STEEL, STEEL, STEEL_DK, wide_arms=True)
    c.rect(8, 16, 11, 18, STEEL)  # ombreiras
    c.rect(20, 16, 23, 18, STEEL)
    c.rect(8, 18, 11, 18, GOLD)
    c.rect(20, 18, 23, 18, GOLD)
    c.rect(11, 19, 20, 19, GOLD)  # friso do peitoral
    c.rect(15, 16, 16, 21, GOLD)
    _belt(c, GOLD, RED)
    c.rect(8, 21, 10, 22, STEEL_DK)  # manoplas
    c.rect(21, 21, 23, 22, STEEL_DK)
    _hammer(c, 26, 5, 7, 5, 23, head=STEEL_DK, handle=LEATHER_DK)
    c.rect(23, 7, 29, 7, GOLD)
    c.rect(11, 9, 20, 9, SKIN)
    _face(c)
    return _finish(c)


def tier6() -> Canvas:
    """Lenda da forja: armadura dourada, coroa, capa roxa, martelo em chamas e brilho em volta."""
    c = Canvas(32, 32)
    c.rect(9, 16, 22, 28, PURPLE)  # capa real
    _head(c)
    c.ellipse(16, 7.8, 7.2, 5.2, GOLD)  # elmo dourado
    c.rect(15, 8, 16, 11, GOLD)
    # coroa
    for x, h in ((10, 2), (13, 3), (16, 4), (19, 3), (22, 2)):
        c.rect(x - 1 if x == 16 else x, 4 - h, x, 3, GOLD)
    c.put(15, 1, FIRE_RED, lock=True)
    c.put(16, 1, FIRE_RED, lock=True)
    _body(c, GOLD, GOLD, STEEL_DK, wide_arms=True)
    c.rect(8, 16, 11, 18, GOLD)
    c.rect(20, 16, 23, 18, GOLD)
    c.rect(11, 19, 20, 19, STRAW)
    c.rect(15, 16, 16, 21, EMBER)  # núcleo em brasa
    _belt(c, PURPLE_DK, FIRE_WHITE)
    _hammer(c, 26, 5, 7, 5, 23, head=STEEL_DK, handle=GOLD)
    c.rect(11, 9, 20, 9, SKIN)
    _face(c)
    c.shade()
    c.outline()
    # chamas na cabeça do martelo e brilho em volta (depois do contorno)
    for x, y, col in [
        (23, 3, FIRE_RED), (24, 2, FIRE_OR), (25, 1, FIRE_YEL), (26, 2, FIRE_OR), (27, 1, FIRE_YEL),
        (28, 2, FIRE_OR), (29, 3, FIRE_RED), (25, 3, FIRE_YEL), (27, 3, FIRE_WHITE), (26, 0, FIRE_WHITE),
        (24, 4, FIRE_OR), (28, 4, FIRE_OR),
    ]:
        c.put(x, y, col, lock=True)
    for x, y in [(3, 6), (5, 12), (2, 20), (29, 14), (30, 24), (4, 28), (27, 29)]:
        c.put(x, y, FIRE_WHITE, lock=True)
        c.put(x - 1, y, STRAW, lock=True)
        c.put(x + 1, y, STRAW, lock=True)
        c.put(x, y - 1, STRAW, lock=True)
        c.put(x, y + 1, STRAW, lock=True)
    return c


HEROES = {
    "heroi-1": tier1,
    "heroi-2": tier2,
    "heroi-3": tier3,
    "heroi-4": tier4,
    "heroi-5": tier5,
    "heroi-6": tier6,
}
