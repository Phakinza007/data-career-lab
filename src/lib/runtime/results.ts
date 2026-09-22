import type { RunResult } from './types';

export function errorRun(message: string, timedOut = false): RunResult {
  return { ok: false, stdout: '', error: message, table: null, images: [], text: null, ...(timedOut ? { timedOut } : {}) };
}
