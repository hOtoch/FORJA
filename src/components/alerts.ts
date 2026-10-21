'use client';

// Avisos do timer fora da tela: som (Web Audio, sem arquivo) e notificação do navegador.
// O navegador só deixa tocar som e pedir permissão a partir de um clique, então `unlockAlerts()`
// deve ser chamado no clique que liga o Pomodoro ou o timer.

let audio: AudioContext | null = null;

/**
 * Prepara o som e (com `askNotify`) pede permissão para notificar. Chamar dentro de um clique.
 */
export function unlockAlerts(askNotify = true): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audio ??= new Ctx();
      void audio.resume();
    }
  } catch {
    // sem som: a notificação e a faixa na tela bastam
  }
  if (!askNotify) return;
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => {});
    }
  } catch {
    // sem notificações
  }
}

export type NotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function notifyPermission(): NotifyPermission {
  try {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  } catch {
    return 'unsupported';
  }
}

/**
 * Toca um sino curto: dois tons descendo para a pausa, dois subindo para voltar ao foco,
 * e um tom só para avisos (presença).
 */
export function playChime(kind: 'pause' | 'focus' | 'attention'): void {
  try {
    if (!audio) return;
    if (audio.state === 'suspended') void audio.resume();
    const notes = kind === 'pause' ? [880, 660, 440] : kind === 'focus' ? [440, 660, 880] : [660, 660];
    const start = audio.currentTime + 0.02;
    notes.forEach((freq, i) => {
      const t = start + i * 0.28;
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    // sem som
  }
}

/** Notificação do sistema (se permitida). Cada aviso tem a sua etiqueta, para um não apagar o outro. */
export function systemNotify(title: string, body: string, tag = 'forja-timer'): void {
  try {
    if (notifyPermission() !== 'granted') return;
    const n = new Notification(title, { body, tag, icon: '/icon.svg', requireInteraction: false });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // notificações indisponíveis: a faixa na própria região basta
  }
}
