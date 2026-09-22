import { useEffect, useState } from 'react';
import { LEVEL_LABELS } from '../lib/kinds';
import type { TaskView } from '../lib/content/views';
import type { ExerciseStatus } from '../lib/progress/store';
import { useProgress } from '../lib/progress/useProgress';
import { check, run } from '../lib/runtime';
import { messageOf } from '../lib/runtime/timeout';
import type { RunResult } from '../lib/runtime/types';
import CodeEditor from './CodeEditor';
import Output from './Output';
import { LoadError, RunStatus } from './RunStatus';

const STATUS_LABEL: Record<ExerciseStatus, string> = {
  none: 'ยังไม่ได้ทำ',
  failed: 'ยังไม่ผ่าน',
  self: 'ผ่านเอง',
  'with-solution': 'ผ่านด้วยเฉลย',
};

export default function Exercise({ task }: { task: TaskView }) {
  const store = useProgress();
  const [code, setCode] = useState(task.starter);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState<'run' | 'check' | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [verdict, setVerdict] = useState<{ passed: boolean; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const status: ExerciseStatus = store?.exercise(task.gid).status ?? 'none';

  // โหลดโค้ดที่พิมพ์ค้างไว้ครั้งเดียวหลัง hydrate
  useEffect(() => {
    if (!store || draftLoaded) return;
    const draft = store.draft(task.gid);
    if (draft !== null) setCode(draft);
    setDraftLoaded(true);
  }, [store, draftLoaded, task.gid]);

  useEffect(() => {
    if (!store || !draftLoaded) return;
    const t = setTimeout(() => store.saveDraft(task.gid, code === task.starter ? null : code), 500);
    return () => clearTimeout(t);
  }, [code, draftLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onRun() {
    setBusy('run');
    setLoadError(null);
    setVerdict(null);
    try {
      setResult(await run(task.lang, code));
    } catch (err) {
      setLoadError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  async function onCheck() {
    setBusy('check');
    setLoadError(null);
    try {
      const r = await check(task, code);
      setVerdict({ passed: r.passed, message: r.message });
      setResult(r.run ?? null);
      store?.recordCheck(task.gid, r.passed);
    } catch (err) {
      setLoadError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  function onToggleSolution() {
    if (!showSolution && status !== 'self' && status !== 'with-solution') {
      if (!window.confirm('ถ้าดูเฉลยตอนนี้ ข้อนี้จะถูกบันทึกว่า "ผ่านด้วยเฉลย" เมื่อทำผ่าน — ดูเลยไหม?')) return;
      store?.viewSolution(task.gid);
    }
    setShowSolution((s) => !s);
  }

  return (
    <div className="card exercise" data-exercise-id={task.gid}>
      <div className="exercise-head">
        {task.level && <span className={`level level-${task.level}`}>{LEVEL_LABELS[task.level]}</span>}
        <span className={`status status-${status}`} data-status={status}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="prompt" dangerouslySetInnerHTML={{ __html: task.promptHtml }} />
      <CodeEditor lang={task.lang} value={code} onChange={setCode} onRun={onRun} label="ช่องเขียนคำตอบ" />
      <div className="runner-bar">
        <button type="button" onClick={onRun} disabled={busy !== null}>{busy === 'run' ? 'กำลังรัน…' : '▶ Run'}</button>
        <button type="button" className="primary" onClick={onCheck} disabled={busy !== null}>{busy === 'check' ? 'กำลังตรวจ…' : 'ตรวจคำตอบ'}</button>
        {task.hintsHtml.length > 0 && (
          <button type="button" className="ghost" onClick={() => setHintsShown((n) => n + 1)} disabled={hintsShown >= task.hintsHtml.length}>
            ขอ hint ({hintsShown}/{task.hintsHtml.length})
          </button>
        )}
        <button type="button" className="ghost" onClick={onToggleSolution}>{showSolution ? 'ซ่อนเฉลย' : 'ดูเฉลย'}</button>
        <button type="button" className="ghost" onClick={() => { setCode(task.starter); setResult(null); setVerdict(null); }}>เริ่มใหม่</button>
        <RunStatus busy={busy !== null} lang={task.lang} />
      </div>
      {hintsShown > 0 && (
        <ol className="hints">
          {task.hintsHtml.slice(0, hintsShown).map((h, i) => <li key={i} dangerouslySetInnerHTML={{ __html: h }} />)}
        </ol>
      )}
      {verdict && <p className={`verdict ${verdict.passed ? 'pass' : 'fail'}`} role="status">{verdict.passed ? '✓ ' : '✗ '}{verdict.message}</p>}
      {loadError && <LoadError message={loadError} onRetry={onRun} />}
      {result && <Output result={result} />}
      {showSolution && (
        <div className="solution">
          <p><strong>เฉลย</strong></p>
          <CodeEditor lang={task.lang} value={task.solution.trim()} readOnly label="เฉลย" />
          <button type="button" className="ghost" onClick={() => setCode(task.solution)}>คัดลอกเฉลยไปวางในช่องคำตอบ</button>
        </div>
      )}
    </div>
  );
}
