// Os chefes da Temporada 1, um por semana, cada um um vilão da disciplina.
// Só sabor visual: as regras do chefe vêm do motor. Sprites em public/pixel/boss-NN.png.

export interface Boss {
  name: string;
  sprite: string;
  /** Uma linha de descrição, no tom do jogo. */
  lore: string;
}

const ROSTER: Boss[] = [
  { name: 'Ogro da Preguiça', sprite: 'boss-01', lore: 'Dorme em cima do porrete e acha que amanhã está ótimo.' },
  { name: 'Goblin da Distração', sprite: 'boss-02', lore: 'Sacode guizos para você olhar para qualquer lado, menos para a aula.' },
  { name: 'Lich da Procrastinação', sprite: 'boss-03', lore: 'Guarda uma ampulheta que nunca escorre.' },
  { name: 'Troll do Sofá', sprite: 'boss-04', lore: 'Não sai do sofá e quer que você também não saia.' },
  { name: 'Serpente do Celular', sprite: 'boss-05', lore: 'Hipnotiza com uma tabuleta brilhante.' },
  { name: 'Golem do Cansaço', sprite: 'boss-06', lore: 'Pesa como pedra no fim do dia.' },
  { name: 'Morcego das Desculpas', sprite: 'boss-07', lore: 'Carrega um pergaminho de desculpas sem fim.' },
  { name: 'Slime do Tédio', sprite: 'boss-08', lore: 'Uma gosma entediada que gruda nos seus planos.' },
  { name: 'Cavaleiro do Adiamento', sprite: 'boss-09', lore: 'Tem um relógio no peito e sempre pede mais cinco minutos.' },
  { name: 'Hidra dos Compromissos', sprite: 'boss-10', lore: 'Três cabeças, cada uma puxando sua agenda para um lado.' },
  { name: 'Dragão do Fim de Ano', sprite: 'boss-11', lore: 'Cospe festas, confraternizações e boas intenções.' },
];

const FINAL: Boss = {
  name: 'Rei Dragão do Réveillon',
  sprite: 'boss-12',
  lore: 'Guarda o castelo do Réveillon. Derrote-o e a viagem é sua.',
};

export function bossOfWeek(index: number, isFinal = false): Boss {
  if (isFinal) return FINAL;
  return ROSTER[(index - 1) % ROSTER.length];
}
