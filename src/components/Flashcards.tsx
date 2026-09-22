import { useEffect, useState } from 'react';
import type { FlashcardItem } from '../lib/content/flashcards';
import type { ModuleRef } from '../lib/content/refs';
import { drawSession } from '../lib/practice/leitner';
import { lessonStatus } from '../lib/progress/status';
import { useProgress } from '../lib/progress/useProgress';

interface Props {
  cards: FlashcardItem[];
  modules: ModuleRef[];
}

/** เซสชันทบทวนหนึ่งรอบถูกสุ่มครั้งเดียวตอนเริ่ม (หรือกด "เริ่มรอบใหม่") แล้วคงที่ตลอดรอบ
 *  ไม่สุ่มใหม่ตามการอัปเดตความคืบหน้าระหว่างทาง (ไม่งั้นการ์ดจะสลับหายไปกลางรอบ)
 *  ดึงเฉพาะการ์ดของบทที่เรียนจบแล้ว (เหมือนกติกาของ /practice) เพื่อไม่ให้เห็นศัพท์จากบทที่ยังไม่ได้เรียน */
export default function Flashcards({ cards, modules }: Props) {
  const store = useProgress();
  const [session, setSession] = useState<FlashcardItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ remembered: 0, forgot: 0 });

  const doneLessons = new Set<string>();
  if (store) for (const m of modules) for (const l of m.lessons) if (lessonStatus(l.exercises, store.exercise).done) doneLessons.add(l.id);
  const eligible = cards.filter((c) => doneLessons.has(c.lessonId));

  useEffect(() => {
    if (store && session === null && eligible.length > 0) {
      setSession(drawSession(eligible, (c) => store.leitnerBox(c.gid)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, eligible.length]);

  if (!store) return <p className="muted">กำลังโหลด…</p>;
  if (cards.length === 0) return <p className="card">ยังไม่มี flashcard ในระบบ</p>;
  if (eligible.length === 0) return <p className="card">ยังไม่มีการ์ดจากบทที่เรียนจบแล้ว — เรียนจบบทแรกก่อน แล้วกลับมาทบทวนได้ที่นี่</p>;
  if (session === null) return <p className="muted">กำลังเตรียมการ์ด…</p>;

  function restart() {
    setSession(drawSession(eligible, (c) => store!.leitnerBox(c.gid)));
    setIndex(0);
    setFlipped(false);
    setTally({ remembered: 0, forgot: 0 });
  }

  if (index >= session.length) {
    return (
      <div className="card">
        <p>ทบทวนครบ {session.length} ใบแล้ว — จำได้ {tally.remembered} ใบ ต้องทวนอีก {tally.forgot} ใบ</p>
        <button type="button" className="primary" onClick={restart}>เริ่มรอบใหม่</button>
      </div>
    );
  }

  const card = session[index];
  const box = store.leitnerBox(card.gid);

  function answer(remembered: boolean) {
    store!.reviewFlashcard(card.gid, remembered);
    setTally((t) => (remembered ? { ...t, remembered: t.remembered + 1 } : { ...t, forgot: t.forgot + 1 }));
    setIndex((i) => i + 1);
    setFlipped(false);
  }

  return (
    <div>
      <p className="muted">การ์ดที่ {index + 1}/{session.length} · กล่อง {box}</p>
      <button type="button" className="card flashcard" onClick={() => setFlipped((f) => !f)} aria-label="กดเพื่อพลิกการ์ด">
        <div dangerouslySetInnerHTML={{ __html: flipped ? card.backHtml : card.frontHtml }} />
        <p className="muted">{flipped ? '(ด้านหลัง — กดเพื่อพลิกกลับ)' : '(กดเพื่อดูคำตอบ)'}</p>
      </button>
      {flipped && (
        <div className="runner-bar">
          <button type="button" className="danger" onClick={() => answer(false)}>จำไม่ได้ ✗</button>
          <button type="button" className="primary" onClick={() => answer(true)}>จำได้ ✓</button>
        </div>
      )}
      <p className="muted">จาก <a href={card.lessonUrl}>{card.moduleTitle} — {card.lessonTitle}</a></p>
    </div>
  );
}
