export const DATASET_TABLES = ['customers', 'products', 'orders', 'order_items', 'events'] as const;
export type DatasetTable = (typeof DATASET_TABLES)[number];

/** ไฟล์ใน public/data ทั้งหมด — ฝั่ง Python เปิดได้ที่ data/<ไฟล์> */
export const DATA_FILES: string[] = [...DATASET_TABLES.map((t) => `${t}.csv`), 'raw/customers_raw.csv', 'ml_customers.csv'];

/** SQL สร้างตารางจากไฟล์ที่ลงทะเบียนไว้ในชื่อ <table>.csv */
export function setupStatements(): string[] {
  return DATASET_TABLES.map((t) => `CREATE OR REPLACE TABLE ${t} AS SELECT * FROM read_csv_auto('${t}.csv', header = true)`);
}
