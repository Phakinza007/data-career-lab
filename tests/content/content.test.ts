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
