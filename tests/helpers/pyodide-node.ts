import { loadPyodide } from 'pyodide';
import { bootPython, type PyodideLike, type PythonApi } from '../../src/lib/python/boot';

export async function createNodePython(files: Record<string, string> = {}): Promise<PythonApi> {
  const py = await loadPyodide();
  return bootPython(py as unknown as PyodideLike, files);
}
