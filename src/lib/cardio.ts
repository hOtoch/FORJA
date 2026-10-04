import type { CardioModality, SeasonConfig } from './types';

export const CARDIO_LABELS: Record<CardioModality, string> = {
  esteira: 'Esteira',
  bicicleta: 'Bicicleta',
  caminhada: 'Caminhada',
  eliptico: 'Elíptico',
  pelada: 'Pelada',
  outro: 'Outro',
};

/** Pelada de qualquer duração, ou bicicleta/caminhada/esteira com 60 min ou mais. */
export function isSuperCardio(
  modality: CardioModality,
  minutes: number,
  config: Pick<SeasonConfig, 'cardio'>,
): boolean {
  if (config.cardio.alwaysSuper.includes(modality)) return true;
  return config.cardio.superModalities.includes(modality) && minutes >= config.cardio.superMinutes;
}

/** Devolve a mensagem de erro em português, ou null se o cardio vale. */
export function validateCardio(
  modality: CardioModality,
  minutes: number,
  config: Pick<SeasonConfig, 'cardio'>,
): string | null {
  if (config.cardio.alwaysSuper.includes(modality)) return null;
  if (!Number.isFinite(minutes) || minutes < config.cardio.minMinutes) {
    return `Cardio precisa de pelo menos ${config.cardio.minMinutes} minutos.`;
  }
  return null;
}

export function clientBonusCents(contractCents: number, config: Pick<SeasonConfig, 'fund'>): number {
  return Math.round((contractCents * config.fund.clientBonusPct) / 100);
}

/** "R$ 1.500" ou "R$ 12,50" */
export function formatBRL(cents: number): string {
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })
    .format(cents / 100)
    .replace(/ /g, ' ');
}
