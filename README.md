# Data Career Lab

เว็บเรียนส่วนตัวสาย Data Analyst → ML → AI Engineer: อ่าน ดูตัวอย่าง แล้วเขียน SQL/Python จริงในเบราว์เซอร์

## คำสั่ง

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | เปิด dev server ที่ http://localhost:4321 |
| `npm run build` | build เว็บ static ลง `dist/` (ตรวจ frontmatter ให้ด้วย) |
| `npm test` | unit test + content test ทั้งหมด |
| `npm run test:content` | รันแบบฝึกทุกข้อ: เฉลยต้องผ่าน และโค้ดเริ่มต้นต้องไม่ผ่าน |
| `npm run e2e` | Playwright smoke test |
| `npm run data` | สร้าง dataset ใหม่ (ผลเหมือนเดิมทุกครั้ง) |

## เพิ่มบทเรียน

1. `src/content/lessons/da/<module>/<nn-slug>.mdx` — เนื้อหาสอน; ใส่ `<Runner client:visible lang="sql|python" code={...} />` เฉพาะตอนอยากมีช่องลองเล่นอิสระแทรกในเนื้อหา (ไม่จำเป็นเสมอไป — worked examples/exercises/quiz จาก YAML จะถูก render ให้อัตโนมัติอยู่แล้วโดยไม่ต้องเขียนโค้ดเพิ่มในหน้า MDX)
2. `src/content/lesson-data/da/<module>/<nn-slug>.yaml` — goals, examples, faded, exercises, quiz, summary, interview, flashcards
3. โจทย์ Python ต้องมี `check` (เช่น `check_df(result, _sol["result"])`) ส่วนโจทย์ SQL ระบบจะเทียบกับ `solution` เอง
4. รัน `npm run test:content` จนผ่าน

`docs/plans/2026-09-22-plan-2-sql-module.md` (เก็บในเครื่อง ไม่อยู่ใน repo นี้) มีตัวอย่างบทเรียน SQL ครบ 7 บทให้ดูรูปแบบเนื้อหา รวมถึงกับดักที่ต้องระวังตอนเขียนโจทย์ (เช่น pitfall code ต้องรันผ่านได้จริงเสมอ ห้าม error) และวิธีตรวจว่าโจทย์ที่ใช้ `LIMIT` ไม่มีค่าที่ตัดสินไม่ได้ (tie) ตรงจุดตัด

เอกสารออกแบบ (spec/plan) เก็บแยกไว้ในเครื่อง ไม่อยู่ใน repo นี้
