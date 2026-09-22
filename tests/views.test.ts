import { describe, expect, it } from 'vitest';
import { exampleView, quizView, taskView } from '../src/lib/content/views';
import { exerciseSchema, fadedSchema, quizSchema, workedExampleSchema } from '../src/lib/content/schema';

describe('views', () => {
  it('builds a global id, renders markdown and keeps checker fields', () => {
    const t = exerciseSchema.parse({ id: 'e1', level: 'basic', lang: 'python', prompt: 'ใช้ `len()`', starter: 'x = ___', solution: 'x = 1', check: 'check_value(x, 1)', hints: ['ลอง **len**'] });
    const v = taskView('da/start/01-what-is-da', t, 'exercise');
    expect(v.gid).toBe('da/start/01-what-is-da/e1');
    expect(v.level).toBe('basic');
    expect(v.promptHtml).toContain('<code>len()</code>');
    expect(v.hintsHtml[0]).toContain('<strong>len</strong>');
    expect(v.check).toBe('check_value(x, 1)');
    expect(v.ordered).toBe(false);
  });
  it('gives faded tasks no level', () => {
    const t = fadedSchema.parse({ id: 'f1', lang: 'sql', prompt: 'p', starter: 'SELECT ___', solution: 'SELECT 1' });
    expect(taskView('l', t, 'faded')).toMatchObject({ gid: 'l/f1', kind: 'faded', level: null, check: null });
  });
  it('maps worked examples and quiz questions', () => {
    const ex = workedExampleSchema.parse({ id: 'x1', title: 'T', lang: 'sql', prompt: 'p', steps: [{ text: 'a', code: 'SELECT 1' }, { text: 'b', code: 'SELECT 2' }], pitfall: { text: 'ระวัง' } });
    expect(exampleView('l', ex)).toMatchObject({ gid: 'l/x1', steps: [{ code: 'SELECT 1' }, { code: 'SELECT 2' }], pitfall: { code: null } });
    const q = quizSchema.parse({ id: 'q1', question: 'ข้อไหน', choices: [{ text: 'ก', correct: true, why: 'เพราะ' }, { text: 'ข', why: 'ไม่ใช่' }] });
    expect(quizView('l', q)).toEqual({ gid: 'l/q1', questionHtml: 'ข้อไหน', choices: [{ html: 'ก', correct: true, whyHtml: '<p>เพราะ</p>\n' }, { html: 'ข', correct: false, whyHtml: '<p>ไม่ใช่</p>\n' }] });
  });
});
