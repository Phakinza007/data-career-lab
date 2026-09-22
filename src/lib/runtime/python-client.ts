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
