import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DATA_FILES } from '../../src/lib/dataset';

export function readDatasetFiles(): Record<string, string> {
  return Object.fromEntries(DATA_FILES.map((f) => [f, readFileSync(path.resolve('public/data', f), 'utf8')]));
}
