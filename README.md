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

`docs/plans/2026-09-22-plan-2-sql-module.md` (เก็บในเครื่อง ไม่อยู่ใน repo นี้) มีตัวอย่างบทเรียน SQL ครบ 7 บทให้ดูรูปแบบเนื้อหา รวมถึงกับดักที่ต้องระวังตอนเขียนโจทย์ (เช่น pitfall code ต้องรันผ่านได้จริงเสมอ ห้าม error) และวิธีตรวจว่าโจทย์ที่ใช้ `LIMIT` ไม่มีค่าที่ตัดสินไม่ได้ (tie) ตรงจุดตัด ส่วน `docs/plans/2026-09-22-plan-4-pandas-module.md` (เก็บในเครื่อง เช่นกัน) เป็นตัวอย่างบทเรียน pandas ครบ 7 บท และเป็นที่อ้างอิงสำหรับวิธีเขียนโค้ด `check` ของโจทย์ Python (`check_df`/`check_series`/`check_value`/`check_true`) รวมถึงข้อจำกัดสำคัญว่าแต่ละโจทย์ต้อง import/อ่านข้อมูลเองให้ครบ เพราะ namespace ของแต่ละโจทย์ถูกสร้างใหม่แยกกันทุกครั้ง ส่วน `docs/plans/2026-09-22-plan-5-stats-viz-modules.md` (เก็บในเครื่อง เช่นกัน) เป็นตัวอย่างบทเรียนสถิติ 6 บท + visualization 4 บท และเป็นที่อ้างอิงสำหรับโจทย์ Python ที่ใช้ `scipy.stats` (hypothesis testing, confidence interval) รวมถึงรูปแบบการตรวจโจทย์ matplotlib/seaborn ที่ตรวจ "ขั้นตอนเตรียมข้อมูลก่อนวาดกราฟ" (เป็น Series/DataFrame ที่เช็คได้จริง) แทนการตรวจภาพกราฟที่วาดออกมาโดยตรง ส่วน `docs/plans/2026-09-23-plan-6-metrics-capstone.md` (เก็บในเครื่อง เช่นกัน) เป็นตัวอย่างบทเรียน business metrics 4 บท และเป็นที่อ้างอิงสำหรับปุ่มดาวน์โหลด notebook/Open in Colab บนหน้าบทเรียน (`entry.data.notebook`) และรูปแบบ `intro: true` ใน `modules.yaml` สำหรับบทที่ไม่ใช่แบบฝึกหัดเข้มข้น (เช่น Capstone) ซึ่งข้ามการบังคับสัดส่วนแบบฝึกตาม `RATIO` ส่วนสาย ML (เริ่มใน `docs/plans/2026-09-24-plan-7-ml-track-basics-features.md`) ใช้โครงเว็บแบบหลายสาย (`src/lib/tracks.ts`, หน้า `src/pages/[track]/…`) — เพิ่มสายใหม่โดยเพิ่ม id ใน `TRACK_IDS` และ module ใน `modules.yaml` — และใช้ตาราง `data/ml_customers.csv` ที่สร้างจาก `python3 scripts/generate_ml_dataset.py` (ต้องรัน `scripts/generate_dataset.py` ก่อน) เป็นข้อมูลของโจทย์ scikit-learn ทุกข้อ ส่วน `docs/plans/2026-09-24-plan-8-ml-trees-dl-capstone.md` (เก็บในเครื่อง เช่นกัน) ต่อด้วย tree/boosting (4 บท) และ deep learning เบื้องต้น (3 บท) และ ML capstone พร้อม notebook เริ่มต้น โดยมีข้อจำกัดว่าทุกโจทย์ต้องรันในเบราว์เซอร์ให้จบใน ~10 วินาที (จึงใช้ MLP/forest/grid ขนาดเล็ก) และเน้นการรายงานผลอย่างซื่อตรงเมื่อสัญญาณในข้อมูลอ่อน ส่วนสาย AI Engineer (`docs/plans/2026-09-24-plan-9-ai-engineer-track.md` เก็บในเครื่อง เช่นกัน) เรียกโมเดลจริงในเบราว์เซอร์ไม่ได้ จึงฝึกส่วนวิศวกรรมรอบโมเดล (token/ต้นทุน, prompt, JSON, RAG ด้วย TF-IDF จริง, agent loop) โดยใช้โมเดลจำลองที่ตอบตามสคริปต์และติดป้ายกำกับชัดเจน ส่วนการเรียก API จริงอยู่ใน notebook (`public/notebooks/ai-capstone-starter.ipynb` ต้องตั้ง `ANTHROPIC_API_KEY` เอง และมีเส้นทางออฟไลน์สำรอง) ใช้ฐานความรู้ `data/kb_docs.csv` และ `data/kb_questions.csv` ที่สร้างจาก `python3 scripts/generate_kb_dataset.py`

## หน้าใช้ทบทวน

- `/practice` สุ่มโจทย์จากบทที่เรียนจบแล้วเท่านั้น (ทั้งบทเดี่ยวๆ และชุดฝึกท้าย module ที่ต้องเรียนจบทั้ง module ก่อน) ข้อที่เคยตอบผิดหรือเคยดูเฉลยจะถูกสุ่มมาบ่อยกว่า
- `/review` flashcard แบบ Leitner 5 กล่อง ดึงการ์ดจาก `flashcards` ของบทที่เรียนจบแล้วเท่านั้น (กติกาเดียวกับ `/practice`)
- `/interview` รวมคำถามจาก `interview` ของทุกบท (ไม่กรองตามความคืบหน้า) กรองตาม module หรือค้นหาได้

เอกสารออกแบบ (spec/plan) เก็บแยกไว้ในเครื่อง ไม่อยู่ใน repo นี้
