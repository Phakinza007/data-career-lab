import type { LessonRef } from '../lib/content/refs';
import { useProgress } from '../lib/progress/useProgress';

export default function ContinueButton({ lessons }: { lessons: LessonRef[] }) {
  const store = useProgress();
  if (lessons.length === 0) return null;
  const last = store?.lastLesson ? lessons.find((l) => l.id === store.lastLesson) : undefined;
  const target = last ?? lessons[0];
  return <a className="button primary" href={target.url}>{last ? `เรียนต่อ: ${last.title}` : `เริ่มบทแรก: ${target.title}`}</a>;
}
