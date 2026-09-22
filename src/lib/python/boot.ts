import runtimeSrc from './runtime.py?raw';
import checkersSrc from './checkers.py?raw';
import type { CheckResult, RunResult } from '../runtime/types';

export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const PY_PACKAGES = ['pandas', 'matplotlib'];
const HOME = '/home/pyodide';

export interface PyodideLike {
  loadPackage(names: string[], options?: { messageCallback?: (msg: string) => void }): Promise<unknown>;
  runPython(code: string): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pyimport(name: string): any;
  FS: { mkdirTree(path: string): void; writeFile(path: string, data: string | Uint8Array): void };
}

export interface PythonApi {
  run(code: string): RunResult;
  check(code: string, check: string, solution: string): CheckResult;
  reset(): void;
}

/** ติดตั้งแพ็กเกจ, runtime.py/checkers.py และไฟล์ข้อมูล (ที่ data/<ชื่อไฟล์>) ลงใน Pyodide */
export async function bootPython(py: PyodideLike, files: Record<string, string>): Promise<PythonApi> {
  await py.loadPackage(PY_PACKAGES, { messageCallback: () => {} });
  py.FS.mkdirTree(`${HOME}/pylib`);
  py.FS.writeFile(`${HOME}/pylib/runtime.py`, runtimeSrc);
  py.FS.writeFile(`${HOME}/pylib/checkers.py`, checkersSrc);
  for (const [name, content] of Object.entries(files)) {
    const full = `${HOME}/data/${name}`;
    py.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
    py.FS.writeFile(full, content);
  }
  py.runPython(`import os, sys\nos.chdir("${HOME}")\nsys.path.insert(0, "${HOME}/pylib")`);
  const mod = py.pyimport('runtime');
  return {
    run: (code) => JSON.parse(mod.run_user(code)) as RunResult,
    check: (code, check, solution) => JSON.parse(mod.check_exercise(code, check, solution)) as CheckResult,
    reset: () => {
      mod.reset_session();
    },
  };
}
