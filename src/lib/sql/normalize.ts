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
