import { getCollection } from 'astro:content';
import { url } from '../url';
import type { ModuleRef } from './refs';

/** รวม module + บท + id แบบฝึก ของหนึ่งสาย — ใช้สร้างทุกหน้าและส่งให้ island ที่แสดงความคืบหน้า */
export async function getTrack(track: 'da'): Promise<ModuleRef[]> {
  const [modules, lessons, data, practice] = await Promise.all([
    getCollection('modules'),
    getCollection('lessons'),
    getCollection('lessonData'),
    getCollection('practice'),
  ]);
  const dataById = new Map(data.map((d) => [d.id, d.data]));
  const practiceIds = new Set(practice.map((p) => p.id));
  return modules
    .filter((m) => m.data.track === track)
    .sort((a, b) => a.data.order - b.data.order)
    .map((m) => {
      const own = lessons
        .filter((l) => l.data.track === track && l.data.module === m.data.slug)
        .sort((a, b) => a.data.order - b.data.order);
      return {
        id: m.id,
        slug: m.data.slug,
        title: m.data.title,
        description: m.data.description,
        order: m.data.order,
        intro: m.data.intro,
        url: url(`/${track}/${m.data.slug}/`),
        practiceUrl: practiceIds.has(m.id) ? url(`/${track}/${m.data.slug}/practice/`) : null,
        lessons: own.map((l) => {
          if (!l.id.startsWith(`${m.id}/`)) throw new Error(`บท ${l.id} ระบุ module: ${l.data.module} แต่ไฟล์อยู่นอกโฟลเดอร์ ${m.id}/`);
          const d = dataById.get(l.id);
          if (!d) throw new Error(`ไม่พบ src/content/lesson-data/${l.id}.yaml สำหรับบท ${l.id}`);
          const slug = l.id.slice(m.id.length + 1);
          return {
            id: l.id,
            slug,
            title: l.data.title,
            minutes: l.data.minutes,
            url: url(`/${track}/${m.data.slug}/${slug}/`),
            exercises: d.exercises.map((e) => ({ id: `${l.id}/${e.id}`, level: e.level })),
          };
        }),
      };
    });
}
