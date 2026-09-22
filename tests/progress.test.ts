import { describe, expect, it, vi } from 'vitest';
import { BACKUP_KEY, STORAGE_KEY, createStore, type StorageLike } from '../src/lib/progress/store';
import { lessonStatus, moduleProgress, type ExerciseRef } from '../src/lib/progress/status';

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

describe('createStore', () => {
  it('starts empty and healthy', () => {
    const s = createStore(new MemoryStorage());
    expect(s.health).toBe('ok');
    expect(s.exercise('a/e1')).toEqual({ status: 'none', attempts: 0, fails: 0, solutionViewed: false });
    expect(s.lastLesson).toBeNull();
  });
  it('records a failure then a pass as "self"', () => {
    const s = createStore(new MemoryStorage());
    s.recordCheck('a/e1', false);
    expect(s.exercise('a/e1').status).toBe('failed');
    s.recordCheck('a/e1', true);
    expect(s.exercise('a/e1')).toEqual({ status: 'self', attempts: 2, fails: 1, solutionViewed: false });
  });
  it('marks a pass after viewing the solution as "with-solution"', () => {
    const s = createStore(new MemoryStorage());
    s.viewSolution('a/e1');
    s.recordCheck('a/e1', true);
    expect(s.exercise('a/e1').status).toBe('with-solution');
  });
  it('keeps "self" when the solution is viewed after passing', () => {
    const s = createStore(new MemoryStorage());
    s.recordCheck('a/e1', true);
    s.viewSolution('a/e1');
    s.recordCheck('a/e1', false);
    expect(s.exercise('a/e1').status).toBe('self');
  });
  it('persists across stores on the same storage', () => {
    const storage = new MemoryStorage();
    const a = createStore(storage);
    a.recordCheck('a/e1', true);
    a.saveDraft('a/e2', 'SELECT 1');
    a.setLastLesson('da/start/01-what-is-da');
    const b = createStore(storage);
    expect(b.exercise('a/e1').status).toBe('self');
    expect(b.draft('a/e2')).toBe('SELECT 1');
    expect(b.lastLesson).toBe('da/start/01-what-is-da');
  });
  it('removes a draft with null and skips no-op saves', () => {
    const onChange = vi.fn();
    const s = createStore(new MemoryStorage(), onChange);
    s.saveDraft('a/e1', null);
    expect(onChange).not.toHaveBeenCalled();
    s.saveDraft('a/e1', 'x');
    s.saveDraft('a/e1', null);
    expect(s.draft('a/e1')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
  it('backs up corrupt data and starts fresh', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    const s = createStore(storage);
    expect(s.health).toBe('recovered');
    expect(storage.getItem(BACKUP_KEY)).toBe('{not json');
    s.recordCheck('a/e1', true);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).exercises['a/e1'].status).toBe('self');
  });
  it('falls back to memory when storage writes fail', () => {
    const storage = new MemoryStorage();
    storage.setItem = () => { throw new Error('quota'); };
    const s = createStore(storage);
    s.recordCheck('a/e1', true);
    expect(s.health).toBe('memory-only');
    expect(s.exercise('a/e1').status).toBe('self');
  });
  it('works without storage at all', () => {
    expect(createStore(null).health).toBe('memory-only');
  });
  it('exports and imports, rejecting invalid files', () => {
    const a = createStore(new MemoryStorage());
    a.recordQuiz('da/start/01-what-is-da', 2, 3);
    const b = createStore(new MemoryStorage());
    b.importJson(a.exportJson());
    expect(b.quizScore('da/start/01-what-is-da')).toEqual({ correct: 2, total: 3 });
    expect(() => b.importJson('nope')).toThrow('ไม่ใช่ JSON');
    expect(() => b.importJson('{"version": 99}')).toThrow('ไม่ถูกต้อง');
  });
  it('bumps version and notifies on every change', () => {
    const onChange = vi.fn();
    const s = createStore(new MemoryStorage(), onChange);
    s.recordCheck('a/e1', true);
    s.reset();
    expect(s.version).toBe(2);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(s.exercise('a/e1').status).toBe('none');
  });
});

describe('lessonStatus / moduleProgress', () => {
  const items: ExerciseRef[] = [
    { id: 'l/b1', level: 'basic' },
    { id: 'l/a1', level: 'applied' },
    { id: 'l/c1', level: 'challenge' },
  ];
  it('is done when all basic and applied pass; challenge gives stars', () => {
    const s = createStore(null);
    expect(lessonStatus(items, s.exercise)).toMatchObject({ done: false, started: false, requiredPassed: 0, requiredTotal: 2, stars: 0, starsTotal: 1 });
    s.recordCheck('l/b1', true);
    expect(lessonStatus(items, s.exercise)).toMatchObject({ done: false, started: true, requiredPassed: 1 });
    s.viewSolution('l/a1');
    s.recordCheck('l/a1', true);
    s.recordCheck('l/c1', true);
    expect(lessonStatus(items, s.exercise)).toMatchObject({ done: true, stars: 1 });
  });
  it('computes module percent', () => {
    const s = createStore(null);
    s.recordCheck('l/b1', true);
    s.recordCheck('l/a1', true);
    expect(moduleProgress([{ exercises: items }, { exercises: [{ id: 'm/b1', level: 'basic' }] }], s.exercise)).toEqual({ done: 1, total: 2, percent: 50 });
  });
});
