import { beforeAll, describe, expect, it } from 'vitest';
import { arrowToTable, type ArrowTableLike } from '../src/lib/sql/normalize';
import { compareTables } from '../src/lib/sql/compare';
import { checkSql } from '../src/lib/sql/check';
import type { TableData } from '../src/lib/runtime/types';
import { createNodeDuck, type NodeDuck } from './helpers/duckdb-node';

let duck: NodeDuck;
const q = (sql: string) => arrowToTable(duck.query(sql) as ArrowTableLike);

beforeAll(async () => {
  duck = await createNodeDuck({ 'people.csv': 'id,name,city,score\n1,Ann,Bangkok,10.5\n2,Bo,Phuket,\n3,Cy,Bangkok,7\n' });
  duck.query("CREATE TABLE people AS SELECT * FROM read_csv_auto('people.csv')");
});

describe('arrowToTable', () => {
  it('converts basic types and NULL', () => {
    expect(q('SELECT id, name, score FROM people ORDER BY id')).toEqual({
      columns: ['id', 'name', 'score'],
      rows: [[1, 'Ann', 10.5], [2, 'Bo', null], [3, 'Cy', 7]],
      totalRows: 3,
    });
  });
  it('scales DECIMAL and HUGEINT (from SUM) to plain numbers', () => {
    expect(q('SELECT SUM(id) AS s, CAST(-1.25 AS DECIMAL(10,2)) AS d FROM people').rows).toEqual([[6, -1.25]]);
  });
  it('formats DATE and TIMESTAMP as strings', () => {
    expect(q("SELECT DATE '2025-01-02' AS d, TIMESTAMP '2025-01-02 03:04:05' AS t").rows).toEqual([
      ['2025-01-02', '2025-01-02 03:04:05'],
    ]);
  });
  it('limits rows but keeps totalRows', () => {
    const t = arrowToTable(duck.query('SELECT * FROM range(50)') as ArrowTableLike, 20);
    expect(t.rows).toHaveLength(20);
    expect(t.totalRows).toBe(50);
  });
});

const T = (columns: string[], rows: TableData['rows']): TableData => ({ columns, rows, totalRows: rows.length });

describe('compareTables', () => {
  const expected = T(['city', 'n'], [['Bangkok', 2], ['Phuket', 1]]);
  it('ignores row order by default', () => {
    expect(compareTables(T(['city', 'n'], [['Phuket', 1], ['Bangkok', 2]]), expected).passed).toBe(true);
  });
  it('ignores column names', () => {
    expect(compareTables(T(['c', 'total'], [['Bangkok', 2], ['Phuket', 1]]), expected).passed).toBe(true);
  });
  it('explains a wrong order when ordered is required', () => {
    const r = compareTables(T(['city', 'n'], [['Phuket', 1], ['Bangkok', 2]]), expected, { ordered: true });
    expect(r.passed).toBe(false);
    expect(r.message).toContain('ORDER BY');
  });
  it('reports column count mismatch', () => {
    const r = compareTables(T(['city'], [['Bangkok'], ['Phuket']]), expected);
    expect(r.message).toContain('จำนวนคอลัมน์ไม่ตรง');
  });
  it('reports row count mismatch', () => {
    const r = compareTables(T(['city', 'n'], [['Bangkok', 2]]), expected);
    expect(r.message).toBe('จำนวนแถวไม่ตรง: ได้ 1 แถว แต่ควรได้ 2 แถว');
  });
  it('shows the first differing row', () => {
    const r = compareTables(T(['city', 'n'], [['Bangkok', 3], ['Phuket', 1]]), expected, { ordered: true });
    expect(r.message).toBe("แถวที่ 1 ไม่ตรง: ได้ ('Bangkok', 3) แต่ควรเป็น ('Bangkok', 2)");
  });
  it('uses a relative float tolerance and treats NULL = NULL', () => {
    expect(compareTables(T(['x'], [[0.1 + 0.2]]), T(['x'], [[0.3]])).passed).toBe(true);
    expect(compareTables(T(['x'], [[1.0]]), T(['x'], [[1.001]])).passed).toBe(false);
    expect(compareTables(T(['x'], [[null]]), T(['x'], [[null]])).passed).toBe(true);
    expect(compareTables(T(['x'], [[0]]), T(['x'], [[null]])).passed).toBe(false);
  });
});

describe('checkSql', () => {
  const solution = 'SELECT city, COUNT(*) AS n FROM people GROUP BY city';
  it('passes an equivalent answer and returns the run table', async () => {
    const r = await checkSql(duck, 'SELECT city, COUNT(id) FROM people GROUP BY 1', solution);
    expect(r.passed).toBe(true);
    expect(r.run?.table?.totalRows).toBe(2);
  });
  it('reports SQL errors', async () => {
    const r = await checkSql(duck, 'SELECT nope FROM people', solution);
    expect(r.passed).toBe(false);
    expect(r.message).toContain('SQL error');
  });
  it('rejects an empty answer', async () => {
    expect((await checkSql(duck, '   ', solution)).message).toBe('ยังไม่ได้เขียน SQL');
  });
  it('rolls back changes made by the answer', async () => {
    await checkSql(duck, 'DROP TABLE people', solution);
    expect(q('SELECT COUNT(*) FROM people').rows).toEqual([[3]]);
  });
});
