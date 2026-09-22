import { describe, expect, it } from 'vitest';
import { MAX_BOX, boxWeight, drawSession, nextBox } from '../src/lib/practice/leitner';

describe('boxWeight', () => {
  it('is inversely proportional to the box number', () => {
    expect(boxWeight(1)).toBe(1);
    expect(boxWeight(5)).toBeCloseTo(0.2);
  });
  it('treats box 0 or negative the same as box 1', () => {
    expect(boxWeight(0)).toBe(1);
  });
});

describe('nextBox', () => {
  it('moves up by one when remembered, capped at MAX_BOX', () => {
    expect(nextBox(1, true)).toBe(2);
    expect(nextBox(MAX_BOX, true)).toBe(MAX_BOX);
  });
  it('resets to 1 when forgotten', () => {
    expect(nextBox(4, false)).toBe(1);
  });
});

describe('drawSession', () => {
  const cards = [
    { id: 'low', box: 5 },
    { id: 'high', box: 1 },
  ];
  it('favors the lower-box card when the rng draw lands past the higher-weight slice', () => {
    expect(drawSession(cards, (c) => c.box, () => 0.9).map((c) => c.id)).toEqual(['high', 'low']);
  });
  it('picks the other order when the rng draw lands in the low-weight slice first', () => {
    expect(drawSession(cards, (c) => c.box, () => 0.1).map((c) => c.id)).toEqual(['low', 'high']);
  });
  it('returns every card exactly once regardless of rng', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, box: 1 }));
    const order = drawSession(ids, (c) => c.box);
    expect(order).toHaveLength(5);
    expect(new Set(order.map((c) => c.id))).toEqual(new Set(['a', 'b', 'c', 'd', 'e']));
  });
});
