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
