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
