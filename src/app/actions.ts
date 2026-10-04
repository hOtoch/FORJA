'use server';

// ESQUELETO DA FUNDAÇÃO. As assinaturas abaixo são o contrato
// (specs/001-forja-temporada-1/contracts/server-actions.md). A frente B implementa os corpos.

import type { ActionResult, CardioModality } from '@/lib/types';

const TODO = { ok: false, error: 'Ainda não implementado.' } as const;

/** Usada com useActionState na tela /entrar. Em caso de sucesso, redireciona para "/". */
export async function login(
  _prev: { error?: string } | undefined,
  _formData: FormData,
): Promise<{ error?: string }> {
  return { error: TODO.error };
}

export async function logout(): Promise<void> {}

export async function startTimer(_courseSlug: string, _pomodoro: boolean): Promise<ActionResult> {
  return TODO;
}

export async function pauseTimer(): Promise<ActionResult> {
  return TODO;
}

export async function resumeTimer(): Promise<ActionResult> {
  return TODO;
}

export async function confirmPresence(_countGap: boolean): Promise<ActionResult> {
  return TODO;
}

export async function stopTimer(
  _lessonIds: number[],
  _countGap: boolean,
): Promise<ActionResult<{ minutes: number }>> {
  return TODO;
}

export async function discardTimer(): Promise<ActionResult> {
  return TODO;
}

export async function addStudy(_input: {
  day: string;
  courseSlug: string;
  minutes: number;
  lessonIds: number[];
}): Promise<ActionResult> {
  return TODO;
}

export async function addGym(_input: { day: string }): Promise<ActionResult> {
  return TODO;
}

export async function addCardio(_input: {
  day: string;
  modality: CardioModality;
  minutes: number;
}): Promise<ActionResult<{ isSuper: boolean }>> {
  return TODO;
}

/** Usa uma folga de reserva hoje. (Não se chama useBreak para não parecer um hook do React.) */
export async function takeBreak(): Promise<ActionResult> {
  return TODO;
}

export async function confirmDeposit(_weekIndex: number): Promise<ActionResult> {
  return TODO;
}

export async function addClient(_input: {
  contractCents: number;
  note?: string;
}): Promise<ActionResult<{ bonusCents: number }>> {
  return TODO;
}

export async function deleteRecord(_id: string): Promise<ActionResult> {
  return TODO;
}
