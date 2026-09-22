import { createRequire } from 'node:module';
import path from 'node:path';
import { DATASET_TABLES, setupStatements } from '../../src/lib/dataset';
import { readDatasetFiles } from './dataset-files';

const require = createRequire(import.meta.url);
const ENTRY = '@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const duckdb = require(ENTRY) as any;
const DIST = path.dirname(require.resolve(ENTRY));

export interface NodeDuck {
  query(sql: string): unknown;
  registerFileText(name: string, text: string): void;
}

/** DuckDB-wasm ตัวเดียวกับบนเว็บ แต่รันแบบ blocking ใน Node */
export async function createNodeDuck(files: Record<string, string> = {}): Promise<NodeDuck> {
  const db = await duckdb.createDuckDB(
    {
      mvp: { mainModule: path.join(DIST, 'duckdb-mvp.wasm'), mainWorker: path.join(DIST, 'duckdb-node-mvp.worker.cjs') },
      eh: { mainModule: path.join(DIST, 'duckdb-eh.wasm'), mainWorker: path.join(DIST, 'duckdb-node-eh.worker.cjs') },
    },
    new duckdb.VoidLogger(),
    duckdb.NODE_RUNTIME,
  );
  await db.instantiate();
  for (const [name, text] of Object.entries(files)) db.registerFileText(name, text);
  const conn = db.connect();
  return {
    query: (sql) => conn.query(sql),
    registerFileText: (name, text) => db.registerFileText(name, text),
  };
}

/** DuckDB ที่มีตาราง dataset ครบเหมือนบนเว็บ */
export async function createDatasetDuck(): Promise<NodeDuck> {
  const all = readDatasetFiles();
  const files = Object.fromEntries(DATASET_TABLES.map((t) => [`${t}.csv`, all[`${t}.csv`]]));
  const duck = await createNodeDuck(files);
  for (const sql of setupStatements()) duck.query(sql);
  return duck;
}
