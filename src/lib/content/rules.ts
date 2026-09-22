import type { LessonData, PracticeSet } from './schema';

/** สัดส่วนตาม spec §4 — [ต่ำสุด, สูงสุด] */
export const RATIO = {
  examples: [2, 3],
  faded: [1, 2],
  basic: [4, 5],
  applied: [3, 4],
  challenge: [1, 3],
  quiz: [3, 5],
  interview: [1, 3],
  practice: [15, 20],
} as const;

function range(name: string, n: number, [lo, hi]: readonly [number, number]): string[] {
  return n < lo || n > hi ? [`${name} ต้องมี ${lo}–${hi} ข้อ แต่มี ${n}`] : [];
}

function duplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const i of ids) (seen.has(i) ? dup : seen).add(i);
  return [...dup].map((i) => `id ซ้ำ: ${i}`);
}

export function lessonRuleErrors(d: LessonData, opts: { intro: boolean }): string[] {
  const errors = duplicateIds([...d.examples, ...d.faded, ...d.exercises, ...d.quiz, ...d.interview, ...d.flashcards].map((x) => x.id));
  for (const f of d.faded) if (!f.starter.includes('___')) errors.push(`faded ${f.id}: starter ต้องมีช่องว่าง ___`);
  if (opts.intro) return errors;
  const count = (level: string) => d.exercises.filter((e) => e.level === level).length;
  return [
    ...errors,
    ...range('worked example', d.examples.length, RATIO.examples),
    ...range('faded', d.faded.length, RATIO.faded),
    ...range('basic', count('basic'), RATIO.basic),
    ...range('applied', count('applied'), RATIO.applied),
    ...range('challenge', count('challenge'), RATIO.challenge),
    ...range('quiz', d.quiz.length, RATIO.quiz),
    ...range('interview', d.interview.length, RATIO.interview),
  ];
}

export function practiceRuleErrors(set: PracticeSet): string[] {
  const n = set.exercises.length;
  const errors = duplicateIds(set.exercises.map((e) => e.id));
  if (n < RATIO.practice[0] || n > RATIO.practice[1]) errors.push(`ชุดฝึกต้องมี ${RATIO.practice[0]}–${RATIO.practice[1]} ข้อ แต่มี ${n}`);
  return errors;
}
