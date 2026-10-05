// Os chefes da Temporada 1, um por semana. Só sabor visual: as regras do chefe vêm do motor.

import type { BossKind } from './art';

const ROSTER: { name: string; kind: BossKind }[] = [
  { name: 'Ogro da Preguiça', kind: 'ogro' },
  { name: 'Goblin da Distração', kind: 'goblin' },
  { name: 'Lich da Procrastinação', kind: 'lich' },
  { name: 'Troll do Sofá', kind: 'troll' },
  { name: 'Serpente do Celular', kind: 'serpente' },
  { name: 'Goblin do Cansaço', kind: 'goblin' },
  { name: 'Ogro das Desculpas', kind: 'ogro' },
  { name: 'Serpente do Tédio', kind: 'serpente' },
  { name: 'Lich do Adiamento', kind: 'lich' },
  { name: 'Troll dos Compromissos', kind: 'troll' },
  { name: 'Dragão do Fim de Ano', kind: 'dragao' },
];

const FINAL = { name: 'Rei Dragão do Réveillon', kind: 'dragao' as BossKind };

export function bossOfWeek(index: number, isFinal = false): { name: string; kind: BossKind } {
  if (isFinal) return FINAL;
  return ROSTER[(index - 1) % ROSTER.length];
}
