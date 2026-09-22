import { z } from 'astro/zod';
import { LANGS, LEVELS } from '../kinds';

const id = z.string().regex(/^[a-z0-9-]+$/, 'id ใช้ได้แค่ a-z 0-9 และ -');
const text = z.string().min(1);
const lang = z.enum(LANGS);

const taskBase = z.object({
  id,
  lang,
  prompt: text,
  starter: z.string(),
  solution: text,
  check: z.string().optional(),
  ordered: z.boolean().optional(),
  hints: z.array(text).default([]),
});

function refineTask(t: { id: string; lang: string; check?: string }, ctx: z.RefinementCtx) {
  if (t.lang === 'python' && !t.check) {
    ctx.addIssue({ code: 'custom', path: ['check'], message: `${t.id}: โจทย์ python ต้องมี check` });
  }
  if (t.lang === 'sql' && t.check) {
    ctx.addIssue({ code: 'custom', path: ['check'], message: `${t.id}: โจทย์ sql ไม่ใช้ check (ระบบเทียบกับ solution เอง)` });
  }
}

export const fadedSchema = taskBase.superRefine(refineTask);
export const exerciseSchema = taskBase.extend({ level: z.enum(LEVELS) }).superRefine(refineTask);

export const workedExampleSchema = z.object({
  id,
  title: text,
  lang,
  prompt: text,
  steps: z.array(z.object({ text, code: text })).min(2),
  pitfall: z.object({ text, code: z.string().optional() }).optional(),
});

export const quizSchema = z
  .object({
    id,
    question: text,
    choices: z.array(z.object({ text, correct: z.boolean().default(false), why: text })).min(2),
  })
  .superRefine((q, ctx) => {
    if (q.choices.filter((c) => c.correct).length !== 1) {
      ctx.addIssue({ code: 'custom', path: ['choices'], message: `${q.id}: ต้องมีตัวเลือกที่ถูกได้ข้อเดียว` });
    }
  });

export const lessonDataSchema = z.object({
  goals: z.array(text).min(1),
  examples: z.array(workedExampleSchema).default([]),
  faded: z.array(fadedSchema).default([]),
  exercises: z.array(exerciseSchema).min(1),
  quiz: z.array(quizSchema).default([]),
  summary: z.array(text).min(1),
  interview: z.array(z.object({ id, q: text, a: text })).default([]),
  flashcards: z.array(z.object({ id, front: text, back: text })).default([]),
});

export const practiceSchema = z.object({ title: text, exercises: z.array(exerciseSchema).min(1) });

export const lessonFrontmatterSchema = z.object({
  track: z.enum(['da']),
  module: z.string(),
  order: z.number().int().positive(),
  title: z.string(),
  minutes: z.number().int().positive(),
  prereqs: z.array(z.string()).default([]),
  notebook: z.string().optional(),
});

export const moduleSchema = z.object({
  track: z.enum(['da']),
  slug: z.string(),
  order: z.number().int().nonnegative(),
  title: z.string(),
  description: z.string(),
  intro: z.boolean().default(false),
});

export type Task = z.infer<typeof fadedSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type WorkedExample = z.infer<typeof workedExampleSchema>;
export type QuizQuestion = z.infer<typeof quizSchema>;
export type LessonData = z.infer<typeof lessonDataSchema>;
export type PracticeSet = z.infer<typeof practiceSchema>;
