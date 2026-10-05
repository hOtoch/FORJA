"""Itens e ícones em pixel art: baús (16 × 16), bolsa do Fundo (16 × 16) e ícones de 12 × 12
para a semana, os atributos e os selos da temporada."""

from palette import *  # noqa: F403
from pixelkit import Canvas


def bau_fechado() -> Canvas:
    c = Canvas(16, 16)
    c.ellipse(8, 7, 7, 4.5, WOOD)  # tampa abaulada
    c.rect(1, 7, 14, 14, WOOD)
    c.rect(4, 3, 5, 14, STEEL_DK)  # cintas de ferro
    c.rect(10, 3, 11, 14, STEEL_DK)
    c.rect(1, 8, 14, 8, "#5e3b21")
    c.shade()
    c.outline()
    c.rect(7, 7, 8, 10, GOLD, lock=True)  # fechadura
    c.put(7, 9, EYE, lock=True)
    return c


def bau_aberto() -> Canvas:
    c = Canvas(16, 16)
    c.rect(2, 1, 13, 5, "#5e3b21")  # tampa aberta (de dentro)
    c.rect(4, 1, 5, 5, STEEL_DK)
    c.rect(10, 1, 11, 5, STEEL_DK)
    c.rect(1, 8, 14, 14, WOOD)
    c.rect(4, 8, 5, 14, STEEL_DK)
    c.rect(10, 8, 11, 14, STEEL_DK)
    c.ellipse(8, 7.5, 6.5, 2.2, GOLD)  # ouro transbordando
    c.shade()
    c.outline()
    for x, y in [(5, 6), (8, 5), (11, 6), (7, 7), (10, 7)]:
        c.put(x, y, STRAW, lock=True)
    for x, y in [(3, 3), (13, 2), (8, 0)]:
        c.put(x, y, FIRE_WHITE, lock=True)
    return c


def bolsa() -> Canvas:
    c = Canvas(16, 16)
    c.ellipse(7, 10.5, 5.5, 4.8, LEATHER)  # saco
    c.rect(5, 4, 9, 6, LEATHER)
    c.rect(4, 6, 10, 6, EMBER)  # cordão
    for i, y in enumerate((13, 11, 9)):  # pilha de moedas
        c.ellipse(12.5, y + 0.5, 3, 1.3, GOLD if i % 2 == 0 else STRAW)
    c.shade()
    c.outline()
    c.put(6, 10, STRAW, lock=True)
    c.put(7, 10, STRAW, lock=True)
    c.put(6, 11, STRAW, lock=True)
    return c


def _icon() -> Canvas:
    return Canvas(12, 12)


def icone_livro() -> Canvas:
    c = _icon()
    c.rect(1, 2, 5, 9, "#f6efdf")
    c.rect(6, 2, 10, 9, "#f6efdf")
    c.rect(1, 9, 10, 10, RED)  # capa
    c.rect(5, 2, 6, 10, RED)
    c.outline()
    for y in (4, 6, 8):
        c.rect(2, y, 4, y, "#b8ad94", lock=True)
        c.rect(7, y, 9, y, "#b8ad94", lock=True)
    return c


def icone_martelo() -> Canvas:
    c = _icon()
    c.rect(5, 5, 6, 11, WOOD)  # cabo
    c.rect(1, 1, 10, 4, STEEL)  # cabeça
    c.shade()
    c.outline()
    return c


def icone_coracao() -> Canvas:
    c = _icon()
    c.ellipse(4, 4.5, 3, 3, RED)
    c.ellipse(8, 4.5, 3, 3, RED)
    c.poly([(1.2, 5), (10.8, 5), (6, 10.5)], RED)
    c.shade()
    c.outline()
    c.put(3, 3, "#ffb0a0", lock=True)
    return c


def icone_chama() -> Canvas:
    c = _icon()
    c.poly([(6, 0), (9, 4), (10, 8), (8, 11), (4, 11), (2, 8), (3, 4)], FIRE_OR)
    c.poly([(6, 4), (8, 7), (7, 11), (5, 11), (4, 8)], FIRE_YEL)
    c.outline()
    c.put(6, 9, FIRE_WHITE, lock=True)
    c.put(6, 10, FIRE_WHITE, lock=True)
    return c


def icone_escudo() -> Canvas:
    c = _icon()
    c.poly([(1, 1), (11, 1), (11, 6), (6, 11.5), (1, 6)], BLUE)
    c.shade()
    c.outline()
    c.rect(5, 2, 6, 8, GOLD, lock=True)
    c.rect(3, 4, 8, 4, GOLD, lock=True)
    return c


def icone_escudo_vazio() -> Canvas:
    c = _icon()
    c.poly([(1, 1), (11, 1), (11, 6), (6, 11.5), (1, 6)], "#d8cbae")
    c.outline("#6b5a48")
    return c


def icone_ampulheta() -> Canvas:
    c = _icon()
    c.rect(2, 0, 9, 1, WOOD)
    c.rect(2, 10, 9, 11, WOOD)
    c.poly([(3, 2), (9, 2), (6, 6)], "#cfe9f5")
    c.poly([(6, 6), (3, 10), (9, 10)], "#cfe9f5")
    c.outline()
    c.rect(4, 8, 7, 9, STRAW, lock=True)
    c.put(5, 7, STRAW, lock=True)
    c.rect(4, 2, 7, 2, STRAW, lock=True)
    return c


ITEMS = {
    "bau-fechado": bau_fechado,
    "bau-aberto": bau_aberto,
    "bolsa": bolsa,
    "icone-livro": icone_livro,
    "icone-martelo": icone_martelo,
    "icone-coracao": icone_coracao,
    "icone-chama": icone_chama,
    "icone-escudo": icone_escudo,
    "icone-escudo-vazio": icone_escudo_vazio,
    "icone-ampulheta": icone_ampulheta,
}
