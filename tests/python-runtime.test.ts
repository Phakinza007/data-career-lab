import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PythonApi } from '../src/lib/python/boot';
import { createNodePython } from './helpers/pyodide-node';

let py: PythonApi;
beforeAll(async () => {
  py = await createNodePython({ 'tiny.csv': 'city,amount\nBangkok,10\nPhuket,5\nBangkok,7\n' });
});
beforeEach(() => py.reset());

const READ = 'import pandas as pd\ndf = pd.read_csv("data/tiny.csv")\n';

describe('run', () => {
  it('captures print output', () => {
    expect(py.run('print("สวัสดี")').stdout).toBe('สวัสดี\n');
  });
  it('returns the repr of a last-line expression', () => {
    expect(py.run('1 + 2').text).toBe('3');
  });
  it('keeps variables between runs until reset', () => {
    py.run('x = 41');
    expect(py.run('x + 1').text).toBe('42');
    py.reset();
    expect(py.run('x').ok).toBe(false);
  });
  it('renders a DataFrame and moves a named index into columns', () => {
    const r = py.run(`${READ}df.groupby("city")["amount"].sum()`);
    expect(r.table).toEqual({ columns: ['city', 'amount'], rows: [['Bangkok', 17], ['Phuket', 5]], totalRows: 2 });
  });
  it('limits tables to 20 rows', () => {
    const r = py.run('import pandas as pd\npd.DataFrame({"n": range(50)})');
    expect(r.table?.rows).toHaveLength(20);
    expect(r.table?.totalRows).toBe(50);
  });
  it('converts NaN to null', () => {
    expect(py.run('import pandas as pd\npd.DataFrame({"x": [1.0, None]})').table?.rows).toEqual([[1], [null]]);
  });
  it('reports errors with the user line only', () => {
    const r = py.run('a = 1\nb = a / 0');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('บรรทัด 2: b = a / 0\nZeroDivisionError: division by zero');
  });
  it('reports syntax errors with the line number', () => {
    const r = py.run('if True print(1)');
    expect(r.error).toContain('บรรทัด 1');
    expect(r.error).toContain('SyntaxError');
  });
  it('returns matplotlib figures as PNG and hides the artist repr', () => {
    const r = py.run('import matplotlib.pyplot as plt\nplt.plot([1, 2, 3])');
    expect(r.images).toHaveLength(1);
    expect(r.images[0].startsWith('iVBOR')).toBe(true);
    expect(r.text).toBeNull();
  });
});

describe('check', () => {
  const solution = `${READ}result = df.groupby("city", as_index=False)["amount"].sum()`;
  const check = 'check_df(result, _sol["result"])';
  it('passes the solution', () => {
    expect(py.check(solution, check, solution).passed).toBe(true);
  });
  it('accepts an equivalent answer with the group as index', () => {
    const alt = `${READ}result = df.groupby("city")["amount"].sum().to_frame()`;
    expect(py.check(alt, check, solution).passed).toBe(true);
  });
  it('fails when the learner code errors', () => {
    const r = py.check('result = ___', check, solution);
    expect(r.passed).toBe(false);
    expect(r.message).toContain('โค้ดของคุณ error');
  });
  it('fails when the expected variable is missing', () => {
    expect(py.check('x = 1', check, solution).message).toContain('ยังไม่มีตัวแปร result');
  });
  it('explains wrong values by column', () => {
    const wrong = `${READ}result = df.groupby("city", as_index=False)["amount"].mean()`;
    expect(py.check(wrong, check, solution).message).toContain("'amount'");
  });
  it('check_value compares numbers with tolerance and hides the answer', () => {
    expect(py.check('x = 0.1 + 0.2', 'check_value(x, 0.3, name="x")', 'x = 0.3').passed).toBe(true);
    expect(py.check('x = 1', 'check_value(x, _sol["x"], name="x")', 'x = 2').message).toBe('x ยังไม่ถูก: ตอนนี้ได้ 1');
  });
  it('check_series ignores the series name', () => {
    const user = `${READ}s = df["city"].value_counts()`;
    const sol = `${READ}s = df.groupby("city").size()`;
    expect(py.check(user, 'check_series(s, _sol["s"])', sol).passed).toBe(true);
  });
  it('ordered checks explain order problems', () => {
    const sol = `${READ}result = df.sort_values("amount", ascending=False)`;
    const user = `${READ}result = df.sort_values("amount")`;
    expect(py.check(user, 'check_df(result, _sol["result"], ordered=True)', sol).message).toContain('ลำดับ');
  });
});
