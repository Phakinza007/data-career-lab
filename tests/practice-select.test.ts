import { describe, expect, it } from 'vitest';
import { exerciseWeight, pickWeighted } from '../src/lib/practice/select';
import type { ExerciseRecord } from '../src/lib/progress/store';

const record = (over: Partial<ExerciseRecord> = {}): ExerciseRecord => ({
  status: 'none', attempts: 0, fails: 0, solutionViewed: false, ...over,
});

describe('exerciseWeight', () => {
  it('is 1 for a never-attempted exercise', () => {
    expect(exerciseWeight(record())).toBe(1);
  });
  it('adds 1 per fail, capped at 4', () => {
    expect(exerciseWeight(record({ fails: 2 }))).toBe(3);
    expect(exerciseWeight(record({ fails: 10 }))).toBe(5);
  });
  it('adds 2 when the solution was viewed', () => {
    expect(exerciseWeight(record({ solutionViewed: true }))).toBe(3);
  });
  it('combines both', () => {
    expect(exerciseWeight(record({ fails: 2, solutionViewed: true }))).toBe(5);
  });
});

describe('pickWeighted', () => {
  it('returns null for an empty list', () => {
    expect(pickWeighted([], () => 1)).toBeNull();
  });
  it('picks the single item deterministically', () => {
    expect(pickWeighted(['a'], () => 1, () => 0.5)).toBe('a');
  });
  it('picks proportionally to weight using a fixed rng', () => {
    expect(pickWeighted(['a', 'b'], (x) => (x === 'a' ? 1 : 9), () => 0.05)).toBe('a');
    expect(pickWeighted(['a', 'b'], (x) => (x === 'a' ? 1 : 9), () => 0.5)).toBe('b');
  });
  it('never returns an item with non-positive weight when a positive-weight item exists', () => {
    const picks = new Set<string>();
    for (let i = 0; i < 50; i++) picks.add(pickWeighted(['zero', 'real'], (x) => (x === 'zero' ? 0 : 1))!);
    expect(picks.has('zero')).toBe(false);
  });
});
