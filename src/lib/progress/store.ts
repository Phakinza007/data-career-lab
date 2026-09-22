export const STORAGE_KEY = 'dcl:progress';
export const BACKUP_KEY = 'dcl:progress:backup';

export type ExerciseStatus = 'none' | 'failed' | 'self' | 'with-solution';
export interface ExerciseRecord {
  status: ExerciseStatus;
  attempts: number;
  fails: number;
  solutionViewed: boolean;
}
export interface ProgressData {
  version: 1;
  exercises: Record<string, ExerciseRecord>;
  drafts: Record<string, string>;
  quiz: Record<string, { correct: number; total: number }>;
  /** กล่อง Leitner ของ flashcard (ใช้ใน Plan 3) */
  leitner: Record<string, number>;
  lastLesson: string | null;
}
export type StoreHealth = 'ok' | 'memory-only' | 'recovered';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const EMPTY_RECORD: ExerciseRecord = { status: 'none', attempts: 0, fails: 0, solutionViewed: false };

export function emptyProgress(): ProgressData {
  return { version: 1, exercises: {}, drafts: {}, quiz: {}, leitner: {}, lastLesson: null };
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** ตรวจและเติม field ที่ขาด — เวอร์ชันใหม่ในอนาคตให้เพิ่ม case แปลงข้อมูลตรงนี้ */
export function migrate(raw: unknown): ProgressData {
  if (!isObject(raw) || raw.version !== 1) throw new Error('ไฟล์ความคืบหน้าไม่ถูกต้อง หรือมาจากเวอร์ชันที่ไม่รู้จัก');
  const pick = <T>(v: unknown, fallback: T): T => (isObject(v) ? (v as T) : fallback);
  const base = emptyProgress();
  return {
    version: 1,
    exercises: pick(raw.exercises, base.exercises),
    drafts: pick(raw.drafts, base.drafts),
    quiz: pick(raw.quiz, base.quiz),
    leitner: pick(raw.leitner, base.leitner),
    lastLesson: typeof raw.lastLesson === 'string' ? raw.lastLesson : null,
  };
}

export type Store = ReturnType<typeof createStore>;

export function createStore(storage: StorageLike | null, onChange: () => void = () => {}) {
  let health: StoreHealth = storage ? 'ok' : 'memory-only';
  let data = emptyProgress();
  let version = 0;

  if (storage) {
    let raw: string | null = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      health = 'memory-only';
    }
    if (raw) {
      try {
        data = migrate(JSON.parse(raw));
      } catch {
        health = 'recovered';
        try {
          storage.setItem(BACKUP_KEY, raw);
        } catch {
          // เก็บสำรองไม่ได้ก็เริ่มใหม่ต่อ
        }
      }
    }
  }

  function commit() {
    version += 1;
    if (storage && health !== 'memory-only') {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        health = 'memory-only';
      }
    }
    onChange();
  }

  const exercise = (id: string): ExerciseRecord => ({ ...EMPTY_RECORD, ...data.exercises[id] });

  return {
    get version() { return version; },
    get health() { return health; },
    get lastLesson() { return data.lastLesson; },
    exercise,
    recordCheck(id: string, passed: boolean) {
      const r = exercise(id);
      r.attempts += 1;
      if (passed) {
        if (r.status !== 'self' && r.status !== 'with-solution') r.status = r.solutionViewed ? 'with-solution' : 'self';
      } else {
        r.fails += 1;
        if (r.status === 'none') r.status = 'failed';
      }
      data.exercises[id] = r;
      commit();
    },
    viewSolution(id: string) {
      const r = exercise(id);
      if (r.solutionViewed) return;
      r.solutionViewed = true;
      data.exercises[id] = r;
      commit();
    },
    draft: (id: string): string | null => data.drafts[id] ?? null,
    saveDraft(id: string, code: string | null) {
      if ((data.drafts[id] ?? null) === code) return;
      if (code === null) delete data.drafts[id];
      else data.drafts[id] = code;
      commit();
    },
    quizScore: (lessonId: string) => data.quiz[lessonId] ?? null,
    recordQuiz(lessonId: string, correct: number, total: number) {
      data.quiz[lessonId] = { correct, total };
      commit();
    },
    setLastLesson(id: string) {
      if (data.lastLesson === id) return;
      data.lastLesson = id;
      commit();
    },
    exportJson: () => JSON.stringify(data, null, 2),
    importJson(text: string) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('ไฟล์นี้ไม่ใช่ JSON');
      }
      data = migrate(parsed);
      commit();
    },
    reset() {
      data = emptyProgress();
      commit();
    },
  };
}
