import { describe, expect, it } from 'vitest';
import { lessonDataSchema, practiceSchema, type LessonData } from '../src/lib/content/schema';
import { lessonRuleErrors, practiceRuleErrors } from '../src/lib/content/rules';

const sqlTask = (id: string, level?: string) => ({ id, ...(level ? { level } : {}), lang: 'sql', prompt: 'p', starter: 'SELECT ___', solution: 'SELECT 1' });
const quiz = (id: string) => ({ id, question: 'q', choices: [{ text: 'a', correct: true, why: 'w' }, { text: 'b', why: 'w' }] });

function validLesson() {
  return {
    goals: ['g'],
    examples: ['x1', 'x2'].map((id) => ({ id, title: 't', lang: 'sql', prompt: 'p', steps: [{ text: 's', code: 'SELECT 1' }, { text: 's', code: 'SELECT 2' }] })),
    faded: [sqlTask('f1')],
    exercises: [
      ...['b1', 'b2', 'b3', 'b4'].map((id) => sqlTask(id, 'basic')),
      ...['a1', 'a2', 'a3'].map((id) => sqlTask(id, 'applied')),
      sqlTask('c1', 'challenge'),
    ],
    quiz: ['q1', 'q2', 'q3'].map(quiz),
    summary: ['s'],
    interview: [{ id: 'i1', q: 'q', a: 'a' }],
  };
}
const parse = (raw: unknown): LessonData => lessonDataSchema.parse(raw);
const issues = (raw: unknown) => JSON.stringify(lessonDataSchema.safeParse(raw).error?.issues ?? []);

describe('lessonDataSchema', () => {
  it('accepts a valid lesson and fills defaults', () => {
    const d = parse(validLesson());
    expect(d.flashcards).toEqual([]);
    expect(d.exercises[0].hints).toEqual([]);
  });
  it('requires check for python tasks', () => {
    const raw = validLesson();
    raw.exercises[0] = { ...raw.exercises[0], lang: 'python' };
    expect(issues(raw)).toContain('ต้องมี check');
  });
  it('rejects check on sql tasks', () => {
    const raw = validLesson();
    raw.exercises[0] = { ...raw.exercises[0], check: 'x' } as (typeof raw.exercises)[0];
    expect(issues(raw)).toContain('ไม่ใช้ check');
  });
  it('requires exactly one correct quiz choice', () => {
    const raw = validLesson();
    raw.quiz[0].choices[1] = { text: 'b', correct: true, why: 'w' } as (typeof raw.quiz)[0]['choices'][0];
    expect(issues(raw)).toContain('ถูกได้ข้อเดียว');
  });
});

describe('lessonRuleErrors', () => {
  it('passes a lesson that follows the ratio', () => {
    expect(lessonRuleErrors(parse(validLesson()), { intro: false })).toEqual([]);
  });
  it('flags too few basic exercises', () => {
    const raw = validLesson();
    raw.exercises = raw.exercises.filter((e) => e.id !== 'b4');
    expect(lessonRuleErrors(parse(raw), { intro: false })).toEqual(['basic ต้องมี 4–5 ข้อ แต่มี 3']);
  });
  it('flags faded starters without a blank', () => {
    const raw = validLesson();
    raw.faded[0].starter = 'SELECT 1';
    expect(lessonRuleErrors(parse(raw), { intro: false })).toEqual(['faded f1: starter ต้องมีช่องว่าง ___']);
  });
  it('flags duplicate ids even in intro lessons', () => {
    const raw = validLesson();
    raw.exercises[1].id = 'b1';
    expect(lessonRuleErrors(parse(raw), { intro: true })).toEqual(['id ซ้ำ: b1']);
  });
  it('skips ratio checks for intro modules', () => {
    const raw = { ...validLesson(), examples: [], faded: [], quiz: [], exercises: [sqlTask('e1', 'basic')] };
    expect(lessonRuleErrors(parse(raw), { intro: true })).toEqual([]);
  });
});

describe('practiceRuleErrors', () => {
  it('requires 15–20 exercises', () => {
    const set = practiceSchema.parse({ title: 't', exercises: Array.from({ length: 14 }, (_, i) => sqlTask(`p${i}`, 'basic')) });
    expect(practiceRuleErrors(set)).toEqual(['ชุดฝึกต้องมี 15–20 ข้อ แต่มี 14']);
  });
});
