import { getCollection } from 'astro:content';
import { getTrack } from './catalog';
import { md, mdInline } from './markdown';

export interface InterviewQA {
  gid: string;
  questionHtml: string;
  answerHtml: string;
  lessonTitle: string;
  lessonUrl: string;
}
export interface InterviewGroup {
  moduleId: string;
  moduleTitle: string;
  items: InterviewQA[];
}

/** รวมคำถามสัมภาษณ์ท้ายทุกบท จัดกลุ่มตาม module ให้ /interview กรอง/ค้นหาได้ */
export async function getInterviewBank(track: 'da'): Promise<InterviewGroup[]> {
  const [modules, data] = await Promise.all([getTrack(track), getCollection('lessonData')]);
  const dataById = new Map(data.map((d) => [d.id, d.data]));
  const groups: InterviewGroup[] = [];
  for (const mod of modules) {
    const items: InterviewQA[] = [];
    for (const lesson of mod.lessons) {
      const d = dataById.get(lesson.id);
      if (!d) continue;
      for (const qa of d.interview) {
        items.push({
          gid: `${lesson.id}/${qa.id}`,
          questionHtml: mdInline(qa.q),
          answerHtml: md(qa.a),
          lessonTitle: lesson.title,
          lessonUrl: lesson.url,
        });
      }
    }
    if (items.length > 0) groups.push({ moduleId: mod.id, moduleTitle: mod.title, items });
  }
  return groups;
}
