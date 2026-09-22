import type { ExerciseRef } from '../progress/status';

export interface LessonRef {
  id: string;
  slug: string;
  title: string;
  minutes: number;
  url: string;
  exercises: ExerciseRef[];
}

export interface ModuleRef {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  intro: boolean;
  url: string;
  lessons: LessonRef[];
  practiceUrl: string | null;
}
