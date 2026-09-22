import { useState, type ChangeEvent } from 'react';
import { useProgress } from '../lib/progress/useProgress';
import { messageOf } from '../lib/runtime/timeout';

export default function SettingsPanel() {
  const store = useProgress();
  const [message, setMessage] = useState<string | null>(null);
  if (!store) return <p className="muted">กำลังโหลด…</p>;

  function onExport() {
    const href = URL.createObjectURL(new Blob([store!.exportJson()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = `data-career-lab-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      store!.importJson(await file.text());
      setMessage('นำเข้าความคืบหน้าเรียบร้อย');
    } catch (err) {
      setMessage(messageOf(err));
    }
  }

  function onReset() {
    if (!window.confirm('ลบความคืบหน้าทั้งหมด รวมโค้ดที่พิมพ์ค้างไว้ — ย้อนกลับไม่ได้ ยืนยันไหม?')) return;
    store!.reset();
    setMessage('ล้างความคืบหน้าแล้ว');
  }

  return (
    <div>
      <section className="card">
        <h2>สำรองความคืบหน้า</h2>
        <p>ความคืบหน้าเก็บอยู่ในเบราว์เซอร์นี้เท่านั้น ถ้าล้าง cache จะหาย ควร export เก็บไว้เป็นระยะ</p>
        <div className="runner-bar">
          <button type="button" className="primary" onClick={onExport}>Export เป็นไฟล์ JSON</button>
          <label className="button">
            Import จากไฟล์
            <input type="file" accept="application/json,.json" onChange={onImport} className="sr-only" />
          </label>
        </div>
      </section>
      <section className="card">
        <h2>เริ่มใหม่ทั้งหมด</h2>
        <button type="button" className="danger" onClick={onReset}>ล้างความคืบหน้า</button>
      </section>
      {message && <p className="verdict" role="status">{message}</p>}
    </div>
  );
}
