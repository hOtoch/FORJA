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

/** Duração do alarme, em segundos. */
const ALARM_SECONDS = 3;

/**
 * Toca um alarme repetitivo de 3 segundos, como um despertador: bipes curtos em pares, com um
 * respiro entre os pares. Na pausa, o par desce (agudo, grave); na volta ao foco, sobe; no aviso
 * de presença, os dois bipes têm o mesmo tom.
 */
export function playChime(kind: 'pause' | 'focus' | 'attention'): void {
  try {
    if (!audio) return;
    if (audio.state === 'suspended') void audio.resume();
    const pair = kind === 'pause' ? [988, 740] : kind === 'focus' ? [740, 988] : [880, 880];
    const beep = 0.12; // duração de cada bipe
    const gap = 0.06; // entre os bipes do par
    const cycle = 0.5; // um par a cada meio segundo
    const start = audio.currentTime + 0.02;
    for (let c = 0; c * cycle < ALARM_SECONDS - 0.01; c++) {
      pair.forEach((freq, i) => {
        const t = start + c * cycle + i * (beep + gap);
        const osc = audio!.createOscillator();
        const gain = audio!.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
        gain.gain.setValueAtTime(0.12, t + beep - 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + beep);
        osc.connect(gain).connect(audio!.destination);
        osc.start(t);
        osc.stop(t + beep + 0.02);
      });
    }
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
