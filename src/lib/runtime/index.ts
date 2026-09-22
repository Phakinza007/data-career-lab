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
