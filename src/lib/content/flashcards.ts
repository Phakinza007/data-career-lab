import { getCollection } from 'astro:content';
import { getTrack } from './catalog';
import { mdInline } from './markdown';

export interface FlashcardItem {
  gid: string;
  frontHtml: string;
  backHtml: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonUrl: string;
  lessonId: string;
}

/** รวม flashcard ของทุกบททั้งสาย ให้ /review ทบทวนแบบ Leitner ได้ */
export async function getFlashcardPool(track: 'da'): Promise<FlashcardItem[]> {
  const [modules, data] = await Promise.all([getTrack(track), getCollection('lessonData')]);
  const dataById = new Map(data.map((d) => [d.id, d.data]));
  const items: FlashcardItem[] = [];
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      const d = dataById.get(lesson.id);
      if (!d) continue;
      for (const c of d.flashcards) {
        items.push({
          gid: `${lesson.id}/${c.id}`,
          frontHtml: mdInline(c.front),
          backHtml: mdInline(c.back),
          moduleTitle: mod.title,
          lessonTitle: lesson.title,
          lessonUrl: lesson.url,
          lessonId: lesson.id,
        });
      }
    }
  }
  return items;
}
