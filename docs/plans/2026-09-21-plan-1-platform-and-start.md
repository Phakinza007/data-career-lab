# Data Career Lab — Plan 1: Platform + Module 0 (เริ่มต้น)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline in the current session (the user chose inline, not subagent-driven). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the whole learning platform: Astro site, in-browser Python/SQL runners, auto-checked exercises, progress tracking and the dataset. Then prove it end-to-end with the two lessons of Module 0 "เริ่มต้น".

**Architecture:** A static Astro site. Lessons are MDX files for prose and runnable examples, and each lesson has one YAML file that holds its goals, worked examples, faded examples, exercises, quiz, summary, interview questions and flashcards. The interactive parts are React islands:
- Python runs in Pyodide (loaded from CDN) inside a module Web Worker.
- SQL runs in DuckDB-wasm, self-hosted through Vite `?url` imports.

The checking logic is shared by the browser and the Node content tests: `checkSql` is TypeScript, and `runtime.py`/`checkers.py` are Python that runs in Pyodide in both places. Every solution in the content is therefore verified against the same engine the learner uses.

**Tech Stack:** Astro 7.3.3, @astrojs/mdx 8.0.1, @astrojs/react 6.0.6, React 19.3.0, @uiw/react-codemirror 4.25.11, @duckdb/duckdb-wasm 1.33.1-dev57.0, Pyodide 314.0.7 (pandas 3.0.2, matplotlib 3.10.8), marked 18.0.13, Vitest 5.0.1, yaml 2.9.1, Playwright 1.63.0. The dataset generator is Python 3 standard library only.

**Spec:** `docs/specs/2026-09-21-data-career-lab-design.md`

## Plan series

| Plan | Scope |
|---|---|
| **1 (this)** | Platform + dataset + Module 0 (2 intro lessons) |
| 2 | Module 1 SQL: 7 lessons + module practice set |
| 3 | `/practice` drill, `/review` flashcards (Leitner), `/interview` bank |
| 4 | Module 2 pandas |
| 5 | Module 3 stats + Module 4 viz (seaborn via `micropip`, it is not in the Pyodide lock) |
| 6 | Module 5 metrics + Module 6 capstone notebook + deploy |

Order change vs spec §8: the drill, review and interview pages move up to Plan 3, right after SQL. The learner can drill as soon as the first real module exists.

## Global Constraints

- Node ≥ 22.12.0 (machine has 26.5.1). All versions are pinned exactly as in Tech Stack. `PYODIDE_VERSION` in code must equal the `pyodide` devDependency (`314.0.7`).
- No backend, no login. Progress lives in `localStorage` key `dcl:progress`, object `version: 1`. A corrupt value is copied to `dcl:progress:backup` before starting fresh.
- All learner-facing UI text is Thai.
- Run timeout is 10 seconds. On timeout the worker is terminated and recreated, and the learner is told.
- Result display is capped at 20 rows and always states the total row count. Text output is capped at 20,000 characters.
- Every data file is ≤ 5 MB.
- SQL checking: row order is ignored unless `ordered: true`. Column names are ignored, but column count and order must match. Numbers are equal when `|a−b| ≤ 1e-6 × max(1,|a|,|b|)`. NULL equals NULL.
- Global exercise id = `<lessonId>/<localId>`, e.g. `da/start/02-workflow-and-tools/e1`. Module practice ids = `<moduleId>/practice/<localId>`.
- Ratio rules (spec §4) apply to every lesson except modules with `intro: true` (Module 0 is orientation):
  - worked examples 2–3
  - faded 1–2 (starter must contain `___`)
  - basic 4–5, applied 3–4, challenge 1–3
  - quiz 3–5
  - interview 1–3
  - practice set 15–20
- Python checks run after the learner's code in the same namespace. The solution's variables are available as `_sol["name"]`. Check code prefixes its own helper variables with `_`.
- Do not push, deploy or create remotes in this plan. Publishing is outward-facing and is Plan 6, with the user's approval.

## File map

```
data-career-lab/
  package.json, astro.config.mjs, tsconfig.json, vitest.config.ts, playwright.config.ts, .gitignore, README.md
  scripts/generate_dataset.py              # deterministic dataset (stdlib only)
  public/data/*.csv, public/data/raw/customers_raw.csv
  src/env.d.ts
  src/styles/global.css
  src/layouts/Base.astro
  src/lib/url.ts, theme.ts, kinds.ts, dataset.ts, useIsDark.ts
  src/lib/runtime/types.ts, results.ts, timeout.ts, worker-rpc.ts,
                  python.worker.ts, python-client.ts, sql-client.ts, index.ts
  src/lib/sql/normalize.ts, compare.ts, check.ts
  src/lib/python/runtime.py, checkers.py, boot.ts
  src/lib/content/schema.ts, rules.ts, markdown.ts, views.ts, refs.ts, catalog.ts
  src/lib/progress/store.ts, status.ts, index.ts, useProgress.ts
  src/components/CodeEditor.tsx, Output.tsx, RunStatus.tsx, Runner.tsx,
                 Exercise.tsx, WorkedExample.tsx, Quiz.tsx,
                 LessonNav.tsx, ModuleProgress.tsx, ContinueButton.tsx,
                 TrackLesson.tsx, StorageWarning.tsx, SettingsPanel.tsx
  src/content.config.ts
  src/content/modules.yaml
  src/content/lessons/da/start/01-what-is-da.mdx, 02-workflow-and-tools.mdx
  src/content/lesson-data/da/start/01-what-is-da.yaml, 02-workflow-and-tools.yaml
  src/content/practice/                    # empty in Plan 1
  src/pages/index.astro, settings.astro, da/index.astro,
            da/[module]/index.astro, da/[module]/[lesson].astro, da/[module]/practice.astro
  tests/helpers/duckdb-node.ts, dataset-files.ts, pyodide-node.ts, check-task.ts
  tests/sql.test.ts, dataset.test.ts, python-runtime.test.ts, content-schema.test.ts,
        progress.test.ts, worker-rpc.test.ts, views.test.ts, content/content.test.ts
  e2e/smoke.spec.ts
```

Findings verified before writing this plan (scratch probe on 2026-09-21):
- DuckDB-wasm's `duckdb-node-blocking.cjs` runs in Node and reports `version() = v1.5.4`. `registerFileText` works.
- Arrow gives `SUM()` and `DECIMAL` values as `DecimalBigNum`. `String(v)` is the unscaled signed integer, so it must be divided by `10**type.scale`.
- `DATE` and `TIMESTAMP` values come back as epoch milliseconds.
- `pyodide@314.0.7` in Node loads pandas 3.0.2 and matplotlib from the CDN and caches the wheels in `node_modules`.

---

### Task 1: Project skeleton, base layout, theme, home page

**Files:**
- Create: `.gitignore`, `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/env.d.ts`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/lib/url.ts`, `src/lib/theme.ts`, `src/pages/index.astro`

**Interfaces:**
- Produces: `url(path: string): string` (base-aware link), `isDark(): boolean`, `toggleTheme(): void`, `THEME_EVENT = 'dcl:theme'`. `Base.astro` takes props `{ title: string; description?: string }` and has one default slot.

- [ ] **Step 1: Write config files**

`.gitignore`:
```
node_modules/
dist/
.astro/
test-results/
playwright-report/
.DS_Store
```

`package.json`:
```json
{
  "name": "data-career-lab",
  "type": "module",
  "private": true,
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:content": "vitest run tests/content",
    "e2e": "playwright test",
    "data": "python3 scripts/generate_dataset.py"
  },
  "dependencies": {
    "@astrojs/mdx": "8.0.1",
    "@astrojs/react": "6.0.6",
    "@codemirror/lang-python": "6.2.1",
    "@codemirror/lang-sql": "6.10.0",
    "@codemirror/state": "6.7.5",
    "@codemirror/view": "6.43.12",
    "@duckdb/duckdb-wasm": "1.33.1-dev57.0",
    "@fontsource/ibm-plex-sans-thai": "5.3.0",
    "@uiw/react-codemirror": "4.25.11",
    "astro": "7.3.3",
    "marked": "18.0.13",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "pyodide": "314.0.7",
    "vitest": "5.0.1",
    "yaml": "2.9.1"
  }
}
```

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  // GitHub Pages จะตั้ง BASE_PATH=/data-career-lab/ ตอน deploy (Plan 6)
  base: process.env.BASE_PATH ?? '/',
  integrations: [mdx(), react()],
  vite: {
    optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] },
    worker: { format: 'es' },
  },
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Pyodide โหลด pandas ครั้งแรกใช้เวลาหลายวินาที
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
```

`src/env.d.ts`:
```ts
/// <reference types="astro/client" />
```

- [ ] **Step 2: Install**

Run: `cd /Users/chawanpunya/Documents/School/sem1/data-career-lab && npm install`
Expected: installs with no `ERESOLVE` error, and `package-lock.json` is created.

- [ ] **Step 3: Write `src/lib/url.ts` and `src/lib/theme.ts`**

```ts
// src/lib/url.ts
/** สร้างลิงก์ภายในเว็บที่ใช้ได้ทั้งตอน dev (/) และตอน deploy ใต้ sub-path */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
```

```ts
// src/lib/theme.ts
export const THEME_EVENT = 'dcl:theme';
const KEY = 'dcl:theme';

export function isDark(): boolean {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function toggleTheme(): void {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // บันทึกไม่ได้ก็ใช้ได้แค่รอบนี้
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}
```

- [ ] **Step 4: Write `src/styles/global.css`**

```css
:root {
  --bg: #fbfaf7;
  --surface: #ffffff;
  --surface-2: #f3f1ec;
  --text: #1d1c1a;
  --muted: #6b6860;
  --border: #e3e0d8;
  --accent: #2f6fed;
  --accent-text: #ffffff;
  --pass: #1f7a45;
  --pass-bg: #e4f3ea;
  --fail: #b93b27;
  --fail-bg: #fbe9e5;
  --warn: #7a5600;
  --warn-bg: #fff3d1;
  --code-bg: #f6f5f1;
  --radius: 10px;
  --font: 'IBM Plex Sans Thai', system-ui, sans-serif;
  --mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #151514; --surface: #1d1d1b; --surface-2: #262623; --text: #ecebe6; --muted: #a09d94;
    --border: #34332f; --accent: #6b9bff; --accent-text: #0d1426; --pass: #6fcf97; --pass-bg: #16301f;
    --fail: #ff8a75; --fail-bg: #3a1c16; --warn: #f2c14e; --warn-bg: #33290f; --code-bg: #1a1a18;
    color-scheme: dark;
  }
}
:root[data-theme='dark'] {
  --bg: #151514; --surface: #1d1d1b; --surface-2: #262623; --text: #ecebe6; --muted: #a09d94;
  --border: #34332f; --accent: #6b9bff; --accent-text: #0d1426; --pass: #6fcf97; --pass-bg: #16301f;
  --fail: #ff8a75; --fail-bg: #3a1c16; --warn: #f2c14e; --warn-bg: #33290f; --code-bg: #1a1a18;
  color-scheme: dark;
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 17px; line-height: 1.7; }
a { color: var(--accent); }
h1, h2, h3 { line-height: 1.3; }
h2 { margin-top: 2.2rem; }
code, pre { font-family: var(--mono); font-size: 0.9em; }
:not(pre) > code { background: var(--code-bg); border: 1px solid var(--border); border-radius: 4px; padding: 0 0.3em; }
pre { white-space: pre-wrap; margin: 0; }
table { border-collapse: collapse; width: 100%; font-size: 0.95em; }
th, td { border-bottom: 1px solid var(--border); padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.muted { color: var(--muted); }
.lead { font-size: 1.1rem; color: var(--muted); }

.site-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 16px; border-bottom: 1px solid var(--border); background: var(--surface); position: sticky; top: 0; z-index: 10; }
.site-header nav { display: flex; align-items: center; gap: 1rem; }
.site-header a { text-decoration: none; color: var(--text); }
.brand { font-weight: 600; }
.container { max-width: 1120px; margin: 0 auto; padding: 1.5rem 16px 4rem; }
.banner { background: var(--warn-bg); color: var(--warn); padding: 0.6rem 16px; text-align: center; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.25rem; margin: 1rem 0; }
.hero { padding: 2rem 0 1rem; }
.hero h1 { font-size: 2.2rem; margin: 0 0 0.5rem; }
.track-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
.track-card.soon { opacity: 0.65; }
.step { margin: 0; color: var(--muted); font-size: 0.85rem; }
.badge { display: inline-block; font-size: 0.8rem; padding: 0.1rem 0.6rem; border-radius: 999px; background: var(--surface-2); color: var(--muted); }

button, .button { font: inherit; font-size: 0.95rem; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: 8px; padding: 0.35rem 0.9rem; cursor: pointer; text-decoration: none; display: inline-block; }
button:disabled { opacity: 0.55; cursor: default; }
button.primary, .button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
button.ghost { background: transparent; }
button.danger { border-color: var(--fail); color: var(--fail); background: transparent; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.crumb { color: var(--muted); font-size: 0.9rem; margin: 0; }
.module-list, .lesson-list { list-style: none; padding: 0; }
.module-card { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.module-card h2 { margin: 0.2rem 0; }
.lesson-list li { padding: 0.5rem 0; border-bottom: 1px solid var(--border); }

.lesson-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 2rem; }
.lesson-aside { position: sticky; top: 4rem; align-self: start; font-size: 0.92rem; }
@media (max-width: 860px) {
  .lesson-layout { grid-template-columns: 1fr; }
  .lesson-aside { position: static; }
}
.lesson-nav { list-style: none; padding: 0; margin: 0; }
.lesson-nav a { display: flex; gap: 0.5rem; padding: 0.3rem 0.4rem; border-radius: 6px; text-decoration: none; color: var(--text); }
.lesson-nav li.current a { background: var(--surface-2); font-weight: 600; }
.lesson-nav .icon { width: 1.2em; flex: none; }
.lesson-nav .stars { color: var(--warn); margin-left: auto; }
.pager { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; }
.pager .next { margin-left: auto; }

.runner, .exercise, .worked { margin: 1rem 0; }
.editor { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; font-size: 0.92rem; }
.runner-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 0.5rem 0; }
.runner-title { font-weight: 600; margin-bottom: 0.3rem; }
.lang-tag { margin-left: auto; font-size: 0.8rem; color: var(--muted); }
.run-note { font-size: 0.85rem; color: var(--muted); }
.output { border-left: 3px solid var(--border); padding: 0.4rem 0.8rem; margin: 0.5rem 0; overflow-x: auto; }
.output img { max-width: 100%; background: #fff; border-radius: 6px; }
.out-error { color: var(--fail); }
.table-wrap { overflow-x: auto; }
.table-wrap caption { caption-side: bottom; text-align: left; color: var(--muted); font-size: 0.85rem; padding-top: 0.3rem; }
.null { color: var(--muted); font-style: italic; }
.load-error { background: var(--warn-bg); color: var(--warn); padding: 0.5rem 0.8rem; border-radius: 8px; }

.exercise-head { display: flex; gap: 0.5rem; align-items: center; }
.level, .status { font-size: 0.8rem; padding: 0.05rem 0.55rem; border-radius: 999px; background: var(--surface-2); }
.status-self { background: var(--pass-bg); color: var(--pass); }
.status-with-solution { background: var(--warn-bg); color: var(--warn); }
.status-failed { background: var(--fail-bg); color: var(--fail); }
.verdict { white-space: pre-wrap; padding: 0.5rem 0.8rem; border-radius: 8px; }
.verdict.pass { background: var(--pass-bg); color: var(--pass); }
.verdict.fail { background: var(--fail-bg); color: var(--fail); }
.hints { background: var(--surface-2); border-radius: 8px; padding: 0.4rem 1rem 0.4rem 2rem; }
.solution, .pitfall { border-top: 1px dashed var(--border); margin-top: 0.8rem; padding-top: 0.5rem; }
.pitfall { background: var(--warn-bg); border-radius: 8px; padding: 0.6rem 0.9rem; }
.steps > li { margin-bottom: 1rem; }

.quiz-q { border: 1px solid var(--border); }
.quiz-q legend { font-weight: 600; padding: 0 0.3rem; }
.choice { display: block; width: 100%; text-align: left; margin: 0.35rem 0; background: var(--surface); }
.choice.right { border-color: var(--pass); background: var(--pass-bg); }
.choice.wrong { border-color: var(--fail); background: var(--fail-bg); }
.why { font-size: 0.93rem; color: var(--muted); }

.progress { display: flex; align-items: center; gap: 0.6rem; min-width: 180px; }
.progress .bar { flex: 1; height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.progress .bar span { display: block; height: 100%; background: var(--pass); }
.interview summary { cursor: pointer; font-weight: 600; }
```

- [ ] **Step 5: Write `src/layouts/Base.astro`**

```astro
---
import '@fontsource/ibm-plex-sans-thai/400.css';
import '@fontsource/ibm-plex-sans-thai/600.css';
import '../styles/global.css';
import { url } from '../lib/url';

interface Props {
  title: string;
  description?: string;
}
const { title, description = 'เว็บเรียนส่วนตัวสาย Data Analyst, ML และ AI Engineer' } = Astro.props;
---
<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title} · Data Career Lab</title>
    <script is:inline>
      try {
        const t = localStorage.getItem('dcl:theme');
        if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
      } catch {}
    </script>
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href={url('/')}>Data Career Lab</a>
      <nav>
        <a href={url('/da/')}>Data Analyst</a>
        <a href={url('/settings/')}>ตั้งค่า</a>
        <button id="theme-toggle" class="ghost" type="button" aria-label="สลับโหมดสว่าง/มืด">◐</button>
      </nav>
    </header>
    <main class="container">
      <slot />
    </main>
    <script>
      import { toggleTheme } from '../lib/theme';
      document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    </script>
  </body>
</html>
```

- [ ] **Step 6: Write `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import { url } from '../lib/url';

const tracks = [
  { title: 'Data Analyst', blurb: 'SQL, pandas, สถิติ, visualization และ business metrics — จบด้วยโปรเจกต์ portfolio', href: url('/da/') },
  { title: 'Machine Learning', blurb: 'scikit-learn, การวัดผลโมเดล, feature engineering, tree/boosting และ deep learning เบื้องต้น', href: null },
  { title: 'AI Engineer', blurb: 'LLM API, embeddings และ RAG, agents, evals และการ deploy', href: null },
];
---
<Base title="หน้าแรก">
  <section class="hero">
    <h1>Data Career Lab</h1>
    <p class="lead">เรียนสาย Data ทีละขั้น — อ่าน ดูตัวอย่าง แล้วลงมือเขียนโค้ดจริงในเบราว์เซอร์</p>
  </section>
  <section class="track-grid">
    {tracks.map((t, i) => (
      <article class:list={['card', 'track-card', { soon: !t.href }]}>
        <p class="step">สายที่ {i + 1}</p>
        <h2>{t.title}</h2>
        <p>{t.blurb}</p>
        {t.href ? <a class="button primary" href={t.href}>เข้าเรียน</a> : <span class="badge">เร็วๆ นี้</span>}
      </article>
    ))}
  </section>
</Base>
```

- [ ] **Step 7: Build and verify**

Run: `npm run build && grep -c "Data Career Lab" dist/index.html`
Expected: build succeeds and prints a count ≥ 1.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Astro site with base layout, theme toggle and home page"
```

---

### Task 2: SQL result normalizer, comparer and checker

**Files:**
- Create: `src/lib/runtime/types.ts`, `src/lib/sql/normalize.ts`, `src/lib/sql/compare.ts`, `src/lib/sql/check.ts`, `tests/helpers/duckdb-node.ts`
- Test: `tests/sql.test.ts`

**Interfaces:**
- Produces:
  - `type Cell = string | number | boolean | null`
  - `interface TableData { columns: string[]; rows: Cell[][]; totalRows: number }`
  - `interface RunResult { ok: boolean; stdout: string; error: string | null; table: TableData | null; images: string[]; text: string | null; timedOut?: boolean }`
  - `interface CheckResult { passed: boolean; message: string; run?: RunResult }`
  - `interface ArrowTableLike` and `arrowToTable(table: ArrowTableLike, limit?: number): TableData`
  - `compareTables(actual: TableData, expected: TableData, opts?: { ordered?: boolean; tolerance?: number }): { passed: boolean; message: string }` and `formatRow(row: Cell[]): string`
  - `interface QueryConn { query(sql: string): unknown }` (sync or Promise, Arrow table)
  - `checkSql(conn: QueryConn, userSql: string, solutionSql: string, opts?: { ordered?: boolean }): Promise<CheckResult>`
  - test helper `createNodeDuck(files?: Record<string,string>): Promise<NodeDuck>` where `NodeDuck = { query(sql: string): unknown; registerFileText(name: string, text: string): void }`

- [ ] **Step 1: Write types and the Node DuckDB helper**

```ts
// src/lib/runtime/types.ts
export type Cell = string | number | boolean | null;

export interface TableData {
  columns: string[];
  rows: Cell[][];
  /** จำนวนแถวทั้งหมดก่อนตัด (rows อาจถูกตัดเหลือ 20 แถวเพื่อแสดงผล) */
  totalRows: number;
}

export interface RunResult {
  ok: boolean;
  stdout: string;
  error: string | null;
  table: TableData | null;
  /** PNG แบบ base64 (ไม่มี prefix data:) */
  images: string[];
  /** repr ของค่าบรรทัดสุดท้ายเมื่อไม่ใช่ตาราง */
  text: string | null;
  timedOut?: boolean;
}

export interface CheckResult {
  passed: boolean;
  message: string;
  run?: RunResult;
}
```

```ts
// tests/helpers/duckdb-node.ts
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ENTRY = '@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const duckdb = require(ENTRY) as any;
const DIST = path.dirname(require.resolve(ENTRY));

export interface NodeDuck {
  query(sql: string): unknown;
  registerFileText(name: string, text: string): void;
}

/** DuckDB-wasm ตัวเดียวกับบนเว็บ แต่รันแบบ blocking ใน Node */
export async function createNodeDuck(files: Record<string, string> = {}): Promise<NodeDuck> {
  const db = await duckdb.createDuckDB(
    {
      mvp: { mainModule: path.join(DIST, 'duckdb-mvp.wasm'), mainWorker: path.join(DIST, 'duckdb-node-mvp.worker.cjs') },
      eh: { mainModule: path.join(DIST, 'duckdb-eh.wasm'), mainWorker: path.join(DIST, 'duckdb-node-eh.worker.cjs') },
    },
    new duckdb.VoidLogger(),
    duckdb.NODE_RUNTIME,
  );
  await db.instantiate();
  for (const [name, text] of Object.entries(files)) db.registerFileText(name, text);
  const conn = db.connect();
  return {
    query: (sql) => conn.query(sql),
    registerFileText: (name, text) => db.registerFileText(name, text),
  };
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// tests/sql.test.ts
import { beforeAll, describe, expect, it } from 'vitest';
import { arrowToTable, type ArrowTableLike } from '../src/lib/sql/normalize';
import { compareTables } from '../src/lib/sql/compare';
import { checkSql } from '../src/lib/sql/check';
import type { TableData } from '../src/lib/runtime/types';
import { createNodeDuck, type NodeDuck } from './helpers/duckdb-node';

let duck: NodeDuck;
const q = (sql: string) => arrowToTable(duck.query(sql) as ArrowTableLike);

beforeAll(async () => {
  duck = await createNodeDuck({ 'people.csv': 'id,name,city,score\n1,Ann,Bangkok,10.5\n2,Bo,Phuket,\n3,Cy,Bangkok,7\n' });
  duck.query("CREATE TABLE people AS SELECT * FROM read_csv_auto('people.csv')");
});

describe('arrowToTable', () => {
  it('converts basic types and NULL', () => {
    expect(q('SELECT id, name, score FROM people ORDER BY id')).toEqual({
      columns: ['id', 'name', 'score'],
      rows: [[1, 'Ann', 10.5], [2, 'Bo', null], [3, 'Cy', 7]],
      totalRows: 3,
    });
  });
  it('scales DECIMAL and HUGEINT (from SUM) to plain numbers', () => {
    expect(q('SELECT SUM(id) AS s, CAST(-1.25 AS DECIMAL(10,2)) AS d FROM people').rows).toEqual([[6, -1.25]]);
  });
  it('formats DATE and TIMESTAMP as strings', () => {
    expect(q("SELECT DATE '2025-01-02' AS d, TIMESTAMP '2025-01-02 03:04:05' AS t").rows).toEqual([
      ['2025-01-02', '2025-01-02 03:04:05'],
    ]);
  });
  it('limits rows but keeps totalRows', () => {
    const t = arrowToTable(duck.query('SELECT * FROM range(50)') as ArrowTableLike, 20);
    expect(t.rows).toHaveLength(20);
    expect(t.totalRows).toBe(50);
  });
});

const T = (columns: string[], rows: TableData['rows']): TableData => ({ columns, rows, totalRows: rows.length });

describe('compareTables', () => {
  const expected = T(['city', 'n'], [['Bangkok', 2], ['Phuket', 1]]);
  it('ignores row order by default', () => {
    expect(compareTables(T(['city', 'n'], [['Phuket', 1], ['Bangkok', 2]]), expected).passed).toBe(true);
  });
  it('ignores column names', () => {
    expect(compareTables(T(['c', 'total'], [['Bangkok', 2], ['Phuket', 1]]), expected).passed).toBe(true);
  });
  it('explains a wrong order when ordered is required', () => {
    const r = compareTables(T(['city', 'n'], [['Phuket', 1], ['Bangkok', 2]]), expected, { ordered: true });
    expect(r.passed).toBe(false);
    expect(r.message).toContain('ORDER BY');
  });
  it('reports column count mismatch', () => {
    const r = compareTables(T(['city'], [['Bangkok'], ['Phuket']]), expected);
    expect(r.message).toContain('จำนวนคอลัมน์ไม่ตรง');
  });
  it('reports row count mismatch', () => {
    const r = compareTables(T(['city', 'n'], [['Bangkok', 2]]), expected);
    expect(r.message).toBe('จำนวนแถวไม่ตรง: ได้ 1 แถว แต่ควรได้ 2 แถว');
  });
  it('shows the first differing row', () => {
    const r = compareTables(T(['city', 'n'], [['Bangkok', 3], ['Phuket', 1]]), expected, { ordered: true });
    expect(r.message).toBe("แถวที่ 1 ไม่ตรง: ได้ ('Bangkok', 3) แต่ควรเป็น ('Bangkok', 2)");
  });
  it('uses a relative float tolerance and treats NULL = NULL', () => {
    expect(compareTables(T(['x'], [[0.1 + 0.2]]), T(['x'], [[0.3]])).passed).toBe(true);
    expect(compareTables(T(['x'], [[1.0]]), T(['x'], [[1.001]])).passed).toBe(false);
    expect(compareTables(T(['x'], [[null]]), T(['x'], [[null]])).passed).toBe(true);
    expect(compareTables(T(['x'], [[0]]), T(['x'], [[null]])).passed).toBe(false);
  });
});

describe('checkSql', () => {
  const solution = 'SELECT city, COUNT(*) AS n FROM people GROUP BY city';
  it('passes an equivalent answer and returns the run table', async () => {
    const r = await checkSql(duck, 'SELECT city, COUNT(id) FROM people GROUP BY 1', solution);
    expect(r.passed).toBe(true);
    expect(r.run?.table?.totalRows).toBe(2);
  });
  it('reports SQL errors', async () => {
    const r = await checkSql(duck, 'SELECT nope FROM people', solution);
    expect(r.passed).toBe(false);
    expect(r.message).toContain('SQL error');
  });
  it('rejects an empty answer', async () => {
    expect((await checkSql(duck, '   ', solution)).message).toBe('ยังไม่ได้เขียน SQL');
  });
  it('rolls back changes made by the answer', async () => {
    await checkSql(duck, 'DROP TABLE people', solution);
    expect(q('SELECT COUNT(*) FROM people').rows).toEqual([[3]]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/sql.test.ts`
Expected: FAIL. Imports of `../src/lib/sql/normalize` etc. cannot be resolved.

- [ ] **Step 4: Implement**

```ts
// src/lib/sql/normalize.ts
import type { Cell, TableData } from '../runtime/types';

interface ArrowField {
  name: string;
  type: { toString(): string; scale?: number };
}
export interface ArrowTableLike {
  schema: { fields: ArrowField[] };
  numRows: number;
  getChildAt(index: number): { get(row: number): unknown } | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return `${formatDate(ms)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** แปลงค่าจาก Arrow ให้เป็นค่า JS ธรรมดา — DECIMAL/HUGEINT มาเป็น bignum, DATE/TIMESTAMP มาเป็น epoch ms */
export function toCell(value: unknown, typeName: string, scale = 0): Cell {
  if (value === null || value === undefined) return null;
  if (typeName.startsWith('Date')) return formatDate(Number(value));
  if (typeName.startsWith('Timestamp')) return formatTimestamp(Number(value));
  if (typeName.startsWith('Decimal')) return Number(String(value)) / 10 ** scale;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  const withJson = value as { toJSON?: () => unknown };
  if (typeof withJson.toJSON === 'function') {
    return JSON.stringify(withJson.toJSON(), (_k, x) => (typeof x === 'bigint' ? Number(x) : x));
  }
  return String(value);
}

export function arrowToTable(table: ArrowTableLike, limit = Infinity): TableData {
  const fields = table.schema.fields;
  const columns = fields.map((_, i) => table.getChildAt(i));
  const n = Math.min(table.numRows, limit);
  const rows: Cell[][] = [];
  for (let r = 0; r < n; r++) {
    rows.push(fields.map((f, c) => toCell(columns[c]?.get(r), String(f.type), f.type.scale ?? 0)));
  }
  return { columns: fields.map((f) => f.name), rows, totalRows: table.numRows };
}
```

```ts
// src/lib/sql/compare.ts
import type { Cell, TableData } from '../runtime/types';

export interface CompareOptions {
  ordered?: boolean;
  tolerance?: number;
}
export interface CompareResult {
  passed: boolean;
  message: string;
}

const DEFAULT_TOLERANCE = 1e-6;

function cellEqual(a: Cell, b: Cell, tol: number): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
  }
  return a === b;
}

const rowEqual = (a: Cell[], b: Cell[], tol: number) => a.length === b.length && a.every((c, i) => cellEqual(c, b[i], tol));

function sortKey(row: Cell[]): string {
  return JSON.stringify(row.map((c) => (typeof c === 'number' ? Number(c.toPrecision(10)) : c)));
}

function sortRows(rows: Cell[][]): Cell[][] {
  return [...rows].sort((x, y) => {
    const a = sortKey(x);
    const b = sortKey(y);
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

function firstMismatch(a: Cell[][], e: Cell[][], tol: number): number {
  for (let i = 0; i < a.length; i++) if (!rowEqual(a[i], e[i], tol)) return i;
  return -1;
}

export function formatRow(row: Cell[]): string {
  return `(${row.map((c) => (c === null ? 'NULL' : typeof c === 'string' ? `'${c}'` : String(c))).join(', ')})`;
}

export function compareTables(actual: TableData, expected: TableData, opts: CompareOptions = {}): CompareResult {
  const tol = opts.tolerance ?? DEFAULT_TOLERANCE;
  if (actual.columns.length !== expected.columns.length) {
    return {
      passed: false,
      message: `จำนวนคอลัมน์ไม่ตรง: ได้ ${actual.columns.length} คอลัมน์ (${actual.columns.join(', ')}) แต่ควรได้ ${expected.columns.length} คอลัมน์ (${expected.columns.join(', ')})`,
    };
  }
  if (actual.rows.length !== expected.rows.length) {
    return { passed: false, message: `จำนวนแถวไม่ตรง: ได้ ${actual.rows.length} แถว แต่ควรได้ ${expected.rows.length} แถว` };
  }
  const passed = { passed: true, message: `ถูกต้อง! ผลลัพธ์ตรงกับคำตอบ (${actual.rows.length} แถว)` };
  if (opts.ordered) {
    const i = firstMismatch(actual.rows, expected.rows, tol);
    if (i === -1) return passed;
    if (firstMismatch(sortRows(actual.rows), sortRows(expected.rows), tol) === -1) {
      return { passed: false, message: 'ข้อมูลถูกแล้ว แต่ลำดับแถวไม่ตรงกับที่โจทย์ต้องการ — ลองตรวจ ORDER BY' };
    }
    return { passed: false, message: `แถวที่ ${i + 1} ไม่ตรง: ได้ ${formatRow(actual.rows[i])} แต่ควรเป็น ${formatRow(expected.rows[i])}` };
  }
  const a = sortRows(actual.rows);
  const e = sortRows(expected.rows);
  const i = firstMismatch(a, e, tol);
  if (i === -1) return passed;
  return { passed: false, message: `ข้อมูลบางแถวไม่ตรง เช่น ได้แถว ${formatRow(a[i])} แต่คำตอบที่ถูกมีแถว ${formatRow(e[i])}` };
}
```

```ts
// src/lib/sql/check.ts
import type { CheckResult, RunResult } from '../runtime/types';
import { arrowToTable, type ArrowTableLike } from './normalize';
import { compareTables } from './compare';

/** connection ของ DuckDB-wasm — แบบ async (เว็บ) หรือ blocking (Node test) ก็ได้ */
export interface QueryConn {
  query(sql: string): unknown;
}

const DISPLAY_ROWS = 20;
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e)).trim();

/** รันเฉลยและคำตอบบน DB เดียวกัน แล้วเทียบผล — คำตอบรันใน transaction ที่ rollback เสมอ */
export async function checkSql(conn: QueryConn, userSql: string, solutionSql: string, opts: { ordered?: boolean } = {}): Promise<CheckResult> {
  if (!userSql.trim()) return { passed: false, message: 'ยังไม่ได้เขียน SQL' };
  let expected;
  try {
    expected = arrowToTable((await conn.query(solutionSql)) as ArrowTableLike);
  } catch (e) {
    return { passed: false, message: `เฉลยของโจทย์นี้ error (ต้องแก้ที่ไฟล์บทเรียน): ${messageOf(e)}` };
  }
  await conn.query('BEGIN TRANSACTION');
  try {
    const actual = arrowToTable((await conn.query(userSql)) as ArrowTableLike);
    const run: RunResult = {
      ok: true, stdout: '', error: null, images: [], text: null,
      table: { ...actual, rows: actual.rows.slice(0, DISPLAY_ROWS) },
    };
    return { ...compareTables(actual, expected, opts), run };
  } catch (e) {
    const message = messageOf(e);
    return {
      passed: false,
      message: `SQL error: ${message}`,
      run: { ok: false, stdout: '', error: message, table: null, images: [], text: null },
    };
  } finally {
    try {
      await conn.query('ROLLBACK');
    } catch {
      // คำตอบอาจปิด transaction ไปเองแล้ว
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/sql.test.ts`
Expected: all 15 tests PASS.

If `rolls back changes` fails because DuckDB-wasm auto-commits DDL, change `checkSql` to run the user query on a `SELECT * FROM (<user>)` wrapper and report "โจทย์นี้รับเฉพาะคำสั่ง SELECT". Do not delete the test.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add SQL result normalizer, comparer and checker"
```

---

### Task 3: Dataset generator and planted-pattern tests

**Files:**
- Create: `scripts/generate_dataset.py`, `src/lib/dataset.ts`, `tests/helpers/dataset-files.ts`, `public/data/*.csv` (generated)
- Modify: `tests/helpers/duckdb-node.ts` (add `createDatasetDuck`)
- Test: `tests/dataset.test.ts`

**Interfaces:**
- Consumes: `createNodeDuck`, `arrowToTable` (Task 2)
- Produces:
  - `DATASET_TABLES = ['customers','products','orders','order_items','events'] as const`
  - `DATA_FILES: string[]` (table CSVs + `raw/customers_raw.csv`)
  - `setupStatements(): string[]` (creates each table from a registered file `<table>.csv`)
  - test helpers `readDatasetFiles(): Record<string,string>` (keys are `DATA_FILES` entries) and `createDatasetDuck(): Promise<NodeDuck>`

Table columns (lessons depend on these names):

| file | columns |
|---|---|
| `customers.csv` | customer_id, email, city, signup_date, channel (`organic`/`ads`/`referral`/`promo`) |
| `products.csv` | product_id, product_name, category, price, cost |
| `orders.csv` | order_id, customer_id, order_date, status (`completed`/`cancelled`/`returned`), discount_pct (empty = no discount), payment_method (`credit_card`/`promptpay`/`cod`/`bank_transfer`) |
| `order_items.csv` | order_item_id, order_id, product_id, quantity, unit_price |
| `events.csv` | event_id, session_id, customer_id (empty = anonymous), event_type (`visit`→`view_product`→`add_to_cart`→`checkout`→`purchase`), event_time, device, variant (`A`/`B`/empty) |
| `raw/customers_raw.csv` | same columns as customers, dirty: duplicates, empty email/city, messy city casing and spaces, 3 date formats |

- [ ] **Step 1: Write the generator**

```python
#!/usr/bin/env python3
"""สร้าง dataset ร้านค้าออนไลน์สมมติสำหรับสาย Data Analyst

- ใช้แค่ standard library และ fix seed → รันกี่ครั้งก็ได้ไฟล์เหมือนเดิมทุกไบต์
- pattern ที่ฝังไว้ (ตรวจโดย tests/dataset.test.ts):
  1. ฤดูกาล: ออเดอร์ พ.ย.–ธ.ค. สูงกว่าเดือนปกติ
  2. A/B test ช่วง ส.ค.–ก.ย. 2025: กลุ่ม B ซื้อมากกว่า A เล็กน้อยแต่มีนัยสำคัญ
  3. cohort มิ.ย. 2025 (แคมเปญ promo) กลับมาซื้อซ้ำน้อย
  4. raw/customers_raw.csv มีข้อมูลสกปรกสำหรับบท cleaning

รัน: python3 scripts/generate_dataset.py
"""
import csv
import math
import random
from bisect import bisect_right
from datetime import date, datetime, timedelta
from pathlib import Path

SEED = 161
OUT = Path(__file__).resolve().parent.parent / "public" / "data"
START = date(2024, 1, 1)
END = date(2025, 12, 31)
LAST_SIGNUP = date(2025, 12, 15)
N_REGULAR_CUSTOMERS = 3000
N_PROMO_CUSTOMERS = 300
PROMO_MONTH = (date(2025, 6, 1), date(2025, 6, 30))
EXPERIMENT = (date(2025, 8, 1), date(2025, 9, 30))
N_EXPERIMENT_SESSIONS = 16000
N_OTHER_SESSIONS = 12000

CITIES = ["Bangkok", "Chiang Mai", "Khon Kaen", "Phuket", "Hat Yai", "Nakhon Ratchasima", "Udon Thani", "Chon Buri"]
CITY_WEIGHTS = [40, 10, 7, 8, 7, 10, 8, 10]
CHANNELS = ["organic", "ads", "referral"]
CHANNEL_WEIGHTS = [50, 35, 15]
CATEGORIES = {  # หมวด: (จำนวนสินค้า, ราคาต่ำสุด, ราคาสูงสุด, สัดส่วนต้นทุน)
    "Electronics": (25, 490, 25900, 0.78),
    "Home": (25, 159, 4990, 0.60),
    "Beauty": (20, 99, 1890, 0.45),
    "Fashion": (25, 199, 2990, 0.50),
    "Sports": (15, 249, 6990, 0.62),
    "Books": (10, 120, 890, 0.70),
}
SEASON_EXTRA = {11: 0.6, 12: 0.8}  # โอกาสที่ลูกค้าซื้อเพิ่มอีกออเดอร์ในเดือนเดียวกัน
FUNNEL = ["visit", "view_product", "add_to_cart", "checkout", "purchase"]


def rand_date(rng, a, b):
    return a + timedelta(days=rng.randint(0, (b - a).days))


def month_end(d):
    return (d.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)


def make_products(rng):
    rows = []
    for category, (count, low, high, cost_ratio) in CATEGORIES.items():
        for i in range(1, count + 1):
            raw = math.exp(rng.uniform(math.log(low), math.log(high)))
            price = int(raw // 10) * 10 + 9  # ราคาลงท้ายด้วย 9 แบบร้านจริง
            cost = round(price * cost_ratio * rng.uniform(0.9, 1.1), 2)
            rows.append({"product_id": len(rows) + 1, "product_name": f"{category} Item {i:02d}",
                         "category": category, "price": price, "cost": cost})
    return rows


def make_customers(rng):
    people = [(rand_date(rng, START, LAST_SIGNUP), rng.choices(CHANNELS, CHANNEL_WEIGHTS)[0])
              for _ in range(N_REGULAR_CUSTOMERS)]
    # แคมเปญ promo เดือน มิ.ย. 2025: ได้ลูกค้าใหม่เยอะ แต่เป็นขาจรที่ไม่ค่อยกลับมา
    people += [(rand_date(rng, *PROMO_MONTH), "promo") for _ in range(N_PROMO_CUSTOMERS)]
    people.sort(key=lambda p: p[0])
    return [{"customer_id": i, "email": f"customer{i:05d}@example.com",
             "city": rng.choices(CITIES, CITY_WEIGHTS)[0], "signup_date": signup, "channel": channel}
            for i, (signup, channel) in enumerate(people, 1)]


def make_orders(rng, customers, products):
    raw = []
    for c in customers:
        if rng.random() > 0.85:
            continue  # สมัครแล้วไม่เคยซื้อ
        p_repeat = 0.15 if c["channel"] == "promo" else 0.6
        d = c["signup_date"] + timedelta(days=rng.randint(0, 14))
        while d <= END:
            raw.append((d, c["customer_id"]))
            if rng.random() < SEASON_EXTRA.get(d.month, 0):
                extra = d + timedelta(days=rng.randint(0, (month_end(d) - d).days))
                if extra <= END:
                    raw.append((extra, c["customer_id"]))
            if rng.random() > p_repeat:
                break
            d += timedelta(days=max(1, round(rng.expovariate(1 / 45))))
    raw.sort()
    orders, items = [], []
    for order_id, (d, customer_id) in enumerate(raw, 1):
        orders.append({
            "order_id": order_id,
            "customer_id": customer_id,
            "order_date": d,
            "status": rng.choices(["completed", "cancelled", "returned"], [90, 6, 4])[0],
            "discount_pct": rng.choices([None, 5, 10, 15, 20], [70, 12, 10, 5, 3])[0],
            "payment_method": rng.choices(["credit_card", "promptpay", "cod", "bank_transfer"], [35, 40, 15, 10])[0],
        })
        for p in rng.sample(products, rng.choices([1, 2, 3, 4], [50, 30, 15, 5])[0]):
            items.append({"order_item_id": len(items) + 1, "order_id": order_id, "product_id": p["product_id"],
                          "quantity": rng.choices([1, 2, 3], [75, 20, 5])[0], "unit_price": p["price"]})
    return orders, items


def make_events(rng, customers):
    signups = [c["signup_date"] for c in customers]  # customers เรียงตามวันสมัครอยู่แล้ว
    exp_start, exp_end = EXPERIMENT
    other_days = [date(2025, 1, 1) + timedelta(days=i) for i in range(365)]
    other_days = [d for d in other_days if not exp_start <= d <= exp_end]
    sessions = [(rand_date(rng, exp_start, exp_end), True) for _ in range(N_EXPERIMENT_SESSIONS)]
    sessions += [(rng.choice(other_days), False) for _ in range(N_OTHER_SESSIONS)]
    sessions.sort(key=lambda s: s[0])
    rows = []
    for session_id, (day, in_experiment) in enumerate(sessions, 1):
        variant = rng.choice(["A", "B"]) if in_experiment else None
        known = bisect_right(signups, day)
        customer_id = customers[rng.randrange(known)]["customer_id"] if known and rng.random() < 0.6 else None
        device = rng.choices(["mobile", "desktop"], [65, 35])[0]
        t = datetime(day.year, day.month, day.day, rng.randint(0, 23), rng.randint(0, 59), rng.randint(0, 59))
        # หน้า checkout แบบใหม่ (B) ทำให้คนที่ถึง checkout ซื้อจริงมากขึ้น
        probs = [1.0, 0.6, 0.35, 0.55, 0.78 if variant == "B" else 0.62]
        for event_type, p in zip(FUNNEL, probs):
            if rng.random() >= p:
                break
            rows.append({"event_id": len(rows) + 1, "session_id": session_id, "customer_id": customer_id,
                         "event_type": event_type, "event_time": t.strftime("%Y-%m-%d %H:%M:%S"),
                         "device": device, "variant": variant})
            t += timedelta(seconds=rng.randint(5, 600))
    return rows


def make_customers_raw(rng, customers):
    rows = []
    for c in customers:
        row = dict(c)
        d = c["signup_date"]
        fmt = rng.choices(["iso", "dmy", "ymd_slash"], [70, 20, 10])[0]
        row["signup_date"] = {"iso": d.isoformat(), "dmy": d.strftime("%d/%m/%Y"), "ymd_slash": d.strftime("%Y/%m/%d")}[fmt]
        if rng.random() < 0.05:
            row["email"] = ""
        if rng.random() < 0.04:
            row["city"] = ""
        elif rng.random() < 0.08:
            row["city"] = rng.choice([row["city"].upper(), row["city"].lower(), f" {row['city']} "])
        rows.append(row)
        if rng.random() < 0.03:
            rows.append(dict(row))  # แถวซ้ำจากการ import ข้อมูลสองรอบ
    return rows


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: "" if v is None else v.isoformat() if isinstance(v, date) else v for k, v in row.items()})


def main():
    rng = random.Random(SEED)
    products = make_products(rng)
    customers = make_customers(rng)
    orders, items = make_orders(rng, customers, products)
    events = make_events(rng, customers)
    raw = make_customers_raw(rng, customers)
    outputs = [("customers.csv", customers), ("products.csv", products), ("orders.csv", orders),
               ("order_items.csv", items), ("events.csv", events), ("raw/customers_raw.csv", raw)]
    for name, rows in outputs:
        write_csv(OUT / name, rows)
        print(f"{name}: {len(rows):,} แถว")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Generate and check determinism**

Run: `npm run data && shasum public/data/*.csv public/data/raw/*.csv > /tmp/dcl1 && npm run data && shasum public/data/*.csv public/data/raw/*.csv | diff - /tmp/dcl1 && echo SAME`
Expected: six "แถว" lines per run, then `SAME`.

- [ ] **Step 3: Write `src/lib/dataset.ts` and the helpers**

```ts
// src/lib/dataset.ts
export const DATASET_TABLES = ['customers', 'products', 'orders', 'order_items', 'events'] as const;
export type DatasetTable = (typeof DATASET_TABLES)[number];

/** ไฟล์ใน public/data ทั้งหมด — ฝั่ง Python เปิดได้ที่ data/<ไฟล์> */
export const DATA_FILES: string[] = [...DATASET_TABLES.map((t) => `${t}.csv`), 'raw/customers_raw.csv'];

/** SQL สร้างตารางจากไฟล์ที่ลงทะเบียนไว้ในชื่อ <table>.csv */
export function setupStatements(): string[] {
  return DATASET_TABLES.map((t) => `CREATE OR REPLACE TABLE ${t} AS SELECT * FROM read_csv_auto('${t}.csv', header = true)`);
}
```

```ts
// tests/helpers/dataset-files.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DATA_FILES } from '../../src/lib/dataset';

export function readDatasetFiles(): Record<string, string> {
  return Object.fromEntries(DATA_FILES.map((f) => [f, readFileSync(path.resolve('public/data', f), 'utf8')]));
}
```

Append to `tests/helpers/duckdb-node.ts`:
```ts
import { DATASET_TABLES, setupStatements } from '../../src/lib/dataset';
import { readDatasetFiles } from './dataset-files';

/** DuckDB ที่มีตาราง dataset ครบเหมือนบนเว็บ */
export async function createDatasetDuck(): Promise<NodeDuck> {
  const all = readDatasetFiles();
  const files = Object.fromEntries(DATASET_TABLES.map((t) => [`${t}.csv`, all[`${t}.csv`]]));
  const duck = await createNodeDuck(files);
  for (const sql of setupStatements()) duck.query(sql);
  return duck;
}
```
Move the two new `import` lines to the top of the file, next to the existing imports.

- [ ] **Step 4: Write the failing-if-broken dataset tests**

```ts
// tests/dataset.test.ts
import { readFileSync, statSync } from 'node:fs';
import { beforeAll, expect, it } from 'vitest';
import { DATA_FILES } from '../src/lib/dataset';
import { arrowToTable, type ArrowTableLike } from '../src/lib/sql/normalize';
import type { Cell } from '../src/lib/runtime/types';
import { createDatasetDuck, type NodeDuck } from './helpers/duckdb-node';

let duck: NodeDuck;
const rows = (sql: string): Cell[][] => arrowToTable(duck.query(sql) as ArrowTableLike).rows;
const one = (sql: string) => rows(sql)[0][0] as number;

beforeAll(async () => {
  duck = await createDatasetDuck();
});

it('ทุกไฟล์ไม่เกิน 5MB', () => {
  for (const f of DATA_FILES) expect(statSync(`public/data/${f}`).size, f).toBeLessThan(5 * 1024 * 1024);
});

it('จำนวนแถวอยู่ในช่วงที่ออกแบบไว้', () => {
  expect(one('SELECT COUNT(*) FROM customers')).toBe(3300);
  expect(one('SELECT COUNT(*) FROM products')).toBe(120);
  const orders = one('SELECT COUNT(*) FROM orders');
  expect(orders).toBeGreaterThan(5000);
  expect(orders).toBeLessThan(15000);
  expect(one('SELECT COUNT(DISTINCT session_id) FROM events')).toBe(28000);
});

it('ความสัมพันธ์ระหว่างตารางถูกต้อง', () => {
  expect(one('SELECT COUNT(*) FROM orders o LEFT JOIN customers c USING (customer_id) WHERE c.customer_id IS NULL')).toBe(0);
  expect(one('SELECT COUNT(*) FROM order_items i LEFT JOIN products p USING (product_id) WHERE p.product_id IS NULL')).toBe(0);
  expect(one('SELECT COUNT(*) FROM order_items i LEFT JOIN orders o USING (order_id) WHERE o.order_id IS NULL')).toBe(0);
  expect(one('SELECT COUNT(*) FROM orders o JOIN customers c USING (customer_id) WHERE o.order_date < c.signup_date')).toBe(0);
  expect(one("SELECT COUNT(*) FROM orders WHERE order_date NOT BETWEEN DATE '2024-01-01' AND DATE '2025-12-31'")).toBe(0);
});

it('ออเดอร์ พ.ย.–ธ.ค. สูงกว่าเดือน มี.ค.–ต.ค. ของปีเดียวกันอย่างน้อย 1.3 เท่า', () => {
  const ratios = rows(`
    WITH m AS (SELECT year(order_date) AS y, month(order_date) AS mo, COUNT(*) AS n FROM orders GROUP BY ALL)
    SELECT y, AVG(n) FILTER (WHERE mo IN (11, 12)) / AVG(n) FILTER (WHERE mo BETWEEN 3 AND 10) AS ratio
    FROM m GROUP BY y ORDER BY y`);
  expect(ratios).toHaveLength(2);
  for (const [year, ratio] of ratios) expect(ratio as number, `ปี ${year}`).toBeGreaterThan(1.3);
});

it('A/B test: กลุ่ม B ซื้อมากกว่า A อย่างมีนัยสำคัญ (z > 1.96)', () => {
  const r = rows(`
    SELECT variant, COUNT(DISTINCT session_id) AS n,
           COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'purchase') AS buyers
    FROM events WHERE variant IS NOT NULL GROUP BY variant ORDER BY variant`) as [string, number, number][];
  const [[, nA, bA], [, nB, bB]] = r;
  const pA = bA / nA;
  const pB = bB / nB;
  const p = (bA + bB) / (nA + nB);
  const z = (pB - pA) / Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
  expect(pB).toBeGreaterThan(pA);
  expect(z).toBeGreaterThan(1.96);
});

it('cohort มิ.ย. 2025 กลับมาซื้อซ้ำน้อยกว่าเดือนข้างเคียงชัดเจน', () => {
  const r = rows(`
    WITH c AS (SELECT customer_id, strftime(signup_date, '%Y-%m') AS cohort FROM customers),
         k AS (SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY customer_id)
    SELECT cohort, AVG(CASE WHEN COALESCE(k.n, 0) >= 2 THEN 1 ELSE 0 END) AS repeat_rate
    FROM c LEFT JOIN k USING (customer_id)
    WHERE cohort IN ('2025-05', '2025-06', '2025-07')
    GROUP BY cohort ORDER BY cohort`) as [string, number][];
  const rate = Object.fromEntries(r);
  expect(rate['2025-06']).toBeLessThan((0.7 * (rate['2025-05'] + rate['2025-07'])) / 2);
});

it('customers_raw มีข้อมูลสกปรกครบตามที่บท cleaning ใช้', () => {
  const lines = readFileSync('public/data/raw/customers_raw.csv', 'utf8').trim().split('\n').slice(1);
  const cols = lines.map((l) => l.split(','));
  expect(new Set(lines).size).toBeLessThan(lines.length);
  expect(cols.some((c) => c[1] === '')).toBe(true);
  expect(cols.some((c) => c[2] === '')).toBe(true);
  expect(cols.some((c) => c[2] !== '' && (c[2] !== c[2].trim() || c[2] === c[2].toUpperCase()))).toBe(true);
  expect(cols.some((c) => /^\d{2}\/\d{2}\/\d{4}$/.test(c[3]))).toBe(true);
  expect(cols.some((c) => /^\d{4}\/\d{2}\/\d{2}$/.test(c[3]))).toBe(true);
});
```

- [ ] **Step 5: Run the dataset tests**

Run: `npx vitest run tests/dataset.test.ts`
Expected: 7 PASS.

If a planted-pattern test fails, **do not loosen the threshold**. Adjust the generator constant that drives it (`SEASON_EXTRA`, the B purchase probability, or the promo `p_repeat`), regenerate, and note the change in the commit message.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add deterministic e-commerce dataset with planted patterns"
```

---

### Task 4: Python runtime and checkers (Pyodide)

**Files:**
- Create: `src/lib/python/runtime.py`, `src/lib/python/checkers.py`, `src/lib/python/boot.ts`, `tests/helpers/pyodide-node.ts`
- Test: `tests/python-runtime.test.ts`

**Interfaces:**
- Consumes: `RunResult`, `CheckResult` (Task 2), `readDatasetFiles` (Task 3)
- Produces:
  - `PYODIDE_VERSION = '314.0.7'`, `PYODIDE_CDN`, `PY_PACKAGES`
  - `interface PyodideLike`
  - `bootPython(py: PyodideLike, files: Record<string,string>): Promise<PythonApi>` where `PythonApi = { run(code): RunResult; check(code, check, solution): CheckResult; reset(): void }`
  - Python side: `run_user(code) -> str`, `check_exercise(user_code, check_code, solution_code) -> str`, `reset_session()`
  - Checkers visible to check code: `CheckFailed`, `check_true(cond, message)`, `check_value(actual, expected, name="คำตอบ", tol=1e-6)`, `check_df(actual, expected, name="result", ordered=False, tol=1e-6)`, `check_series(actual, expected, name="result", ordered=False, tol=1e-6)`, plus `_sol` (solution namespace) and `_stdout`
  - test helper `createNodePython(files?: Record<string,string>): Promise<PythonApi>`

- [ ] **Step 1: Write the Node helper and failing tests**

```ts
// tests/helpers/pyodide-node.ts
import { loadPyodide } from 'pyodide';
import { bootPython, type PyodideLike, type PythonApi } from '../../src/lib/python/boot';

export async function createNodePython(files: Record<string, string> = {}): Promise<PythonApi> {
  const py = await loadPyodide();
  return bootPython(py as unknown as PyodideLike, files);
}
```

```ts
// tests/python-runtime.test.ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PythonApi } from '../src/lib/python/boot';
import { createNodePython } from './helpers/pyodide-node';

let py: PythonApi;
beforeAll(async () => {
  py = await createNodePython({ 'tiny.csv': 'city,amount\nBangkok,10\nPhuket,5\nBangkok,7\n' });
});
beforeEach(() => py.reset());

const READ = 'import pandas as pd\ndf = pd.read_csv("data/tiny.csv")\n';

describe('run', () => {
  it('captures print output', () => {
    expect(py.run('print("สวัสดี")').stdout).toBe('สวัสดี\n');
  });
  it('returns the repr of a last-line expression', () => {
    expect(py.run('1 + 2').text).toBe('3');
  });
  it('keeps variables between runs until reset', () => {
    py.run('x = 41');
    expect(py.run('x + 1').text).toBe('42');
    py.reset();
    expect(py.run('x').ok).toBe(false);
  });
  it('renders a DataFrame and moves a named index into columns', () => {
    const r = py.run(`${READ}df.groupby("city")["amount"].sum()`);
    expect(r.table).toEqual({ columns: ['city', 'amount'], rows: [['Bangkok', 17], ['Phuket', 5]], totalRows: 2 });
  });
  it('limits tables to 20 rows', () => {
    const r = py.run('import pandas as pd\npd.DataFrame({"n": range(50)})');
    expect(r.table?.rows).toHaveLength(20);
    expect(r.table?.totalRows).toBe(50);
  });
  it('converts NaN to null', () => {
    expect(py.run('import pandas as pd\npd.DataFrame({"x": [1.0, None]})').table?.rows).toEqual([[1], [null]]);
  });
  it('reports errors with the user line only', () => {
    const r = py.run('a = 1\nb = a / 0');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('บรรทัด 2: b = a / 0\nZeroDivisionError: division by zero');
  });
  it('reports syntax errors with the line number', () => {
    const r = py.run('if True print(1)');
    expect(r.error).toContain('บรรทัด 1');
    expect(r.error).toContain('SyntaxError');
  });
  it('returns matplotlib figures as PNG and hides the artist repr', () => {
    const r = py.run('import matplotlib.pyplot as plt\nplt.plot([1, 2, 3])');
    expect(r.images).toHaveLength(1);
    expect(r.images[0].startsWith('iVBOR')).toBe(true);
    expect(r.text).toBeNull();
  });
});

describe('check', () => {
  const solution = `${READ}result = df.groupby("city", as_index=False)["amount"].sum()`;
  const check = 'check_df(result, _sol["result"])';
  it('passes the solution', () => {
    expect(py.check(solution, check, solution).passed).toBe(true);
  });
  it('accepts an equivalent answer with the group as index', () => {
    const alt = `${READ}result = df.groupby("city")["amount"].sum().to_frame()`;
    expect(py.check(alt, check, solution).passed).toBe(true);
  });
  it('fails when the learner code errors', () => {
    const r = py.check('result = ___', check, solution);
    expect(r.passed).toBe(false);
    expect(r.message).toContain('โค้ดของคุณ error');
  });
  it('fails when the expected variable is missing', () => {
    expect(py.check('x = 1', check, solution).message).toContain('ยังไม่มีตัวแปร result');
  });
  it('explains wrong values by column', () => {
    const wrong = `${READ}result = df.groupby("city", as_index=False)["amount"].mean()`;
    expect(py.check(wrong, check, solution).message).toContain("'amount'");
  });
  it('check_value compares numbers with tolerance and hides the answer', () => {
    expect(py.check('x = 0.1 + 0.2', 'check_value(x, 0.3, name="x")', 'x = 0.3').passed).toBe(true);
    expect(py.check('x = 1', 'check_value(x, _sol["x"], name="x")', 'x = 2').message).toBe('x ยังไม่ถูก: ตอนนี้ได้ 1');
  });
  it('check_series ignores the series name', () => {
    const user = `${READ}s = df["city"].value_counts()`;
    const sol = `${READ}s = df.groupby("city").size()`;
    expect(py.check(user, 'check_series(s, _sol["s"])', sol).passed).toBe(true);
  });
  it('ordered checks explain order problems', () => {
    const sol = `${READ}result = df.sort_values("amount", ascending=False)`;
    const user = `${READ}result = df.sort_values("amount")`;
    expect(py.check(user, 'check_df(result, _sol["result"], ordered=True)', sol).message).toContain('ลำดับ');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/python-runtime.test.ts`
Expected: FAIL. Cannot resolve `../src/lib/python/boot`.

- [ ] **Step 3: Write `src/lib/python/runtime.py`**

```python
"""Runtime ฝั่ง Python ที่รันใน Pyodide

ใช้ทั้งใน Web Worker ของเว็บและใน content test บน Node — ฟังก์ชันที่ JS เรียกคืนค่าเป็น JSON string
"""
import os

os.environ.setdefault("MPLBACKEND", "Agg")  # worker ไม่มี DOM ต้องวาดกราฟแบบ Agg

import ast
import base64
import contextlib
import io
import json
import linecache
import math
import sys
import traceback

MAX_ROWS = 20
MAX_TEXT = 20_000
CELL = "<cell>"
CHECK = "<check>"

_session = {"__name__": "__main__"}


def _truncate(text):
    if len(text) <= MAX_TEXT:
        return text
    return text[:MAX_TEXT] + f"\n… (ตัดเหลือ {MAX_TEXT:,} ตัวอักษรแรก)"


def _cell(value):
    pd = sys.modules.get("pandas")
    if value is None:
        return None
    if pd is not None:
        if isinstance(value, pd.Timestamp):
            if value == value.normalize():
                return value.strftime("%Y-%m-%d")
            return value.strftime("%Y-%m-%d %H:%M:%S")
        try:
            if pd.isna(value):
                return None
        except (TypeError, ValueError):
            pass
    if hasattr(value, "item") and callable(value.item):
        try:
            value = value.item()
        except (TypeError, ValueError):
            pass
    if isinstance(value, float) and not math.isfinite(value):
        return None if math.isnan(value) else str(value)
    if isinstance(value, (bool, int, float, str)):
        return value
    return str(value)


def _column_name(col):
    return " / ".join(str(c) for c in col) if isinstance(col, tuple) else str(col)


def _table(value):
    pd = sys.modules.get("pandas")
    if pd is None:
        return None
    if isinstance(value, pd.Series):
        value = value.to_frame(name=value.name if value.name is not None else "value")
    if not isinstance(value, pd.DataFrame):
        return None
    df = value
    if not isinstance(df.index, pd.RangeIndex) or any(n is not None for n in df.index.names):
        try:
            df = df.reset_index()
        except ValueError:  # ชื่อ index ซ้ำกับคอลัมน์
            df = df.reset_index(drop=True)
    head = df.head(MAX_ROWS)
    return {
        "columns": [_column_name(c) for c in head.columns],
        "rows": [[_cell(v) for v in row] for row in head.itertuples(index=False, name=None)],
        "totalRows": int(len(df)),
    }


def _images():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return []
    out = []
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format="png", dpi=100, bbox_inches="tight")
        out.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")
    return out


def _exec(code, ns):
    """รันแบบ notebook: ถ้าบรรทัดสุดท้ายเป็น expression จะคืนค่าของมัน"""
    linecache.cache[CELL] = (len(code), None, code.splitlines(True), CELL)
    tree = ast.parse(code, filename=CELL, mode="exec")
    last = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last = ast.Expression(tree.body.pop().value)
    exec(compile(tree, CELL, "exec"), ns)
    if last is not None:
        return eval(compile(last, CELL, "eval"), ns)
    return None


def _format_error(exc):
    lines = []
    if isinstance(exc, SyntaxError) and exc.filename == CELL:
        lines.append(f"บรรทัด {exc.lineno}: {(exc.text or '').strip()}")
    else:
        for frame in traceback.extract_tb(exc.__traceback__):
            if frame.filename == CELL:
                lines.append(f"บรรทัด {frame.lineno}: {(frame.line or '').strip()}")
    lines.append(f"{type(exc).__name__}: {exc}")
    return "\n".join(lines)


def _run(code, ns):
    out = io.StringIO()
    result = {"ok": True, "stdout": "", "error": None, "table": None, "images": [], "text": None}
    value = None
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            value = _exec(code, ns)
    except BaseException as exc:  # รวม SystemExit ด้วย ไม่ให้ worker ตาย
        result["ok"] = False
        result["error"] = _format_error(exc)
    result["stdout"] = _truncate(out.getvalue())
    result["images"] = _images()
    if value is not None:
        table = _table(value)
        if table is not None:
            result["table"] = table
        elif not result["images"]:
            result["text"] = _truncate(repr(value))
    return result


def run_user(code):
    return json.dumps(_run(code, _session), ensure_ascii=False)


def reset_session():
    _session.clear()
    _session["__name__"] = "__main__"


def _check(user_code, check_code, solution_code):
    import checkers

    sol = {"__name__": "__main__"}
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            _exec(solution_code, sol)
    except BaseException as exc:
        _images()
        return {"passed": False, "message": "เฉลยของโจทย์นี้ error (ต้องแก้ที่ไฟล์บทเรียน):\n" + _format_error(exc)}
    _images()

    user = {"__name__": "__main__"}
    run = _run(user_code, user)
    if not run["ok"]:
        return {"passed": False, "message": "โค้ดของคุณ error ก่อนตรวจได้:\n" + run["error"], "run": run}

    ns = dict(user)
    ns.update({name: getattr(checkers, name) for name in checkers.__all__})
    ns["_sol"] = sol
    ns["_stdout"] = run["stdout"]
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(check_code, CHECK, "exec"), ns)
    except checkers.CheckFailed as exc:
        return {"passed": False, "message": str(exc), "run": run}
    except NameError as exc:
        return {"passed": False, "message": f"ยังไม่มีตัวแปร {exc.name} — โจทย์ให้เก็บคำตอบไว้ในตัวแปรชื่อนี้", "run": run}
    except Exception as exc:
        return {"passed": False, "message": f"ตัวตรวจเจอปัญหา: {type(exc).__name__}: {exc}", "run": run}
    return {"passed": True, "message": "ถูกต้อง!", "run": run}


def check_exercise(user_code, check_code, solution_code):
    return json.dumps(_check(user_code, check_code, solution_code), ensure_ascii=False)
```

- [ ] **Step 4: Write `src/lib/python/checkers.py`**

```python
"""ตัวช่วยตรวจแบบฝึก Python

check code ใน YAML เรียกฟังก์ชันพวกนี้ได้เลย และอ่านตัวแปรของเฉลยได้จาก _sol["ชื่อตัวแปร"]
ข้อความ error เขียนเป็นภาษาไทยให้ผู้เรียนรู้ว่าต้องแก้ตรงไหน
"""
import math

__all__ = ["CheckFailed", "check_true", "check_value", "check_df", "check_series"]


class CheckFailed(Exception):
    """ตรวจแล้วไม่ผ่าน — ข้อความคือสิ่งที่ผู้เรียนจะเห็น"""


def check_true(condition, message):
    if not condition:
        raise CheckFailed(message)


def _plain(x):
    if hasattr(x, "item") and callable(x.item):
        try:
            return x.item()
        except (TypeError, ValueError):
            return x
    return x


def _is_number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def check_value(actual, expected, name="คำตอบ", tol=1e-6):
    """เทียบค่าเดี่ยว — ไม่บอกค่าที่ถูก เพื่อไม่ให้ลอกคำตอบ"""
    actual, expected = _plain(actual), _plain(expected)
    if _is_number(actual) and _is_number(expected):
        ok = math.isclose(actual, expected, rel_tol=tol, abs_tol=tol)
    else:
        ok = type(actual) is type(expected) and actual == expected
    if not ok:
        raise CheckFailed(f"{name} ยังไม่ถูก: ตอนนี้ได้ {actual!r}")


def _flatten(df):
    import pandas as pd

    if not isinstance(df.index, pd.RangeIndex) or any(n is not None for n in df.index.names):
        try:
            df = df.reset_index()
        except ValueError:
            df = df.reset_index(drop=True)
    else:
        df = df.reset_index(drop=True)
    df = df.copy()
    df.columns = [" / ".join(map(str, c)) if isinstance(c, tuple) else str(c) for c in df.columns]
    return df


def _sort_rows(df):
    try:
        return df.sort_values(list(df.columns), na_position="last", kind="mergesort").reset_index(drop=True)
    except TypeError:  # คอลัมน์มีหลายชนิดปนกัน
        order = df.astype(str).apply(tuple, axis=1).sort_values(kind="mergesort").index
        return df.loc[order].reset_index(drop=True)


def _same(a, e, tol):
    import pandas as pd

    numeric = pd.api.types.is_numeric_dtype
    if numeric(a) and numeric(e) and not pd.api.types.is_bool_dtype(a):
        af, ef = a.astype(float), e.astype(float)
        scale = pd.concat([af.abs(), ef.abs()], axis=1).max(axis=1).clip(lower=1)
        close = ((af - ef).abs() <= tol * scale).fillna(False)
        return (close | (af.isna() & ef.isna())).tolist()
    return ((a.astype(object) == e.astype(object)) | (a.isna() & e.isna())).tolist()


def _first_diff(a, e, tol):
    for col in e.columns:
        same = _same(a[col], e[col], tol)
        if not all(same):
            return col, same.index(False)
    return None


def check_df(actual, expected, name="result", ordered=False, tol=1e-6):
    import pandas as pd

    if not isinstance(actual, pd.DataFrame):
        raise CheckFailed(f"{name} ต้องเป็น DataFrame แต่ตอนนี้เป็น {type(actual).__name__}")
    a, e = _flatten(actual), _flatten(expected)
    missing = [c for c in e.columns if c not in a.columns]
    extra = [c for c in a.columns if c not in e.columns]
    if missing or extra:
        parts = []
        if missing:
            parts.append("ขาดคอลัมน์ " + ", ".join(missing))
        if extra:
            parts.append("มีคอลัมน์เกิน " + ", ".join(extra))
        raise CheckFailed(f"{name}: " + " และ ".join(parts))
    a = a[list(e.columns)]
    if len(a) != len(e):
        raise CheckFailed(f"{name}: ได้ {len(a)} แถว แต่ควรได้ {len(e)} แถว")
    if ordered:
        diff = _first_diff(a, e, tol)
        if diff is None:
            return
        if _first_diff(_sort_rows(a), _sort_rows(e), tol) is None:
            raise CheckFailed(f"{name}: ข้อมูลถูกแล้ว แต่ลำดับแถวไม่ตรงกับที่โจทย์ต้องการ")
        col, i = diff
        raise CheckFailed(f"{name}: แถวที่ {i + 1} คอลัมน์ '{col}' ได้ {a[col].iloc[i]!r} แต่ควรเป็น {e[col].iloc[i]!r}")
    a, e = _sort_rows(a), _sort_rows(e)
    diff = _first_diff(a, e, tol)
    if diff is not None:
        col, i = diff
        raise CheckFailed(f"{name}: ค่าในคอลัมน์ '{col}' ไม่ตรง เช่น ได้ {a[col].iloc[i]!r} แต่ควรเป็น {e[col].iloc[i]!r}")


def check_series(actual, expected, name="result", ordered=False, tol=1e-6):
    import pandas as pd

    if not isinstance(actual, pd.Series):
        raise CheckFailed(f"{name} ต้องเป็น Series แต่ตอนนี้เป็น {type(actual).__name__}")
    check_df(actual.rename("value").to_frame(), expected.rename("value").to_frame(), name=name, ordered=ordered, tol=tol)
```

- [ ] **Step 5: Write `src/lib/python/boot.ts`**

```ts
import runtimeSrc from './runtime.py?raw';
import checkersSrc from './checkers.py?raw';
import type { CheckResult, RunResult } from '../runtime/types';

export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const PY_PACKAGES = ['pandas', 'matplotlib'];
const HOME = '/home/pyodide';

export interface PyodideLike {
  loadPackage(names: string[], options?: { messageCallback?: (msg: string) => void }): Promise<unknown>;
  runPython(code: string): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pyimport(name: string): any;
  FS: { mkdirTree(path: string): void; writeFile(path: string, data: string | Uint8Array): void };
}

export interface PythonApi {
  run(code: string): RunResult;
  check(code: string, check: string, solution: string): CheckResult;
  reset(): void;
}

/** ติดตั้งแพ็กเกจ, runtime.py/checkers.py และไฟล์ข้อมูล (ที่ data/<ชื่อไฟล์>) ลงใน Pyodide */
export async function bootPython(py: PyodideLike, files: Record<string, string>): Promise<PythonApi> {
  await py.loadPackage(PY_PACKAGES, { messageCallback: () => {} });
  py.FS.mkdirTree(`${HOME}/pylib`);
  py.FS.writeFile(`${HOME}/pylib/runtime.py`, runtimeSrc);
  py.FS.writeFile(`${HOME}/pylib/checkers.py`, checkersSrc);
  for (const [name, content] of Object.entries(files)) {
    const full = `${HOME}/data/${name}`;
    py.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
    py.FS.writeFile(full, content);
  }
  py.runPython(`import os, sys\nos.chdir("${HOME}")\nsys.path.insert(0, "${HOME}/pylib")`);
  const mod = py.pyimport('runtime');
  return {
    run: (code) => JSON.parse(mod.run_user(code)) as RunResult,
    check: (code, check, solution) => JSON.parse(mod.check_exercise(code, check, solution)) as CheckResult,
    reset: () => {
      mod.reset_session();
    },
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/python-runtime.test.ts`
Expected: 17 PASS. The first run downloads pandas and matplotlib wheels from jsdelivr into `node_modules/pyodide`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Pyodide runtime with notebook-style runs and Thai exercise checkers"
```

---

### Task 5: Content schema and ratio rules

**Files:**
- Create: `src/lib/kinds.ts`, `src/lib/content/schema.ts`, `src/lib/content/rules.ts`
- Test: `tests/content-schema.test.ts`

**Interfaces:**
- Produces:
  - `LEVELS = ['basic','applied','challenge'] as const`, `Level`, `LANGS = ['sql','python'] as const`, `Lang`, `LEVEL_LABELS: Record<Level,string>`
  - zod schemas `fadedSchema`, `exerciseSchema`, `workedExampleSchema`, `quizSchema`, `lessonDataSchema`, `practiceSchema`, `lessonFrontmatterSchema`, `moduleSchema`
  - types `Task`, `Exercise`, `WorkedExample`, `QuizQuestion`, `LessonData`, `PracticeSet`
  - `RATIO`, `lessonRuleErrors(data: LessonData, opts: { intro: boolean }): string[]`, `practiceRuleErrors(set: PracticeSet): string[]`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/content-schema.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/content-schema.test.ts`
Expected: FAIL. Modules not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/kinds.ts
export const LEVELS = ['basic', 'applied', 'challenge'] as const;
export type Level = (typeof LEVELS)[number];
export const LANGS = ['sql', 'python'] as const;
export type Lang = (typeof LANGS)[number];
export const LEVEL_LABELS: Record<Level, string> = {
  basic: '🟢 พื้นฐาน',
  applied: '🟡 ประยุกต์',
  challenge: '🔴 ท้าทาย',
};
```

```ts
// src/lib/content/schema.ts
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
```

```ts
// src/lib/content/rules.ts
import type { LessonData, PracticeSet } from './schema';

/** สัดส่วนตาม spec §4 — [ต่ำสุด, สูงสุด] */
export const RATIO = {
  examples: [2, 3],
  faded: [1, 2],
  basic: [4, 5],
  applied: [3, 4],
  challenge: [1, 3],
  quiz: [3, 5],
  interview: [1, 3],
  practice: [15, 20],
} as const;

function range(name: string, n: number, [lo, hi]: readonly [number, number]): string[] {
  return n < lo || n > hi ? [`${name} ต้องมี ${lo}–${hi} ข้อ แต่มี ${n}`] : [];
}

function duplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const i of ids) (seen.has(i) ? dup : seen).add(i);
  return [...dup].map((i) => `id ซ้ำ: ${i}`);
}

export function lessonRuleErrors(d: LessonData, opts: { intro: boolean }): string[] {
  const errors = duplicateIds([...d.examples, ...d.faded, ...d.exercises, ...d.quiz, ...d.interview, ...d.flashcards].map((x) => x.id));
  for (const f of d.faded) if (!f.starter.includes('___')) errors.push(`faded ${f.id}: starter ต้องมีช่องว่าง ___`);
  if (opts.intro) return errors;
  const count = (level: string) => d.exercises.filter((e) => e.level === level).length;
  return [
    ...errors,
    ...range('worked example', d.examples.length, RATIO.examples),
    ...range('faded', d.faded.length, RATIO.faded),
    ...range('basic', count('basic'), RATIO.basic),
    ...range('applied', count('applied'), RATIO.applied),
    ...range('challenge', count('challenge'), RATIO.challenge),
    ...range('quiz', d.quiz.length, RATIO.quiz),
    ...range('interview', d.interview.length, RATIO.interview),
  ];
}

export function practiceRuleErrors(set: PracticeSet): string[] {
  const n = set.exercises.length;
  const errors = duplicateIds(set.exercises.map((e) => e.id));
  if (n < RATIO.practice[0] || n > RATIO.practice[1]) errors.push(`ชุดฝึกต้องมี ${RATIO.practice[0]}–${RATIO.practice[1]} ข้อ แต่มี ${n}`);
  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/content-schema.test.ts`
Expected: 10 PASS. If `astro/zod` cannot be imported under Vitest, add `"zod": "<astro's zod version>"` to devDependencies (`npm ls zod` shows it), switch the import to `'zod'`, and keep Astro's `content.config.ts` on the same schema objects.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add lesson content schema and ratio rules"
```

---

### Task 6: Progress store, lesson status and React hook

**Files:**
- Create: `src/lib/progress/store.ts`, `src/lib/progress/status.ts`, `src/lib/progress/index.ts`, `src/lib/progress/useProgress.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Consumes: `Level` (Task 5)
- Produces:
  - `ExerciseStatus = 'none'|'failed'|'self'|'with-solution'`, `ExerciseRecord { status; attempts; fails; solutionViewed }`
  - `StorageLike`, `createStore(storage: StorageLike | null, onChange?: () => void): Store`
  - Store members: `version`, `health: 'ok'|'memory-only'|'recovered'`, `lastLesson`, `exercise(id)`, `recordCheck(id, passed)`, `viewSolution(id)`, `draft(id)`, `saveDraft(id, code|null)`, `quizScore(lessonId)`, `recordQuiz(lessonId, correct, total)`, `setLastLesson(id)`, `exportJson()`, `importJson(text)`, `reset()`
  - `ExerciseRef { id; level }`, `isPassed(record)`, `lessonStatus(items, get): LessonStatus`, `moduleProgress(lessons, get)`
  - browser `getProgress(): Store`, `PROGRESS_EVENT`; hook `useProgress(): Store | null` (null during SSR and hydration)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/progress.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL. Modules not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/progress/store.ts
export const STORAGE_KEY = 'dcl:progress';
export const BACKUP_KEY = 'dcl:progress:backup';

export type ExerciseStatus = 'none' | 'failed' | 'self' | 'with-solution';
export interface ExerciseRecord {
  status: ExerciseStatus;
  attempts: number;
  fails: number;
  solutionViewed: boolean;
}
export interface ProgressData {
  version: 1;
  exercises: Record<string, ExerciseRecord>;
  drafts: Record<string, string>;
  quiz: Record<string, { correct: number; total: number }>;
  /** กล่อง Leitner ของ flashcard (ใช้ใน Plan 3) */
  leitner: Record<string, number>;
  lastLesson: string | null;
}
export type StoreHealth = 'ok' | 'memory-only' | 'recovered';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const EMPTY_RECORD: ExerciseRecord = { status: 'none', attempts: 0, fails: 0, solutionViewed: false };

export function emptyProgress(): ProgressData {
  return { version: 1, exercises: {}, drafts: {}, quiz: {}, leitner: {}, lastLesson: null };
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** ตรวจและเติม field ที่ขาด — เวอร์ชันใหม่ในอนาคตให้เพิ่ม case แปลงข้อมูลตรงนี้ */
export function migrate(raw: unknown): ProgressData {
  if (!isObject(raw) || raw.version !== 1) throw new Error('ไฟล์ความคืบหน้าไม่ถูกต้อง หรือมาจากเวอร์ชันที่ไม่รู้จัก');
  const pick = <T>(v: unknown, fallback: T): T => (isObject(v) ? (v as T) : fallback);
  const base = emptyProgress();
  return {
    version: 1,
    exercises: pick(raw.exercises, base.exercises),
    drafts: pick(raw.drafts, base.drafts),
    quiz: pick(raw.quiz, base.quiz),
    leitner: pick(raw.leitner, base.leitner),
    lastLesson: typeof raw.lastLesson === 'string' ? raw.lastLesson : null,
  };
}

export type Store = ReturnType<typeof createStore>;

export function createStore(storage: StorageLike | null, onChange: () => void = () => {}) {
  let health: StoreHealth = storage ? 'ok' : 'memory-only';
  let data = emptyProgress();
  let version = 0;

  if (storage) {
    let raw: string | null = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      health = 'memory-only';
    }
    if (raw) {
      try {
        data = migrate(JSON.parse(raw));
      } catch {
        health = 'recovered';
        try {
          storage.setItem(BACKUP_KEY, raw);
        } catch {
          // เก็บสำรองไม่ได้ก็เริ่มใหม่ต่อ
        }
      }
    }
  }

  function commit() {
    version += 1;
    if (storage && health !== 'memory-only') {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        health = 'memory-only';
      }
    }
    onChange();
  }

  const exercise = (id: string): ExerciseRecord => ({ ...EMPTY_RECORD, ...data.exercises[id] });

  return {
    get version() { return version; },
    get health() { return health; },
    get lastLesson() { return data.lastLesson; },
    exercise,
    recordCheck(id: string, passed: boolean) {
      const r = exercise(id);
      r.attempts += 1;
      if (passed) {
        if (r.status !== 'self' && r.status !== 'with-solution') r.status = r.solutionViewed ? 'with-solution' : 'self';
      } else {
        r.fails += 1;
        if (r.status === 'none') r.status = 'failed';
      }
      data.exercises[id] = r;
      commit();
    },
    viewSolution(id: string) {
      const r = exercise(id);
      if (r.solutionViewed) return;
      r.solutionViewed = true;
      data.exercises[id] = r;
      commit();
    },
    draft: (id: string): string | null => data.drafts[id] ?? null,
    saveDraft(id: string, code: string | null) {
      if ((data.drafts[id] ?? null) === code) return;
      if (code === null) delete data.drafts[id];
      else data.drafts[id] = code;
      commit();
    },
    quizScore: (lessonId: string) => data.quiz[lessonId] ?? null,
    recordQuiz(lessonId: string, correct: number, total: number) {
      data.quiz[lessonId] = { correct, total };
      commit();
    },
    setLastLesson(id: string) {
      if (data.lastLesson === id) return;
      data.lastLesson = id;
      commit();
    },
    exportJson: () => JSON.stringify(data, null, 2),
    importJson(text: string) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('ไฟล์นี้ไม่ใช่ JSON');
      }
      data = migrate(parsed);
      commit();
    },
    reset() {
      data = emptyProgress();
      commit();
    },
  };
}
```

```ts
// src/lib/progress/status.ts
import type { Level } from '../kinds';
import type { ExerciseRecord } from './store';

export interface ExerciseRef {
  id: string;
  level: Level;
}
export interface LessonStatus {
  done: boolean;
  started: boolean;
  requiredPassed: number;
  requiredTotal: number;
  stars: number;
  starsTotal: number;
}
type Getter = (id: string) => ExerciseRecord;

export const isPassed = (r: ExerciseRecord) => r.status === 'self' || r.status === 'with-solution';

/** บทเสร็จเมื่อผ่านข้อ basic + applied ครบ — ข้อ challenge เป็นดาวโบนัส */
export function lessonStatus(items: ExerciseRef[], get: Getter): LessonStatus {
  const required = items.filter((i) => i.level !== 'challenge');
  const challenge = items.filter((i) => i.level === 'challenge');
  const passed = (i: ExerciseRef) => isPassed(get(i.id));
  const requiredPassed = required.filter(passed).length;
  return {
    done: required.length > 0 && requiredPassed === required.length,
    started: items.some((i) => get(i.id).attempts > 0),
    requiredPassed,
    requiredTotal: required.length,
    stars: challenge.filter(passed).length,
    starsTotal: challenge.length,
  };
}

export function moduleProgress(lessons: { exercises: ExerciseRef[] }[], get: Getter) {
  const done = lessons.filter((l) => lessonStatus(l.exercises, get).done).length;
  const total = lessons.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
```

```ts
// src/lib/progress/index.ts
import { createStore, type StorageLike, type Store } from './store';

export const PROGRESS_EVENT = 'dcl:progress';
let store: Store | null = null;

function browserStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    s.setItem('dcl:probe', '1');
    s.removeItem('dcl:probe');
    return s;
  } catch {
    return null;
  }
}

/** store เดียวต่อหน้า — ทุก island ใช้ร่วมกันและได้ event เมื่อข้อมูลเปลี่ยน */
export function getProgress(): Store {
  store ??= createStore(browserStorage(), () => window.dispatchEvent(new Event(PROGRESS_EVENT)));
  return store;
}
```

```ts
// src/lib/progress/useProgress.ts
import { useSyncExternalStore } from 'react';
import { getProgress, PROGRESS_EVENT } from './index';
import type { Store } from './store';

function subscribe(callback: () => void) {
  window.addEventListener(PROGRESS_EVENT, callback);
  return () => window.removeEventListener(PROGRESS_EVENT, callback);
}

/** คืน null ตอน render ฝั่ง server และตอน hydrate เพื่อไม่ให้ HTML ไม่ตรงกัน */
export function useProgress(): Store | null {
  const version = useSyncExternalStore(subscribe, () => getProgress().version, () => -1);
  return version === -1 ? null : getProgress();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/progress.test.ts`
Expected: 13 PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add localStorage progress store with lesson status rules"
```

---

### Task 7: Browser runtime clients (workers, timeout, reset)

**Files:**
- Create: `src/lib/runtime/timeout.ts`, `src/lib/runtime/results.ts`, `src/lib/runtime/worker-rpc.ts`, `src/lib/runtime/python.worker.ts`, `src/lib/runtime/python-client.ts`, `src/lib/runtime/sql-client.ts`, `src/lib/runtime/index.ts`
- Test: `tests/worker-rpc.test.ts`

**Interfaces:**
- Consumes: `bootPython`, `PYODIDE_CDN` (Task 4), `DATA_FILES`, `DATASET_TABLES`, `setupStatements` (Task 3), `arrowToTable`, `checkSql` (Task 2), `Lang` (Task 5)
- Produces:
  - `RUN_TIMEOUT_MS = 10_000`
  - `TimeoutError`, `RuntimeLoadError`, `withTimeout(p, ms)`, `messageOf(e)`
  - `errorRun(message, timedOut?)`
  - `WorkerRpc` with `call<T>(type, payload, timeoutMs): Promise<T>` and `terminate()`
  - `interface Checkable { lang: Lang; solution: string; check?: string | null; ordered?: boolean }`
  - `run(lang, code): Promise<RunResult>`, `check(task: Checkable, code): Promise<CheckResult>`, `reset(lang): Promise<void>`
  - `run`/`check` throw `RuntimeLoadError` when the runtime cannot load, so the UI shows retry. Code errors and timeouts come back as results.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/worker-rpc.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerRpc, type WorkerLike } from '../src/lib/runtime/worker-rpc';
import { TimeoutError, withTimeout } from '../src/lib/runtime/timeout';

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null;
  onerror: WorkerLike['onerror'] = null;
  sent: unknown[] = [];
  terminated = false;
  postMessage(msg: unknown) { this.sent.push(msg); }
  terminate() { this.terminated = true; }
  reply(data: unknown) { this.onmessage?.({ data }); }
}

afterEach(() => vi.useRealTimers());

describe('WorkerRpc', () => {
  it('sends a message with an id and resolves with the reply', async () => {
    const w = new FakeWorker();
    const rpc = new WorkerRpc(() => w);
    const p = rpc.call<number>('run', { code: '1' }, 1000);
    expect(w.sent[0]).toEqual({ id: 1, type: 'run', code: '1' });
    w.reply({ id: 1, ok: true, result: 42 });
    await expect(p).resolves.toBe(42);
  });
  it('rejects with the worker error message', async () => {
    const w = new FakeWorker();
    const p = new WorkerRpc(() => w).call('init', {}, 1000);
    w.reply({ id: 1, ok: false, error: 'โหลดไม่ได้' });
    await expect(p).rejects.toThrow('โหลดไม่ได้');
  });
  it('times out with TimeoutError', async () => {
    vi.useFakeTimers();
    const p = new WorkerRpc(() => new FakeWorker()).call('run', {}, 10_000);
    vi.advanceTimersByTime(10_001);
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });
  it('terminate kills the worker and rejects pending calls', async () => {
    const w = new FakeWorker();
    const rpc = new WorkerRpc(() => w);
    const p = rpc.call('run', {}, 1000);
    rpc.terminate();
    expect(w.terminated).toBe(true);
    await expect(p).rejects.toThrow('ถูกปิด');
  });
  it('rejects pending calls when the worker crashes', async () => {
    const w = new FakeWorker();
    const p = new WorkerRpc(() => w).call('run', {}, 1000);
    w.onerror?.({ message: 'boom' });
    await expect(p).rejects.toThrow('boom');
  });
});

describe('withTimeout', () => {
  it('passes values through and times out slow promises', async () => {
    await expect(withTimeout(Promise.resolve(1), 100)).resolves.toBe(1);
    vi.useFakeTimers();
    const slow = withTimeout(new Promise(() => {}), 10_000);
    vi.advanceTimersByTime(10_001);
    await expect(slow).rejects.toThrow('10 วินาที');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/worker-rpc.test.ts`
Expected: FAIL. Modules not found.

- [ ] **Step 3: Implement the shared pieces**

```ts
// src/lib/runtime/timeout.ts
export const RUN_TIMEOUT_MS = 10_000;

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`โค้ดรันนานเกิน ${ms / 1000} วินาที จึงถูกหยุด`);
    this.name = 'TimeoutError';
  }
}

/** โหลด Python หรือ DuckDB ไม่สำเร็จ — UI จะแสดงปุ่มลองใหม่ */
export class RuntimeLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeLoadError';
  }
}

export const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
```

```ts
// src/lib/runtime/results.ts
import type { RunResult } from './types';

export function errorRun(message: string, timedOut = false): RunResult {
  return { ok: false, stdout: '', error: message, table: null, images: [], text: null, ...(timedOut ? { timedOut } : {}) };
}
```

```ts
// src/lib/runtime/worker-rpc.ts
import { TimeoutError } from './timeout';

export interface WorkerLike {
  postMessage(msg: unknown): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: { message: string }) => void) | null;
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
interface Reply {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

/** เรียก worker แบบ request/response พร้อม timeout ต่อคำขอ */
export class WorkerRpc {
  private worker: WorkerLike;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(factory: () => WorkerLike) {
    this.worker = factory();
    this.worker.onmessage = (e) => {
      const reply = e.data as Reply;
      const p = this.pending.get(reply.id);
      if (!p) return;
      this.pending.delete(reply.id);
      clearTimeout(p.timer);
      if (reply.ok) p.resolve(reply.result);
      else p.reject(new Error(reply.error ?? 'worker error'));
    };
    this.worker.onerror = (e) => this.rejectAll(new Error(e.message || 'worker ล่ม'));
  }

  call<T>(type: string, payload: object, timeoutMs: number): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new TimeoutError(timeoutMs));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.worker.postMessage({ id, type, ...payload });
    });
  }

  terminate(): void {
    this.worker.terminate();
    this.rejectAll(new Error('worker ถูกปิด'));
  }

  private rejectAll(error: Error) {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/worker-rpc.test.ts`
Expected: 6 PASS.

- [ ] **Step 5: Implement the Python worker and client**

```ts
// src/lib/runtime/python.worker.ts
/// <reference lib="webworker" />
import { bootPython, PYODIDE_CDN, type PyodideLike, type PythonApi } from '../python/boot';
import { DATA_FILES } from '../dataset';

type Request =
  | { id: number; type: 'init'; baseUrl: string }
  | { id: number; type: 'run'; code: string }
  | { id: number; type: 'check'; code: string; check: string; solution: string }
  | { id: number; type: 'reset' };

let api: PythonApi | null = null;

async function init(baseUrl: string) {
  const { loadPyodide } = await import(/* @vite-ignore */ `${PYODIDE_CDN}pyodide.mjs`);
  const py = (await loadPyodide({ indexURL: PYODIDE_CDN })) as PyodideLike;
  const files: Record<string, string> = {};
  await Promise.all(
    DATA_FILES.map(async (f) => {
      const res = await fetch(`${baseUrl}data/${f}`);
      if (!res.ok) throw new Error(`โหลดไฟล์ ${f} ไม่ได้ (HTTP ${res.status})`);
      files[f] = await res.text();
    }),
  );
  api = await bootPython(py, files);
}

self.onmessage = async (e: MessageEvent<Request>) => {
  const msg = e.data;
  try {
    let result: unknown = null;
    if (msg.type === 'init') await init(msg.baseUrl);
    else if (!api) throw new Error('Python ยังไม่พร้อม');
    else if (msg.type === 'run') result = api.run(msg.code);
    else if (msg.type === 'check') result = api.check(msg.code, msg.check, msg.solution);
    else if (msg.type === 'reset') api.reset();
    self.postMessage({ id: msg.id, ok: true, result });
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
```

```ts
// src/lib/runtime/python-client.ts
import type { CheckResult, RunResult } from './types';
import { errorRun } from './results';
import { messageOf, RUN_TIMEOUT_MS, RuntimeLoadError, TimeoutError } from './timeout';
import { WorkerRpc } from './worker-rpc';

const INIT_TIMEOUT_MS = 180_000;
const CLEARED = ' — ตัวแปรที่สร้างไว้ในหน้านี้ถูกล้างแล้ว';
let ready: Promise<WorkerRpc> | null = null;
let rpc: WorkerRpc | null = null;

function stop() {
  rpc?.terminate();
  rpc = null;
  ready = null;
}

function start(): Promise<WorkerRpc> {
  if (ready) return ready;
  const r = new WorkerRpc(() => new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' }));
  rpc = r;
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  ready = r.call('init', { baseUrl }, INIT_TIMEOUT_MS).then(
    () => r,
    (err) => {
      stop();
      throw new RuntimeLoadError(`โหลด Python ไม่สำเร็จ: ${messageOf(err)}`);
    },
  );
  return ready;
}

export async function runPython(code: string): Promise<RunResult> {
  const r = await start();
  try {
    return await r.call<RunResult>('run', { code }, RUN_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof TimeoutError) {
      stop();
      return errorRun(err.message + CLEARED, true);
    }
    return errorRun(messageOf(err));
  }
}

export async function checkPython(code: string, check: string, solution: string): Promise<CheckResult> {
  const r = await start();
  try {
    return await r.call<CheckResult>('check', { code, check, solution }, RUN_TIMEOUT_MS * 2);
  } catch (err) {
    if (err instanceof TimeoutError) stop();
    return { passed: false, message: messageOf(err) };
  }
}

export async function resetPython(): Promise<void> {
  if (!ready) return;
  const r = await start();
  await r.call('reset', {}, RUN_TIMEOUT_MS);
}
```

- [ ] **Step 6: Implement the SQL client and the unified entry point**

```ts
// src/lib/runtime/sql-client.ts
import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import { DATASET_TABLES, setupStatements } from '../dataset';
import { checkSql } from '../sql/check';
import { arrowToTable, type ArrowTableLike } from '../sql/normalize';
import type { CheckResult, RunResult } from './types';
import { errorRun } from './results';
import { messageOf, RUN_TIMEOUT_MS, RuntimeLoadError, TimeoutError, withTimeout } from './timeout';

const DISPLAY_ROWS = 20;
const INIT_TIMEOUT_MS = 60_000;
const RELOADED = ' — ตารางถูกโหลดใหม่ ข้อมูลที่แก้ไว้ถูกล้างแล้ว';

interface Handle {
  worker: Worker;
  conn: duckdb.AsyncDuckDBConnection;
}
let handle: Promise<Handle> | null = null;

async function open(): Promise<Handle> {
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
    eh: { mainModule: ehWasm, mainWorker: ehWorker },
  });
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  for (const t of DATASET_TABLES) {
    const res = await fetch(`${import.meta.env.BASE_URL}data/${t}.csv`);
    if (!res.ok) throw new Error(`โหลดตาราง ${t} ไม่ได้ (HTTP ${res.status})`);
    await db.registerFileText(`${t}.csv`, await res.text());
  }
  const conn = await db.connect();
  for (const sql of setupStatements()) await conn.query(sql);
  return { worker, conn };
}

async function load(): Promise<Handle> {
  if (!handle) {
    handle = withTimeout(open(), INIT_TIMEOUT_MS);
    handle.catch(() => {
      handle = null;
    });
  }
  try {
    return await handle;
  } catch (err) {
    throw new RuntimeLoadError(`โหลด DuckDB ไม่สำเร็จ: ${messageOf(err)}`);
  }
}

async function kill() {
  const h = handle;
  handle = null;
  if (!h) return;
  try {
    (await h).worker.terminate();
  } catch {
    // โหลดไม่สำเร็จตั้งแต่แรก ไม่มีอะไรต้องปิด
  }
}

export async function runSql(sql: string): Promise<RunResult> {
  const { conn } = await load();
  try {
    const table = await withTimeout(conn.query(sql), RUN_TIMEOUT_MS);
    return { ok: true, stdout: '', error: null, images: [], text: null, table: arrowToTable(table as unknown as ArrowTableLike, DISPLAY_ROWS) };
  } catch (err) {
    if (err instanceof TimeoutError) {
      await kill();
      return errorRun(err.message + RELOADED, true);
    }
    return errorRun(messageOf(err).trim());
  }
}

export async function checkSqlAnswer(code: string, solution: string, ordered: boolean): Promise<CheckResult> {
  const { conn } = await load();
  try {
    return await withTimeout(checkSql(conn, code, solution, { ordered }), RUN_TIMEOUT_MS * 2);
  } catch (err) {
    if (err instanceof TimeoutError) await kill();
    return { passed: false, message: messageOf(err) };
  }
}

export async function resetSql(): Promise<void> {
  await kill();
}
```

```ts
// src/lib/runtime/index.ts
import type { Lang } from '../kinds';
import type { CheckResult, RunResult } from './types';

export interface Checkable {
  lang: Lang;
  solution: string;
  check?: string | null;
  ordered?: boolean;
}

// import แบบ dynamic: หน้าที่ไม่มีโค้ดให้รันจะไม่ต้องโหลด DuckDB/Pyodide
export async function run(lang: Lang, code: string): Promise<RunResult> {
  if (lang === 'sql') return (await import('./sql-client')).runSql(code);
  return (await import('./python-client')).runPython(code);
}

export async function check(task: Checkable, code: string): Promise<CheckResult> {
  if (task.lang === 'sql') return (await import('./sql-client')).checkSqlAnswer(code, task.solution, task.ordered ?? false);
  return (await import('./python-client')).checkPython(code, task.check ?? '', task.solution);
}

export async function reset(lang: Lang): Promise<void> {
  if (lang === 'sql') return (await import('./sql-client')).resetSql();
  return (await import('./python-client')).resetPython();
}
```

- [ ] **Step 7: Run all unit tests**

Run: `npm test`
Expected: all test files PASS. The runtime clients are only exercised in a real browser (Task 9 and Task 14).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add browser runtime clients for Pyodide and DuckDB-wasm with timeouts"
```

---

### Task 8: Content collections, catalog, track/module/lesson pages, lesson 1 content

**Files:**
- Create: `src/content.config.ts`, `src/content/modules.yaml`, `src/lib/content/markdown.ts`, `src/lib/content/views.ts`, `src/lib/content/refs.ts`, `src/lib/content/catalog.ts`, `src/pages/da/index.astro`, `src/pages/da/[module]/index.astro`, `src/pages/da/[module]/[lesson].astro`, `src/content/lessons/da/start/01-what-is-da.mdx`, `src/content/lesson-data/da/start/01-what-is-da.yaml`, `src/content/practice/.gitkeep`
- Test: `tests/views.test.ts`

**Interfaces:**
- Consumes: schemas and types (Task 5), `ExerciseRef` (Task 6), `url` (Task 1)
- Produces:
  - `md(text): string` (block HTML) and `mdInline(text): string`
  - `TaskView`, `ExampleView`, `QuizView`, `taskView(scope, task, kind)`, `exampleView(scope, ex)`, `quizView(scope, q)`
  - `LessonRef { id; slug; title; minutes; url; exercises: ExerciseRef[] }`
  - `ModuleRef { id; slug; title; description; order; intro; url; lessons: LessonRef[]; practiceUrl: string | null }`
  - `getTrack('da'): Promise<ModuleRef[]>`
  - URL scheme: `/da/`, `/da/<module>/`, `/da/<module>/<lessonSlug>/`, `/da/<module>/practice/`

- [ ] **Step 1: Write the failing view tests**

```ts
// tests/views.test.ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/views.test.ts`
Expected: FAIL. Module `views` not found.

- [ ] **Step 3: Implement markdown, views and refs**

```ts
// src/lib/content/markdown.ts
import { marked } from 'marked';

/** เนื้อหาเขียนเองทั้งหมด (ไม่ใช่ input จากผู้ใช้) จึง render เป็น HTML ได้ตรงๆ */
export const md = (text: string): string => marked.parse(text, { async: false });
export const mdInline = (text: string): string => marked.parseInline(text, { async: false });
```

```ts
// src/lib/content/refs.ts
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
```

```ts
// src/lib/content/views.ts
import type { Lang, Level } from '../kinds';
import { md, mdInline } from './markdown';
import type { Exercise, QuizQuestion, Task, WorkedExample } from './schema';

export interface TaskView {
  gid: string;
  kind: 'faded' | 'exercise';
  level: Level | null;
  lang: Lang;
  promptHtml: string;
  starter: string;
  solution: string;
  check: string | null;
  ordered: boolean;
  hintsHtml: string[];
}
export interface ExampleView {
  gid: string;
  title: string;
  lang: Lang;
  promptHtml: string;
  steps: { html: string; code: string }[];
  pitfall: { html: string; code: string | null } | null;
}
export interface QuizView {
  gid: string;
  questionHtml: string;
  choices: { html: string; correct: boolean; whyHtml: string }[];
}

export function taskView(scope: string, t: Task | Exercise, kind: TaskView['kind']): TaskView {
  return {
    gid: `${scope}/${t.id}`,
    kind,
    level: 'level' in t ? t.level : null,
    lang: t.lang,
    promptHtml: md(t.prompt),
    starter: t.starter,
    solution: t.solution,
    check: t.check ?? null,
    ordered: t.ordered ?? false,
    hintsHtml: t.hints.map(mdInline),
  };
}

export function exampleView(scope: string, ex: WorkedExample): ExampleView {
  return {
    gid: `${scope}/${ex.id}`,
    title: ex.title,
    lang: ex.lang,
    promptHtml: md(ex.prompt),
    steps: ex.steps.map((s) => ({ html: md(s.text), code: s.code })),
    pitfall: ex.pitfall ? { html: md(ex.pitfall.text), code: ex.pitfall.code ?? null } : null,
  };
}

export function quizView(scope: string, q: QuizQuestion): QuizView {
  return {
    gid: `${scope}/${q.id}`,
    questionHtml: mdInline(q.question),
    choices: q.choices.map((c) => ({ html: mdInline(c.text), correct: c.correct, whyHtml: md(c.why) })),
  };
}
```

- [ ] **Step 4: Run view tests**

Run: `npx vitest run tests/views.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Write collections, module list and catalog**

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { lessonDataSchema, lessonFrontmatterSchema, moduleSchema, practiceSchema } from './lib/content/schema';

export const collections = {
  lessons: defineCollection({ loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }), schema: lessonFrontmatterSchema }),
  lessonData: defineCollection({ loader: glob({ pattern: '**/*.yaml', base: './src/content/lesson-data' }), schema: lessonDataSchema }),
  practice: defineCollection({ loader: glob({ pattern: '**/*.yaml', base: './src/content/practice' }), schema: practiceSchema }),
  modules: defineCollection({ loader: file('./src/content/modules.yaml'), schema: moduleSchema }),
};
```

`src/content/modules.yaml`:
```yaml
- id: da/start
  track: da
  slug: start
  order: 0
  title: เริ่มต้น
  description: DA ทำอะไร ขั้นตอนการวิเคราะห์ และวิธีใช้เว็บนี้
  intro: true
- id: da/sql
  track: da
  slug: sql
  order: 1
  title: SQL
  description: ดึงและสรุปข้อมูลด้วย SQL ตั้งแต่ SELECT จนถึง window functions
- id: da/pandas
  track: da
  slug: pandas
  order: 2
  title: pandas
  description: จัดการ ทำความสะอาด และสรุปข้อมูลด้วย Python
- id: da/stats
  track: da
  slug: stats
  order: 3
  title: สถิติสำหรับ DA
  description: สถิติที่ใช้จริงในงาน ตั้งแต่ค่าเฉลี่ยจนถึง A/B testing
- id: da/viz
  track: da
  slug: viz
  order: 4
  title: Visualization และ storytelling
  description: เลือกกราฟให้ตรงคำถาม และเล่าผลให้คนอ่านเข้าใจ
- id: da/metrics
  track: da
  slug: metrics
  order: 5
  title: Business metrics
  description: KPI, funnel, cohort/retention และ RFM segmentation
- id: da/capstone
  track: da
  slug: capstone
  order: 6
  title: Capstone
  description: โปรเจกต์ portfolio แบบ end-to-end
```

Create an empty `src/content/practice/.gitkeep` so the glob base exists.

```ts
// src/lib/content/catalog.ts
import { getCollection } from 'astro:content';
import { url } from '../url';
import type { ModuleRef } from './refs';

/** รวม module + บท + id แบบฝึก ของหนึ่งสาย — ใช้สร้างทุกหน้าและส่งให้ island ที่แสดงความคืบหน้า */
export async function getTrack(track: 'da'): Promise<ModuleRef[]> {
  const [modules, lessons, data, practice] = await Promise.all([
    getCollection('modules'),
    getCollection('lessons'),
    getCollection('lessonData'),
    getCollection('practice'),
  ]);
  const dataById = new Map(data.map((d) => [d.id, d.data]));
  const practiceIds = new Set(practice.map((p) => p.id));
  return modules
    .filter((m) => m.data.track === track)
    .sort((a, b) => a.data.order - b.data.order)
    .map((m) => {
      const own = lessons
        .filter((l) => l.data.track === track && l.data.module === m.data.slug)
        .sort((a, b) => a.data.order - b.data.order);
      return {
        id: m.id,
        slug: m.data.slug,
        title: m.data.title,
        description: m.data.description,
        order: m.data.order,
        intro: m.data.intro,
        url: url(`/${track}/${m.data.slug}/`),
        practiceUrl: practiceIds.has(m.id) ? url(`/${track}/${m.data.slug}/practice/`) : null,
        lessons: own.map((l) => {
          if (!l.id.startsWith(`${m.id}/`)) throw new Error(`บท ${l.id} ระบุ module: ${l.data.module} แต่ไฟล์อยู่นอกโฟลเดอร์ ${m.id}/`);
          const d = dataById.get(l.id);
          if (!d) throw new Error(`ไม่พบ src/content/lesson-data/${l.id}.yaml สำหรับบท ${l.id}`);
          const slug = l.id.slice(m.id.length + 1);
          return {
            id: l.id,
            slug,
            title: l.data.title,
            minutes: l.data.minutes,
            url: url(`/${track}/${m.data.slug}/${slug}/`),
            exercises: d.exercises.map((e) => ({ id: `${l.id}/${e.id}`, level: e.level })),
          };
        }),
      };
    });
}
```

- [ ] **Step 6: Write the track, module and lesson pages**

```astro
---
// src/pages/da/index.astro
import Base from '../../layouts/Base.astro';
import { getTrack } from '../../lib/content/catalog';

const modules = await getTrack('da');
---
<Base title="Data Analyst">
  <h1>สาย Data Analyst</h1>
  <p class="lead">เริ่มจาก SQL และ pandas ต่อด้วยสถิติ visualization และ business metrics แล้วจบด้วยโปรเจกต์ portfolio</p>
  <ol class="module-list">
    {modules.map((m) => (
      <li class="card module-card">
        <div>
          <p class="step">Module {m.order}</p>
          <h2><a href={m.url}>{m.title}</a></h2>
          <p class="muted">{m.description}</p>
        </div>
        {m.lessons.length > 0 ? <span class="muted">{m.lessons.length} บท</span> : <span class="badge">กำลังเขียน</span>}
      </li>
    ))}
  </ol>
</Base>
```

```astro
---
// src/pages/da/[module]/index.astro
import Base from '../../../layouts/Base.astro';
import { getTrack } from '../../../lib/content/catalog';
import type { ModuleRef } from '../../../lib/content/refs';
import { url } from '../../../lib/url';

export async function getStaticPaths() {
  const modules = await getTrack('da');
  return modules.map((m) => ({ params: { module: m.slug }, props: { mod: m } }));
}
const { mod } = Astro.props as { mod: ModuleRef };
---
<Base title={mod.title}>
  <p class="crumb"><a href={url('/da/')}>Data Analyst</a> › Module {mod.order}</p>
  <h1>{mod.title}</h1>
  <p class="lead">{mod.description}</p>
  {mod.lessons.length === 0 ? (
    <p class="card">เนื้อหาส่วนนี้กำลังเขียน</p>
  ) : (
    <ol class="lesson-list">
      {mod.lessons.map((l) => (
        <li><a href={l.url}>{l.title}</a> <span class="muted">· ~{l.minutes} นาที · แบบฝึก {l.exercises.length} ข้อ</span></li>
      ))}
    </ol>
  )}
  {mod.practiceUrl && <a class="button primary" href={mod.practiceUrl}>ชุดฝึกท้าย module</a>}
</Base>
```

```astro
---
// src/pages/da/[module]/[lesson].astro
import { getCollection, render, type CollectionEntry } from 'astro:content';
import Base from '../../../layouts/Base.astro';
import { getTrack } from '../../../lib/content/catalog';
import { md, mdInline } from '../../../lib/content/markdown';
import type { LessonRef, ModuleRef } from '../../../lib/content/refs';
import type { LessonData } from '../../../lib/content/schema';
import { url } from '../../../lib/url';

export async function getStaticPaths() {
  const modules = await getTrack('da');
  const entries = await getCollection('lessons');
  const data = await getCollection('lessonData');
  const flat = modules.flatMap((mod) => mod.lessons.map((ref) => ({ mod, ref })));
  return flat.map(({ mod, ref }, i) => ({
    params: { module: mod.slug, lesson: ref.slug },
    props: {
      mod,
      ref,
      entry: entries.find((e) => e.id === ref.id)!,
      data: data.find((d) => d.id === ref.id)!.data,
      prev: flat[i - 1]?.ref ?? null,
      next: flat[i + 1]?.ref ?? null,
    },
  }));
}

interface Props {
  mod: ModuleRef;
  ref: LessonRef;
  entry: CollectionEntry<'lessons'>;
  data: LessonData;
  prev: LessonRef | null;
  next: LessonRef | null;
}
const { mod, ref, entry, data, prev, next } = Astro.props;
const { Content } = await render(entry);
---
<Base title={entry.data.title}>
  <div class="lesson-layout">
    <aside class="lesson-aside">
      <p class="muted">{mod.title}</p>
      <ol class="lesson-nav">
        {mod.lessons.map((l, i) => (
          <li class={l.id === ref.id ? 'current' : ''}>
            <a href={l.url} aria-current={l.id === ref.id ? 'page' : undefined}>{i + 1}. {l.title}</a>
          </li>
        ))}
      </ol>
    </aside>
    <article class="lesson">
      <p class="crumb"><a href={url('/da/')}>Data Analyst</a> › <a href={mod.url}>{mod.title}</a></p>
      <h1>{entry.data.title}</h1>
      <p class="muted">ประมาณ {entry.data.minutes} นาที</p>

      <section class="card">
        <h2>เป้าหมายของบท</h2>
        <ul>{data.goals.map((g) => <li set:html={mdInline(g)} />)}</ul>
      </section>

      <div class="prose"><Content /></div>

      <section class="card">
        <h2>สรุป</h2>
        <ul>{data.summary.map((s) => <li set:html={mdInline(s)} />)}</ul>
      </section>

      {data.interview.length > 0 && (
        <section>
          <h2>คำถามสัมภาษณ์</h2>
          {data.interview.map((it) => (
            <details class="card interview">
              <summary set:html={mdInline(it.q)} />
              <div set:html={md(it.a)} />
            </details>
          ))}
        </section>
      )}

      <nav class="pager">
        {prev && <a href={prev.url}>← {prev.title}</a>}
        {next && <a class="next" href={next.url}>{next.title} →</a>}
      </nav>
    </article>
  </div>
</Base>
```

- [ ] **Step 7: Write lesson 1 content**

`src/content/lessons/da/start/01-what-is-da.mdx`:
````mdx
---
track: da
module: start
order: 1
title: Data Analyst ทำอะไร
minutes: 15
---

## งานหลักของ Data Analyst

Data Analyst (DA) คือคนที่**ตอบคำถามของธุรกิจด้วยข้อมูล** แล้วสื่อสารคำตอบให้คนที่ต้องตัดสินใจเข้าใจ คำถามที่เจอบ่อยหน้าตาประมาณนี้

- ยอดขายเดือนนี้ตกลงเพราะอะไร ตกทุกหมวดหรือแค่บางหมวด
- โปรโมชันลด 10% เมื่อเดือนที่แล้วคุ้มไหม
- ลูกค้ากลุ่มไหนกลับมาซื้อซ้ำ และกลุ่มไหนหายไปหลังซื้อครั้งแรก
- หน้า checkout แบบใหม่ทำให้คนซื้อมากขึ้นจริงไหม

สังเกตว่าทุกคำถามจบที่**การตัดสินใจ** ผลงานของ DA จึงไม่ใช่ตารางหรือกราฟ แต่คือคำตอบที่ช่วยให้ทีมเลือกทางได้ดีขึ้น

## หนึ่งวันของ DA

| งาน | ตัวอย่าง |
| --- | --- |
| ดึงข้อมูล | เขียน SQL ดึงออเดอร์ 3 เดือนล่าสุดจากฐานข้อมูล |
| ทำความสะอาด | จัดการค่าว่าง แถวซ้ำ และวันที่ที่เขียนหลายรูปแบบ |
| วิเคราะห์ | เทียบยอดขายก่อนและหลังโปรโมชัน แล้วตรวจว่าต่างกันจริงหรือแค่บังเอิญ |
| ทำรายงาน/dashboard | สร้าง dashboard ยอดขายรายวันให้ทีมการตลาดเปิดดูเอง |
| สื่อสาร | สรุปผลเป็นข้อความสั้นๆ พร้อมข้อเสนอแนะ |

เวลาส่วนใหญ่หมดไปกับการดึงข้อมูลและทำความสะอาด สายนี้จึงเริ่มจาก SQL และ pandas

## DA ต่างจากตำแหน่งอื่นในสาย Data ยังไง

| ตำแหน่ง | โฟกัส | เครื่องมือหลัก |
| --- | --- | --- |
| Data Analyst | ตอบคำถามธุรกิจจากข้อมูลที่มีอยู่ | SQL, Excel/Sheets, BI, Python |
| Data Scientist | สร้างโมเดลทำนาย ออกแบบการทดลอง | Python, สถิติ, ML |
| Data Engineer | สร้างและดูแล pipeline ให้ข้อมูลไหลมาถึงมือทุกคน | SQL, Python, Spark, Airflow, cloud |
| ML Engineer | นำโมเดลไปใช้งานจริงและดูแลให้ทำงานต่อเนื่อง | Python, MLOps, cloud |
| AI Engineer | สร้างระบบที่ใช้ LLM เช่น RAG และ agent | Python, LLM API, vector DB, evals |

แต่ละบริษัทใช้ชื่อตำแหน่งไม่เหมือนกัน เวลาอ่านประกาศงานให้ดูที่รายละเอียดงานมากกว่าชื่อตำแหน่ง

## ทักษะที่ประกาศงาน DA ขอบ่อย

1. **SQL** — แทบทุกประกาศขอ และมักมีข้อสอบ SQL ในรอบสัมภาษณ์ → Module 1
2. **Python/pandas** — ใช้ทำความสะอาดและวิเคราะห์ข้อมูลที่ SQL ทำยาก → Module 2
3. **สถิติพื้นฐาน** — อ่านผล A/B test ได้ และไม่สรุปเกินกว่าที่ข้อมูลบอก → Module 3
4. **Visualization และ BI** — เช่น Power BI, Tableau หรือ Looker Studio → Module 4
5. **ความเข้าใจธุรกิจ** — รู้ว่า KPI ไหนสำคัญกับธุรกิจแบบไหน → Module 5
6. **การสื่อสาร** — อธิบายผลให้คนที่ไม่ได้ทำงานสาย data เข้าใจ → ฝึกทุก module และใน Capstone

## ข้อมูลที่จะใช้ตลอดสายนี้

ทุกบทใช้ข้อมูลชุดเดียวกัน คือ**ร้านค้าออนไลน์สมมติ**ช่วงปี 2024–2025 มีทั้งหมด 5 ตาราง

| ตาราง | เก็บอะไร |
| --- | --- |
| `customers` | ลูกค้า 1 แถวต่อ 1 คน: เมือง วันสมัคร และช่องทางที่มาสมัคร |
| `products` | สินค้า: หมวด ราคาขาย และต้นทุน |
| `orders` | 1 แถวต่อ 1 ออเดอร์: วันที่ สถานะ ส่วนลด และวิธีจ่ายเงิน |
| `order_items` | สินค้าแต่ละรายการในออเดอร์: สินค้าอะไร กี่ชิ้น ราคาเท่าไร |
| `events` | พฤติกรรมบนเว็บ: เข้าเว็บ ดูสินค้า ใส่ตะกร้า checkout และซื้อ |

ข้อมูลชุดนี้สร้างขึ้นเอง ไม่ใช่ข้อมูลลูกค้าจริง แต่ตั้งใจใส่เรื่องที่ DA เจอในงานจริงไว้ให้ค้นพบระหว่างเรียน
````

`src/content/lesson-data/da/start/01-what-is-da.yaml`:
```yaml
goals:
  - อธิบายได้ว่า Data Analyst ทำอะไร และต่างจาก Data Scientist, Data Engineer, ML Engineer และ AI Engineer ยังไง
  - รู้ว่าทักษะไหนที่ประกาศงาน DA ขอบ่อย และจะได้เรียนใน module ไหน
  - รู้จัก 5 ตารางของร้านค้าออนไลน์ที่ใช้ตลอดสายนี้

exercises:
  - id: e1
    level: basic
    lang: sql
    prompt: |
      ตาราง `customers` มีลูกค้ากี่คน? ตอบเป็นคอลัมน์เดียวชื่อ `n_customers`
    starter: |
      SELECT ___ AS n_customers
      FROM customers
    solution: |
      SELECT COUNT(*) AS n_customers
      FROM customers
    hints:
      - "`COUNT(*)` นับจำนวนแถวทั้งหมดในตาราง"
  - id: e2
    level: basic
    lang: python
    prompt: |
      อ่านไฟล์ `data/products.csv` ด้วย pandas เก็บไว้ในตัวแปร `products`
      แล้วเก็บจำนวนสินค้า (จำนวนแถว) ไว้ในตัวแปร `n_products`
    starter: |
      import pandas as pd

      products = ___
      n_products = ___
    solution: |
      import pandas as pd

      products = pd.read_csv("data/products.csv")
      n_products = len(products)
    check: |
      check_value(n_products, _sol["n_products"], name="n_products")
    hints:
      - "`pd.read_csv(\"data/products.csv\")` อ่านไฟล์ CSV ออกมาเป็น DataFrame"
      - "`len(df)` คืนจำนวนแถวของ DataFrame"

quiz:
  - id: q1
    question: ข้อไหนเป็นงานหลักของ Data Analyst มากที่สุด
    choices:
      - text: เทรนโมเดล deep learning ด้วย GPU
        why: ส่วนใหญ่เป็นงานของ Data Scientist หรือ ML Engineer
      - text: ตอบคำถามธุรกิจจากข้อมูล แล้วสื่อสารผลให้ทีมใช้ตัดสินใจ
        correct: true
        why: ถูกต้อง ผลงานของ DA คือคำตอบที่ช่วยให้ทีมตัดสินใจได้ดีขึ้น
      - text: ออกแบบ pipeline ย้ายข้อมูลหลายร้อย GB ทุกวัน
        why: เป็นงานหลักของ Data Engineer
      - text: สร้างแชตบอตที่ตอบคำถามจากเอกสารบริษัท
        why: เป็นงานของ AI Engineer (ระบบแบบ RAG)
  - id: q2
    question: ทักษะไหนที่แทบทุกประกาศงาน DA ขอ
    choices:
      - text: SQL
        correct: true
        why: ใช้ดึงข้อมูลแทบทุกวัน และมักมีข้อสอบ SQL ตอนสัมภาษณ์
      - text: Kubernetes
        why: เป็นเครื่องมือจัดการ container ที่ใช้ในงาน infrastructure มากกว่า
      - text: CUDA
        why: ใช้เขียนโปรแกรมบน GPU ไม่เกี่ยวกับงาน DA ทั่วไป
      - text: React
        why: ใช้สร้างหน้าเว็บ เป็นงานของ frontend developer
  - id: q3
    question: ถ้าอยากรู้ว่าออเดอร์หนึ่งมีสินค้าอะไรบ้าง ต้องดูตารางไหน
    choices:
      - text: "`order_items`"
        correct: true
        why: เก็บสินค้าแต่ละรายการในออเดอร์ 1 แถวต่อ 1 รายการ
      - text: "`orders`"
        why: เก็บข้อมูลระดับออเดอร์ เช่น วันที่และสถานะ แต่ไม่ได้บอกว่ามีสินค้าอะไร
      - text: "`products`"
        why: บอกรายละเอียดสินค้า แต่ไม่รู้ว่าสินค้าอยู่ในออเดอร์ไหน
      - text: "`events`"
        why: เก็บพฤติกรรมบนเว็บ ไม่ใช่รายการสินค้าในออเดอร์

summary:
  - DA ตอบคำถามธุรกิจด้วยข้อมูล และผลงานคือคำตอบที่ช่วยให้ทีมตัดสินใจ
  - งานส่วนใหญ่คือดึงข้อมูลและทำความสะอาด สายนี้จึงเริ่มจาก SQL และ pandas
  - แต่ละบริษัทใช้ชื่อตำแหน่งในสาย Data ต่างกัน ให้อ่านรายละเอียดงานเป็นหลัก

interview:
  - id: i1
    q: Data Analyst ต่างจาก Data Scientist ยังไง
    a: |
      DA เน้นตอบคำถามธุรกิจจากข้อมูลที่มีอยู่ เช่น ยอดขายตกเพราะอะไร หรือโปรโมชันได้ผลไหม แล้วสื่อสารผลให้ทีมตัดสินใจ
      ส่วน Data Scientist เน้นสร้างโมเดลทำนายหรือออกแบบการทดลองที่ซับซ้อนกว่า ในหลายบริษัทสองตำแหน่งนี้มีงานทับกัน

      ตอนตอบควรยกตัวอย่างงานจริงประกอบ และบอกว่าตัวเราอยากทำงานแบบไหน

flashcards:
  - id: c1
    front: Data Analyst ทำอะไร
    back: ตอบคำถามธุรกิจด้วยข้อมูล แล้วสื่อสารผลให้ทีมใช้ตัดสินใจ
  - id: c2
    front: ตาราง order_items ต่างจาก orders ยังไง
    back: orders มี 1 แถวต่อ 1 ออเดอร์ ส่วน order_items มี 1 แถวต่อสินค้า 1 รายการในออเดอร์
```

- [ ] **Step 8: Build and inspect**

Run: `npm run build && ls dist/da/start/01-what-is-da/index.html && grep -c "เป้าหมายของบท" dist/da/start/01-what-is-da/index.html`
Expected: build succeeds, the file exists, and the count is 1. `dist/da/sql/index.html` also exists and contains "กำลังเขียน".

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add content collections, track/module/lesson pages and lesson 1"
```

---

### Task 9: Code editor, output and the free-play Runner

**Files:**
- Create: `src/lib/useIsDark.ts`, `src/components/CodeEditor.tsx`, `src/components/Output.tsx`, `src/components/RunStatus.tsx`, `src/components/Runner.tsx`
- Modify: `src/content/lessons/da/start/01-what-is-da.mdx` (append runners), `/Users/chawanpunya/Documents/School/sem1/.claude/launch.json` (outside the repo, add one configuration)

**Interfaces:**
- Consumes: `run`, `reset` (Task 7), `RunResult`, `TableData` (Task 2), `Lang` (Task 5), `isDark`, `THEME_EVENT` (Task 1)
- Produces:
  - `<CodeEditor lang value onChange? onRun? readOnly? label />` (Mod-Enter calls `onRun`)
  - `<Output result />`
  - `<RunStatus busy lang />` shows the first-load hint after 1.5 s
  - `<LoadError message onRetry />`
  - `<Runner lang code title? />` is the default export, usable from MDX with `client:visible`

- [ ] **Step 1: Implement the components**

```ts
// src/lib/useIsDark.ts
import { useEffect, useState } from 'react';
import { isDark, THEME_EVENT } from './theme';

export function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const update = () => setDark(isDark());
    update();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    window.addEventListener(THEME_EVENT, update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener(THEME_EVENT, update);
    };
  }, []);
  return dark;
}
```

```tsx
// src/components/CodeEditor.tsx
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useMemo, useRef } from 'react';
import type { Lang } from '../lib/kinds';
import { useIsDark } from '../lib/useIsDark';

interface Props {
  lang: Lang;
  value: string;
  label: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
}

export default function CodeEditor({ lang, value, label, onChange, onRun, readOnly = false }: Props) {
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const dark = useIsDark();
  const extensions = useMemo(
    () => [
      lang === 'sql' ? sql({ dialect: PostgreSQL, upperCaseKeywords: true }) : python(),
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { runRef.current?.(); return true; } }])),
    ],
    [lang],
  );
  return (
    <CodeMirror
      className="editor"
      value={value}
      onChange={onChange}
      extensions={extensions}
      editable={!readOnly}
      readOnly={readOnly}
      theme={dark ? 'dark' : 'light'}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly }}
      aria-label={label}
    />
  );
}
```

```tsx
// src/components/Output.tsx
import type { RunResult, TableData } from '../lib/runtime/types';

function ResultTable({ table }: { table: TableData }) {
  if (table.columns.length === 0) return <p className="muted">รันสำเร็จ (คำสั่งนี้ไม่มีผลลัพธ์เป็นตาราง)</p>;
  const caption = table.totalRows > table.rows.length ? `แสดง ${table.rows.length} จาก ${table.totalRows.toLocaleString()} แถว` : `${table.totalRows.toLocaleString()} แถว`;
  return (
    <div className="table-wrap">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>{table.columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => <td key={c}>{cell === null ? <span className="null">NULL</span> : String(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Output({ result }: { result: RunResult }) {
  const empty = result.ok && !result.stdout && !result.table && !result.text && result.images.length === 0;
  return (
    <div className="output" aria-live="polite">
      {result.stdout && <pre>{result.stdout}</pre>}
      {result.error && <pre className="out-error" role="alert">{result.error}</pre>}
      {result.table && <ResultTable table={result.table} />}
      {result.text && <pre>{result.text}</pre>}
      {result.images.map((b64, i) => <img key={i} src={`data:image/png;base64,${b64}`} alt={`กราฟที่ ${i + 1}`} />)}
      {empty && <p className="muted">รันสำเร็จ (ไม่มีผลลัพธ์ให้แสดง)</p>}
    </div>
  );
}
```

```tsx
// src/components/RunStatus.tsx
import { useEffect, useState } from 'react';
import type { Lang } from '../lib/kinds';

const LOAD_HINT: Record<Lang, string> = {
  sql: 'ครั้งแรกต้องโหลด DuckDB และข้อมูล ใช้เวลาไม่กี่วินาที',
  python: 'ครั้งแรกต้องโหลด Python และ pandas ประมาณ 10–30 วินาที ครั้งต่อไปจะเร็ว',
};

/** ถ้ารันนานเกิน 1.5 วินาที แปลว่าน่าจะกำลังโหลด runtime ครั้งแรก */
export function RunStatus({ busy, lang }: { busy: boolean; lang: Lang }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 1500);
    return () => clearTimeout(t);
  }, [busy]);
  return slow ? <span className="run-note">{LOAD_HINT[lang]}</span> : null;
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="load-error" role="alert">
      {message} — ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้ว <button type="button" onClick={onRetry}>ลองใหม่</button>
    </div>
  );
}
```

```tsx
// src/components/Runner.tsx
import { useState } from 'react';
import type { Lang } from '../lib/kinds';
import { reset, run } from '../lib/runtime';
import { messageOf } from '../lib/runtime/timeout';
import type { RunResult } from '../lib/runtime/types';
import CodeEditor from './CodeEditor';
import Output from './Output';
import { LoadError, RunStatus } from './RunStatus';

interface Props {
  lang: Lang;
  code: string;
  title?: string;
}

/** ช่องลองเล่นโค้ด — ไม่ถูกตรวจ ไม่บันทึกความคืบหน้า */
export default function Runner({ lang, code: initial, title }: Props) {
  const start = initial.trim();
  const [code, setCode] = useState(start);
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function onRun() {
    setBusy(true);
    setLoadError(null);
    try {
      setResult(await run(lang, code));
    } catch (err) {
      setLoadError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setCode(start);
    setResult(null);
    await reset(lang).catch(() => {});
  }

  return (
    <div className="runner">
      {title && <div className="runner-title">{title}</div>}
      <CodeEditor lang={lang} value={code} onChange={setCode} onRun={onRun} label={`ช่องเขียนโค้ด ${lang === 'sql' ? 'SQL' : 'Python'}`} />
      <div className="runner-bar">
        <button type="button" className="primary" onClick={onRun} disabled={busy}>{busy ? 'กำลังรัน…' : '▶ Run'}</button>
        <button type="button" className="ghost" onClick={onReset} disabled={busy} title="คืนโค้ดตั้งต้น และล้างตัวแปร/ตารางที่แก้ไว้">Reset</button>
        <RunStatus busy={busy} lang={lang} />
        <span className="lang-tag">{lang === 'sql' ? 'SQL' : 'Python'}</span>
      </div>
      {loadError && <LoadError message={loadError} onRetry={onRun} />}
      {result && <Output result={result} />}
    </div>
  );
}
```

- [ ] **Step 2: Add runners to lesson 1**

Add this import directly under the frontmatter of `01-what-is-da.mdx`:
```mdx
import Runner from '@/components/Runner';
```

Append at the end of the file:
````mdx
ลองกด **▶ Run** (หรือกด Ctrl/Cmd + Enter ในช่องโค้ด) เพื่อดู 5 แถวแรกของตาราง `orders`

<Runner client:visible lang="sql" code={`SELECT *
FROM orders
LIMIT 5`} />

ข้อมูลชุดเดียวกันเปิดด้วย pandas ได้จากไฟล์ `data/<ชื่อตาราง>.csv`

<Runner client:visible lang="python" code={`import pandas as pd

orders = pd.read_csv("data/orders.csv")
orders.head()`} />
````

- [ ] **Step 3: Add a preview configuration**

In `/Users/chawanpunya/Documents/School/sem1/.claude/launch.json`, append this object to `configurations` and keep the two existing entries:
```json
{
  "name": "data-career-lab",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["--prefix", "data-career-lab", "run", "dev"],
  "port": 4321
}
```

- [ ] **Step 4: Build, then verify in the browser**

Run: `npm run build`
Expected: success. `dist/_astro/` contains `duckdb-mvp*.wasm`, `duckdb-eh*.wasm` and a `python.worker*.js`.

Then with the Browser preview tools:
1. `preview_start {name: "data-career-lab"}` and navigate to `/da/start/01-what-is-da/`.
2. Click the SQL runner's **▶ Run**. Expect a table with columns `order_id, customer_id, order_date, status, discount_pct, payment_method` and the caption `5 แถว`. `discount_pct` shows `NULL` where empty.
3. Click the Python runner's **▶ Run**. Within 60 s expect a 5-row table. After 1.5 s the hint "ครั้งแรกต้องโหลด Python…" shows while loading.
4. In the Python runner, type `while True: pass` and run. After about 10 s expect the red message "โค้ดรันนานเกิน 10 วินาที จึงถูกหยุด — ตัวแปรที่สร้างไว้ในหน้านี้ถูกล้างแล้ว". A following run of `1 + 1` shows `2`.
5. `read_console_messages {onlyErrors: true}` shows no errors. Toggle ◐ and confirm the editor switches to the dark theme.
6. Take a screenshot as proof.

If the Pyodide `import()` inside the worker is blocked, check `read_network_requests` for `pyodide.mjs`. Vite must keep the URL external, which is what `/* @vite-ignore */` is for.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add code editor, output renderer and Runner island"
```

---

### Task 10: Exercises, worked examples, quiz and the module practice page

**Files:**
- Create: `src/components/Exercise.tsx`, `src/components/WorkedExample.tsx`, `src/components/Quiz.tsx`, `src/pages/da/[module]/practice.astro`
- Modify: `src/pages/da/[module]/[lesson].astro` (add sections)

**Interfaces:**
- Consumes: `TaskView`, `ExampleView`, `QuizView`, `taskView`, `exampleView`, `quizView` (Task 8), `useProgress` (Task 6), `check`, `run` (Task 7), `CodeEditor`, `Output`, `RunStatus`, `LoadError`, `Runner` (Task 9), `LEVELS`, `LEVEL_LABELS` (Task 5)
- Produces:
  - `<Exercise task />` root has `data-exercise-id={gid}` and a status badge `[data-status]`
  - `<WorkedExample example />` root has `data-example-id`
  - `<Quiz lessonId questions />`
  - page `/da/<module>/practice/` for modules that have `src/content/practice/da/<module>.yaml`

- [ ] **Step 1: Implement `Exercise.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { LEVEL_LABELS } from '../lib/kinds';
import type { TaskView } from '../lib/content/views';
import type { ExerciseStatus } from '../lib/progress/store';
import { useProgress } from '../lib/progress/useProgress';
import { check, run } from '../lib/runtime';
import { messageOf } from '../lib/runtime/timeout';
import type { RunResult } from '../lib/runtime/types';
import CodeEditor from './CodeEditor';
import Output from './Output';
import { LoadError, RunStatus } from './RunStatus';

const STATUS_LABEL: Record<ExerciseStatus, string> = {
  none: 'ยังไม่ได้ทำ',
  failed: 'ยังไม่ผ่าน',
  self: 'ผ่านเอง',
  'with-solution': 'ผ่านด้วยเฉลย',
};

export default function Exercise({ task }: { task: TaskView }) {
  const store = useProgress();
  const [code, setCode] = useState(task.starter);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState<'run' | 'check' | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [verdict, setVerdict] = useState<{ passed: boolean; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const status: ExerciseStatus = store?.exercise(task.gid).status ?? 'none';

  // โหลดโค้ดที่พิมพ์ค้างไว้ครั้งเดียวหลัง hydrate
  useEffect(() => {
    if (!store || draftLoaded) return;
    const draft = store.draft(task.gid);
    if (draft !== null) setCode(draft);
    setDraftLoaded(true);
  }, [store, draftLoaded, task.gid]);

  useEffect(() => {
    if (!store || !draftLoaded) return;
    const t = setTimeout(() => store.saveDraft(task.gid, code === task.starter ? null : code), 500);
    return () => clearTimeout(t);
  }, [code, draftLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onRun() {
    setBusy('run');
    setLoadError(null);
    setVerdict(null);
    try {
      setResult(await run(task.lang, code));
    } catch (err) {
      setLoadError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  async function onCheck() {
    setBusy('check');
    setLoadError(null);
    try {
      const r = await check(task, code);
      setVerdict({ passed: r.passed, message: r.message });
      setResult(r.run ?? null);
      store?.recordCheck(task.gid, r.passed);
    } catch (err) {
      setLoadError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  function onToggleSolution() {
    if (!showSolution && status !== 'self' && status !== 'with-solution') {
      if (!window.confirm('ถ้าดูเฉลยตอนนี้ ข้อนี้จะถูกบันทึกว่า "ผ่านด้วยเฉลย" เมื่อทำผ่าน — ดูเลยไหม?')) return;
      store?.viewSolution(task.gid);
    }
    setShowSolution((s) => !s);
  }

  return (
    <div className="card exercise" data-exercise-id={task.gid}>
      <div className="exercise-head">
        {task.level && <span className={`level level-${task.level}`}>{LEVEL_LABELS[task.level]}</span>}
        <span className={`status status-${status}`} data-status={status}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="prompt" dangerouslySetInnerHTML={{ __html: task.promptHtml }} />
      <CodeEditor lang={task.lang} value={code} onChange={setCode} onRun={onRun} label="ช่องเขียนคำตอบ" />
      <div className="runner-bar">
        <button type="button" onClick={onRun} disabled={busy !== null}>{busy === 'run' ? 'กำลังรัน…' : '▶ Run'}</button>
        <button type="button" className="primary" onClick={onCheck} disabled={busy !== null}>{busy === 'check' ? 'กำลังตรวจ…' : 'ตรวจคำตอบ'}</button>
        {task.hintsHtml.length > 0 && (
          <button type="button" className="ghost" onClick={() => setHintsShown((n) => n + 1)} disabled={hintsShown >= task.hintsHtml.length}>
            ขอ hint ({hintsShown}/{task.hintsHtml.length})
          </button>
        )}
        <button type="button" className="ghost" onClick={onToggleSolution}>{showSolution ? 'ซ่อนเฉลย' : 'ดูเฉลย'}</button>
        <button type="button" className="ghost" onClick={() => { setCode(task.starter); setResult(null); setVerdict(null); }}>เริ่มใหม่</button>
        <RunStatus busy={busy !== null} lang={task.lang} />
      </div>
      {hintsShown > 0 && (
        <ol className="hints">
          {task.hintsHtml.slice(0, hintsShown).map((h, i) => <li key={i} dangerouslySetInnerHTML={{ __html: h }} />)}
        </ol>
      )}
      {verdict && <p className={`verdict ${verdict.passed ? 'pass' : 'fail'}`} role="status">{verdict.passed ? '✓ ' : '✗ '}{verdict.message}</p>}
      {loadError && <LoadError message={loadError} onRetry={onRun} />}
      {result && <Output result={result} />}
      {showSolution && (
        <div className="solution">
          <p><strong>เฉลย</strong></p>
          <CodeEditor lang={task.lang} value={task.solution.trim()} readOnly label="เฉลย" />
          <button type="button" className="ghost" onClick={() => setCode(task.solution)}>คัดลอกเฉลยไปวางในช่องคำตอบ</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement `WorkedExample.tsx` and `Quiz.tsx`**

```tsx
// src/components/WorkedExample.tsx
import { useState } from 'react';
import type { ExampleView } from '../lib/content/views';
import Runner from './Runner';

export default function WorkedExample({ example }: { example: ExampleView }) {
  const [shown, setShown] = useState(1);
  const total = example.steps.length;
  return (
    <div className="card worked" data-example-id={example.gid}>
      <h3>{example.title}</h3>
      <div className="prompt" dangerouslySetInnerHTML={{ __html: example.promptHtml }} />
      <ol className="steps">
        {example.steps.slice(0, shown).map((s, i) => (
          <li key={i}>
            <div dangerouslySetInnerHTML={{ __html: s.html }} />
            <Runner lang={example.lang} code={s.code} />
          </li>
        ))}
      </ol>
      {shown < total ? (
        <div className="runner-bar">
          <button type="button" className="primary" onClick={() => setShown(shown + 1)}>ขั้นต่อไป ({shown}/{total})</button>
          <button type="button" className="ghost" onClick={() => setShown(total)}>แสดงทุกขั้น</button>
        </div>
      ) : (
        example.pitfall && (
          <div className="pitfall">
            <p><strong>⚠ ทางที่คนมักพลาด</strong></p>
            <div dangerouslySetInnerHTML={{ __html: example.pitfall.html }} />
            {example.pitfall.code && <Runner lang={example.lang} code={example.pitfall.code} />}
          </div>
        )
      )}
    </div>
  );
}
```

```tsx
// src/components/Quiz.tsx
import { useEffect, useState } from 'react';
import type { QuizView } from '../lib/content/views';
import { useProgress } from '../lib/progress/useProgress';

export default function Quiz({ lessonId, questions }: { lessonId: string; questions: QuizView[] }) {
  const store = useProgress();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a !== null && questions[i].choices[a].correct).length;
  const finished = questions.length > 0 && answered === questions.length;
  const last = store?.quizScore(lessonId) ?? null;

  useEffect(() => {
    if (finished) store?.recordQuiz(lessonId, correct, questions.length);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (qi: number, ci: number) => setAnswers((a) => a.map((x, i) => (i === qi ? ci : x)));

  return (
    <div className="quiz">
      {last && answered === 0 && <p className="muted">ครั้งล่าสุดได้ {last.correct}/{last.total}</p>}
      {questions.map((q, qi) => {
        const chosen = answers[qi];
        return (
          <fieldset key={q.gid} className="card quiz-q">
            <legend dangerouslySetInnerHTML={{ __html: `${qi + 1}. ${q.questionHtml}` }} />
            {q.choices.map((c, ci) => {
              const cls = chosen === null ? '' : c.correct ? 'right' : chosen === ci ? 'wrong' : '';
              return (
                <button key={ci} type="button" className={`choice ${cls}`} disabled={chosen !== null} onClick={() => choose(qi, ci)} dangerouslySetInnerHTML={{ __html: c.html }} />
              );
            })}
            {chosen !== null && <div className="why" dangerouslySetInnerHTML={{ __html: q.choices[chosen].whyHtml }} />}
          </fieldset>
        );
      })}
      {finished && (
        <p className="verdict pass">
          ได้ {correct}/{questions.length}{' '}
          <button type="button" className="ghost" onClick={() => setAnswers(questions.map(() => null))}>ทำใหม่</button>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add the interactive sections to the lesson page**

In `src/pages/da/[module]/[lesson].astro` add these imports to the frontmatter:
```ts
import Exercise from '../../../components/Exercise';
import Quiz from '../../../components/Quiz';
import WorkedExample from '../../../components/WorkedExample';
import { exampleView, quizView, taskView } from '../../../lib/content/views';
import { LEVELS, LEVEL_LABELS } from '../../../lib/kinds';
```
and after `const { Content } = await render(entry);`:
```ts
const examples = data.examples.map((e) => exampleView(ref.id, e));
const faded = data.faded.map((t) => taskView(ref.id, t, 'faded'));
const exercises = data.exercises.map((t) => taskView(ref.id, t, 'exercise'));
const quiz = data.quiz.map((q) => quizView(ref.id, q));
```
Insert between `<div class="prose"><Content /></div>` and the `สรุป` section:
```astro
{examples.length > 0 && (
  <section>
    <h2>ตัวอย่างแก้โจทย์</h2>
    <p class="muted">กด "ขั้นต่อไป" ทีละขั้น ลองรันและแก้โค้ดในแต่ละขั้นได้</p>
    {examples.map((ex) => <WorkedExample client:visible example={ex} />)}
  </section>
)}
{faded.length > 0 && (
  <section>
    <h2>เติมช่องว่าง</h2>
    <p class="muted">แทน <code>___</code> ด้วยโค้ดที่ถูกต้อง แล้วกดตรวจคำตอบ</p>
    {faded.map((t) => <Exercise client:visible task={t} />)}
  </section>
)}
<section>
  <h2>แบบฝึกท้ายบท</h2>
  <p class="muted">บทนี้จะนับว่าเสร็จเมื่อผ่านข้อพื้นฐานและประยุกต์ครบ ข้อท้าทายได้ดาวเพิ่ม</p>
  {LEVELS.map((level) => {
    const list = exercises.filter((t) => t.level === level);
    return list.length > 0 && (
      <div class="level-group">
        <h3>{LEVEL_LABELS[level]}</h3>
        {list.map((t) => <Exercise client:visible task={t} />)}
      </div>
    );
  })}
</section>
{quiz.length > 0 && (
  <section>
    <h2>Quiz</h2>
    <Quiz client:visible lessonId={ref.id} questions={quiz} />
  </section>
)}
```

- [ ] **Step 4: Add the module practice page**

```astro
---
// src/pages/da/[module]/practice.astro
import { getCollection } from 'astro:content';
import Exercise from '../../../components/Exercise';
import Base from '../../../layouts/Base.astro';
import { getTrack } from '../../../lib/content/catalog';
import type { ModuleRef } from '../../../lib/content/refs';
import type { PracticeSet } from '../../../lib/content/schema';
import { taskView } from '../../../lib/content/views';
import { url } from '../../../lib/url';

export async function getStaticPaths() {
  const modules = await getTrack('da');
  const sets = await getCollection('practice');
  return modules
    .filter((m) => m.practiceUrl)
    .map((m) => ({ params: { module: m.slug }, props: { mod: m, set: sets.find((s) => s.id === m.id)!.data } }));
}
const { mod, set } = Astro.props as { mod: ModuleRef; set: PracticeSet };
const tasks = set.exercises.map((t) => taskView(`${mod.id}/practice`, t, 'exercise'));
---
<Base title={`ชุดฝึก: ${mod.title}`}>
  <p class="crumb"><a href={url('/da/')}>Data Analyst</a> › <a href={mod.url}>{mod.title}</a></p>
  <h1>{set.title}</h1>
  <p class="lead">โจทย์คละหัวข้อทั้ง module โดยไม่บอกว่าต้องใช้เทคนิคไหน ให้เลือกวิธีเองเหมือนตอนทำงานจริง</p>
  {tasks.map((t) => <Exercise client:visible task={t} />)}
</Base>
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run build`
Expected: success. There are no practice YAML files yet, so no `practice/` pages are generated.

With the preview on `/da/start/01-what-is-da/`:
1. Exercise `e1` (SQL): click **ตรวจคำตอบ** on the untouched starter. Expect a red verdict starting "✗ SQL error".
2. Replace `___` with `COUNT(*)` and check again. Expect "✓ ถูกต้อง! ผลลัพธ์ตรงกับคำตอบ (1 แถว)" and the badge "ผ่านเอง".
3. Exercise `e2` (Python): click **ดูเฉลย** and accept the confirm dialog. Click "คัดลอกเฉลยไปวางในช่องคำตอบ", then **ตรวจคำตอบ**. Expect "✓ ถูกต้อง!" and the badge "ผ่านด้วยเฉลย".
4. Click **ขอ hint** twice on e2. Expect both hints and the button disabled at 2/2.
5. Answer all 3 quiz questions. Expect green/red choices, the explanation, and "ได้ n/3".
6. Type something into e1, reload after 1 s. Expect the typed code to be restored and the badge still "ผ่านเอง".
7. `read_console_messages {onlyErrors: true}` shows no hydration errors. Take a screenshot.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auto-checked exercises, worked examples, quiz and module practice page"
```

---

### Task 11: Progress UI (sidebar, module progress, continue, settings, storage warning)

**Files:**
- Create: `src/components/LessonNav.tsx`, `src/components/ModuleProgress.tsx`, `src/components/ContinueButton.tsx`, `src/components/TrackLesson.tsx`, `src/components/StorageWarning.tsx`, `src/components/SettingsPanel.tsx`, `src/pages/settings.astro`
- Modify: `src/layouts/Base.astro`, `src/pages/index.astro`, `src/pages/da/index.astro`, `src/pages/da/[module]/index.astro`, `src/pages/da/[module]/[lesson].astro`

**Interfaces:**
- Consumes: `useProgress`, `getProgress`, `lessonStatus`, `moduleProgress` (Task 6), `LessonRef` (Task 8), `getTrack` (Task 8), `messageOf` (Task 7)
- Produces: islands used with `client:only="react"` (they depend on localStorage, so there is no SSR):
  - `<LessonNav lessons currentId />` renders ✓ done, ◐ started, ○ not started, plus ★ per passed challenge
  - `<ModuleProgress lessons />`
  - `<ContinueButton lessons />`
  - `<TrackLesson lessonId />` records `lastLesson`
  - `<StorageWarning />`
  - `<SettingsPanel />`

- [ ] **Step 1: Implement the islands**

```tsx
// src/components/LessonNav.tsx
import type { LessonRef } from '../lib/content/refs';
import { lessonStatus } from '../lib/progress/status';
import { useProgress } from '../lib/progress/useProgress';

export default function LessonNav({ lessons, currentId }: { lessons: LessonRef[]; currentId: string | null }) {
  const store = useProgress();
  return (
    <ol className="lesson-nav">
      {lessons.map((l, i) => {
        const s = store ? lessonStatus(l.exercises, store.exercise) : null;
        const icon = s?.done ? '✓' : s?.started ? '◐' : '○';
        const label = s?.done ? 'เรียนจบแล้ว' : s?.started ? 'กำลังเรียน' : 'ยังไม่เริ่ม';
        const current = l.id === currentId;
        return (
          <li key={l.id} className={current ? 'current' : ''}>
            <a href={l.url} aria-current={current ? 'page' : undefined}>
              <span className="icon" aria-hidden="true">{icon}</span>
              <span>{i + 1}. {l.title}<span className="sr-only"> ({label})</span></span>
              {s && s.stars > 0 && <span className="stars" title="ข้อท้าทายที่ผ่าน">{'★'.repeat(s.stars)}</span>}
            </a>
          </li>
        );
      })}
    </ol>
  );
}
```

```tsx
// src/components/ModuleProgress.tsx
import type { LessonRef } from '../lib/content/refs';
import { moduleProgress } from '../lib/progress/status';
import { useProgress } from '../lib/progress/useProgress';

export default function ModuleProgress({ lessons }: { lessons: LessonRef[] }) {
  const store = useProgress();
  const p = store ? moduleProgress(lessons, store.exercise) : { done: 0, total: lessons.length, percent: 0 };
  return (
    <div className="progress" role="img" aria-label={`เรียนจบ ${p.done} จาก ${p.total} บท`}>
      <div className="bar"><span style={{ width: `${p.percent}%` }} /></div>
      <span className="muted">{p.done}/{p.total} บท</span>
    </div>
  );
}
```

```tsx
// src/components/ContinueButton.tsx
import type { LessonRef } from '../lib/content/refs';
import { useProgress } from '../lib/progress/useProgress';

export default function ContinueButton({ lessons }: { lessons: LessonRef[] }) {
  const store = useProgress();
  if (lessons.length === 0) return null;
  const last = store?.lastLesson ? lessons.find((l) => l.id === store.lastLesson) : undefined;
  const target = last ?? lessons[0];
  return <a className="button primary" href={target.url}>{last ? `เรียนต่อ: ${last.title}` : `เริ่มบทแรก: ${target.title}`}</a>;
}
```

```tsx
// src/components/TrackLesson.tsx
import { useEffect } from 'react';
import { getProgress } from '../lib/progress';

export default function TrackLesson({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    getProgress().setLastLesson(lessonId);
  }, [lessonId]);
  return null;
}
```

```tsx
// src/components/StorageWarning.tsx
import { useProgress } from '../lib/progress/useProgress';

export default function StorageWarning() {
  const store = useProgress();
  if (!store || store.health === 'ok') return null;
  const text =
    store.health === 'memory-only'
      ? 'เบราว์เซอร์นี้บันทึกความคืบหน้าไม่ได้ (localStorage ถูกปิดหรือเต็ม) — ความคืบหน้าจะหายเมื่อปิดหน้า'
      : 'ข้อมูลความคืบหน้าเดิมเสีย จึงเริ่มนับใหม่ ข้อมูลเดิมเก็บสำรองไว้ในเบราว์เซอร์ที่คีย์ dcl:progress:backup';
  return <div className="banner" role="alert">{text}</div>;
}
```

```tsx
// src/components/SettingsPanel.tsx
import { useState, type ChangeEvent } from 'react';
import { useProgress } from '../lib/progress/useProgress';
import { messageOf } from '../lib/runtime/timeout';

export default function SettingsPanel() {
  const store = useProgress();
  const [message, setMessage] = useState<string | null>(null);
  if (!store) return <p className="muted">กำลังโหลด…</p>;

  function onExport() {
    const href = URL.createObjectURL(new Blob([store!.exportJson()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = `data-career-lab-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      store!.importJson(await file.text());
      setMessage('นำเข้าความคืบหน้าเรียบร้อย');
    } catch (err) {
      setMessage(messageOf(err));
    }
  }

  function onReset() {
    if (!window.confirm('ลบความคืบหน้าทั้งหมด รวมโค้ดที่พิมพ์ค้างไว้ — ย้อนกลับไม่ได้ ยืนยันไหม?')) return;
    store!.reset();
    setMessage('ล้างความคืบหน้าแล้ว');
  }

  return (
    <div>
      <section className="card">
        <h2>สำรองความคืบหน้า</h2>
        <p>ความคืบหน้าเก็บอยู่ในเบราว์เซอร์นี้เท่านั้น ถ้าล้าง cache จะหาย ควร export เก็บไว้เป็นระยะ</p>
        <div className="runner-bar">
          <button type="button" className="primary" onClick={onExport}>Export เป็นไฟล์ JSON</button>
          <label className="button">
            Import จากไฟล์
            <input type="file" accept="application/json,.json" onChange={onImport} className="sr-only" />
          </label>
        </div>
      </section>
      <section className="card">
        <h2>เริ่มใหม่ทั้งหมด</h2>
        <button type="button" className="danger" onClick={onReset}>ล้างความคืบหน้า</button>
      </section>
      {message && <p className="verdict" role="status">{message}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Wire the islands into pages**

`src/pages/settings.astro`:
```astro
---
import SettingsPanel from '../components/SettingsPanel';
import Base from '../layouts/Base.astro';
---
<Base title="ตั้งค่า">
  <h1>ตั้งค่า</h1>
  <SettingsPanel client:only="react" />
</Base>
```

`src/layouts/Base.astro`: add `import StorageWarning from '../components/StorageWarning';` to the frontmatter and `<StorageWarning client:only="react" />` right after `</header>`.

`src/pages/index.astro`: add to the frontmatter:
```ts
import ContinueButton from '../components/ContinueButton';
import ModuleProgress from '../components/ModuleProgress';
import { getTrack } from '../lib/content/catalog';

const daLessons = (await getTrack('da')).flatMap((m) => m.lessons);
```
Add `<ContinueButton client:only="react" lessons={daLessons} />` as the last child of `<section class="hero">`. In the track card, render `{t.href && <ModuleProgress client:only="react" lessons={daLessons} />}` just before the button line.

`src/pages/da/index.astro`: import `ModuleProgress` and replace `<span class="muted">{m.lessons.length} บท</span>` with `<ModuleProgress client:only="react" lessons={m.lessons} />`.

`src/pages/da/[module]/index.astro`: import `LessonNav` and replace the whole `<ol class="lesson-list">…</ol>` with `<LessonNav client:only="react" lessons={mod.lessons} currentId={null} />`.

`src/pages/da/[module]/[lesson].astro`: import `LessonNav` and `TrackLesson`. Replace the static `<ol class="lesson-nav">…</ol>` in the aside with `<LessonNav client:only="react" lessons={mod.lessons} currentId={ref.id} />`, and add `<TrackLesson client:only="react" lessonId={ref.id} />` just before `</Base>`.

- [ ] **Step 3: Verify in the browser**

Run: `npm run build` (expect success), then with the preview:
1. Open `/`. With empty storage the button reads "เริ่มบทแรก: Data Analyst ทำอะไร".
2. Open lesson 1 and go back to `/`. The button now reads "เรียนต่อ: Data Analyst ทำอะไร".
3. On lesson 1, pass both exercises (e1 SQL by typing, e2 via solution). The sidebar icon becomes ✓. `/da/` shows `1/1 บท` for เริ่มต้น with a full bar.
4. `/settings/`: Export downloads a JSON file. Reset, then confirm the sidebar shows ○ again. Import the exported file and the ✓ comes back. The download is a local file from the page itself, so no external download approval is needed.
5. Run `localStorage.setItem('dcl:progress', '{bad')` via `javascript_tool`, then reload. Expect the "ข้อมูลความคืบหน้าเดิมเสีย…" banner.
6. Screenshot `/da/` and the lesson sidebar.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add progress sidebar, module progress, continue button and settings"
```

---

### Task 12: Content test harness (every solution passes, every starter fails)

**Files:**
- Create: `tests/helpers/check-task.ts`, `tests/content/content.test.ts`

**Interfaces:**
- Consumes: `lessonDataSchema`, `practiceSchema`, `lessonFrontmatterSchema`, `lessonRuleErrors`, `practiceRuleErrors` (Task 5), `checkSql` (Task 2), `createDatasetDuck` (Task 3), `createNodePython`, `readDatasetFiles` (Tasks 3–4)
- Produces: `npm run test:content`, which later plans run after every lesson they add

- [ ] **Step 1: Write the harness**

```ts
// tests/helpers/check-task.ts
import { checkSql } from '../../src/lib/sql/check';
import type { PythonApi } from '../../src/lib/python/boot';
import type { CheckResult } from '../../src/lib/runtime/types';
import type { Task } from '../../src/lib/content/schema';
import type { NodeDuck } from './duckdb-node';

export interface ContentEnv {
  duck: NodeDuck;
  py: PythonApi;
}

export function checkTask(env: ContentEnv, task: Task, code: string): Promise<CheckResult> {
  if (task.lang === 'sql') return checkSql(env.duck, code, task.solution, { ordered: task.ordered });
  return Promise.resolve(env.py.check(code, task.check ?? '', task.solution));
}
```

```ts
// tests/content/content.test.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';
import { lessonDataSchema, lessonFrontmatterSchema, practiceSchema, type Task } from '../../src/lib/content/schema';
import { lessonRuleErrors, practiceRuleErrors } from '../../src/lib/content/rules';
import { createDatasetDuck } from '../helpers/duckdb-node';
import { readDatasetFiles } from '../helpers/dataset-files';
import { createNodePython } from '../helpers/pyodide-node';
import { checkTask, type ContentEnv } from '../helpers/check-task';

const ROOT = 'src/content';
const list = (dir: string, ext: string) =>
  existsSync(dir)
    ? (readdirSync(dir, { recursive: true }) as string[]).filter((f) => f.endsWith(ext)).map((f) => f.split(path.sep).join('/').slice(0, -ext.length)).sort()
    : [];

const lessonIds = list(`${ROOT}/lesson-data`, '.yaml');
const mdxIds = list(`${ROOT}/lessons`, '.mdx');
const practiceIds = list(`${ROOT}/practice`, '.yaml');
const modules = YAML.parse(readFileSync(`${ROOT}/modules.yaml`, 'utf8')) as { id: string; slug: string; intro?: boolean }[];
const isIntro = (lessonId: string) => modules.find((m) => lessonId.startsWith(`${m.id}/`))?.intro === true;

let env: ContentEnv;
beforeAll(async () => {
  env = { duck: await createDatasetDuck(), py: await createNodePython(readDatasetFiles()) };
});

it('มีบทเรียนอย่างน้อยหนึ่งบท และไฟล์ MDX กับ YAML จับคู่กันครบ', () => {
  expect(lessonIds.length).toBeGreaterThan(0);
  expect(mdxIds).toEqual(lessonIds);
});

function taskTests(scope: string, tasks: Task[]) {
  for (const t of tasks) {
    it(`${scope}/${t.id}: เฉลยผ่านตัวตรวจ`, async () => {
      const r = await checkTask(env, t, t.solution);
      expect(r.passed, r.message).toBe(true);
    });
    it(`${scope}/${t.id}: โค้ดเริ่มต้นไม่ผ่าน`, async () => {
      expect((await checkTask(env, t, t.starter)).passed).toBe(false);
    });
  }
}

for (const id of lessonIds) {
  describe(id, () => {
    const parsed = lessonDataSchema.safeParse(YAML.parse(readFileSync(`${ROOT}/lesson-data/${id}.yaml`, 'utf8')));
    if (!parsed.success) {
      it('ตรงตาม schema', () => expect(parsed.error.issues).toEqual([]));
      return;
    }
    const data = parsed.data;

    it('frontmatter ถูกต้องและ module ตรงกับโฟลเดอร์', () => {
      const raw = readFileSync(`${ROOT}/lessons/${id}.mdx`, 'utf8');
      const fm = lessonFrontmatterSchema.parse(YAML.parse(raw.split(/^---$/m)[1]));
      expect(id.startsWith(`${fm.track}/${fm.module}/`)).toBe(true);
    });
    it('ตรงตามสัดส่วนของ spec', () => {
      expect(lessonRuleErrors(data, { intro: isIntro(id) })).toEqual([]);
    });

    taskTests(id, [...data.faded, ...data.exercises]);

    for (const ex of data.examples) {
      it(`${id}/${ex.id}: โค้ดทุกขั้นของตัวอย่างรันได้`, async () => {
        const codes = [...ex.steps.map((s) => s.code), ...(ex.pitfall?.code ? [ex.pitfall.code] : [])];
        if (ex.lang === 'python') {
          env.py.reset();
          for (const code of codes) {
            const r = env.py.run(code);
            expect(r.ok, `${code}\n→ ${r.error}`).toBe(true);
          }
        } else {
          for (const code of codes) expect(() => env.duck.query(code), code).not.toThrow();
        }
      });
    }
  });
}

for (const id of practiceIds) {
  describe(`practice ${id}`, () => {
    const set = practiceSchema.parse(YAML.parse(readFileSync(`${ROOT}/practice/${id}.yaml`, 'utf8')));
    it('มี module ตรงกับชื่อไฟล์ และจำนวนข้อตาม spec', () => {
      expect(modules.some((m) => m.id === id)).toBe(true);
      expect(practiceRuleErrors(set)).toEqual([]);
    });
    taskTests(`${id}/practice`, set.exercises);
  });
}
```

- [ ] **Step 2: Run against lesson 1**

Run: `npm run test:content`
Expected: all tests PASS. That covers the pairing test, frontmatter, ratio (intro, so only duplicates and blanks) and 2 × 2 task tests for e1/e2.

Sanity-check that the harness catches bad content:
1. Set e1's `starter` to the same text as its `solution`, rerun, and confirm "e1: โค้ดเริ่มต้นไม่ผ่าน" FAILS.
2. Put a typo in e2's `check` (e.g. `check_value(n_product, ...)`) and confirm "e2: เฉลยผ่านตัวตรวจ" FAILS.
3. Revert with `git checkout src/content`.

Self-comparison cannot prove that a solution answers the prompt correctly. That part stays a manual review step when writing content.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: every file PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add content harness that runs every exercise against real DuckDB and Pyodide"
```

---

### Task 13: Lesson 2 — ขั้นตอนการวิเคราะห์ และวิธีใช้เว็บนี้

**Files:**
- Create: `src/content/lessons/da/start/02-workflow-and-tools.mdx`, `src/content/lesson-data/da/start/02-workflow-and-tools.yaml`

**Interfaces:**
- Consumes: everything above. This lesson is the first to use a worked example and a faded example, so it exercises every component.
- Produces: exercise `da/start/02-workflow-and-tools/e1` with the single-line solution `SELECT COUNT(*) AS n_orders FROM orders` (the E2E test in Task 14 types it).

- [ ] **Step 1: Write the lesson**

`src/content/lessons/da/start/02-workflow-and-tools.mdx`:
````mdx
---
track: da
module: start
order: 2
title: ขั้นตอนการวิเคราะห์ และวิธีใช้เว็บนี้
minutes: 20
prereqs: [da/start/01-what-is-da]
---
import Runner from '@/components/Runner';

## 5 ขั้นของงานวิเคราะห์

1. **ตั้งคำถาม** — เปลี่ยนโจทย์กว้างๆ ให้เป็นคำถามที่ตอบได้ด้วยข้อมูล
2. **หาข้อมูล** — รู้ว่าคำตอบอยู่ในตารางไหน แล้วดึงเฉพาะส่วนที่ต้องใช้
3. **ทำความสะอาด** — จัดการค่าว่าง แถวซ้ำ และรูปแบบข้อมูลที่ไม่ตรงกัน
4. **วิเคราะห์** — สรุป เปรียบเทียบ และตรวจว่าผลที่เห็นไม่ได้เกิดจากความบังเอิญ
5. **สื่อสาร** — เล่าผลสั้นๆ ให้คนที่ต้องตัดสินใจเข้าใจ พร้อมข้อเสนอแนะ

ลองดูตัวอย่างสั้นๆ กับคำถามว่า "ปี 2025 ลูกค้าจ่ายเงินด้วยช่องทางไหนมากที่สุด"

<Runner client:visible lang="sql" code={`SELECT payment_method, COUNT(*) AS n_orders
FROM orders
WHERE year(order_date) = 2025
GROUP BY payment_method
ORDER BY n_orders DESC`} />

คำถามเดียวกันเขียนด้วย pandas ได้แบบนี้

<Runner client:visible lang="python" code={`import pandas as pd

orders = pd.read_csv("data/orders.csv", parse_dates=["order_date"])
orders_2025 = orders[orders["order_date"].dt.year == 2025]
orders_2025["payment_method"].value_counts()`} />

ทั้งสองแบบได้คำตอบเดียวกัน ในงานจริงมักใช้ SQL ดึงและสรุปข้อมูลจากฐานข้อมูลก่อน แล้วค่อยใช้ pandas กับงานที่ SQL ทำยาก เช่น การทำความสะอาดข้อมูลหรือสถิติ

## ตั้งคำถามให้วิเคราะห์ได้

| คำถามที่กว้างเกินไป | คำถามที่วิเคราะห์ได้ |
| --- | --- |
| "ยอดขายไม่ดี ช่วยดูหน่อย" | "รายได้ไตรมาส 3 ปี 2025 ลดลงกี่ % เทียบกับไตรมาส 2 และลดลงที่หมวดไหน" |
| "ลูกค้าชอบอะไร" | "สินค้าหมวดไหนที่ลูกค้ากลับมาซื้อซ้ำภายใน 90 วันมากที่สุด" |
| "โปรโมชันเวิร์กไหม" | "ออเดอร์ที่ใช้ส่วนลดมียอดต่อออเดอร์สูงกว่าออเดอร์ที่ไม่ใช้ส่วนลดไหม" |

คำถามที่ดีระบุ**ช่วงเวลา ตัวชี้วัด และสิ่งที่จะเปรียบเทียบ** ถ้าคำถามที่ได้รับยังไม่ครบ ให้ถามกลับก่อนเริ่มเขียนโค้ด

## วิธีใช้เว็บนี้

- **ช่องลองเล่น** — กด ▶ Run หรือ Ctrl/Cmd + Enter แก้โค้ดได้อิสระ ไม่มีการตรวจ ปุ่ม Reset คืนโค้ดตั้งต้น
- **ลำดับในแต่ละบท** — ตัวอย่างแก้โจทย์ → เติมช่องว่าง → แบบฝึก 3 ระดับ → quiz → สรุปและคำถามสัมภาษณ์
- **แบบฝึก** — บทจะนับว่าเสร็จเมื่อผ่านข้อ 🟢 พื้นฐาน และ 🟡 ประยุกต์ครบ ส่วนข้อ 🔴 ท้าทายได้ดาว ★
- **ติดตรงไหน** — กดขอ hint ทีละขั้นก่อน ถ้ายังไม่ได้ค่อยดูเฉลย ข้อที่ดูเฉลยแล้วจะถูกบันทึกว่า "ผ่านด้วยเฉลย" เพื่อให้รู้ว่าควรกลับมาทำเองอีกรอบ
- **ความคืบหน้า** — บันทึกในเบราว์เซอร์นี้อัตโนมัติ รวมถึงโค้ดที่พิมพ์ค้างไว้ ควร export สำรองที่หน้าตั้งค่าเป็นระยะ
- **ข้อมูล** — ใน SQL ใช้ชื่อตารางได้เลย ใน Python ให้อ่านไฟล์จาก `data/<ชื่อตาราง>.csv`
````

`src/content/lesson-data/da/start/02-workflow-and-tools.yaml`:
```yaml
goals:
  - เรียงขั้นตอนการวิเคราะห์ 5 ขั้นได้ และรู้ว่าแต่ละขั้นทำอะไร
  - เปลี่ยนคำถามกว้างๆ ให้เป็นคำถามที่ระบุช่วงเวลา ตัวชี้วัด และสิ่งที่จะเปรียบเทียบ
  - ใช้ช่องลองเล่น แบบฝึก hint และเฉลยของเว็บนี้ได้

examples:
  - id: x1
    title: เดือนไหนของปี 2024 มีออเดอร์มากที่สุด
    lang: sql
    prompt: |
      ทีมการตลาดอยากรู้ว่าปี 2024 เดือนไหนมีออเดอร์มากที่สุด เพื่อวางแผนแคมเปญปีหน้า
    steps:
      - text: |
          **ดูข้อมูลก่อนเสมอ** — เช็กว่าตาราง `orders` มีคอลัมน์อะไร และวันที่เก็บในรูปแบบไหน
        code: |
          SELECT order_id, order_date
          FROM orders
          LIMIT 5
      - text: |
          **ดึงเดือนออกจากวันที่** — ฟังก์ชัน `month()` คืนเลขเดือน 1–12 ลองดูคู่กับวันที่จริงว่าถูกต้อง
        code: |
          SELECT order_date, month(order_date) AS m
          FROM orders
          LIMIT 5
      - text: |
          **กรองปี นับ แล้วเรียง** — เลือกเฉพาะปี 2024 นับออเดอร์ต่อเดือน แล้วเรียงจากมากไปน้อย แถวแรกคือคำตอบ
        code: |
          SELECT month(order_date) AS m, COUNT(*) AS n_orders
          FROM orders
          WHERE year(order_date) = 2024
          GROUP BY m
          ORDER BY n_orders DESC
    pitfall:
      text: |
        ถ้าลืม `WHERE year(order_date) = 2024` ออเดอร์ของปี 2024 และ 2025 จะถูกรวมเป็นเดือนเดียวกัน
        ตัวเลขจะดูสมเหตุสมผลแต่ตอบผิดคำถาม — ลองรันแล้วเทียบกับขั้นที่ 3
      code: |
        SELECT month(order_date) AS m, COUNT(*) AS n_orders
        FROM orders
        GROUP BY m
        ORDER BY n_orders DESC

faded:
  - id: f1
    lang: python
    prompt: |
      นับจำนวนออเดอร์ของแต่ละช่องทางการจ่ายเงิน (`payment_method`) เก็บผลไว้ในตัวแปร `result`
      เติม `___` ให้ถูกต้อง
    starter: |
      import pandas as pd

      orders = pd.read_csv("data/orders.csv")
      result = orders["___"].value_counts()
    solution: |
      import pandas as pd

      orders = pd.read_csv("data/orders.csv")
      result = orders["payment_method"].value_counts()
    check: |
      check_series(result, _sol["result"], name="result")
    hints:
      - ใส่ชื่อคอลัมน์ที่ต้องการนับลงในวงเล็บเหลี่ยม

exercises:
  - id: e1
    level: basic
    lang: sql
    prompt: |
      นับจำนวนออเดอร์ทั้งหมดในตาราง `orders` ตั้งชื่อคอลัมน์ว่า `n_orders`
    starter: |
      -- เขียน SQL ตรงนี้
    solution: SELECT COUNT(*) AS n_orders FROM orders
    hints:
      - ใช้ `COUNT(*)` เหมือนแบบฝึกในบทที่แล้ว
      - "`AS n_orders` ใช้ตั้งชื่อคอลัมน์ผลลัพธ์"
  - id: e2
    level: basic
    lang: python
    prompt: |
      ใช้ pandas หาว่ามีออเดอร์ที่ `status` เป็น `"cancelled"` กี่ออเดอร์ เก็บคำตอบไว้ในตัวแปร `n_cancelled`
    starter: |
      import pandas as pd

      orders = pd.read_csv("data/orders.csv")
      n_cancelled = ___
    solution: |
      import pandas as pd

      orders = pd.read_csv("data/orders.csv")
      n_cancelled = (orders["status"] == "cancelled").sum()
    check: |
      check_value(n_cancelled, _sol["n_cancelled"], name="n_cancelled")
    hints:
      - "`orders[\"status\"] == \"cancelled\"` ได้ค่า True/False ทีละแถว"
      - "`.sum()` กับค่า True/False จะนับจำนวน True"
  - id: e3
    level: applied
    lang: sql
    ordered: true
    prompt: |
      หาจำนวนออเดอร์ของแต่ละช่องทางการจ่ายเงินเฉพาะ**ปี 2025** เรียงจากมากไปน้อย
      ใช้ชื่อคอลัมน์ `payment_method` และ `n_orders`
    starter: |
      SELECT payment_method, ___ AS n_orders
      FROM orders
      WHERE ___
      GROUP BY payment_method
      ORDER BY ___
    solution: |
      SELECT payment_method, COUNT(*) AS n_orders
      FROM orders
      WHERE year(order_date) = 2025
      GROUP BY payment_method
      ORDER BY n_orders DESC
    hints:
      - ดูโค้ดในช่องลองเล่นช่วงต้นบท โครงเหมือนกันเลย
      - "`year(order_date) = 2025` กรองเฉพาะปี 2025"
      - "`DESC` คือเรียงจากมากไปน้อย"

quiz:
  - id: q1
    question: ขั้นแรกของงานวิเคราะห์คืออะไร
    choices:
      - text: ตั้งคำถามให้ชัดว่าจะตอบอะไร
        correct: true
        why: ถ้ายังไม่รู้คำถาม จะไม่รู้ว่าต้องดึงข้อมูลอะไรและวิเคราะห์แบบไหน
      - text: ดึงข้อมูลทุกตารางมาก่อน
        why: ดึงมาโดยไม่มีคำถามจะเสียเวลาและหลงทาง
      - text: ทำ dashboard
        why: dashboard เป็นส่วนของการสื่อสาร ซึ่งเป็นขั้นสุดท้าย
      - text: ทำความสะอาดข้อมูลทั้งหมด
        why: ต้องรู้คำถามก่อน จึงจะรู้ว่าต้องทำความสะอาดคอลัมน์ไหนบ้าง
  - id: q2
    question: หัวหน้าบอกว่า "ยอดขายไม่ดี ช่วยดูหน่อย" ควรถามกลับเรื่องไหนก่อน
    choices:
      - text: เทียบกับช่วงไหน และหมายถึงจำนวนออเดอร์หรือรายได้
        correct: true
        why: ได้ช่วงเวลาและตัวชี้วัดชัดเจน ทำให้คำถามวิเคราะห์ได้
      - text: ควรใช้ Power BI หรือ Tableau
        why: เลือกเครื่องมือทีหลังได้ ยังไม่ช่วยให้คำถามชัดขึ้น
      - text: ขอข้อมูลทั้งหมดของบริษัทได้ไหม
        why: ข้อมูลทั้งหมดเยอะเกินจำเป็น และยังไม่รู้ว่าต้องดูอะไร
      - text: ควรเขียนด้วย Python หรือ SQL
        why: เป็นเรื่องวิธีทำ ไม่ได้ช่วยให้รู้ว่าต้องตอบอะไร
  - id: q3
    question: ถ้ากดดูเฉลยก่อนทำข้อนั้นผ่าน เว็บจะบันทึกข้อนั้นว่าอะไรเมื่อทำผ่าน
    choices:
      - text: ผ่านด้วยเฉลย
        correct: true
        why: แยกไว้ให้รู้ว่าข้อไหนควรกลับมาทำเองอีกรอบ
      - text: ผ่านเอง
        why: ผ่านเองใช้กับข้อที่ทำได้โดยไม่ดูเฉลย
      - text: ไม่ผ่าน
        why: ยังนับว่าผ่าน แต่ติดป้ายว่าใช้เฉลยช่วย
      - text: ข้อนั้นจะถูกลบ
        why: ไม่มีข้อไหนถูกลบ

summary:
  - งานวิเคราะห์มี 5 ขั้น — ตั้งคำถาม หาข้อมูล ทำความสะอาด วิเคราะห์ และสื่อสาร
  - คำถามที่ดีระบุช่วงเวลา ตัวชี้วัด และสิ่งที่จะเปรียบเทียบ
  - คำถามเดียวกันตอบได้ทั้ง SQL และ pandas งานจริงมักใช้ทั้งสองอย่างคู่กัน

interview:
  - id: i1
    q: เล่าขั้นตอนการวิเคราะห์ข้อมูลที่คุณเคยทำให้ฟังหน่อย
    a: |
      ตอบตาม 5 ขั้น โดยยกโปรเจกต์จริงหนึ่งงาน เช่น Capstone ของสายนี้
      เริ่มจากคำถามธุรกิจที่ได้รับ แล้วเล่าว่าเปลี่ยนเป็นคำถามที่วิเคราะห์ได้ยังไง ใช้ข้อมูลอะไร
      เจอปัญหาข้อมูลสกปรกแบบไหนและแก้ยังไง ใช้วิธีวิเคราะห์อะไร และสุดท้ายผลนำไปสู่การตัดสินใจอะไร
      ผู้สัมภาษณ์อยากเห็นวิธีคิด ไม่ใช่แค่รายชื่อเครื่องมือ

flashcards:
  - id: c1
    front: 5 ขั้นของงานวิเคราะห์
    back: ตั้งคำถาม → หาข้อมูล → ทำความสะอาด → วิเคราะห์ → สื่อสาร
  - id: c2
    front: คำถามที่วิเคราะห์ได้ต้องระบุอะไรบ้าง
    back: ช่วงเวลา ตัวชี้วัด และสิ่งที่จะเปรียบเทียบ
```

- [ ] **Step 2: Run the content tests**

Run: `npm run test:content`
Expected: all PASS, including `x1: โค้ดทุกขั้นของตัวอย่างรันได้` and 4 tasks × 2 checks for this lesson. If `e3` fails on ordering because two payment methods tie, the dataset has a tie. Add `payment_method` as a tie-breaker (`ORDER BY n_orders DESC, payment_method`) in both the solution and the prompt.

- [ ] **Step 3: Verify in the browser**

On `/da/start/02-workflow-and-tools/`:
1. The worked example shows step 1 only. "ขั้นต่อไป" reveals steps 2 and 3, then the ⚠ pitfall box with its runner.
2. The faded example: fill `payment_method` and check. Expect ✓.
3. The pager shows "← Data Analyst ทำอะไร". Lesson 1's pager shows "ขั้นตอนการวิเคราะห์ และวิธีใช้เว็บนี้ →".
4. Screenshot the worked example fully expanded.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "content: add lesson 2 on the analysis workflow and how to use the site"
```

---

### Task 14: E2E smoke test and README

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `README.md`

**Interfaces:**
- Consumes: exercise `da/start/02-workflow-and-tools/e1` (Task 13), `[data-exercise-id]` and `[data-status]` attributes (Task 10)

- [ ] **Step 1: Ask before downloading Chromium**

Playwright needs its own Chromium build (about 150 MB, from Playwright's CDN). Ask the user in chat before running `npx playwright install chromium`. If they decline, skip Steps 3–4 and say so in the final report.

- [ ] **Step 2: Write the config and test**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

```ts
// e2e/smoke.spec.ts
import { expect, test } from '@playwright/test';

const LESSON = '/da/start/02-workflow-and-tools/';

test('ทำแบบฝึก SQL ผ่านแล้วความคืบหน้าถูกบันทึกหลัง reload', async ({ page }) => {
  await page.goto(LESSON);
  const ex = page.locator('[data-exercise-id="da/start/02-workflow-and-tools/e1"]');
  await ex.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('SELECT COUNT(*) AS n_orders FROM orders');
  await ex.getByRole('button', { name: 'ตรวจคำตอบ' }).click();
  await expect(ex.getByRole('status')).toContainText('ถูกต้อง', { timeout: 60_000 });
  await expect(ex.locator('[data-status="self"]')).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-exercise-id="da/start/02-workflow-and-tools/e1"] [data-status="self"]')).toBeVisible();
});

test('Python runner โหลด Pyodide และแสดงตารางผลลัพธ์', async ({ page }) => {
  await page.goto(LESSON);
  const runner = page.locator('.prose .runner').nth(1);
  await runner.getByRole('button', { name: '▶ Run' }).click();
  await expect(runner.locator('table')).toBeVisible({ timeout: 90_000 });
  await expect(runner.locator('th').first()).toHaveText('payment_method');
});
```

- [ ] **Step 3: Run the E2E tests**

Run: `npx playwright install chromium && npm run e2e`
Expected: 2 passed. The Pyodide CDN and jsdelivr must be reachable.

- [ ] **Step 4: Write `README.md`**

````markdown
# Data Career Lab

เว็บเรียนส่วนตัวสาย Data Analyst → ML → AI Engineer: อ่าน ดูตัวอย่าง แล้วเขียน SQL/Python จริงในเบราว์เซอร์

## คำสั่ง

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | เปิด dev server ที่ http://localhost:4321 |
| `npm run build` | build เว็บ static ลง `dist/` (ตรวจ frontmatter ให้ด้วย) |
| `npm test` | unit test + content test ทั้งหมด |
| `npm run test:content` | รันแบบฝึกทุกข้อ: เฉลยต้องผ่าน และโค้ดเริ่มต้นต้องไม่ผ่าน |
| `npm run e2e` | Playwright smoke test |
| `npm run data` | สร้าง dataset ใหม่ (ผลเหมือนเดิมทุกครั้ง) |

## เพิ่มบทเรียน

1. `src/content/lessons/da/<module>/<nn-slug>.mdx` — เนื้อหาและ `<Runner client:visible lang="sql|python" code={...} />`
2. `src/content/lesson-data/da/<module>/<nn-slug>.yaml` — goals, examples, faded, exercises, quiz, summary, interview, flashcards
3. โจทย์ Python ต้องมี `check` (เช่น `check_df(result, _sol["result"])`) ส่วนโจทย์ SQL ระบบจะเทียบกับ `solution` เอง
4. รัน `npm run test:content` จนผ่าน

สเปกและแผนอยู่ใน `docs/`
````

- [ ] **Step 5: Final full check and commit**

Run: `npm test && npm run build`
Expected: all tests pass and the build succeeds.

```bash
git add -A
git commit -m "test: add Playwright smoke test and README"
```

---

## Execution notes (fill in while executing)

Record anything that differed from this plan here, e.g. API changes in Astro 7 content loaders, a zod import workaround, or dataset constants that had to change. Plan 2 reads these notes first.

- Work happens on branch `feat/plan-1`, not directly on `main`.
- Task 1:
  - `npm install` warns that esbuild's postinstall was skipped (`allowScripts`). The build still works, so no approval was given.
  - Header links wrapped mid-word at 375px, so `global.css` gained `white-space: nowrap` on `.site-header a` plus a `max-width: 480px` rule that tightens the gap.
  - The `.claude/launch.json` preview entry (Task 9 Step 3) was added early, in Task 1.
- Task 2: the plan's DECIMAL test query was missing `FROM people`. Fixed in both the test and the plan.
- Task 3: generated counts were 3,300 customers, 120 products, 6,938 orders, 12,183 order_items and 55,900 events. The largest file is `events.csv` at 2.9 MB. All planted patterns held with `SEED = 161`, so no constants changed.
- Task 4 (and later tasks): files were extracted verbatim from this plan with a small script, so the red TDD step happened only where the test file was written first (Tasks 5–8, 12).
- Task 8:
  - After adding `content.config.ts`, the running dev server had to be restarted to see the collections.
  - The build warns "collection practice is empty", which is expected until Plan 2.
  - The build also emits a harmless rolldown `MODULE_LEVEL_DIRECTIVE` warning from Astro's MDX pipeline.
- Tasks 9–10: narrow-screen fixes in `global.css`:
  - the mobile lesson grid uses `minmax(0, 1fr)`, since a bare `1fr` let wide tables stretch the page
  - result-table cells use `nowrap`
  - inline code uses `overflow-wrap: anywhere`
  - `.brand` truncates with an ellipsis and the header nav has `flex: none`
- Dev-server gotchas when verifying in the browser pane:
  - Vite re-optimizes deps (504 "Outdated Optimize Dep") after new imports. If islands stop hydrating, clear `node_modules/.vite` and restart.
  - JS `scrollIntoView` does not trigger `client:visible` in the pane. Use a real scroll.
- Task 14:
  - Chromium v1243 was already cached, so nothing was downloaded.
  - `astro preview` (Astro 7) detaches into a background daemon when it has no TTY, which Playwright reports as "webServer exited early". The Playwright config now serves `dist/` with `python3 -m http.server 4321 --directory dist`.
  - The E2E tests scroll each island into view before interacting, because of `client:visible`.
  - Stop stray previews with `npx astro preview stop`.

## Self-review record

- **Spec coverage.** Every spec item maps to a task:
  - §2 architecture → Tasks 1, 7, 8
  - runners → 7, 9
  - dataset → 3
  - §3 DA curriculum: Module 0 here; Modules 1–6 in Plans 2, 4–6
  - §4 lesson format → 5, 8, 10
  - SQL/Python checking → 2, 4
  - hints/solution flag → 10
  - completion rule → 6
  - drafts → 6, 10
  - flashcards: data captured in YAML here, the `/review` page in Plan 3
  - progress export → 6, 11
  - §5 pages: `/`, `/da/…`, `/settings` here; `/practice`, `/review`, `/interview` in Plan 3
  - §6 errors → 2, 4, 6, 7, 9, 11
  - §7 tests → 2–6, 12, 14
- **Clarifications of the spec made here:**
  - Module 0 is exempt from the ratio rules (`intro: true`).
  - A corrupt progress value is backed up and replaced (the store stays persistent). Only unavailable storage falls back to memory.
  - Numeric tolerance is relative with a floor of 1.
  - Drill/review/interview pages move to Plan 3.
- **Type consistency.** These names are checked across tasks: `TaskView.check: string | null` → `Checkable.check?: string | null`; `ExerciseRef`; `LessonRef`/`ModuleRef` in `refs.ts`; `useProgress(): Store | null`; `checkSql(conn, user, solution, { ordered })`.
