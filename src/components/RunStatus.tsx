import { useEffect, useState } from 'react';
import type { Lang } from '../lib/kinds';

const LOAD_HINT: Record<Lang, string> = {
  sql: 'ครั้งแรกต้องโหลด DuckDB และข้อมูล ใช้เวลาไม่กี่วินาที',
  python: 'ครั้งแรกต้องโหลด Python และ pandas ประมาณ 10–30 วินาที ครั้งต่อไปจะเร็ว',
};

/** ถ้ารันนานเกิน 1.5 วินาที แปลว่าน่าจะกำลังโหลด runtime ครั้งแรก */
export function RunStatus({ busy, lang }: { busy: boolean; lang: Lang }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 1500);
    return () => clearTimeout(t);
  }, [busy]);
  return slow ? <span className="run-note">{LOAD_HINT[lang]}</span> : null;
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="load-error" role="alert">
      {message} — ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้ว <button type="button" onClick={onRetry}>ลองใหม่</button>
    </div>
  );
}
