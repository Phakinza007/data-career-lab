import { useMemo, useState } from 'react';
import type { InterviewGroup } from '../lib/content/interview';

export default function InterviewBank({ groups }: { groups: InterviewGroup[] }) {
  const [moduleId, setModuleId] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return groups
      .filter((g) => moduleId === 'all' || g.moduleId === moduleId)
      .map((g) => ({ ...g, items: g.items.filter((it) => !query || it.questionHtml.toLowerCase().includes(query)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, moduleId, q]);

  return (
    <div>
      <div className="drill-filters">
        <label>
          หัวข้อ
          <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="all">ทั้งหมด</option>
            {groups.map((g) => <option key={g.moduleId} value={g.moduleId}>{g.moduleTitle}</option>)}
          </select>
        </label>
        <label>
          ค้นหา
          <input type="search" placeholder="พิมพ์คำถาม…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {filtered.length === 0 && <p className="card">ไม่พบคำถามที่ตรงกับตัวกรอง</p>}
      {filtered.map((g) => (
        <section key={g.moduleId}>
          <h2>{g.moduleTitle}</h2>
          {g.items.map((it) => (
            <details key={it.gid} className="card interview">
              <summary dangerouslySetInnerHTML={{ __html: it.questionHtml }} />
              <div dangerouslySetInnerHTML={{ __html: it.answerHtml }} />
              <p className="muted">จาก <a href={it.lessonUrl}>{it.lessonTitle}</a></p>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
