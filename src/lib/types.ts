// Contrato entre as partes do Forja. Fonte: specs/001-forja-temporada-1/data-model.md

// ---------- Registros (o que fica guardado) ----------

export type RecordKind = 'study' | 'gym' | 'cardio' | 'break' | 'deposit' | 'client';

export interface BaseRecord<K extends RecordKind, D> {
  id: string;
  seasonId: string;
  kind: K;
  /** Dia do jogo, YYYY-MM-DD (virada às 04:00 em America/Sao_Paulo). */
  day: string;
  createdAt: string;
  data: D;
}

export type StudyRecord = BaseRecord<
  'study',
  {
    courseSlug: string;
    /** Minutos creditados, inteiro >= 1. */
    minutes: number;
    source: 'timer' | 'manual';
    startedAt?: string;
    endedAt?: string;
    /** Aulas concluídas nesta sessão. */
    lessonIds: number[];
  }
>;

export type GymRecord = BaseRecord<'gym', Record<string, never>>;

export type CardioModality = 'esteira' | 'bicicleta' | 'caminhada' | 'eliptico' | 'pelada' | 'outro';

export type CardioRecord = BaseRecord<
  'cardio',
  {
    modality: CardioModality;
    minutes: number;
    isSuper: boolean;
  }
>;

/** Só folgas de reserva; as planejadas vêm da configuração. */
export type BreakRecord = BaseRecord<'break', { reason?: string }>;

export type DepositRecord = BaseRecord<
  'deposit',
  {
    weekIndex: number;
    amountCents: number;
  }
>;

export type ClientRecord = BaseRecord<
  'client',
  {
    contractCents: number;
    bonusCents: number;
    note?: string;
  }
>;

export type ForjaRecord =
  | StudyRecord
  | GymRecord
  | CardioRecord
  | BreakRecord
  | DepositRecord
  | ClientRecord;

// ---------- Timer em andamento (kv['timer']) ----------

export interface TimerState {
  courseSlug: string;
  /** ISO; define o dia do jogo da sessão. */
  startedAt: string;
  /** Tempo já creditado de trechos fechados. */
  accumulatedMs: number;
  /** ISO; null = pausado. */
  runningSince: string | null;
  /** ISO; última confirmação de presença (ou início/retomada). */
  lastConfirmAt: string;
  pomodoro: boolean;
}

// ---------- Catálogo de cursos (src/config/courses.json) ----------

/** [id, título, minutos (0 = sem duração na plataforma)] */
export type CatalogLesson = [number, string, number];

export interface CatalogModule {
  name: string;
  min: number;
  lessons: CatalogLesson[];
}

export interface CatalogCourse {
  slug: string;
  name: string;
  modules: CatalogModule[];
}

export interface CourseCatalog {
  courses: CatalogCourse[];
}

// ---------- Configuração da temporada ----------

export interface ChestConfig {
  id: number;
  condition: string;
  prize: string;
  kind: 'first-boss' | 'streak' | 'midpoint-grade' | 'study-hours' | 'final-grade';
  /** streak: dias; study-hours: minutos; midpoint-grade: data YYYY-MM-DD; final-grade: data */
  threshold?: number;
  date?: string;
  /** final-grade: prêmio por letra */
  prizes?: Partial<Record<'S' | 'A' | 'B' | 'C', string>>;
}

export interface SeasonConfig {
  id: string;
  name: string;
  start: string;
  end: string;
  timeZone: string;
  dayStartHour: number;
  plannedBreaks: string[];
  reserveBreaks: number;
  goals: {
    studyMinutes: number;
    gymPerWeek: number;
    cardioPerWeek: number;
    finalWeek: { gym: number; cardio: number; requireSuper: boolean };
    cardioMaxWithoutSuper: number;
  };
  cardio: {
    minMinutes: number;
    superMinutes: number;
    superModalities: CardioModality[];
    alwaysSuper: CardioModality[];
  };
  xp: {
    perStudyMinute: number;
    studyDailyCap: number;
    gym: number;
    cardio: number;
    superCardio: number;
    module: number;
    course: number;
    boss: number;
  };
  levelXp: (n: number) => number;
  titles: [number, string][];
  shields: { initial: number; max: number };
  grade: { S: number; A: number; B: number };
  fund: {
    studyDayCents: number;
    gymCents: number;
    cardioCents: number;
    bossCents: number;
    finalBossCents: number;
    clientBonusPct: number;
    perfectCents: number;
  };
  chests: ChestConfig[];
  courses: {
    queue: string[];
    initialCompleted: Record<string, number[]>;
    missingDurationMin: number;
    defaultStudyPerVideo: number;
    paceWindowDays: number;
    minSessionsForPace: number;
    lessonUrl: (slug: string, id: number) => string;
  };
  timer: {
    presenceMinutes: number;
    capMinutes: number;
    pomodoroFocus: number;
    pomodoroBreak: number;
  };
}

// ---------- Estado do jogo (saída do motor, nunca guardado) ----------

/** 0 frio, 1 cereja, 2 brasa, 3 palha, 4 incandescente */
export type Heat = 0 | 1 | 2 | 3 | 4;

export type GradeLetter = 'S' | 'A' | 'B' | 'C';

export interface DayInfo {
  date: string;
  index: number;
  weekIndex: number;
  weekday: number;
  isFuture: boolean;
  isToday: boolean;
  breakKind: 'planned' | 'reserve' | null;
  studyMinutes: number;
  studyMet: boolean;
  shieldUsed: boolean;
  gym: number;
  cardio: number;
  superCardio: number;
  /** null = futuro ou hoje sem nada */
  heat: Heat | null;
  xp: number;
  fundCents: number;
}

export interface WeekInfo {
  index: number;
  start: string;
  end: string;
  isFinal: boolean;
  isClosed: boolean;
  isCurrent: boolean;
  studyDaysRequired: number;
  studyDaysMet: number;
  shieldDays: number;
  gym: number;
  gymTarget: number;
  cardio: number;
  cardioTarget: number;
  hasSuper: boolean;
  superRequired: boolean;
  bossDefeated: boolean;
  fundCents: number;
  depositedCents: number | null;
}

export interface ChestState {
  id: number;
  condition: string;
  prize: string;
  state: 'locked' | 'opened' | 'failed';
  openedOn: string | null;
  note?: string;
}

export interface LessonProgress {
  id: number;
  title: string;
  minutes: number;
  done: boolean;
}

export interface ModuleProgress {
  name: string;
  total: number;
  done: number;
  completed: boolean;
  lessons: LessonProgress[];
}

export interface CourseProgress {
  slug: string;
  name: string;
  totalLessons: number;
  doneLessons: number;
  totalMinutes: number;
  doneMinutes: number;
  modules: ModuleProgress[];
  completed: boolean;
  projectedEnd: string | null;
}

export interface NextLesson {
  courseSlug: string;
  id: number;
  title: string;
  minutes: number;
  url: string;
}

export interface TimerView extends TimerState {
  creditedMs: number;
  awaitingPresence: boolean;
  pendingMs: number;
  capped: boolean;
}

export interface GameState {
  now: string;
  today: string;
  phase: 'before' | 'active' | 'after';
  dayIndex: number | null;
  days: DayInfo[];
  weeks: WeekInfo[];
  currentWeek: WeekInfo | null;
  todayInfo: DayInfo | null;
  yesterdayMissedUnprotected: boolean;
  streak: { current: number; best: number; shields: number };
  xp: {
    total: number;
    byAttr: { inteligencia: number; forca: number; vigor: number };
    level: number;
    title: string;
    levelStartXp: number;
    nextLevelXp: number;
  };
  grade: {
    studyPct: number;
    gymPct: number;
    cardioPct: number;
    totalPct: number;
    letter: GradeLetter | null;
    isFinal: boolean;
  };
  fund: {
    earnedCents: number;
    depositedCents: number;
    perfectCents: number;
    clientBonusCents: number;
    pending: { weekIndex: number; amountCents: number }[];
  };
  chests: ChestState[];
  courses: CourseProgress[];
  currentCourseSlug: string | null;
  nextLesson: NextLesson | null;
  queueProjectedEnd: string | null;
  queueEndsBeforeSeason: boolean;
  medals: string[];
  breaks: { reserveUsed: number; reserveLeft: number; canUseToday: boolean };
  timer: TimerView | null;
  status: {
    studyDone: boolean;
    weekAtRisk: boolean;
    reasons: string[];
  };
}

// ---------- Ações ----------

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };
