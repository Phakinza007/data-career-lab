import type { ExerciseRecord } from '../progress/store';

/** ข้อที่เคยตอบผิดหรือเคยดูเฉลยจะถูกสุ่มมาบ่อยกว่า (spec: หน้า Drill /practice) */
export function exerciseWeight(record: ExerciseRecord): number {
  return 1 + Math.min(record.fails, 4) + (record.solutionViewed ? 2 : 0);
}

/** สุ่มเลือก 1 รายการถ่วงน้ำหนักตาม weightOf — ทุกรายการที่มี weight > 0 มีโอกาสถูกเลือกเสมอ */
export function pickWeighted<T>(items: T[], weightOf: (t: T) => number, rng: () => number = Math.random): T | null {
  if (items.length === 0) return null;
  const weights = items.map((i) => Math.max(weightOf(i), 0));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
