import type { LessonRef } from '../lib/content/refs';
import { moduleProgress } from '../lib/progress/status';
import { useProgress } from '../lib/progress/useProgress';

export default function ModuleProgress({ lessons }: { lessons: LessonRef[] }) {
  const store = useProgress();
  const p = store ? moduleProgress(lessons, store.exercise) : { done: 0, total: lessons.length, percent: 0 };
  return (
    <div className="progress" role="img" aria-label={`เรียนจบ ${p.done} จาก ${p.total} บท`}>
      <div className="bar"><span style={{ width: `${p.percent}%` }} /></div>
      <span className="muted">{p.done}/{p.total} บท</span>
    </div>
  );
}
