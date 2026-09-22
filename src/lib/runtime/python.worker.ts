/// <reference lib="webworker" />
import { bootPython, PYODIDE_CDN, type PyodideLike, type PythonApi } from '../python/boot';
import { DATA_FILES } from '../dataset';

type Request =
  | { id: number; type: 'init'; baseUrl: string }
  | { id: number; type: 'run'; code: string }
  | { id: number; type: 'check'; code: string; check: string; solution: string }
  | { id: number; type: 'reset' };

let api: PythonApi | null = null;

async function init(baseUrl: string) {
  const { loadPyodide } = await import(/* @vite-ignore */ `${PYODIDE_CDN}pyodide.mjs`);
  const py = (await loadPyodide({ indexURL: PYODIDE_CDN })) as PyodideLike;
  const files: Record<string, string> = {};
  await Promise.all(
    DATA_FILES.map(async (f) => {
      const res = await fetch(`${baseUrl}data/${f}`);
      if (!res.ok) throw new Error(`โหลดไฟล์ ${f} ไม่ได้ (HTTP ${res.status})`);
      files[f] = await res.text();
    }),
  );
  api = await bootPython(py, files);
}

self.onmessage = async (e: MessageEvent<Request>) => {
  const msg = e.data;
  try {
    let result: unknown = null;
    if (msg.type === 'init') await init(msg.baseUrl);
    else if (!api) throw new Error('Python ยังไม่พร้อม');
    else if (msg.type === 'run') result = api.run(msg.code);
    else if (msg.type === 'check') result = api.check(msg.code, msg.check, msg.solution);
    else if (msg.type === 'reset') api.reset();
    self.postMessage({ id: msg.id, ok: true, result });
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
