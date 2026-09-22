import { readFileSync, statSync } from 'node:fs';
import { beforeAll, expect, it } from 'vitest';
import { DATA_FILES } from '../src/lib/dataset';
import { arrowToTable, type ArrowTableLike } from '../src/lib/sql/normalize';
import type { Cell } from '../src/lib/runtime/types';
import { createDatasetDuck, type NodeDuck } from './helpers/duckdb-node';

let duck: NodeDuck;
const rows = (sql: string): Cell[][] => arrowToTable(duck.query(sql) as ArrowTableLike).rows;
const one = (sql: string) => rows(sql)[0][0] as number;

beforeAll(async () => {
  duck = await createDatasetDuck();
});

it('ทุกไฟล์ไม่เกิน 5MB', () => {
  for (const f of DATA_FILES) expect(statSync(`public/data/${f}`).size, f).toBeLessThan(5 * 1024 * 1024);
});

it('จำนวนแถวอยู่ในช่วงที่ออกแบบไว้', () => {
  expect(one('SELECT COUNT(*) FROM customers')).toBe(3300);
  expect(one('SELECT COUNT(*) FROM products')).toBe(120);
  const orders = one('SELECT COUNT(*) FROM orders');
  expect(orders).toBeGreaterThan(5000);
  expect(orders).toBeLessThan(15000);
  expect(one('SELECT COUNT(DISTINCT session_id) FROM events')).toBe(28000);
});

it('ความสัมพันธ์ระหว่างตารางถูกต้อง', () => {
  expect(one('SELECT COUNT(*) FROM orders o LEFT JOIN customers c USING (customer_id) WHERE c.customer_id IS NULL')).toBe(0);
  expect(one('SELECT COUNT(*) FROM order_items i LEFT JOIN products p USING (product_id) WHERE p.product_id IS NULL')).toBe(0);
  expect(one('SELECT COUNT(*) FROM order_items i LEFT JOIN orders o USING (order_id) WHERE o.order_id IS NULL')).toBe(0);
  expect(one('SELECT COUNT(*) FROM orders o JOIN customers c USING (customer_id) WHERE o.order_date < c.signup_date')).toBe(0);
  expect(one("SELECT COUNT(*) FROM orders WHERE order_date NOT BETWEEN DATE '2024-01-01' AND DATE '2025-12-31'")).toBe(0);
});

it('ออเดอร์ พ.ย.–ธ.ค. สูงกว่าเดือน มี.ค.–ต.ค. ของปีเดียวกันอย่างน้อย 1.3 เท่า', () => {
  const ratios = rows(`
    WITH m AS (SELECT year(order_date) AS y, month(order_date) AS mo, COUNT(*) AS n FROM orders GROUP BY ALL)
    SELECT y, AVG(n) FILTER (WHERE mo IN (11, 12)) / AVG(n) FILTER (WHERE mo BETWEEN 3 AND 10) AS ratio
    FROM m GROUP BY y ORDER BY y`);
  expect(ratios).toHaveLength(2);
  for (const [year, ratio] of ratios) expect(ratio as number, `ปี ${year}`).toBeGreaterThan(1.3);
});

it('A/B test: กลุ่ม B ซื้อมากกว่า A อย่างมีนัยสำคัญ (z > 1.96)', () => {
  const r = rows(`
    SELECT variant, COUNT(DISTINCT session_id) AS n,
           COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'purchase') AS buyers
    FROM events WHERE variant IS NOT NULL GROUP BY variant ORDER BY variant`) as [string, number, number][];
  const [[, nA, bA], [, nB, bB]] = r;
  const pA = bA / nA;
  const pB = bB / nB;
  const p = (bA + bB) / (nA + nB);
  const z = (pB - pA) / Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
  expect(pB).toBeGreaterThan(pA);
  expect(z).toBeGreaterThan(1.96);
});

it('cohort มิ.ย. 2025 กลับมาซื้อซ้ำน้อยกว่าเดือนข้างเคียงชัดเจน', () => {
  const r = rows(`
    WITH c AS (SELECT customer_id, strftime(signup_date, '%Y-%m') AS cohort FROM customers),
         k AS (SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY customer_id)
    SELECT cohort, AVG(CASE WHEN COALESCE(k.n, 0) >= 2 THEN 1 ELSE 0 END) AS repeat_rate
    FROM c LEFT JOIN k USING (customer_id)
    WHERE cohort IN ('2025-05', '2025-06', '2025-07')
    GROUP BY cohort ORDER BY cohort`) as [string, number][];
  const rate = Object.fromEntries(r);
  expect(rate['2025-06']).toBeLessThan((0.7 * (rate['2025-05'] + rate['2025-07'])) / 2);
});

it('customers_raw มีข้อมูลสกปรกครบตามที่บท cleaning ใช้', () => {
  const lines = readFileSync('public/data/raw/customers_raw.csv', 'utf8').trim().split('\n').slice(1);
  const cols = lines.map((l) => l.split(','));
  expect(new Set(lines).size).toBeLessThan(lines.length);
  expect(cols.some((c) => c[1] === '')).toBe(true);
  expect(cols.some((c) => c[2] === '')).toBe(true);
  expect(cols.some((c) => c[2] !== '' && (c[2] !== c[2].trim() || c[2] === c[2].toUpperCase()))).toBe(true);
  expect(cols.some((c) => /^\d{2}\/\d{2}\/\d{4}$/.test(c[3]))).toBe(true);
  expect(cols.some((c) => /^\d{4}\/\d{2}\/\d{2}$/.test(c[3]))).toBe(true);
});
