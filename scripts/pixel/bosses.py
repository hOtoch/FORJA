"""Os 12 chefes da Temporada 1 (32 × 32), um por semana. Cada um é um vilão da disciplina.

Os desenhos são simétricos em volta de x = 16 (as elipses com centro 16 já saem simétricas).
"""

from palette import *  # noqa: F403
from pixelkit import Canvas


def _eyes(c: Canvas, y: int, xl: int, xr: int, color: str = EYE, h: int = 1) -> None:
    for x in (xl, xr):
        for dy in range(h):
            c.put(x, y + dy, color, lock=True)


def _sym(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Espelha uma lista de pontos da metade esquerda para fechar o polígono."""
    return pts + [(32 - x, y) for x, y in reversed(pts)]


def _zzz(c: Canvas) -> None:
    for x, y in [(23, 1), (24, 1), (25, 1), (24, 2), (23, 3), (24, 3), (25, 3), (27, 4), (28, 4), (28, 5), (27, 6), (28, 6)]:
        c.put(x, y, WHITE, lock=True)


def ogro() -> Canvas:
    """Semana 1. Ogro da Preguiça: dorme de olhos fechados, segura um porrete."""
    c = Canvas(32, 32)
    c.ellipse(16, 22, 10.5, 8.5, GREEN)  # corpo
    c.ellipse(5.5, 20, 3, 5.5, GREEN)  # braços
    c.ellipse(26.5, 20, 3, 5.5, GREEN)
    c.ellipse(16, 10.5, 8, 6.8, GREEN)  # cabeça
    c.ellipse(7.5, 10, 2, 2.6, GREEN)  # orelhas
    c.ellipse(24.5, 10, 2, 2.6, GREEN)
    c.ellipse(16, 24, 5.5, 4.2, "#9cc764")  # barriga
    c.rect(8, 26, 23, 28, LEATHER)  # tanga
    c.rect(10, 28, 13, 30, GREEN_DK)  # pernas
    c.rect(18, 28, 21, 30, GREEN_DK)
    # porrete
    c.line(27, 22, 29, 9, WOOD)
    c.line(28, 22, 30, 9, WOOD)
    c.ellipse(29.5, 9.5, 2.4, 3.4, WOOD)
    c.shade()
    c.outline()
    for x, y in [(28, 8), (30, 10)]:
        c.put(x, y, STEEL, lock=True)
    # rosto: olhos fechados, nariz, boca com presas
    for x in (12, 13, 18, 19):
        c.put(x, 10, EYE, lock=True)
    c.put(11, 9, EYE, lock=True)
    c.put(20, 9, EYE, lock=True)
    c.rect(15, 11, 16, 12, GREEN_DK, lock=True)
    c.rect(12, 14, 19, 14, EYE, lock=True)
    c.put(13, 13, WHITE, lock=True)
    c.put(18, 13, WHITE, lock=True)
    _zzz(c)
    return c


def goblin() -> Canvas:
    """Semana 2. Goblin da Distração: chapéu de bobo com guizos, olhos para os lados."""
    c = Canvas(32, 32)
    c.poly([(10, 12), (1, 6), (10, 16)], GREEN)  # orelhas
    c.poly([(22, 12), (31, 6), (22, 16)], GREEN)
    c.ellipse(16, 14, 7, 6.2, GREEN)  # cabeça
    c.poly([(9, 9), (3, 1), (15, 8)], RED)  # chapéu: duas pontas
    c.poly([(17, 8), (29, 1), (23, 9)], PURPLE)
    c.rect(9, 7, 22, 8, GOLD)
    c.rect(11, 20, 15, 27, RED)  # roupa de bobo, metade e metade
    c.rect(16, 20, 20, 27, PURPLE)
    c.rect(8, 21, 10, 25, GREEN)  # braços
    c.rect(21, 21, 23, 25, GREEN)
    c.rect(12, 28, 14, 30, PURPLE_DK)
    c.rect(17, 28, 19, 30, PURPLE_DK)
    c.shade()
    c.outline()
    for x, y in [(3, 1), (29, 1)]:
        c.rect(x - 1, y, x + 1, y + 1, STRAW, lock=True)
    # olhos grandes, olhando para o lado (distraído)
    for cx in (13, 19):
        c.rect(cx - 1, 12, cx + 1, 14, WHITE, lock=True)
        c.put(cx + 1, 13, EYE, lock=True)
        c.put(cx + 1, 12, EYE, lock=True)
    c.rect(13, 17, 18, 17, EYE, lock=True)  # sorriso
    c.put(12, 16, EYE, lock=True)
    c.put(19, 16, EYE, lock=True)
    c.put(14, 18, WHITE, lock=True)
    c.put(17, 18, WHITE, lock=True)
    c.put(16, 22, STRAW, lock=True)
    c.put(15, 24, STRAW, lock=True)
    return c


def lich() -> Canvas:
    """Semana 3. Lich da Procrastinação: caveira coroada, manto roxo, ampulheta parada."""
    c = Canvas(32, 32)
    c.ellipse(16, 11, 9, 8.5, PURPLE_DK)  # capuz
    c.poly(_sym([(9, 17), (4, 31)]), PURPLE)  # manto
    c.ellipse(16, 10.5, 6.2, 5.8, BONE)  # crânio
    c.rect(12, 14, 19, 17, BONE)  # mandíbula
    c.rect(6, 23, 8, 25, BONE)  # mãos
    c.rect(23, 23, 25, 25, BONE)
    # ampulheta
    c.rect(12, 20, 19, 20, GOLD)
    c.rect(12, 28, 19, 28, GOLD)
    c.poly([(13, 21), (19, 21), (16, 24.5)], "#fbe9b4")
    c.poly([(16, 24.5), (13, 28), (19, 28)], "#fbe9b4")
    c.shade()
    c.outline()
    c.rect(12, 9, 14, 11, EYE, lock=True)  # órbitas
    c.rect(17, 9, 19, 11, EYE, lock=True)
    c.put(13, 10, GLOW_BLUE, lock=True)
    c.put(18, 10, GLOW_BLUE, lock=True)
    c.put(15, 12, EYE, lock=True)
    c.put(16, 12, EYE, lock=True)
    for x in (13, 15, 17):
        c.rect(x, 15, x, 17, EYE, lock=True)
    c.rect(14, 26, 17, 27, STRAW, lock=True)  # areia parada embaixo
    # coroa
    for x0, top in ((11, 1), (14, 0), (17, 0), (20, 1)):
        c.rect(x0, top, x0 + 1, 4, GOLD, lock=True)
    c.rect(11, 3, 21, 4, GOLD, lock=True)
    c.put(15, 2, FIRE_RED, lock=True)
    c.put(16, 2, FIRE_RED, lock=True)
    return c


def troll() -> Canvas:
    """Semana 4. Troll do Sofá: largado no sofá, coxa de frango na mão."""
    c = Canvas(32, 32)
    c.rect(2, 14, 29, 26, COUCH)  # encosto
    c.rect(1, 20, 5, 29, COUCH)  # braços do sofá
    c.rect(26, 20, 30, 29, COUCH)
    c.rect(5, 25, 26, 29, "#a84a5a")  # assento
    c.ellipse(16, 20, 8.5, 6.5, TROLL)  # corpo
    c.ellipse(16, 9.5, 7, 6, TROLL)  # cabeça
    c.ellipse(16, 11.5, 2.8, 2.2, "#a2b8b6")  # nariz
    c.rect(11, 25, 14, 30, TROLL)  # pernas penduradas
    c.rect(17, 25, 20, 30, TROLL)
    c.ellipse(7.5, 19, 2.5, 4, TROLL)  # braços
    c.ellipse(24.5, 19, 2.5, 4, TROLL)
    c.shade()
    c.outline()
    for cx in (13, 19):  # olhos preguiçosos, com pálpebra pesada
        c.rect(cx - 1, 7, cx, 8, WHITE, lock=True)
        c.rect(cx - 1, 7, cx, 7, "#566a6a", lock=True)
        c.put(cx, 8, EYE, lock=True)
    c.rect(11, 5, 14, 5, "#3e4a4a", lock=True)  # sobrancelhas
    c.rect(17, 5, 20, 5, "#3e4a4a", lock=True)
    c.put(15, 12, EYE, lock=True)  # narinas
    c.put(17, 12, EYE, lock=True)
    c.rect(12, 14, 19, 14, EYE, lock=True)
    c.rect(12, 12, 12, 13, WHITE, lock=True)  # presas
    c.rect(19, 12, 19, 13, WHITE, lock=True)
    for x, y in [(15, 2), (16, 1), (17, 2)]:
        c.put(x, y, STONE_DK, lock=True)  # tufo
    # coxa de frango
    c.rect(25, 13, 26, 16, BONE, lock=True)
    c.rect(24, 9, 27, 12, "#c47a3a", lock=True)
    c.put(24, 9, EYE, lock=True)
    return c


def serpente() -> Canvas:
    """Semana 5. Serpente do Celular: hipnotizada por uma tabuleta brilhante."""
    c = Canvas(32, 32)
    c.ellipse(13, 27, 10, 4, TEAL)  # rolo do corpo
    c.ellipse(12, 23, 7, 3.5, TEAL)
    c.rect(11, 12, 15, 23, TEAL)  # pescoço
    c.poly([(5, 13), (8, 6), (13, 3), (18, 6), (21, 13), (13, 16)], TEAL)  # capelo
    c.ellipse(13, 8, 4.5, 4, "#66c2ae")  # cabeça
    c.rect(21, 18, 28, 29, STONE_DK)  # tabuleta
    c.shade()
    c.outline()
    c.rect(22, 19, 27, 27, GLOW_BLUE, lock=True)  # tela
    for y in (21, 23, 25):
        c.rect(23, y, 26, y, "#4aa8e0", lock=True)
    c.rect(11, 7, 11, 9, STRAW, lock=True)  # olhos em fenda
    c.rect(15, 7, 15, 9, STRAW, lock=True)
    c.put(11, 8, GLOW_BLUE, lock=True)  # reflexo da tela
    c.put(15, 8, GLOW_BLUE, lock=True)
    c.rect(13, 11, 13, 13, FIRE_RED, lock=True)  # língua
    c.put(12, 14, FIRE_RED, lock=True)
    c.put(14, 14, FIRE_RED, lock=True)
    for x, y in [(8, 9), (17, 9), (9, 12), (16, 12)]:
        c.put(x, y, "#25665a", lock=True)
    return c


def golem() -> Canvas:
    """Semana 6. Golem do Cansaço: pedra rachada, olheiras e olhos quase fechados."""
    c = Canvas(32, 32)
    c.rect(10, 3, 21, 11, STONE)  # cabeça
    c.rect(7, 12, 24, 24, STONE)  # tronco
    c.rect(2, 12, 6, 23, STONE_DK)  # braços
    c.rect(25, 12, 29, 23, STONE_DK)
    c.rect(1, 23, 7, 26, STONE)  # punhos
    c.rect(24, 23, 30, 26, STONE)
    c.rect(9, 25, 14, 30, STONE_DK)  # pernas
    c.rect(17, 25, 22, 30, STONE_DK)
    c.shade()
    c.outline()
    # olhos cansados: brasa fraca sob pálpebras pesadas, olheiras roxas
    c.rect(12, 6, 14, 6, STONE_DK, lock=True)
    c.rect(17, 6, 19, 6, STONE_DK, lock=True)
    c.rect(12, 7, 14, 7, EMBER, lock=True)
    c.rect(17, 7, 19, 7, EMBER, lock=True)
    c.rect(12, 8, 14, 8, BAT, lock=True)
    c.rect(17, 8, 19, 8, BAT, lock=True)
    c.rect(14, 10, 17, 10, EYE, lock=True)
    # rachaduras e musgo
    for x, y in [(10, 14), (11, 15), (11, 16), (12, 17), (20, 18), (21, 19), (20, 20), (15, 21), (16, 22)]:
        c.put(x, y, STONE_DK, lock=True)
    for x, y in [(8, 12), (9, 12), (8, 13), (22, 12), (23, 12), (23, 13), (11, 3), (12, 3), (19, 3)]:
        c.put(x, y, GREEN, lock=True)
    c.ellipse(16, 18, 2.2, 2.2, "#ff9a4a", lock=True)  # núcleo apagando
    c.put(16, 18, "#ffd08a", lock=True)
    return c


def morcego() -> Canvas:
    """Semana 7. Morcego das Desculpas: segura um pergaminho de desculpas sem fim."""
    c = Canvas(32, 32)
    c.poly(_sym([(16, 9), (8, 6), (1, 10), (2, 20), (5, 18), (7, 21), (10, 19), (13, 22)]), BAT)  # asas
    c.ellipse(16, 15, 5, 6.5, "#7a5a90")  # corpo
    c.poly(_sym([(11, 9), (10, 2), (14, 7)]), BAT)  # orelhas
    c.ellipse(16, 10, 4.5, 4, BAT)  # cabeça
    c.rect(11, 22, 20, 30, BONE)  # pergaminho
    c.shade()
    c.outline()
    for y in range(23, 30, 2):
        c.rect(13, y, 18, y, "#9a8f80", lock=True)  # linhas de texto
    c.rect(11, 22, 20, 22, "#c9bfa6", lock=True)
    c.rect(11, 30, 20, 30, "#c9bfa6", lock=True)
    c.put(14, 9, GLOW_RED, lock=True)
    c.put(18, 9, GLOW_RED, lock=True)
    c.put(15, 13, WHITE, lock=True)  # presas
    c.put(17, 13, WHITE, lock=True)
    c.rect(14, 12, 18, 12, EYE, lock=True)
    return c


def slime() -> Canvas:
    """Semana 8. Slime do Tédio: uma gosma enorme e entediada."""
    c = Canvas(32, 32)
    c.ellipse(16, 21, 13.5, 9.5, SLIME)
    c.ellipse(16, 12, 7, 5, SLIME)
    c.rect(6, 28, 26, 30, SLIME)
    c.ellipse(9, 30, 2, 1.6, SLIME)  # escorrido
    c.shade()
    c.outline()
    # olhos entediados (meio fechados)
    for cx in (12, 20):
        c.rect(cx - 2, 18, cx + 1, 20, WHITE, lock=True)
        c.rect(cx - 2, 18, cx + 1, 18, "#3f8a46", lock=True)
        c.put(cx, 20, EYE, lock=True)
        c.put(cx - 1, 20, EYE, lock=True)
    c.rect(14, 24, 18, 24, EYE, lock=True)  # boca reta
    for x, y in [(9, 13), (10, 12), (8, 15), (22, 10)]:
        c.put(x, y, "#e4ffe4", lock=True)  # brilho
    for x, y in [(27, 6), (28, 5), (29, 6), (28, 7), (25, 3), (26, 3)]:
        c.put(x, y, "#9be29b", lock=True)  # bolhas
    return c


def cavaleiro() -> Canvas:
    """Semana 9. Cavaleiro Sombrio do Adiamento: relógio no peito, espada cravada no chão."""
    c = Canvas(32, 32)
    c.poly(_sym([(9, 13), (6, 31)]), PURPLE_DK)  # capa rasgada
    c.ellipse(16, 8, 6.5, 6, DARK)  # elmo
    c.rect(10, 13, 21, 25, DARK)  # couraça
    c.ellipse(9, 14, 3, 2.6, DARK)  # ombreiras
    c.ellipse(23, 14, 3, 2.6, DARK)
    c.rect(7, 16, 9, 23, DARK)  # braços
    c.rect(22, 16, 24, 23, DARK)
    c.rect(11, 26, 14, 30, DARK)
    c.rect(17, 26, 20, 30, DARK)
    c.rect(15, 18, 16, 31, STEEL_DK)  # espada cravada
    c.rect(12, 17, 19, 17, STEEL)
    c.shade()
    c.outline()
    c.rect(11, 8, 20, 8, EYE, lock=True)  # viseira em T
    c.rect(15, 8, 16, 11, EYE, lock=True)
    c.put(13, 8, GLOW_RED, lock=True)
    c.put(18, 8, GLOW_RED, lock=True)
    for x, y in [(15, 1), (16, 0), (17, 1), (16, 1)]:
        c.put(x, y, PURPLE, lock=True)  # penacho
    # espinhos nas ombreiras
    for x, y in [(7, 11), (24, 11), (6, 12), (25, 12)]:
        c.put(x, y, STEEL, lock=True)
    # relógio no peito
    c.ellipse(16, 21.5, 2.6, 2.6, GOLD, lock=True)
    c.put(16, 21, EYE, lock=True)
    c.put(16, 20, EYE, lock=True)
    c.put(17, 21, EYE, lock=True)
    return c


def hidra() -> Canvas:
    """Semana 10. Hidra dos Compromissos: três cabeças, cada uma puxando para um lado."""
    c = Canvas(32, 32)
    c.ellipse(16, 26, 10, 5.5, TEAL)  # corpo
    c.rect(14, 10, 17, 24, TEAL)  # pescoço do meio
    c.line(10, 24, 6, 14, TEAL)  # pescoços dos lados
    c.line(11, 24, 7, 14, TEAL)
    c.line(9, 24, 5, 14, TEAL)
    c.line(21, 24, 25, 14, TEAL)
    c.line(20, 24, 24, 14, TEAL)
    c.line(22, 24, 26, 14, TEAL)
    for cx, cy in ((16, 7), (6, 12), (26, 12)):
        c.ellipse(cx, cy, 4, 3.2, "#66c2ae")
    c.shade()
    c.outline()
    for cx, cy in ((16, 7), (6, 12), (26, 12)):
        c.put(cx - 2, cy - 1, GLOW_YELLOW, lock=True)
        c.put(cx + 1, cy - 1, GLOW_YELLOW, lock=True)
        c.rect(cx - 2, cy + 1, cx + 1, cy + 1, EYE, lock=True)
        c.put(cx - 1, cy + 2, WHITE, lock=True)
    for x in range(10, 23, 3):
        c.put(x, 25, "#25665a", lock=True)
    return c


def dragao() -> Canvas:
    """Semana 11. Dragão do Fim de Ano: chifres, asas abertas e fumaça."""
    c = Canvas(32, 32)
    c.poly(_sym([(12, 14), (2, 5), (0, 18), (4, 16), (6, 21), (11, 20)]), "#8a2718")  # asas
    c.ellipse(16, 22, 7.5, 8, DRAGON)  # corpo
    c.ellipse(16, 23, 4, 5.5, STRAW)  # barriga
    c.ellipse(16, 10, 6.5, 5.5, DRAGON)  # cabeça
    c.rect(12, 12, 19, 16, DRAGON)  # focinho
    c.poly(_sym([(11, 7), (8, 0), (13, 5)]), BONE)  # chifres
    c.rect(10, 28, 13, 30, "#7a2219")
    c.rect(18, 28, 21, 30, "#7a2219")
    c.shade()
    c.outline()
    c.rect(12, 9, 13, 9, STRAW, lock=True)
    c.rect(18, 9, 19, 9, STRAW, lock=True)
    c.put(13, 9, EYE, lock=True)
    c.put(18, 9, EYE, lock=True)
    c.put(14, 13, EYE, lock=True)  # narinas
    c.put(17, 13, EYE, lock=True)
    c.rect(13, 16, 18, 16, EYE, lock=True)
    c.put(13, 15, WHITE, lock=True)
    c.put(18, 15, WHITE, lock=True)
    for x, y in [(13, 11), (12, 10), (19, 11), (20, 10)]:
        pass
    for x, y in [(11, 4), (10, 3), (21, 4), (22, 3), (12, 2)]:
        c.put(x, y, "#c9c3ba", lock=True)  # fumaça
    for y in (20, 23, 26):
        c.rect(14, y, 17, y, GOLD, lock=True)  # escamas da barriga
    return c


def rei_dragao() -> Canvas:
    """Semana final. Rei Dragão do Réveillon: dragão negro coroado, entre fogos de artifício."""
    c = Canvas(32, 32)
    c.poly(_sym([(12, 15), (1, 4), (0, 20), (4, 18), (6, 23), (11, 21)]), DRAGON_BK)  # asas
    c.ellipse(16, 23, 7.5, 7.5, DRAGON_BK)
    c.ellipse(16, 24, 4, 5, GOLD)  # barriga dourada
    c.ellipse(16, 12, 6.5, 5.5, DRAGON_BK)
    c.rect(12, 14, 19, 18, DRAGON_BK)
    c.poly(_sym([(11, 9), (7, 3), (13, 7)]), BONE)
    c.rect(10, 29, 13, 31, DRAGON_BK)
    c.rect(18, 29, 21, 31, DRAGON_BK)
    c.shade()
    c.outline()
    # coroa
    for x0, top in ((12, 4), (15, 3), (18, 4)):
        c.rect(x0, top, x0 + 1, 7, GOLD, lock=True)
    c.rect(12, 6, 19, 7, GOLD, lock=True)
    c.put(15, 5, FIRE_RED, lock=True)
    c.put(16, 5, BLUE, lock=True)
    # olhos em brasa
    c.rect(12, 11, 13, 11, GLOW_RED, lock=True)
    c.rect(18, 11, 19, 11, GLOW_RED, lock=True)
    c.rect(13, 18, 18, 18, EYE, lock=True)
    c.put(13, 17, WHITE, lock=True)
    c.put(18, 17, WHITE, lock=True)
    # fogos de artifício
    for cx, cy, col in ((3, 2, FIRE_YEL), (28, 3, GLOW_BLUE), (29, 26, "#ff6ac1"), (2, 27, "#7dff8a")):
        for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-2, -2), (2, -2), (-2, 2), (2, 2)]:
            c.put(cx + dx, cy + dy, col, lock=True)
        c.put(cx, cy, WHITE, lock=True)
    return c


BOSSES = {
    "boss-01": ogro,
    "boss-02": goblin,
    "boss-03": lich,
    "boss-04": troll,
    "boss-05": serpente,
    "boss-06": golem,
    "boss-07": morcego,
    "boss-08": slime,
    "boss-09": cavaleiro,
    "boss-10": hidra,
    "boss-11": dragao,
    "boss-12": rei_dragao,
}
