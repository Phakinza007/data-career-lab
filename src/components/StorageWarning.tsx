import { useProgress } from '../lib/progress/useProgress';

export default function StorageWarning() {
  const store = useProgress();
  if (!store || store.health === 'ok') return null;
  const text =
    store.health === 'memory-only'
      ? 'เบราว์เซอร์นี้บันทึกความคืบหน้าไม่ได้ (localStorage ถูกปิดหรือเต็ม) — ความคืบหน้าจะหายเมื่อปิดหน้า'
      : 'ข้อมูลความคืบหน้าเดิมเสีย จึงเริ่มนับใหม่ ข้อมูลเดิมเก็บสำรองไว้ในเบราว์เซอร์ที่คีย์ dcl:progress:backup';
  return <div className="banner" role="alert">{text}</div>;
}
