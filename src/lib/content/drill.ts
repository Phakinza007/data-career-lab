import { getCollection } from 'astro:content';
import { getTrack } from './catalog';
import { taskView, type TaskView } from './views';

export interface DrillItem {
  task: TaskView;
  moduleId: string;
  moduleTitle: string;
  /** ชื่อบท หรือ "ชุดฝึกท้าย module: ..." สำหรับ item จากชุดฝึกท้าย module */
  sourceTitle: string;
  sourceUrl: string;
  /** null สำหรับ item จากชุดฝึกท้าย module (ไม่ผูกกับบทใดบทหนึ่ง) */
  lessonId: string | null;
}

/** รวมทุกแบบฝึก (รวม faded) ของทุกบท + ชุดฝึกท้าย module ทั้งสาย ให้ /practice สุ่มได้ */
export async function getDrillPool(track: 'da') {
  const [modules, data, practice] = await Promise.all([
    getTrack(track),
    getCollection('lessonData'),
    getCollection('practice'),
  ]);
  const dataById = new Map(data.map((d) => [d.id, d.data]));
  const practiceById = new Map(practice.map((p) => [p.id, p.data]));
  const items: DrillItem[] = [];

  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      const d = dataById.get(lesson.id);
      if (!d) continue;
      for (const t of [...d.faded, ...d.exercises]) {
        items.push({
          task: taskView(lesson.id, t, 'level' in t ? 'exercise' : 'faded'),
          moduleId: mod.id,
          moduleTitle: mod.title,
          sourceTitle: lesson.title,
          sourceUrl: lesson.url,
          lessonId: lesson.id,
        });
      }
    }
    if (mod.practiceUrl) {
      const set = practiceById.get(mod.id);
      if (set) {
        for (const t of set.exercises) {
          items.push({
            task: taskView(`${mod.id}/practice`, t, 'exercise'),
            moduleId: mod.id,
            moduleTitle: mod.title,
            sourceTitle: `ชุดฝึกท้าย module: ${mod.title}`,
            sourceUrl: mod.practiceUrl,
            lessonId: null,
          });
        }
      }
    }
  }
  return { items, modules };
}
