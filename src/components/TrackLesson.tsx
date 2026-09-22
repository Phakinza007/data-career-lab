import { useEffect } from 'react';
import { getProgress } from '../lib/progress';

export default function TrackLesson({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    getProgress().setLastLesson(lessonId);
  }, [lessonId]);
  return null;
}
