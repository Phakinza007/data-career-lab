import type { RunResult, TableData } from '../lib/runtime/types';

function ResultTable({ table }: { table: TableData }) {
  if (table.columns.length === 0) return <p className="muted">รันสำเร็จ (คำสั่งนี้ไม่มีผลลัพธ์เป็นตาราง)</p>;
  const caption = table.totalRows > table.rows.length ? `แสดง ${table.rows.length} จาก ${table.totalRows.toLocaleString()} แถว` : `${table.totalRows.toLocaleString()} แถว`;
  return (
    <div className="table-wrap">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>{table.columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => <td key={c}>{cell === null ? <span className="null">NULL</span> : String(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Output({ result }: { result: RunResult }) {
  const empty = result.ok && !result.stdout && !result.table && !result.text && result.images.length === 0;
  return (
    <div className="output" aria-live="polite">
      {result.stdout && <pre>{result.stdout}</pre>}
      {result.error && <pre className="out-error" role="alert">{result.error}</pre>}
      {result.table && <ResultTable table={result.table} />}
      {result.text && <pre>{result.text}</pre>}
      {result.images.map((b64, i) => <img key={i} src={`data:image/png;base64,${b64}`} alt={`กราฟที่ ${i + 1}`} />)}
      {empty && <p className="muted">รันสำเร็จ (ไม่มีผลลัพธ์ให้แสดง)</p>}
    </div>
  );
}
