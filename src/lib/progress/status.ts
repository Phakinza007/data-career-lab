import type { Level } from '../kinds';
import type { ExerciseRecord } from './store';

export interface ExerciseRef {
  id: string;
  level: Level;
}
export interface LessonStatus {
  done: boolean;
  started: boolean;
  requiredPassed: number;
  requiredTotal: number;
  stars: number;
  starsTotal: number;
}
type Getter = (id: string) => ExerciseRecord;

export const isPassed = (r: ExerciseRecord) => r.status === 'self' || r.status === 'with-solution';

/** บทเสร็จเมื่อผ่านข้อ basic + applied ครบ — ข้อ challenge เป็นดาวโบนัส */
export function lessonStatus(items: ExerciseRef[], get: Getter): LessonStatus {
  const required = items.filter((i) => i.level !== 'challenge');
  const challenge = items.filter((i) => i.level === 'challenge');
  const passed = (i: ExerciseRef) => isPassed(get(i.id));
  const requiredPassed = required.filter(passed).length;
  return {
    done: required.length > 0 && requiredPassed === required.length,
    started: items.some((i) => get(i.id).attempts > 0),
    requiredPassed,
    requiredTotal: required.length,
    stars: challenge.filter(passed).length,
    starsTotal: challenge.length,
  };
}

export function moduleProgress(lessons: { exercises: ExerciseRef[] }[], get: Getter) {
  const done = lessons.filter((l) => lessonStatus(l.exercises, get).done).length;
  const total = lessons.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
