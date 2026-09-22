import { useEffect, useState } from 'react';
import type { DrillItem } from '../lib/content/drill';
import type { ModuleRef } from '../lib/content/refs';
import { LEVELS, LEVEL_LABELS, type Level } from '../lib/kinds';
import { exerciseWeight, pickWeighted } from '../lib/practice/select';
import type { ExerciseRecord } from '../lib/progress/store';
import { lessonStatus, moduleProgress } from '../lib/progress/status';
import { useProgress } from '../lib/progress/useProgress';
import Exercise from './Exercise';

interface Props {
  items: DrillItem[];
  modules: ModuleRef[];
}
type Getter = (id: string) => ExerciseRecord;

function doneLessonIds(modules: ModuleRef[], get: Getter): Set<string> {
  const set = new Set<string>();
  for (const m of modules) for (const l of m.lessons) if (lessonStatus(l.exercises, get).done) set.add(l.id);
  return set;
}
function doneModuleIds(modules: ModuleRef[], get: Getter): Set<string> {
  return new Set(modules.filter((m) => m.lessons.length > 0 && moduleProgress(m.lessons, get).done === m.lessons.length).map((m) => m.id));
}

/** ช่องสุ่มโจทย์ — "ข้อที่กำลังทำ" อยู่ใน state ท้องถิ่น เปลี่ยนเฉพาะตอนกด "สุ่มข้อใหม่" หรือเปลี่ยนตัวกรองเท่านั้น
 *  ไม่เปลี่ยนตามการอัปเดตความคืบหน้าระหว่างทาง (ไม่งั้นข้อที่กำลังตอบจะถูกสลับหายไปกลางคัน) */
export default function Drill({ items, modules }: Props) {
  const store = useProgress();
  const [moduleId, setModuleId] = useState('all');
  const [level, setLevel] = useState<'all' | Level>('all');
  const [picked, setPicked] = useState<DrillItem | null>(null);

  const doneLessons = store ? doneLessonIds(modules, store.exercise) : new Set<string>();
  const doneModules = store ? doneModuleIds(modules, store.exercise) : new Set<string>();
  const eligible = items.filter((it) => {
    const sourceDone = it.lessonId ? doneLessons.has(it.lessonId) : doneModules.has(it.moduleId);
    if (!sourceDone) return false;
    if (moduleId !== 'all' && it.moduleId !== moduleId) return false;
    if (level !== 'all' && it.task.level !== level) return false;
    return true;
  });
  const availableModules = modules.filter((m) => doneModules.has(m.id) || m.lessons.some((l) => doneLessons.has(l.id)));

  function draw() {
    if (!store || eligible.length === 0) return;
    setPicked(pickWeighted(eligible, (it) => exerciseWeight(store.exercise(it.task.gid))));
  }

  useEffect(() => {
    if (picked === null) draw();
    // สุ่มข้อใหม่อัตโนมัติเมื่อยังไม่มีข้อที่เลือกไว้ (โหลดครั้งแรก หรือหลังเปลี่ยนตัวกรอง)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, store, moduleId, level, eligible.length]);

  if (!store) return <p className="muted">กำลังโหลด…</p>;

  return (
    <div className="drill">
      <div className="drill-filters">
        <label>
          หัวข้อ
          <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setPicked(null); }}>
            <option value="all">ทั้งหมด</option>
            {availableModules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </label>
        <label>
          ระดับ
          <select value={level} onChange={(e) => { setLevel(e.target.value as 'all' | Level); setPicked(null); }}>
            <option value="all">ทั้งหมด</option>
            {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
          </select>
        </label>
        <button type="button" className="primary" onClick={draw} disabled={eligible.length === 0}>🎲 สุ่มข้อใหม่</button>
        <span className="muted">มีข้อให้สุ่ม {eligible.length} ข้อ</span>
      </div>
      {picked ? (
        <>
          <p className="crumb">จาก <a href={picked.sourceUrl}>{picked.moduleTitle} — {picked.sourceTitle}</a></p>
          <Exercise key={picked.task.gid} task={picked.task} />
        </>
      ) : (
        <p className="card">
          {items.length === 0
            ? 'ยังไม่มีแบบฝึกในระบบ'
            : 'ยังไม่มีข้อที่เรียนจบตรงกับตัวกรองนี้ — เรียนจบบทหรือ module ที่เกี่ยวข้องก่อน แล้วกลับมาสุ่มโจทย์ได้'}
        </p>
      )}
    </div>
  );
}
