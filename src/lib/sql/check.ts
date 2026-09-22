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
