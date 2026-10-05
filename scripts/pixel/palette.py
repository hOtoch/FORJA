"""Paleta do Forja em pixel art: tons do DESIGN.md (tinta, brasa, palha, ouro, azul heráldico)
mais as cores dos monstros e do mapa. Cada cor base tem luz e sombra para o sombreamento."""

from pixelkit import ramp

INK = "#1a1410"
WHITE = "#f6efdf"
EYE = "#1a1410"

SKIN = ramp("#e8b582", "#f6cfa0", "#c98b56")
HAIR = ramp("#7a4522", "#9a5a2e", "#4a2a14")
BEARD = ramp("#8a4f26", "#a8632f", "#5a3016")
LEATHER = ramp("#9a6a3c", "#b8834e", "#6b4626")
LEATHER_DK = ramp("#5e3b21", "#7a4f2e", "#3e2614")
RED = ramp("#b8352a", "#d6503f", "#7a2219")
EMBER = ramp("#e8681e", "#f59a4a", "#a8440f")
STRAW = ramp("#f3c14a", "#ffe08a", "#c98a2a")
GOLD = ramp("#d9a93a", "#f6d36a", "#9a6a16")
STEEL = ramp("#b8b2a8", "#e2ddd3", "#7d776f")
STEEL_DK = ramp("#5f5a54", "#7d776f", "#3e3a35")
CLOTH = ramp("#6a6d78", "#8b8e99", "#45474f")
BLUE = ramp("#3f63b8", "#6a8ad6", "#26407e")
PURPLE = ramp("#7a4cb0", "#9f72d4", "#4c2a78")
PURPLE_DK = ramp("#3a2258", "#54357a", "#22133a")
GREEN = ramp("#76a843", "#9cc764", "#4f7a2a")
GREEN_DK = ramp("#4f7a2a", "#76a843", "#2f4a16")
TEAL = ramp("#3f9c8a", "#66c2ae", "#25665a")
STONE = ramp("#9a8f80", "#bdb3a4", "#6a6157")
STONE_DK = ramp("#5c544a", "#7a7065", "#3a342d")
BONE = ramp("#e8e0cc", "#fbf6ea", "#b8ad94")
TROLL = ramp("#7f9696", "#a2b8b6", "#566a6a")
DRAGON = ramp("#b8352a", "#d65a45", "#7a2219")
DRAGON_BK = ramp("#3a2f3a", "#5a4a5a", "#1f181f")
SLIME = ramp("#6cc36c", "#9be29b", "#3f8a46")
BAT = ramp("#5a3c6e", "#7a5a90", "#38244a")
DARK = ramp("#3b3640", "#58525e", "#22202a")
COUCH = ramp("#8e3a4a", "#b05566", "#5e2230")
WOOD = ramp("#8a5a35", "#a8724a", "#5e3b21")

GLOW_RED = "#ff4a3a"
GLOW_BLUE = "#8fd0ff"
GLOW_YELLOW = "#ffe36a"
FIRE_WHITE = "#fff3c4"
FIRE_YEL = "#ffd24a"
FIRE_OR = "#ff8a2a"
FIRE_RED = "#e23b2a"

# mapa
GRASS = ramp("#6fae4a", "#8cc95e", "#4f8a36")
GRASS_AUT = ramp("#a8a04a", "#c4ba62", "#7f7a34")
SNOW = ramp("#e8f0f4", "#ffffff", "#b8ccd8")
SAND = ramp("#e6d29c", "#f4e4b8", "#c4ad74")
WATER = ramp("#4a8fd0", "#74b2e6", "#2f62a0")
DIRT = ramp("#b88a56", "#d0a46e", "#8a643a")
ROCK = ramp("#8a8178", "#aaa196", "#5f584f")
LEAF = ramp("#3f8a3a", "#5aa84e", "#2a5f28")
LEAF_AUT = ramp("#d0782a", "#e89a48", "#9a5218")
PINE = ramp("#2f6a4a", "#4a8a62", "#1c4a32")
ROOF = ramp("#a8402e", "#c45a44", "#74291c")
WALL = ramp("#d8c8a6", "#ece0c4", "#ad9c7a")
