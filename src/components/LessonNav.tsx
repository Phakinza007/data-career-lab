import type { LessonRef } from '../lib/content/refs';
import { lessonStatus } from '../lib/progress/status';
import { useProgress } from '../lib/progress/useProgress';

export default function LessonNav({ lessons, currentId }: { lessons: LessonRef[]; currentId: string | null }) {
  const store = useProgress();
  return (
    <ol className="lesson-nav">
      {lessons.map((l, i) => {
        const s = store ? lessonStatus(l.exercises, store.exercise) : null;
        const icon = s?.done ? '✓' : s?.started ? '◐' : '○';
        const label = s?.done ? 'เรียนจบแล้ว' : s?.started ? 'กำลังเรียน' : 'ยังไม่เริ่ม';
        const current = l.id === currentId;
        return (
          <li key={l.id} className={current ? 'current' : ''}>
            <a href={l.url} aria-current={current ? 'page' : undefined}>
              <span className="icon" aria-hidden="true">{icon}</span>
              <span>{i + 1}. {l.title}<span className="sr-only"> ({label})</span></span>
              {s && s.stars > 0 && <span className="stars" title="ข้อท้าทายที่ผ่าน">{'★'.repeat(s.stars)}</span>}
            </a>
          </li>
        );
      })}
    </ol>
  );
}
