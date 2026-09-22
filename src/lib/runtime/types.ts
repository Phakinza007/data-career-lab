export type Cell = string | number | boolean | null;

export interface TableData {
  columns: string[];
  rows: Cell[][];
  /** จำนวนแถวทั้งหมดก่อนตัด (rows อาจถูกตัดเหลือ 20 แถวเพื่อแสดงผล) */
  totalRows: number;
}

export interface RunResult {
  ok: boolean;
  stdout: string;
  error: string | null;
  table: TableData | null;
  /** PNG แบบ base64 (ไม่มี prefix data:) */
  images: string[];
  /** repr ของค่าบรรทัดสุดท้ายเมื่อไม่ใช่ตาราง */
  text: string | null;
  timedOut?: boolean;
}

export interface CheckResult {
  passed: boolean;
  message: string;
  run?: RunResult;
}
