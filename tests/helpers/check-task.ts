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
