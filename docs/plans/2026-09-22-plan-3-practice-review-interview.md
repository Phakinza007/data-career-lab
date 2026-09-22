# Data Career Lab — Plan 3: /practice, /review, /interview

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline in the current session (the user chose inline, not subagent-driven). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three cross-module pages the spec defers past the first content module: `/practice` (weighted random drill), `/review` (Leitner flashcards), and `/interview` (searchable interview-question bank) — all built from content that already exists (Module 0 + Module 1's exercises, flashcards, and interview Q&A).

**Architecture:** Three new Astro pages, each backed by one server-side aggregation module (`src/lib/content/{drill,flashcards,interview}.ts`) that walks every module/lesson via `getTrack('da')` (from Plan 1) and the `lessonData`/`practice` collections, and one `client:only="react"` (Drill, Flashcards) or `client:load` (InterviewBank — no localStorage dependency) island that renders it. The two stateful islands reuse `Exercise.tsx` and the progress store exactly as-is; the store gains two small Leitner methods. Weighting/selection logic is pure and lives in a new `src/lib/practice/` folder so it can be unit tested without Astro's content layer.

**Tech Stack:** Same as Plans 1–2 — no new dependencies.

**Spec:** `docs/specs/2026-09-21-data-career-lab-design.md` §4 ("หน้า Drill `/practice`", "Flashcards"), §5 (หน้าเว็บ table: `/practice`, `/review`, `/interview`)

## Global Constraints

Everything in Plans 1–2's Global Constraints still applies. In addition, for this plan:

- **"เรียนจบแล้ว" gate (spec §4: "สุ่มโจทย์จากบทที่เรียนผ่านแล้ว"):** both Drill and Flashcards only draw from lessons where `lessonStatus(...).done` is `true`. A module's practice-set exercises are eligible only once **every** lesson in that module is done (`moduleProgress(mod.lessons, ...).done === mod.lessons.length && mod.lessons.length > 0`). This is this plan's concrete reading of the spec's wording — write it down here so it isn't re-litigated later.
- **No track parameter.** The spec's page table lists `/practice`, `/review`, `/interview` as top-level (not under `/da/`). Only the `da` track exists today, so every aggregator in this plan is hardcoded to `getTrack('da')`. If a second track ships later, that's the point to add a `?track=` or path segment — out of scope now (YAGNI).
- **Testing split, matching existing precedent exactly:** `src/lib/content/catalog.ts` (Plan 1) calls `astro:content`'s `getCollection` and has no unit test — there is no harness in this repo for testing Astro content-collection code outside Astro's own runtime. The three new aggregators in `src/lib/content/` follow the same pattern and are **verified via `npm run build` + a browser check, not a unit test file** — do not attempt to mock `astro:content`. In contrast, the pure weighting/selection logic they feed into (`src/lib/practice/select.ts`, `src/lib/practice/leitner.ts`) has zero Astro coupling and **must** be unit tested like every other pure module in this repo (`src/lib/content/rules.ts`, `src/lib/progress/status.ts`, etc.).
- **No React-component unit tests**, matching Plan 1/2 precedent exactly (no Testing Library is set up in this repo) — `Drill.tsx`, `Flashcards.tsx`, `InterviewBank.tsx` are verified via the Browser preview tools, same as `Exercise.tsx`/`Quiz.tsx` were.
- **Picked-item stability:** once Drill or Flashcards has chosen an item/session, later `store.version` bumps (e.g. from the learner passing that very exercise, or reviewing a card) must **not** cause a different item to be silently swapped in mid-attempt. Both components are designed below so the "current pick" lives in local `useState`, set only by an explicit action (draw / restart / filter change), never recomputed reactively off `store.version`. Keep this property when implementing — it is the main correctness risk in this plan.
- Reuse existing CSS: `.card`, `.crumb`, `.muted`, `button.primary`, `button.danger`, `button.ghost`, `.interview` (already used per-lesson). New CSS classes are additive only.

## File map

```
data-career-lab/
  src/lib/practice/select.ts          # exerciseWeight, pickWeighted (pure)
  src/lib/practice/leitner.ts         # boxWeight, nextBox, drawSession (pure)
  src/lib/progress/store.ts           # + leitnerBox, reviewFlashcard (modify)
  src/lib/content/drill.ts            # DrillItem, getDrillPool
  src/lib/content/flashcards.ts       # FlashcardItem, getFlashcardPool
  src/lib/content/interview.ts        # InterviewQA, InterviewGroup, getInterviewBank
  src/components/Drill.tsx
  src/components/Flashcards.tsx
  src/components/InterviewBank.tsx
  src/pages/practice.astro
  src/pages/review.astro
  src/pages/interview.astro
  src/layouts/Base.astro              # + nav links (modify)
  src/styles/global.css               # + .drill-filters, .flashcard, header nav wrap (modify)
  tests/practice-select.test.ts
  tests/leitner.test.ts
  tests/progress.test.ts              # + leitner tests (modify)
```

---

### Task 1: Pure selection logic — weighted drill pick and Leitner session draw

**Files:**
- Create: `src/lib/practice/select.ts`, `src/lib/practice/leitner.ts`
- Test: `tests/practice-select.test.ts`, `tests/leitner.test.ts`

**Interfaces:**
- Consumes: `ExerciseRecord` (from `src/lib/progress/store.ts`, already exists)
- Produces:
  - `exerciseWeight(record: ExerciseRecord): number` — `1 + min(record.fails, 4) + (record.solutionViewed ? 2 : 0)`
  - `pickWeighted<T>(items: T[], weightOf: (t: T) => number, rng?: () => number): T | null`
  - `MAX_BOX = 5`
  - `boxWeight(box: number): number` — `1 / max(box, 1)`
  - `nextBox(box: number, remembered: boolean): number` — `remembered ? min(box + 1, MAX_BOX) : 1`
  - `drawSession<T>(cards: T[], boxOf: (c: T) => number, rng?: () => number): T[]` — full permutation of `cards`, sampled without replacement, weighted so lower boxes tend to come first

- [ ] **Step 1: Write the failing tests**

```ts
// tests/practice-select.test.ts
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
    // weights [1, 9], total 10 — rng*10 = 0.5 falls in item0's [0,1) slice
    expect(pickWeighted(['a', 'b'], (x) => (x === 'a' ? 1 : 9), () => 0.05)).toBe('a');
    // rng*10 = 5 falls past item0's slice, into item1's [1,10)
    expect(pickWeighted(['a', 'b'], (x) => (x === 'a' ? 1 : 9), () => 0.5)).toBe('b');
  });
  it('never returns an item with non-positive weight when a positive-weight item exists', () => {
    const picks = new Set<string>();
    for (let i = 0; i < 50; i++) picks.add(pickWeighted(['zero', 'real'], (x) => (x === 'zero' ? 0 : 1))!);
    expect(picks.has('zero')).toBe(false);
  });
});
```

```ts
// tests/leitner.test.ts
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
    // weights: low=0.2, high=1, total=1.2. rng=0.9 -> r=1.08, past low's 0.2 slice -> picks high first
    expect(drawSession(cards, (c) => c.box, () => 0.9).map((c) => c.id)).toEqual(['high', 'low']);
  });
  it('picks the other order when the rng draw lands in the low-weight slice first', () => {
    // rng=0.1 -> r=0.12, within low's [0, 0.2) slice -> picks low first
    expect(drawSession(cards, (c) => c.box, () => 0.1).map((c) => c.id)).toEqual(['low', 'high']);
  });
  it('returns every card exactly once regardless of rng', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, box: 1 }));
    const order = drawSession(ids, (c) => c.box);
    expect(order).toHaveLength(5);
    expect(new Set(order.map((c) => c.id))).toEqual(new Set(['a', 'b', 'c', 'd', 'e']));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/practice-select.test.ts tests/leitner.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/practice/select'` (and `leitner`).

- [ ] **Step 3: Implement**

```ts
// src/lib/practice/select.ts
import type { ExerciseRecord } from '../progress/store';

/** ข้อที่เคยตอบผิดหรือเคยดูเฉลยจะถูกสุ่มมาบ่อยกว่า (spec: หน้า Drill /practice) */
export function exerciseWeight(record: ExerciseRecord): number {
  return 1 + Math.min(record.fails, 4) + (record.solutionViewed ? 2 : 0);
}

/** สุ่มเลือก 1 รายการถ่วงน้ำหนักตาม weightOf — ทุกรายการที่มี weight > 0 มีโอกาสถูกเลือกเสมอ */
export function pickWeighted<T>(items: T[], weightOf: (t: T) => number, rng: () => number = Math.random): T | null {
  if (items.length === 0) return null;
  const weights = items.map((i) => Math.max(weightOf(i), 0));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
```

```ts
// src/lib/practice/leitner.ts
export const MAX_BOX = 5;

/** กล่องยิ่งน้อย ยิ่งมีโอกาสถูกหยิบมาทวนมากกว่า */
export function boxWeight(box: number): number {
  return 1 / Math.max(box, 1);
}

/** ตอบถูกเลื่อนขึ้นกล่อง (สูงสุด MAX_BOX) ตอบผิดกลับไปกล่อง 1 */
export function nextBox(box: number, remembered: boolean): number {
  return remembered ? Math.min(box + 1, MAX_BOX) : 1;
}

/** สุ่มลำดับการ์ดหนึ่งรอบทบทวน (สุ่มแบบไม่ใส่คืน) โดยกล่องน้อยมีโอกาสมาก่อน */
export function drawSession<T>(cards: T[], boxOf: (c: T) => number, rng: () => number = Math.random): T[] {
  const pool = [...cards];
  const order: T[] = [];
  while (pool.length > 0) {
    const weights = pool.map((c) => boxWeight(boxOf(c)));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    order.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return order;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/practice-select.test.ts tests/leitner.test.ts`
Expected: 13 PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure weighted-pick logic for drill and Leitner sessions"
```

---

### Task 2: Progress store — Leitner box tracking

**Files:**
- Modify: `src/lib/progress/store.ts`
- Test: `tests/progress.test.ts` (extend the existing file)

**Interfaces:**
- Consumes: `nextBox` (Task 1)
- Produces: two new members on `Store`: `leitnerBox(id: string): number` (default `1` for an unseen card), `reviewFlashcard(id: string, remembered: boolean): void`. `ProgressData.leitner` already exists (Plan 1) and is already included in `exportJson`/`importJson`/`migrate` — no schema change needed.

- [ ] **Step 1: Write the failing tests**

Add to the end of the `describe('createStore', ...)` block in `tests/progress.test.ts` (keep every existing test in that file untouched):

```ts
  it('tracks Leitner boxes: default 1, moves up on remembered, resets on forgotten', () => {
    const s = createStore(new MemoryStorage());
    expect(s.leitnerBox('c1')).toBe(1);
    s.reviewFlashcard('c1', true);
    expect(s.leitnerBox('c1')).toBe(2);
    s.reviewFlashcard('c1', true);
    s.reviewFlashcard('c1', true);
    s.reviewFlashcard('c1', true);
    expect(s.leitnerBox('c1')).toBe(5);
    s.reviewFlashcard('c1', true); // capped
    expect(s.leitnerBox('c1')).toBe(5);
    s.reviewFlashcard('c1', false);
    expect(s.leitnerBox('c1')).toBe(1);
  });
  it('persists Leitner boxes across stores on the same storage, including via export/import', () => {
    const storage = new MemoryStorage();
    const a = createStore(storage);
    a.reviewFlashcard('c1', true);
    const b = createStore(storage);
    expect(b.leitnerBox('c1')).toBe(2);
    const c = createStore(new MemoryStorage());
    c.importJson(a.exportJson());
    expect(c.leitnerBox('c1')).toBe(2);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/progress.test.ts`
Expected: the 2 new tests FAIL with `s.leitnerBox is not a function` (all pre-existing tests still PASS).

- [ ] **Step 3: Implement**

Add this import near the top of `src/lib/progress/store.ts`:

```ts
import { nextBox } from '../practice/leitner';
```

Add these two members to the object returned by `createStore` (place them near `viewSolution`, before `draft`):

```ts
    leitnerBox: (id: string): number => data.leitner[id] ?? 1,
    reviewFlashcard(id: string, remembered: boolean) {
      data.leitner[id] = nextBox(data.leitner[id] ?? 1, remembered);
      commit();
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/progress.test.ts`
Expected: all PASS (13 pre-existing + 2 new = 15).

- [ ] **Step 5: Run the whole unit suite**

Run: `npm test`
Expected: all files PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Leitner box tracking to the progress store"
```

---

### Task 3: Content aggregators — drill pool, flashcard pool, interview bank

**Files:**
- Create: `src/lib/content/drill.ts`, `src/lib/content/flashcards.ts`, `src/lib/content/interview.ts`

**Interfaces:**
- Consumes: `getTrack` (`src/lib/content/catalog.ts`, Plan 1), `taskView` and `TaskView` (`src/lib/content/views.ts`, Plan 1), `md`/`mdInline` (`src/lib/content/markdown.ts`, Plan 1), `url` (`src/lib/url.ts`, Plan 1), `ModuleRef`/`LessonRef` (`src/lib/content/refs.ts`, Plan 1)
- Produces:
  - `interface DrillItem { task: TaskView; moduleId: string; moduleTitle: string; sourceTitle: string; sourceUrl: string; lessonId: string | null }` and `getDrillPool(track: 'da'): Promise<{ items: DrillItem[]; modules: ModuleRef[] }>`
  - `interface FlashcardItem { gid: string; frontHtml: string; backHtml: string; moduleTitle: string; lessonTitle: string; lessonUrl: string; lessonId: string }` and `getFlashcardPool(track: 'da'): Promise<FlashcardItem[]>`
  - `interface InterviewQA { gid: string; questionHtml: string; answerHtml: string; lessonTitle: string; lessonUrl: string }`, `interface InterviewGroup { moduleId: string; moduleTitle: string; items: InterviewQA[] }`, `getInterviewBank(track: 'da'): Promise<InterviewGroup[]>`

No test file for this task (see Global Constraints) — verified in Step 3 below via build, and again visually in Tasks 4–6.

- [ ] **Step 1: Implement `src/lib/content/drill.ts`**

```ts
import { getCollection } from 'astro:content';
import { getTrack } from './catalog';
import { taskView, type TaskView } from './views';

export interface DrillItem {
  task: TaskView;
  moduleId: string;
  moduleTitle: string;
  /** ชื่อบท หรือ "ชุดฝึกท้าย module: ..." สำหรับ item จากชุดฝึกท้าย module */
  sourceTitle: string;
  sourceUrl: string;
  /** null สำหรับ item จากชุดฝึกท้าย module (ไม่ผูกกับบทใดบทหนึ่ง) */
  lessonId: string | null;
}

/** รวมทุกแบบฝึก (รวม faded) ของทุกบท + ชุดฝึกท้าย module ทั้งสาย ให้ /practice สุ่มได้ */
export async function getDrillPool(track: 'da') {
  const [modules, data, practice] = await Promise.all([
    getTrack(track),
    getCollection('lessonData'),
    getCollection('practice'),
  ]);
  const dataById = new Map(data.map((d) => [d.id, d.data]));
  const practiceById = new Map(practice.map((p) => [p.id, p.data]));
  const items: DrillItem[] = [];

  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      const d = dataById.get(lesson.id);
      if (!d) continue;
      for (const t of [...d.faded, ...d.exercises]) {
        items.push({
          task: taskView(lesson.id, t, 'level' in t ? 'exercise' : 'faded'),
          moduleId: mod.id,
          moduleTitle: mod.title,
          sourceTitle: lesson.title,
          sourceUrl: lesson.url,
          lessonId: lesson.id,
        });
      }
    }
    if (mod.practiceUrl) {
      const set = practiceById.get(mod.id);
      if (set) {
        for (const t of set.exercises) {
          items.push({
            task: taskView(`${mod.id}/practice`, t, 'exercise'),
            moduleId: mod.id,
            moduleTitle: mod.title,
            sourceTitle: `ชุดฝึกท้าย module: ${mod.title}`,
            sourceUrl: mod.practiceUrl,
            lessonId: null,
          });
        }
      }
    }
  }
  return { items, modules };
}
```

- [ ] **Step 2: Implement `src/lib/content/flashcards.ts` and `src/lib/content/interview.ts`**

```ts
// src/lib/content/flashcards.ts
import { getCollection } from 'astro:content';
import { getTrack } from './catalog';
import { mdInline } from './markdown';

export interface FlashcardItem {
  gid: string;
  frontHtml: string;
  backHtml: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonUrl: string;
  lessonId: string;
}

/** รวม flashcard ของทุกบททั้งสาย ให้ /review ทบทวนแบบ Leitner ได้ */
export async function getFlashcardPool(track: 'da'): Promise<FlashcardItem[]> {
  const [modules, data] = await Promise.all([getTrack(track), getCollection('lessonData')]);
  const dataById = new Map(data.map((d) => [d.id, d.data]));
  const items: FlashcardItem[] = [];
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      const d = dataById.get(lesson.id);
      if (!d) continue;
      for (const c of d.flashcards) {
        items.push({
          gid: `${lesson.id}/${c.id}`,
          frontHtml: mdInline(c.front),
          backHtml: mdInline(c.back),
          moduleTitle: mod.title,
          lessonTitle: lesson.title,
          lessonUrl: lesson.url,
          lessonId: lesson.id,
        });
      }
    }
  }
  return items;
}
```

```ts
// src/lib/content/interview.ts
import { getCollection } from 'astro:content';
import { getTrack } from './catalog';
import { md, mdInline } from './markdown';

export interface InterviewQA {
  gid: string;
  questionHtml: string;
  answerHtml: string;
  lessonTitle: string;
  lessonUrl: string;
}
export interface InterviewGroup {
  moduleId: string;
  moduleTitle: string;
  items: InterviewQA[];
}

/** รวมคำถามสัมภาษณ์ท้ายทุกบท จัดกลุ่มตาม module ให้ /interview กรอง/ค้นหาได้ */
export async function getInterviewBank(track: 'da'): Promise<InterviewGroup[]> {
  const [modules, data] = await Promise.all([getTrack(track), getCollection('lessonData')]);
  const dataById = new Map(data.map((d) => [d.id, d.data]));
  const groups: InterviewGroup[] = [];
  for (const mod of modules) {
    const items: InterviewQA[] = [];
    for (const lesson of mod.lessons) {
      const d = dataById.get(lesson.id);
      if (!d) continue;
      for (const qa of d.interview) {
        items.push({
          gid: `${lesson.id}/${qa.id}`,
          questionHtml: mdInline(qa.q),
          answerHtml: md(qa.a),
          lessonTitle: lesson.title,
          lessonUrl: lesson.url,
        });
      }
    }
    if (items.length > 0) groups.push({ moduleId: mod.id, moduleTitle: mod.title, items });
  }
  return groups;
}
```

- [ ] **Step 3: Verify by building**

Since there's no page calling these yet, verify with a throwaway script instead of a full page: temporarily add a debug line to `src/pages/index.astro`'s frontmatter (`const _debug = await getDrillPool('da'); console.log(_debug.items.length, (await getFlashcardPool('da')).length, (await getInterviewBank('da')).length);`), run `npm run build`, read the printed counts from the build log, then revert the temporary line (`git checkout -- src/pages/index.astro`).

Run: `npm run build 2>&1 | grep -E "^[0-9]+ [0-9]+ [0-9]+$|error"`
Expected: one line of three numbers (drill items, flashcards, interview Q&A) greater than zero, no error. Given Module 0 (2 lessons) + Module 1 (7 lessons + practice), expect roughly 90+ drill items, 18 flashcards (2 per lesson × 9 lessons), and 9–13 interview Q&A.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add cross-module content aggregators for drill, flashcards and interview bank"
```

---

### Task 4: `/practice` — Drill page

**Files:**
- Create: `src/components/Drill.tsx`, `src/pages/practice.astro`
- Modify: `src/styles/global.css` (add `.drill-filters`)

**Interfaces:**
- Consumes: `DrillItem`, `getDrillPool` (Task 3); `exerciseWeight`, `pickWeighted` (Task 1); `lessonStatus`, `moduleProgress` (Plan 1 `src/lib/progress/status.ts`); `useProgress` (Plan 1); `Exercise` component (Plan 1); `LEVELS`, `LEVEL_LABELS`, `Level` (Plan 1 `src/lib/kinds.ts`); `ExerciseRecord` type (Plan 1 `src/lib/progress/store.ts`); `ModuleRef` (Plan 1 `src/lib/content/refs.ts`)

- [ ] **Step 1: Add CSS**

Append to `src/styles/global.css`:

```css
.drill-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin: 1rem 0; }
.drill-filters label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; color: var(--muted); }
.drill-filters select, .drill-filters input[type='search'] { font: inherit; padding: 0.3rem 0.5rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); }
```

- [ ] **Step 2: Write `src/components/Drill.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { DrillItem } from '../lib/content/drill';
import type { ModuleRef } from '../lib/content/refs';
import { LEVELS, LEVEL_LABELS, type Level } from '../lib/kinds';
import { exerciseWeight, pickWeighted } from '../lib/practice/select';
import type { ExerciseRecord } from '../lib/progress/store';
import { lessonStatus, moduleProgress } from '../lib/progress/status';
import { useProgress } from '../lib/progress/useProgress';
import Exercise from './Exercise';

interface Props {
  items: DrillItem[];
  modules: ModuleRef[];
}
type Getter = (id: string) => ExerciseRecord;

function doneLessonIds(modules: ModuleRef[], get: Getter): Set<string> {
  const set = new Set<string>();
  for (const m of modules) for (const l of m.lessons) if (lessonStatus(l.exercises, get).done) set.add(l.id);
  return set;
}
function doneModuleIds(modules: ModuleRef[], get: Getter): Set<string> {
  return new Set(modules.filter((m) => m.lessons.length > 0 && moduleProgress(m.lessons, get).done === m.lessons.length).map((m) => m.id));
}

/** ช่องสุ่มโจทย์ — "ข้อที่กำลังทำ" อยู่ใน state ท้องถิ่น เปลี่ยนเฉพาะตอนกด "สุ่มข้อใหม่" หรือเปลี่ยนตัวกรองเท่านั้น
 *  ไม่เปลี่ยนตามการอัปเดตความคืบหน้าระหว่างทาง (ไม่งั้นข้อที่กำลังตอบจะถูกสลับหายไปกลางคัน) */
export default function Drill({ items, modules }: Props) {
  const store = useProgress();
  const [moduleId, setModuleId] = useState('all');
  const [level, setLevel] = useState<'all' | Level>('all');
  const [picked, setPicked] = useState<DrillItem | null>(null);

  const doneLessons = store ? doneLessonIds(modules, store.exercise) : new Set<string>();
  const doneModules = store ? doneModuleIds(modules, store.exercise) : new Set<string>();
  const eligible = items.filter((it) => {
    const sourceDone = it.lessonId ? doneLessons.has(it.lessonId) : doneModules.has(it.moduleId);
    if (!sourceDone) return false;
    if (moduleId !== 'all' && it.moduleId !== moduleId) return false;
    if (level !== 'all' && it.task.level !== level) return false;
    return true;
  });
  const availableModules = modules.filter((m) => doneModules.has(m.id) || m.lessons.some((l) => doneLessons.has(l.id)));

  function draw() {
    if (!store || eligible.length === 0) return;
    setPicked(pickWeighted(eligible, (it) => exerciseWeight(store.exercise(it.task.gid))));
  }

  useEffect(() => {
    if (picked === null) draw();
    // สุ่มข้อใหม่อัตโนมัติเมื่อยังไม่มีข้อที่เลือกไว้ (โหลดครั้งแรก หรือหลังเปลี่ยนตัวกรอง)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, store, moduleId, level, eligible.length]);

  if (!store) return <p className="muted">กำลังโหลด…</p>;

  return (
    <div className="drill">
      <div className="drill-filters">
        <label>
          หัวข้อ
          <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setPicked(null); }}>
            <option value="all">ทั้งหมด</option>
            {availableModules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </label>
        <label>
          ระดับ
          <select value={level} onChange={(e) => { setLevel(e.target.value as 'all' | Level); setPicked(null); }}>
            <option value="all">ทั้งหมด</option>
            {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
          </select>
        </label>
        <button type="button" className="primary" onClick={draw} disabled={eligible.length === 0}>🎲 สุ่มข้อใหม่</button>
        <span className="muted">มีข้อให้สุ่ม {eligible.length} ข้อ</span>
      </div>
      {picked ? (
        <>
          <p className="crumb">จาก <a href={picked.sourceUrl}>{picked.moduleTitle} — {picked.sourceTitle}</a></p>
          <Exercise key={picked.task.gid} task={picked.task} />
        </>
      ) : (
        <p className="card">
          {items.length === 0
            ? 'ยังไม่มีแบบฝึกในระบบ'
            : 'ยังไม่มีข้อที่เรียนจบตรงกับตัวกรองนี้ — เรียนจบบทหรือ module ที่เกี่ยวข้องก่อน แล้วกลับมาสุ่มโจทย์ได้'}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/pages/practice.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Drill from '../components/Drill';
import { getDrillPool } from '../lib/content/drill';

const { items, modules } = await getDrillPool('da');
---
<Base title="ฝึกซ้อม">
  <h1>ฝึกซ้อม</h1>
  <p class="lead">สุ่มโจทย์จากบทที่เรียนจบแล้ว ข้อที่เคยตอบผิดหรือเคยดูเฉลยจะถูกสุ่มมาบ่อยกว่า</p>
  <Drill client:only="react" items={items} modules={modules} />
</Base>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success; `dist/practice/index.html` exists.

- [ ] **Step 5: Browser verification**

Using the Browser preview tools (`preview_start {name: "data-career-lab"}`):
1. With empty progress, open `/practice/`. Expect the message "ยังไม่มีข้อที่เรียนจบตรงกับตัวกรองนี้…" and "มีข้อให้สุ่ม 0 ข้อ" (no lesson is done yet).
2. Set up localStorage so at least one lesson (e.g. `da/start/01-what-is-da`) is fully done — reuse the same fixture style as Plan 1 Task 11 Step 3 (`localStorage.setItem('dcl:progress', JSON.stringify({...}))` with that lesson's exercise ids marked `self`), reload `/practice/`. Expect a real exercise to render, sourced from that lesson (check the "จาก …" byline).
3. Click "สุ่มข้อใหม่" a few times — confirm it never crashes and the byline/exercise updates.
4. Answer the shown exercise correctly (type the real solution, click ตรวจคำตอบ) and confirm passing it does **not** swap the exercise out from under you (the same exercise stays on screen showing "✓ ถูกต้อง!").
5. Change the "ระดับ" filter to a level with zero eligible items and confirm the friendly empty message appears instead of a crash; change it back.
6. `read_console_messages {onlyErrors: true}` shows no errors. Screenshot as proof.
7. Clean up: `localStorage.removeItem('dcl:progress')` (or reset via `/settings/`) so later tasks start from a clean slate.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add /practice weighted drill page"
```

---

### Task 5: `/review` — Leitner flashcards page

**Files:**
- Create: `src/components/Flashcards.tsx`, `src/pages/review.astro`
- Modify: `src/styles/global.css` (add `.flashcard`)

**Interfaces:**
- Consumes: `FlashcardItem`, `getFlashcardPool` (Task 3); `drawSession` (Task 1); `store.leitnerBox`, `store.reviewFlashcard` (Task 2); `useProgress` (Plan 1)

- [ ] **Step 1: Add CSS**

Append to `src/styles/global.css`:

```css
.flashcard { display: block; width: 100%; text-align: center; padding: 3rem 1.5rem; font-size: 1.2rem; cursor: pointer; }
```

- [ ] **Step 2: Write `src/components/Flashcards.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FlashcardItem } from '../lib/content/flashcards';
import { drawSession } from '../lib/practice/leitner';
import { useProgress } from '../lib/progress/useProgress';

/** เซสชันทบทวนหนึ่งรอบถูกสุ่มครั้งเดียวตอนเริ่ม (หรือกด "เริ่มรอบใหม่") แล้วคงที่ตลอดรอบ
 *  ไม่สุ่มใหม่ตามการอัปเดตความคืบหน้าระหว่างทาง (ไม่งั้นการ์ดจะสลับหายไปกลางรอบ) */
export default function Flashcards({ cards }: { cards: FlashcardItem[] }) {
  const store = useProgress();
  const [session, setSession] = useState<FlashcardItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ remembered: 0, forgot: 0 });

  useEffect(() => {
    if (store && session === null && cards.length > 0) {
      setSession(drawSession(cards, (c) => store.leitnerBox(c.gid)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, cards.length]);

  if (!store) return <p className="muted">กำลังโหลด…</p>;
  if (cards.length === 0) return <p className="card">ยังไม่มี flashcard ในระบบ</p>;
  if (session === null) return <p className="muted">กำลังเตรียมการ์ด…</p>;

  function restart() {
    setSession(drawSession(cards, (c) => store!.leitnerBox(c.gid)));
    setIndex(0);
    setFlipped(false);
    setTally({ remembered: 0, forgot: 0 });
  }

  if (index >= session.length) {
    return (
      <div className="card">
        <p>ทบทวนครบ {session.length} ใบแล้ว — จำได้ {tally.remembered} ใบ ต้องทวนอีก {tally.forgot} ใบ</p>
        <button type="button" className="primary" onClick={restart}>เริ่มรอบใหม่</button>
      </div>
    );
  }

  const card = session[index];
  const box = store.leitnerBox(card.gid);

  function answer(remembered: boolean) {
    store!.reviewFlashcard(card.gid, remembered);
    setTally((t) => (remembered ? { ...t, remembered: t.remembered + 1 } : { ...t, forgot: t.forgot + 1 }));
    setIndex((i) => i + 1);
    setFlipped(false);
  }

  return (
    <div>
      <p className="muted">การ์ดที่ {index + 1}/{session.length} · กล่อง {box}</p>
      <button type="button" className="card flashcard" onClick={() => setFlipped((f) => !f)} aria-label="กดเพื่อพลิกการ์ด">
        <div dangerouslySetInnerHTML={{ __html: flipped ? card.backHtml : card.frontHtml }} />
        <p className="muted">{flipped ? '(ด้านหลัง — กดเพื่อพลิกกลับ)' : '(กดเพื่อดูคำตอบ)'}</p>
      </button>
      {flipped && (
        <div className="runner-bar">
          <button type="button" className="danger" onClick={() => answer(false)}>จำไม่ได้ ✗</button>
          <button type="button" className="primary" onClick={() => answer(true)}>จำได้ ✓</button>
        </div>
      )}
      <p className="muted">จาก <a href={card.lessonUrl}>{card.moduleTitle} — {card.lessonTitle}</a></p>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/pages/review.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Flashcards from '../components/Flashcards';
import { getFlashcardPool } from '../lib/content/flashcards';

const cards = await getFlashcardPool('da');
---
<Base title="ทบทวน">
  <h1>ทบทวนคำศัพท์</h1>
  <p class="lead">Flashcard แบบ Leitner — ตอบถูกเลื่อนขึ้นกล่อง ตอบผิดกลับไปกล่อง 1 เพื่อทวนถี่ขึ้น</p>
  <Flashcards client:only="react" cards={cards} />
</Base>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success; `dist/review/index.html` exists.

- [ ] **Step 5: Browser verification**

1. Open `/review/`. Expect the first card's front side and "(กดเพื่อดูคำตอบ)". Note the total card count in "การ์ดที่ 1/N".
2. Click the card to flip — back side shows, "จำได้ ✓" / "จำไม่ได้ ✗" buttons appear.
3. Click "จำได้ ✓" — index advances to card 2, flipped resets to front.
4. `javascript_tool`: read `JSON.parse(localStorage.getItem('dcl:progress')).leitner` and confirm the first card's gid now maps to `2`.
5. Click through the remaining cards (mix of ✓/✗) until the "ทบทวนครบ N ใบแล้ว" summary appears with correct tallies; click "เริ่มรอบใหม่" and confirm it restarts at card 1.
6. Reload the page mid-session (after answering 2–3 cards) and confirm a **fresh** session starts (this is expected — sessions aren't persisted across reloads, only the per-card box is) while the Leitner boxes from before the reload are retained.
7. `read_console_messages {onlyErrors: true}` shows no errors. Screenshot as proof.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add /review Leitner flashcard page"
```

---

### Task 6: `/interview` — searchable interview-question bank

**Files:**
- Create: `src/components/InterviewBank.tsx`, `src/pages/interview.astro`

**Interfaces:**
- Consumes: `InterviewGroup`, `getInterviewBank` (Task 3)

- [ ] **Step 1: Write `src/components/InterviewBank.tsx`**

```tsx
import { useMemo, useState } from 'react';
import type { InterviewGroup } from '../lib/content/interview';

export default function InterviewBank({ groups }: { groups: InterviewGroup[] }) {
  const [moduleId, setModuleId] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return groups
      .filter((g) => moduleId === 'all' || g.moduleId === moduleId)
      .map((g) => ({ ...g, items: g.items.filter((it) => !query || it.questionHtml.toLowerCase().includes(query)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, moduleId, q]);

  return (
    <div>
      <div className="drill-filters">
        <label>
          หัวข้อ
          <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="all">ทั้งหมด</option>
            {groups.map((g) => <option key={g.moduleId} value={g.moduleId}>{g.moduleTitle}</option>)}
          </select>
        </label>
        <label>
          ค้นหา
          <input type="search" placeholder="พิมพ์คำถาม…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {filtered.length === 0 && <p className="card">ไม่พบคำถามที่ตรงกับตัวกรอง</p>}
      {filtered.map((g) => (
        <section key={g.moduleId}>
          <h2>{g.moduleTitle}</h2>
          {g.items.map((it) => (
            <details key={it.gid} className="card interview">
              <summary dangerouslySetInnerHTML={{ __html: it.questionHtml }} />
              <div dangerouslySetInnerHTML={{ __html: it.answerHtml }} />
              <p className="muted">จาก <a href={it.lessonUrl}>{it.lessonTitle}</a></p>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/interview.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import InterviewBank from '../components/InterviewBank';
import { getInterviewBank } from '../lib/content/interview';

const groups = await getInterviewBank('da');
---
<Base title="คำถามสัมภาษณ์">
  <h1>คลังคำถามสัมภาษณ์</h1>
  <p class="lead">รวมคำถามท้ายทุกบท กรองตามหัวข้อหรือค้นหาได้</p>
  <InterviewBank client:load groups={groups} />
</Base>
```

Note: `client:load` (not `client:only`/`client:visible`) — this island has no `localStorage`/progress dependency, so there is no SSR-mismatch risk, and it is the page's primary content so it should hydrate immediately rather than waiting to scroll into view.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success; `dist/interview/index.html` exists.

- [ ] **Step 4: Browser verification**

1. Open `/interview/`. Expect grouped sections ("เริ่มต้น", "SQL") each with `<details>` items; all collapsed by default.
2. Click a question — it expands showing the answer and a "จาก …" link back to its lesson.
3. Use the "หัวข้อ" dropdown to filter to just "SQL" — confirm the "เริ่มต้น" section disappears.
4. Type part of a question (e.g. "fan-out" or a Thai substring you know is in one of the SQL lesson's interview questions) into "ค้นหา" — confirm only matching questions remain, and clearing the box restores the full list.
5. `read_console_messages {onlyErrors: true}` shows no errors. Screenshot as proof.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add /interview searchable question bank"
```

---

### Task 7: Navigation links and mobile-width re-check

**Files:**
- Modify: `src/layouts/Base.astro`, `src/styles/global.css`

**Interfaces:**
- Consumes: `url` (Plan 1)

- [ ] **Step 1: Add nav links**

In `src/layouts/Base.astro`, replace the `<nav>` block:

```astro
      <nav>
        <a href={url('/da/')}>Data Analyst</a>
        <a href={url('/practice/')}>ฝึกซ้อม</a>
        <a href={url('/review/')}>ทบทวน</a>
        <a href={url('/interview/')}>สัมภาษณ์</a>
        <a href={url('/settings/')}>ตั้งค่า</a>
        <button id="theme-toggle" class="ghost" type="button" aria-label="สลับโหมดสว่าง/มืด">◐</button>
      </nav>
```

- [ ] **Step 2: Let the header nav wrap on narrow screens**

Five nav items plus the brand no longer fit on one line at 375px width even with the Plan 1 truncation/`flex: none` fix (that fix was tuned for 2 links + a button). Update `src/styles/global.css`: find the `.site-header` rule and add `flex-wrap: wrap;`; find `.site-header nav` and add `flex-wrap: wrap;` — both rules already exist from Plan 1, just add the one property to each (do not remove any existing property). Leave the `@media (max-width: 480px)` block and `.brand` truncation exactly as they are.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Browser verification at phone width**

Using the Browser preview tools:
1. `resize_window {preset: "mobile"}` (375×812), navigate to `/`.
2. `javascript_tool`: `document.documentElement.scrollWidth <= window.innerWidth` must be `true` (no horizontal scroll — same check as Plan 1 Task 1).
3. Screenshot and confirm the header wraps onto two (or more) lines cleanly rather than overflowing.
4. Click through all 5 nav links once at this width to confirm nothing is clipped or unclickable.
5. `resize_window {preset: "desktop"}` to reset, then confirm the header still looks correct (single line) at full width.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add nav links for the new pages and let the header wrap on narrow screens"
```

---

### Task 8: Full verification, README note, and finish

**Files:**
- Modify: `README.md` (add the three new pages to a short list; do not restructure the rest)

- [ ] **Step 1: Stop any running preview server first**

Per Plan 2's execution notes: running `npm test` while the Browser preview's dev server is up caused a false-flaky failure and a 10-minute run once, from resource contention. Stop the preview (`preview_stop`, or `npx astro preview stop` / kill the `astro dev` process) before the next step.

- [ ] **Step 2: Full suite and build**

Run: `npm test && npm run build`
Expected: all tests pass (Plan 2 ended at 281; this plan adds 13 (Task 1) + 2 (Task 2) = 15, so expect 296), build succeeds with `dist/practice/index.html`, `dist/review/index.html`, `dist/interview/index.html` all present.

- [ ] **Step 3: One end-to-end browser pass tying the three pages together**

Restart the preview server, then:
1. On a lesson page (e.g. `da/sql/01-select-where-order`), pass every basic+applied exercise so the lesson shows `done`.
2. Open `/practice/`, confirm that lesson's exercises are now drawable (byline names it), pass the drawn one.
3. Open `/review/`, confirm that lesson's 2 flashcards appear in the session.
4. Open `/interview/`, confirm that lesson's interview question is listed under "SQL".
5. Stop the preview server again when done (leaves a clean state for the finishing-branch step's `npm test`).

- [ ] **Step 4: README note**

Add one short paragraph after the "เพิ่มบทเรียน" section in `README.md`:

```markdown
## หน้าใช้ทบทวน

- `/practice` สุ่มโจทย์จากบทที่เรียนจบแล้วเท่านั้น (ทั้งบทเดี่ยวๆ และชุดฝึกท้าย module ที่ต้องเรียนจบทั้ง module ก่อน) ข้อที่เคยตอบผิดหรือเคยดูเฉลยจะถูกสุ่มมาบ่อยกว่า
- `/review` flashcard แบบ Leitner 5 กล่อง ดึงการ์ดจาก `flashcards` ของทุกบท
- `/interview` รวมคำถามจาก `interview` ของทุกบท กรองตาม module หรือค้นหาได้
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "docs: note the practice/review/interview pages in README"
```

---

## Execution notes (fill in while executing)

Record deviations here, same convention as Plans 1–2. Read before starting Plan 4.

- Work happened on branch `feat/plan-3`, not directly on `main`.
- Task 1: 15 tests pass, not 13 as the plan's Step 4 said (4 `exerciseWeight` + 4 `pickWeighted` + 2 `boxWeight` + 2 `nextBox` + 3 `drawSession` = 15). Simple miscount when writing the plan; no code issue.
- Task 3's debug-verification step worked exactly as written: the temporary `console.log` in `index.astro` printed `87 18 11` (drill items, flashcards, interview Q&A) on the first try, matching the plan's hand-computed estimate.
- **Real bug found and fixed during Task 8's end-to-end walkthrough:** the plan's own Global Constraints state that "both Drill and Flashcards only draw from lessons where `lessonStatus(...).done` is `true`", and Task 4's `Drill.tsx` correctly implements this — but Task 3/5 as originally written **never actually gated Flashcards by lesson completion**: `getFlashcardPool` returns every card site-wide, `Flashcards.tsx` only took a `cards` prop with no `modules`/progress filtering, and `review.astro` passed the full pool straight through. This shipped in the Task 5 commit without being caught by Task 5's own browser verification (which only checked flip/answer/session mechanics, not that the pool was scoped). It surfaced immediately once Task 8's walkthrough compared `/practice`'s scoped count against `/review`'s: `/practice` correctly showed 9 eligible items from the one done lesson, but `/review` showed all 18 site-wide cards. Fixed by:
  - Adding a `modules: ModuleRef[]` prop to `Flashcards.tsx` and computing `doneLessons` with `lessonStatus` (same pattern as `Drill.tsx`'s `doneLessonIds` helper), filtering `cards` down to `eligible` before every `drawSession` call (initial draw and `restart()`).
  - Adding a new empty-state message ("ยังไม่มีการ์ดจากบทที่เรียนจบแล้ว…") for when `cards.length > 0` but `eligible.length === 0`, distinct from the pre-existing "ยังไม่มี flashcard ในระบบ" message for when there are no cards at all.
  - Updating `review.astro` to also call `getTrack('da')` and pass `modules` to the island.
  - Re-verified: with one lesson done, `/review` now correctly shows only that lesson's 2 cards; with no progress, it shows the new "เรียนจบบทแรกก่อน" message instead of the full 18.
  - **Lesson for future plans:** when two features share a stated design rule (here, the "เรียนจบแล้ว" gate applying to both Drill and Flashcards), write that rule into *both* features' task steps explicitly, or add a cross-check step at the end that compares their outputs against the same fixture — don't rely on a Global Constraints paragraph alone to keep separate tasks consistent with each other.
- A stale error (`TypeError: modules is not iterable`) briefly appeared in `read_console_messages` after the fix was applied but *before* restarting the dev server's tab — it turned out to be a leftover buffered log from the pre-fix code, not a live error (confirmed by opening a fresh tab, which showed zero console errors on the same page). Noting this so it isn't mistaken for a real regression during a future session: **when a console error appears right after a code fix, check it in a freshly opened tab before assuming the fix didn't work — the console log buffer can outlive an HMR update.**

## Self-review record

- **Spec coverage:** §5's three page rows (`/practice`, `/review`, `/interview`) → Tasks 4–6. §4's Drill weighting rule ("ให้น้ำหนักข้อที่เคย 'ผ่านด้วยเฉลย' หรือเคยตอบผิดมากกว่าข้ออื่น") → `exerciseWeight` (Task 1). §4's Leitner description ("ตอบถูกเลื่อนขึ้นกล่อง ตอบผิดกลับไปกล่อง 1") → `nextBox` (Task 1) and the store (Task 2).
- **Placeholder scan:** every code block is complete and wired to real, already-existing types from Plans 1–2 (`ModuleRef`, `TaskView`, `ExerciseRecord`, `lessonStatus`, `moduleProgress`) — nothing here is invented or approximate. The one place this plan explicitly narrows the spec's wording ("เรียนจบแล้ว" gate) is called out in Global Constraints, not left ambiguous.
- **Ambiguity / correctness check:** the "picked-item / session stability" property (Global Constraints) is the main way this feature could subtly misbehave (an item swapping out mid-attempt due to a progress-store update) — each of Drill and Flashcards is designed with local `useState` holding the current pick/session, updated only by explicit user action, and Task 4/5's browser verification steps explicitly test for this ("does **not** swap the exercise out from under you").
- **Type consistency:** `DrillItem.task` is a `TaskView` (same type `Exercise.tsx` already consumes, unchanged) so `<Exercise task={picked.task} />` needs no adapter. `FlashcardItem.gid` and `InterviewQA.gid` both follow the existing `${lessonId}/${localId}` convention Plan 1 established for exercises, so Leitner box keys and future analytics stay consistent across features.
