import { useState } from 'react';
import type { Lang } from '../lib/kinds';
import { reset, run } from '../lib/runtime';
import { messageOf } from '../lib/runtime/timeout';
import type { RunResult } from '../lib/runtime/types';
import CodeEditor from './CodeEditor';
import Output from './Output';
import { LoadError, RunStatus } from './RunStatus';

interface Props {
  lang: Lang;
  code: string;
  title?: string;
}

/** ช่องลองเล่นโค้ด — ไม่ถูกตรวจ ไม่บันทึกความคืบหน้า */
export default function Runner({ lang, code: initial, title }: Props) {
  const start = initial.trim();
  const [code, setCode] = useState(start);
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function onRun() {
    setBusy(true);
    setLoadError(null);
    try {
      setResult(await run(lang, code));
    } catch (err) {
      setLoadError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setCode(start);
    setResult(null);
    await reset(lang).catch(() => {});
  }

  return (
    <div className="runner">
      {title && <div className="runner-title">{title}</div>}
      <CodeEditor lang={lang} value={code} onChange={setCode} onRun={onRun} label={`ช่องเขียนโค้ด ${lang === 'sql' ? 'SQL' : 'Python'}`} />
      <div className="runner-bar">
        <button type="button" className="primary" onClick={onRun} disabled={busy}>{busy ? 'กำลังรัน…' : '▶ Run'}</button>
        <button type="button" className="ghost" onClick={onReset} disabled={busy} title="คืนโค้ดตั้งต้น และล้างตัวแปร/ตารางที่แก้ไว้">Reset</button>
        <RunStatus busy={busy} lang={lang} />
        <span className="lang-tag">{lang === 'sql' ? 'SQL' : 'Python'}</span>
      </div>
      {loadError && <LoadError message={loadError} onRetry={onRun} />}
      {result && <Output result={result} />}
    </div>
  );
}
