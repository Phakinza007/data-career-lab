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
