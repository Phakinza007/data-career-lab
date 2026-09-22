# Data Career Lab — Plan 2: Module 1 (SQL)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline in the current session (the user chose inline, not subagent-driven). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write and verify the 7 lessons of Module 1 (SQL) plus its module-wide practice set, following the platform built in Plan 1.

**Architecture:** No platform code changes. Every task adds one `src/content/lessons/da/sql/<slug>.mdx` + `src/content/lesson-data/da/sql/<slug>.yaml` pair (or, for the last task, one `src/content/practice/da/sql.yaml`), verified by the existing content-test harness (`tests/content/content.test.ts`) which runs every exercise's solution and starter against the real DuckDB engine.

**Tech Stack:** Same as Plan 1 — no new dependencies.

**Spec:** `docs/specs/2026-09-21-data-career-lab-design.md` §3 (Module 1 row), §4 (lesson format and ratios)

## Global Constraints

Everything in Plan 1's Global Constraints still applies. In addition, for this plan:

- Frontmatter `module: sql`, `track: da`. Files under `src/content/lessons/da/sql/` and `src/content/lesson-data/da/sql/`.
- Lesson order 1–7, filenames `01-select-where-order.mdx` … `07-interview-review.mdx`.
- Ratio targets used in this plan (all within the spec's ranges, RATIO in `src/lib/content/rules.ts`): lessons 1–6 use the **low end** — 2 examples, 1 faded, 4 basic + 3 applied + 1 challenge (8 exercises), 3 quiz, 1 interview. Lesson 7 (interview review) is richer since that is its purpose: 3 examples, 1 faded, 4 basic + 4 applied + 2 challenge (10 exercises), 5 quiz, 3 interview. The module practice set has 16 exercises (within the required 15–20).
- **Every SQL query and its exact result below was run against the real dataset (`createDatasetDuck`) before writing this plan.** Do not change a query's logic during implementation; if a number looks wrong, rerun it — don't guess.
- **Pitfall rule (from Plan 1's content test):** `ex.pitfall.code`, if present, must run without throwing. When the realistic mistake is a genuine SQL error (e.g. an aggregate in `WHERE`), describe it in `pitfall.text` only and omit `code` — do not invent a "safe" version of a query that's supposed to demonstrate an error.
- **Determinism rule for any exercise using `LIMIT`:** verified below to have no ties at the cutoff (either the sort key is naturally unique, or an explicit tie-break column such as `order_id`/`customer_id`/`product_name` is included). Keep those tie-break columns in `ORDER BY` exactly as given — removing them can reintroduce ties.
- Dataset domain reference (from `scripts/generate_dataset.py`): cities = Bangkok/Chiang Mai/Khon Kaen/Phuket/Hat Yai/Nakhon Ratchasima/Udon Thani/Chon Buri; categories = Electronics(25)/Home(25)/Beauty(20)/Fashion(25)/Sports(15)/Books(10); channels = organic/ads/referral/promo; order status = completed/cancelled/returned; payment_method = credit_card/promptpay/cod/bank_transfer; `discount_pct` is `NULL` or 5/10/15/20; `EXTRACT(dow FROM date)` is DuckDB's convention: 0=Sunday…6=Saturday.
- DuckDB is strict ANSI SQL here: a non-aggregated column missing from `GROUP BY` throws `Binder Error`, and an aggregate in `WHERE` throws `WHERE clause cannot contain aggregates!` — both confirmed by probe, used for pitfall **text**, never as runnable pitfall code.
- Avoid DuckDB-only syntax that doesn't transfer to interview contexts (Postgres/MySQL): no `QUALIFY`, prefer `CASE WHEN … SUM/COUNT` over `FILTER (WHERE …)` in exercise solutions (both work in DuckDB, but the former is portable).

## File map

```
data-career-lab/
  src/content/lessons/da/sql/01-select-where-order.mdx
  src/content/lessons/da/sql/02-group-by-having.mdx
  src/content/lessons/da/sql/03-joins.mdx
  src/content/lessons/da/sql/04-subquery-cte.mdx
  src/content/lessons/da/sql/05-window-functions.mdx
  src/content/lessons/da/sql/06-dates.mdx
  src/content/lessons/da/sql/07-interview-review.mdx
  src/content/lesson-data/da/sql/01-select-where-order.yaml
  src/content/lesson-data/da/sql/02-group-by-having.yaml
  src/content/lesson-data/da/sql/03-joins.yaml
  src/content/lesson-data/da/sql/04-subquery-cte.yaml
  src/content/lesson-data/da/sql/05-window-functions.yaml
  src/content/lesson-data/da/sql/06-dates.yaml
  src/content/lesson-data/da/sql/07-interview-review.yaml
  src/content/practice/da/sql.yaml
```

No other files change. `src/content/modules.yaml` already has the `da/sql` module entry from Plan 1 — nothing to edit there.

## Task template (applies to Tasks 1–7, one per lesson)

Each lesson task:
1. Write `src/content/lesson-data/da/sql/<slug>.yaml` from the exercise table given in that task (exact prompts are written in Thai following the house style of Module 0's lessons — short, direct, one clear ask per item; hints give a nudge, not the answer).
2. Write `src/content/lessons/da/sql/<slug>.mdx` — frontmatter, then prose sections teaching the concept using the same worked-example values, a "สรุปวากยสัมพันธ์" (syntax recap) box is optional, no runnable `<Runner>` needed in the MDX body for these lessons (the `<WorkedExample>`/`<Exercise>` islands on the lesson page already give runnable code — Plan 1's Task 10 wiring in `src/pages/da/[module]/[lesson].astro` renders `examples`, `faded`, `exercises`, and `quiz` automatically from the YAML for every lesson, so the MDX body only needs the teaching prose, not its own `<Runner>`).
3. Run `npm run test:content` filtered to that lesson (`npx vitest run tests/content/content.test.ts -t "da/sql/<slug>"`) — expect every task's solution to pass and every starter/faded starter to fail.
4. Run `npm run build` — expect the module page and this lesson's page to build with no schema/ratio errors.
5. Commit.

## Task 1: Lesson `01-select-where-order` — SELECT / WHERE / ORDER BY / LIMIT

**Files:**
- Create: `src/content/lessons/da/sql/01-select-where-order.mdx`, `src/content/lesson-data/da/sql/01-select-where-order.yaml`

**Content (verified):**

Goals: (1) เลือกและตั้งชื่อคอลัมน์ที่ต้องการด้วย SELECT; (2) กรองแถวด้วย WHERE (comparison, AND/OR, IN, BETWEEN, LIKE, IS NULL) ให้ตรงเงื่อนไข; (3) เรียงและตัดผลลัพธ์ด้วย ORDER BY หลายคอลัมน์และ LIMIT

Worked examples (2):
- `x1` "5 สินค้าราคาถูกที่สุดในหมวด Books": steps (a) `SELECT * FROM products LIMIT 5` (ดูโครงตาราง) (b) `SELECT product_name, price FROM products WHERE category='Books'` (c) `SELECT product_name, price FROM products WHERE category='Books' ORDER BY price LIMIT 5` → [Books Item 02:139, 06:259, 09:379, 01:479, 08:499]. Pitfall (runs, wrong): `WHERE category='books'` (lowercase) → 0 rows — string comparison is case-sensitive.
- `x2` "ออเดอร์ที่ยกเลิกหรือคืนสินค้าในเดือน มี.ค. 2025": steps (a) `SELECT DISTINCT status FROM orders` (b) `SELECT order_id, order_date, status FROM orders WHERE status IN ('cancelled','returned') AND order_date BETWEEN '2025-03-01' AND '2025-03-31' ORDER BY order_date DESC` → 19 rows. Pitfall (runs, wrong): `WHERE status='cancelled' OR status='returned' AND order_date BETWEEN '2025-03-01' AND '2025-03-31'` → 412 rows (AND binds tighter than OR, so this actually means "all cancelled orders ever, OR returned orders in March" — explain operator precedence).

Faded (1):
- `f1` "5 ลูกค้าล่าสุดที่สมัคร (ถ้าวันสมัครซ้ำกัน ให้เอา customer_id มากกว่าไว้ก่อน)": starter `SELECT customer_id, signup_date FROM customers ORDER BY ___, ___ LIMIT 5`, solution `ORDER BY signup_date DESC, customer_id DESC LIMIT 5` → rows `[[3300,'2025-12-15'],[3299,'2025-12-15'],[3298,'2025-12-14'],[3297,'2025-12-14'],[3296,'2025-12-14']]`. `ordered: true`.

Exercises:
| id | level | prompt (th) | solution | verified result |
|---|---|---|---|---|
| e1 | basic | สินค้าหมวด Electronics ราคาไม่เกิน 2000 บาท (ชื่อสินค้าและราคา) | `SELECT product_name, price FROM products WHERE category='Electronics' AND price<=2000` | 8 rows |
| e2 | basic | ออเดอร์ที่จ่ายด้วย promptpay ก่อนวันที่ 1 ก.พ. 2024 | `SELECT order_id, order_date FROM orders WHERE payment_method='promptpay' AND order_date < '2024-02-01'` | 28 rows |
| e3 | basic | จำนวนลูกค้าที่อยู่เมือง Phuket (คอลัมน์ชื่อ n_phuket) | `SELECT COUNT(*) AS n_phuket FROM customers WHERE city='Phuket'` | 262 |
| e4 | basic | ช่องทางสมัครสมาชิกทั้งหมดที่มีในระบบ (ไม่ซ้ำ) เรียงตามตัวอักษร | `SELECT DISTINCT channel FROM customers ORDER BY channel` | ads, organic, promo, referral — `ordered: true` (DISTINCT set, alphabetical, no ties possible) |
| e5 | applied | 5 ออเดอร์ที่ completed และมีส่วนลด เรียงส่วนลดมากไปน้อย ถ้าเท่ากันให้เรียง order_id น้อยไปมาก | `SELECT order_id, discount_pct FROM orders WHERE discount_pct IS NOT NULL AND status='completed' ORDER BY discount_pct DESC, order_id ASC LIMIT 5` | `[[24,20],[40,20],[90,20],[114,20],[171,20]]` — `ordered: true` |
| e6 | applied | สินค้าหมวด Home หรือ Sports ราคาระหว่าง 500–1000 บาท | `SELECT product_name, price FROM products WHERE category IN ('Home','Sports') AND price BETWEEN 500 AND 1000` | 7 rows |
| e7 | applied | จำนวนลูกค้าที่มาจากช่องทาง promo และสมัครในปี 2025 | `SELECT COUNT(*) FROM customers WHERE channel='promo' AND signup_date BETWEEN '2025-01-01' AND '2025-12-31'` | 300 (hint may note: นี่คือลูกค้า promo ทั้งหมด — แคมเปญนี้จัดในปี 2025 ล้วน) |
| e8 | challenge | 3 สินค้าราคาแพงที่สุดที่ไม่ใช่หมวด Electronics ถ้าราคาเท่ากันให้เรียงชื่อสินค้า A–Z | `SELECT product_name, category, price FROM products WHERE category<>'Electronics' ORDER BY price DESC, product_name LIMIT 3` | `[["Home Item 19","Home",4769],["Home Item 01","Home",4509],["Sports Item 10","Sports",4109]]` — `ordered: true` (all 3 prices distinct) |

Quiz (3): (1) BETWEEN รวมค่าปลายทั้งสองด้านไหม → รวม (inclusive); (2) `WHERE x = NULL` ทำงานไหม → ไม่ทำงาน ต้องใช้ `IS NULL`; (3) `ORDER BY a, b` เรียงยังไง → เรียงตาม a ก่อน ถ้า a เท่ากันค่อยเรียงตาม b

Interview (1): `i1` "ทำไม `WHERE x = NULL` ไม่เคยคืนแถวไหนเลย ต้องเขียนยังไงแทน" — อธิบาย NULL คือ "ไม่รู้ค่า" การเทียบ `=` กับ NULL จึงได้ผลเป็น unknown เสมอ ต้องใช้ `IS NULL` / `IS NOT NULL`

- [ ] **Step 1: Write the lesson-data YAML** with the exact content above, following the field shapes from `src/lib/content/schema.ts` (`exercises[].level`, `.lang: sql`, `.solution`, `.ordered` where noted, `.hints`) and the house style of `01-what-is-da.yaml`.
- [ ] **Step 2: Write the MDX** — frontmatter `{track: da, module: sql, order: 1, title: "SELECT, WHERE, ORDER BY", minutes: 25}`, then prose teaching SELECT/WHERE/ORDER/LIMIT using the same tables/values as the worked examples (e.g. show the `products`/`orders` column names, explain `IN`, `BETWEEN`, `LIKE`, `IS NULL` each with a one-line example).
- [ ] **Step 3: Run content tests scoped to this lesson**

Run: `npx vitest run tests/content/content.test.ts -t "da/sql/01-select-where-order"`
Expected: PASS for every `เฉลยผ่านตัวตรวจ` / `โค้ดเริ่มต้นไม่ผ่าน` pair (f1, e1–e8), PASS for `ตรงตามสัดส่วนของ spec`, PASS for the worked-example run-without-throwing check.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success; `dist/da/sql/01-select-where-order/index.html` exists.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "content: add SQL lesson 1 (SELECT/WHERE/ORDER BY)"
```

---

## Task 2: Lesson `02-group-by-having` — GROUP BY / HAVING / aggregates

**Files:**
- Create: `src/content/lessons/da/sql/02-group-by-having.mdx`, `src/content/lesson-data/da/sql/02-group-by-having.yaml`

**Content (verified):**

Goals: (1) ใช้ COUNT/SUM/AVG/MIN/MAX สรุปข้อมูลเป็นกลุ่มด้วย GROUP BY; (2) กรอง "กลุ่ม" ด้วย HAVING (ต่างจาก WHERE ที่กรองทีละแถว); (3) GROUP BY หลายคอลัมน์

Worked examples (2):
- `x1` "จำนวนลูกค้าต่อเมือง เรียงมากไปน้อย": step1 `SELECT city, COUNT(*) AS n FROM customers GROUP BY city` (อธิบายว่าถ้าไม่มี GROUP BY จะ error: `column "city" must appear in the GROUP BY clause...`), step2 `... ORDER BY n DESC` → `[Bangkok:1277, Nakhon Ratchasima:364, Chon Buri:344, Chiang Mai:325, Phuket:262, Udon Thani:259, Khon Kaen:251, Hat Yai:218]`. Pitfall: **text only, no code** — เพิ่มคอลัมน์ที่ไม่ได้ GROUP BY (เช่น `channel`) เข้า SELECT โดยไม่เพิ่มใน GROUP BY จะ error เหมือนกัน (`column "channel" must appear in the GROUP BY clause`).
- `x2` "เมืองไหนมีลูกค้ามากกว่า 300 คน": step1 นับต่อเมืองก่อน (เหมือน x1), step2 `SELECT city, COUNT(*) AS n FROM customers GROUP BY city HAVING COUNT(*) > 300 ORDER BY n DESC` → `[Bangkok:1277, Nakhon Ratchasima:364, Chon Buri:344, Chiang Mai:325]`. Pitfall: **text only, no code** — `WHERE COUNT(*) > 300` แทน HAVING จะ error ทันที (`WHERE clause cannot contain aggregates!`) เพราะตอน WHERE ทำงาน ยังไม่มีการรวมกลุ่ม/นับเสร็จ

Faded (1):
- `f1` "ราคาเฉลี่ยของสินค้าแต่ละหมวด ปัดเป็นจำนวนเต็ม เรียงจากแพงไปถูก": starter `SELECT category, ROUND(___(price), 0) AS avg_price FROM products GROUP BY ___ ORDER BY avg_price ___`, solution `ROUND(AVG(price), 0) ... GROUP BY category ... ORDER BY avg_price DESC` → `[Electronics:6541, Sports:2077, Home:1421, Fashion:1059, Beauty:675, Books:535]`. `ordered: true` (6 distinct values).

Exercises:
| id | level | prompt | solution | result |
|---|---|---|---|---|
| e1 | basic | จำนวนออเดอร์แต่ละสถานะ (status) | `SELECT status, COUNT(*) AS n FROM orders GROUP BY status` | completed:6232, cancelled:405, returned:301 |
| e2 | basic | ราคาต่ำสุดและสูงสุดของสินค้าแต่ละหมวด (คอลัมน์ lo, hi) | `SELECT category, MIN(price) AS lo, MAX(price) AS hi FROM products GROUP BY category` | 6 rows (e.g. Electronics 579–20069) |
| e3 | basic | จำนวนลูกค้าที่สมัครในแต่ละปี (คอลัมน์ y, n) | `SELECT EXTRACT(year FROM signup_date) AS y, COUNT(*) AS n FROM customers GROUP BY y` | 2024:1567, 2025:1733 |
| e4 | basic | จำนวนออเดอร์แต่ละช่องทางชำระเงิน | `SELECT payment_method, COUNT(*) AS n FROM orders GROUP BY payment_method` | promptpay:2710, credit_card:2499, cod:1046, bank_transfer:683 |
| e5 | applied | หมวดสินค้าที่มีจำนวนสินค้าน้อยกว่า 20 รายการ | `SELECT category, COUNT(*) AS n FROM products GROUP BY category HAVING COUNT(*) < 20` | Books:10, Sports:15 |
| e6 | applied | ช่องทางชำระเงินที่มีออเดอร์อย่างน้อย 1000 รายการ เรียงจากมากไปน้อย | `SELECT payment_method, COUNT(*) AS n FROM orders GROUP BY payment_method HAVING COUNT(*) >= 1000 ORDER BY n DESC` | promptpay:2710, credit_card:2499, cod:1046 — `ordered: true` (distinct) |
| e7 | applied | ส่วนลดเฉลี่ย (ปัด 1 ตำแหน่ง) ของออเดอร์ที่มีส่วนลด แยกตามช่องทางชำระเงิน | `SELECT payment_method, ROUND(AVG(discount_pct),1) AS avgd FROM orders WHERE discount_pct IS NOT NULL GROUP BY payment_method` | credit_card:10, promptpay:10, bank_transfer:10, cod:9.5 — **do not set `ordered: true`** (3-way tie at 10) |
| e8 | challenge | เมืองที่มีสัดส่วนลูกค้าจากช่องทาง organic มากกว่า 46% (ปัด 1 ตำแหน่งเป็น %) เรียงจากมากไปน้อย | `SELECT city, ROUND(100.0*SUM(CASE WHEN channel='organic' THEN 1 ELSE 0 END)/COUNT(*),1) AS pct_organic FROM customers GROUP BY city HAVING SUM(CASE WHEN channel='organic' THEN 1 ELSE 0 END)*1.0/COUNT(*) > 0.46 ORDER BY pct_organic DESC` | Udon Thani:48.3, Chiang Mai:46.8 — `ordered: true` |

Quiz (3): (1) WHERE กับ HAVING ต่างกันยังไง (WHERE กรองทีละแถวก่อนรวมกลุ่ม, HAVING กรองทีหลังรวมกลุ่มแล้ว); (2) ทำไม `SELECT city, COUNT(*) FROM customers` เฉยๆ ถึง error (ไม่มี GROUP BY บอกว่าจะนับแยกตามอะไร); (3) `GROUP BY city, channel` ต่างจาก `GROUP BY city` ยังไง (กลุ่มตามคู่ city+channel ที่ไม่ซ้ำ ไม่ใช่แค่ city)

Interview (1): `i1` "อธิบายลำดับการประมวลผลจริงของ SQL query หนึ่งคำสั่ง" — FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT (ต่างจากลำดับที่เขียนในโค้ด)

- [ ] **Step 1–5:** same as Task 1's template, filenames `02-group-by-having.*`, frontmatter `order: 2, title: "GROUP BY และ HAVING", minutes: 25, prereqs: [da/sql/01-select-where-order]`.

Run test: `npx vitest run tests/content/content.test.ts -t "da/sql/02-group-by-having"`

```bash
git commit -m "content: add SQL lesson 2 (GROUP BY/HAVING)"
```

---

## Task 3: Lesson `03-joins` — JOIN ทุกแบบ

**Files:**
- Create: `src/content/lessons/da/sql/03-joins.mdx`, `src/content/lesson-data/da/sql/03-joins.yaml`

**Content (verified):**

Goals: (1) เชื่อมตารางด้วย INNER/LEFT/RIGHT/FULL JOIN และรู้ว่าแบบไหนให้ผลต่างกันยังไง; (2) หา "แถวที่ไม่มีคู่" ด้วย LEFT JOIN + `IS NULL`; (3) เชื่อมได้มากกว่า 2 ตาราง และระวังปัญหาแถวเบิ้ล (fan-out)

Worked examples (2):
- `x1` "ลูกค้าคนไหนที่ยังไม่เคยสั่งซื้อเลย": step1 `SELECT COUNT(*) FROM customers c JOIN orders o ON c.customer_id=o.customer_id` → 6938 (อธิบาย: นี่คือ "จำนวนออเดอร์" ไม่ใช่ "จำนวนลูกค้า" เพราะ INNER JOIN คูณแถวตามจำนวนออเดอร์ของแต่ละคน), step2 `SELECT c.customer_id, c.city FROM customers c LEFT JOIN orders o ON c.customer_id=o.customer_id WHERE o.order_id IS NULL ORDER BY c.customer_id LIMIT 5` → `[[18,'Udon Thani'],[19,'Bangkok'],[39,'Bangkok'],[48,'Chon Buri'],[51,'Nakhon Ratchasima']]` (`ordered: true`, `customer_id` PK unique). Pitfall (runs, wrong — returns 0 misleadingly): `SELECT count(*) FROM customers c JOIN orders o ON c.customer_id=o.customer_id WHERE o.order_id IS NULL` → 0 (INNER JOIN ตัดแถวที่จับคู่ไม่ได้ทิ้งไปตั้งแต่ต้น จึงไม่มีทาง `o.order_id` เป็น NULL ให้เจอเลย).
- `x2` "รายได้รวมแต่ละหมวดสินค้า (เฉพาะออเดอร์ completed)": step1 `SELECT o.order_id, i.product_id, i.quantity, i.unit_price FROM orders o JOIN order_items i ON o.order_id=i.order_id WHERE o.status='completed' LIMIT 5`, step2 `SELECT p.category, SUM(i.quantity*i.unit_price) AS revenue FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=p.product_id WHERE o.status='completed' GROUP BY p.category ORDER BY revenue DESC` → `[Electronics:19200143, Home:4368918, Sports:3770726, Fashion:2929760, Beauty:1642543, Books:619888]`. Pitfall (runs, wrong): "นับจำนวนออเดอร์ที่ซื้อสินค้าหมวด Electronics" ด้วย `SELECT COUNT(*) FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=p.product_id WHERE p.category='Electronics'` → 2534 (นับแถวสินค้า ไม่ใช่ออเดอร์ — ออเดอร์เดียวซื้อของ Electronics หลายชิ้นถูกนับซ้ำ) เทียบกับค่าที่ถูกต้อง `COUNT(DISTINCT o.order_id)` → 2249.

Faded (1):
- `f1` "จำนวนออเดอร์ (นับไม่ซ้ำ) ที่ซื้อสินค้าหมวด Electronics": starter `SELECT COUNT(___ o.order_id) FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=___ WHERE p.category='Electronics'`, solution `SELECT COUNT(DISTINCT o.order_id) FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=p.product_id WHERE p.category='Electronics'` → 2249.

Exercises:
| id | level | prompt | solution | result |
|---|---|---|---|---|
| e1 | basic | จับคู่ order_items กับ products ด้วย USING แล้วนับจำนวนแถวทั้งหมด | `SELECT COUNT(*) FROM order_items i JOIN products p USING(product_id)` | 12183 |
| e2 | basic | ออเดอร์กับเมืองของลูกค้า (JOIN customers) 5 ออเดอร์แรกสุด (order_id น้อยสุด) | `SELECT o.order_id, c.city FROM orders o JOIN customers c ON o.customer_id=c.customer_id ORDER BY o.order_id LIMIT 5` | `[[1,'Bangkok'],[2,'Hat Yai'],[3,'Phuket'],[4,'Udon Thani'],[5,'Bangkok']]` — `ordered: true` (order_id PK) |
| e3 | basic | จำนวนลูกค้าที่ยังไม่เคยสั่งซื้อเลย แยกตามเมือง Phuket และ Hat Yai | `SELECT c.city, COUNT(*) AS n FROM customers c LEFT JOIN orders o ON c.customer_id=o.customer_id WHERE o.order_id IS NULL AND c.city IN ('Phuket','Hat Yai') GROUP BY c.city` | Phuket:37, Hat Yai:24 |
| e4 | basic | รายได้รวม (quantity×unit_price) ของออเดอร์ที่ completed ทั้งหมด | `SELECT SUM(i.quantity*i.unit_price) AS total_revenue FROM orders o JOIN order_items i ON o.order_id=i.order_id WHERE o.status='completed'` | 32531978 |
| e5 | applied | หมวดสินค้าที่มีรายได้มากที่สุด (เฉพาะ completed) และรายได้เท่าไร | `SELECT p.category, SUM(i.quantity*i.unit_price) AS revenue FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=p.product_id WHERE o.status='completed' GROUP BY p.category ORDER BY revenue DESC LIMIT 1` | Electronics, 19200143 |
| e6 | applied | 5 ลูกค้าเมือง Bangkok ที่ใช้จ่ายมากที่สุด (เฉพาะ completed) เรียงมากไปน้อย | `SELECT c.customer_id, SUM(i.quantity*i.unit_price) AS revenue FROM customers c JOIN orders o ON c.customer_id=o.customer_id JOIN order_items i ON o.order_id=i.order_id WHERE c.city='Bangkok' AND o.status='completed' GROUP BY c.customer_id ORDER BY revenue DESC LIMIT 5` | `[[2083,98881],[578,90378],[971,89424],[2404,84127],[243,82897]]` — `ordered: true` (top-5 distinct) |
| e7 | applied | จำนวนลูกค้าที่ไม่เคยสั่งซื้อเลย แยกตามเมือง เรียงจากมากไปน้อย | `SELECT c.city, COUNT(*) AS n FROM customers c LEFT JOIN orders o ON c.customer_id=o.customer_id WHERE o.order_id IS NULL GROUP BY c.city ORDER BY n DESC` | `Bangkok:177, Chon Buri:60, Chiang Mai:50, Nakhon Ratchasima:45, Udon Thani:41, Phuket:37, Khon Kaen:27, Hat Yai:24` — `ordered: true` (all distinct) |
| e8 | challenge | จำนวนคู่สินค้าในหมวดเดียวกันที่ราคาต่างกันไม่เกิน 10 บาท (self-join, นับแต่ละคู่ครั้งเดียว) | `SELECT COUNT(*) FROM products p1 JOIN products p2 ON p1.category=p2.category AND p1.product_id<p2.product_id AND ABS(p1.price-p2.price)<=10` | 20 |

Quiz (3): (1) INNER JOIN vs LEFT JOIN ต่างกันยังไง; (2) ทำไม COUNT(*) หลัง JOIN กับตารางลูก (order_items) ถึงมากกว่าจำนวนออเดอร์จริง (fan-out); (3) จะหา "แถวที่ไม่มีคู่" (เช่น ลูกค้าที่ไม่เคยสั่งซื้อ) ต้องใช้ JOIN แบบไหน+เงื่อนไขอะไร (LEFT JOIN + WHERE right.key IS NULL)

Interview (1): `i1` "เจอ bug ว่าตัวเลขหลัง JOIN เยอะกว่าที่ควรจะเป็น สาเหตุที่เป็นไปได้คืออะไร และแก้ยังไง" — อธิบาย fan-out จาก join กับตารางที่มีหลายแถวต่อ 1 คีย์ (one-to-many) แก้ด้วย `COUNT(DISTINCT ...)` หรือ aggregate ก่อน join

- [ ] **Step 1–5:** same template, `order: 3, title: "JOIN ทุกแบบ", minutes: 30, prereqs: [da/sql/02-group-by-having]`. In the MDX prose, include the INNER/LEFT/RIGHT/FULL row-count table verified above (`customers`⋈`orders`: INNER=RIGHT=6938, LEFT=FULL=7399) as a teaching table — explicitly note this is because every `order.customer_id` references a real customer (no orphan orders), so RIGHT/FULL only diverge from INNER/LEFT when the *right*/*either* side has unmatched rows, which doesn't happen here; it does happen for the `customers` side (461 never-ordered customers), which is exactly what LEFT JOIN reveals.

Run test: `npx vitest run tests/content/content.test.ts -t "da/sql/03-joins"`

```bash
git commit -m "content: add SQL lesson 3 (JOIN types, anti-join, fan-out)"
```

---

## Task 4: Lesson `04-subquery-cte` — Subquery และ CTE

**Files:**
- Create: `src/content/lessons/da/sql/04-subquery-cte.mdx`, `src/content/lesson-data/da/sql/04-subquery-cte.yaml`

**Content (verified):**

Goals: (1) ใช้ scalar/correlated subquery เทียบค่าของแถวกับค่าที่คำนวณแยก; (2) กรองด้วย `IN`/`EXISTS`/`NOT EXISTS` และรู้กับดักของ `NOT IN` กับ NULL; (3) ใช้ CTE (`WITH`) ทำให้ query หลายขั้นตอนอ่านง่ายขึ้น

Worked examples (2):
- `x1` "สินค้าที่ราคาแพงกว่าราคาเฉลี่ยของหมวดตัวเอง (correlated subquery)": step1 `SELECT product_name, category, price FROM products p1 WHERE price > (SELECT AVG(price) FROM products p2 WHERE p2.category=p1.category) ORDER BY category, price DESC LIMIT 10` → 48 total rows (sample of 10 shown, e.g. Beauty Item 11/06 @1759 top of Beauty), step2 (same query, no second step needed — keep as 2-step: step1 shows the pattern, step2 counts) `SELECT COUNT(*) FROM products p1 WHERE price > (SELECT AVG(price) FROM products p2 WHERE p2.category=p1.category)` → 48. Pitfall (runs, wrong): ลืม correlate (`p2.category=p1.category`) → `SELECT count(*) FROM products p1 WHERE price > (SELECT AVG(price) FROM products p2)` → 31 (เทียบกับราคาเฉลี่ยของทั้งร้านแทนที่จะเป็นของหมวดตัวเอง).
- `x2` "ลูกค้าที่เคยมีออเดอร์ถูกยกเลิก — เขียนได้ 2 แบบ": step1 (IN) `SELECT COUNT(*) FROM customers WHERE customer_id IN (SELECT customer_id FROM orders WHERE status='cancelled')` → 371, step2 (EXISTS) `SELECT COUNT(*) FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.customer_id AND o.status='cancelled')` → 371 (เท่ากัน — อธิบายว่า `EXISTS` ปลอดภัยกว่าเมื่อ subquery อาจมี NULL ปน). Pitfall (runs, returns empty — the NULL trap): `SELECT * FROM (VALUES (5),(10),(15),(20),(25)) v(pct) WHERE pct NOT IN (SELECT discount_pct FROM orders)` → 0 rows (ทั้งที่ 25 ไม่เคยถูกใช้เป็นส่วนลดเลยจริงๆ) เพราะ `orders.discount_pct` มีค่า NULL ปนอยู่ ทำให้ `NOT IN` กลายเป็น unknown ทุกแถว — เทียบกับที่ถูกต้อง (เพิ่ม `WHERE discount_pct IS NOT NULL` ใน subquery) ซึ่งได้ `[25]`.

Faded (1):
- `f1` "ใช้ CTE หาจำนวนออเดอร์ต่อสถานะก่อน แล้วเลือกเฉพาะสถานะที่มีมากกว่า 400 ออเดอร์": starter `___ t AS (SELECT status, COUNT(*) AS n FROM orders GROUP BY status) SELECT * FROM t WHERE n > ___`, solution `WITH t AS (SELECT status, COUNT(*) AS n FROM orders GROUP BY status) SELECT * FROM t WHERE n > 400` → cancelled:405, completed:6232.

Exercises:
| id | level | prompt | solution | result |
|---|---|---|---|---|
| e1 | basic | จำนวนลูกค้าที่ไม่เคยมีออเดอร์เลย (ใช้ subquery + NOT IN) | `SELECT COUNT(*) FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)` | 461 (ปลอดภัยเพราะ `orders.customer_id` ไม่มี NULL เลย) |
| e2 | basic | สินค้าที่ราคาสูงกว่าราคาเฉลี่ยของสินค้าทั้งหมด (ไม่แยกหมวด) | `SELECT COUNT(*) FROM products WHERE price > (SELECT AVG(price) FROM products)` | 31 |
| e3 | basic | จำนวนลูกค้าที่เคยสั่งซื้อด้วย credit_card (ใช้ EXISTS) | `SELECT COUNT(*) FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.customer_id AND o.payment_method='credit_card')` | 1611 |
| e4 | basic | ใช้ CTE หารายได้ (quantity×unit_price) ต่อลูกค้าก่อน แล้วนับว่ามีกี่คนที่รายได้เกิน 50000 บาท (completed เท่านั้น) | `WITH rev AS (SELECT o.customer_id, SUM(i.quantity*i.unit_price) AS revenue FROM orders o JOIN order_items i ON o.order_id=i.order_id WHERE o.status='completed' GROUP BY o.customer_id) SELECT COUNT(*) FROM rev WHERE revenue > 50000` | 82 |
| e5 | applied | สินค้าที่ราคาต่ำกว่าราคาเฉลี่ยของหมวดตัวเอง (correlated subquery, ตรงข้ามกับตัวอย่าง) | `SELECT COUNT(*) FROM products p1 WHERE price < (SELECT AVG(price) FROM products p2 WHERE p2.category=p1.category)` | 72 |
| e6 | applied | จำนวนลูกค้าที่ไม่เคยมีออเดอร์ยกเลิกเลยสักครั้ง (ใช้ NOT EXISTS) | `SELECT COUNT(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.customer_id AND o.status='cancelled')` | 2929 |
| e7 | applied | ใช้ CTE หา 2 คอลัมน์ (รายได้รวมแต่ละหมวด, จำนวนสินค้าในหมวด) แล้วนับว่ากี่หมวดที่ "รายได้ ÷ จำนวนสินค้า" มากกว่า 100000 บาท | `WITH rev AS (SELECT p.category, SUM(i.quantity*i.unit_price) revenue FROM order_items i JOIN products p USING(product_id) GROUP BY p.category), cnt AS (SELECT category, COUNT(*) n FROM products GROUP BY category) SELECT COUNT(*) FROM rev JOIN cnt USING(category) WHERE revenue/n > 100000` | 4 |
| e8 | challenge | ลูกค้าที่ไม่เคยมีออเดอร์ยกเลิกเลย แต่มีออเดอร์อย่างน้อย 3 ครั้ง (รวม subquery/CTE + GROUP BY/HAVING) | `WITH ok AS (SELECT customer_id FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.customer_id AND o.status='cancelled')) SELECT COUNT(*) FROM (SELECT o.customer_id FROM orders o JOIN ok USING(customer_id) GROUP BY o.customer_id HAVING COUNT(*) >= 3) t` | 733 (verified) |

- [ ] **Step 1–5:** same template, `order: 4, title: "Subquery และ CTE", minutes: 30, prereqs: [da/sql/03-joins]`.

Run test: `npx vitest run tests/content/content.test.ts -t "da/sql/04-subquery-cte"`

```bash
git commit -m "content: add SQL lesson 4 (subquery, EXISTS, NULL trap, CTE)"
```

---

## Task 5: Lesson `05-window-functions` — Window functions

**Files:**
- Create: `src/content/lessons/da/sql/05-window-functions.mdx`, `src/content/lesson-data/da/sql/05-window-functions.yaml`

**Content (verified):**

Goals: (1) ใช้ `ROW_NUMBER`/`RANK`/`DENSE_RANK` จัดลำดับภายในกลุ่มด้วย `PARTITION BY`; (2) ใช้ `LAG` เทียบแถวปัจจุบันกับแถวก่อนหน้า; (3) ทำผลรวมสะสม (running total) ด้วย `SUM() OVER (ORDER BY ...)` และรู้ว่าต้องห่อ query ด้วย subquery ก่อนถึงจะกรองผลลัพธ์ของ window function ได้ (ใช้ใน `WHERE` ตรงๆ ไม่ได้)

Worked examples (2), **all `ORDER BY` inside `OVER(...)` below include an explicit tie-break column** (`order_id`/`customer_id`) even though same-day duplicate orders exist in this dataset, so results are always deterministic:
- `x1` "หาออเดอร์แรกสุดของลูกค้าแต่ละคน (top-1 ต่อกลุ่มด้วย ROW_NUMBER)": step1 `SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders WHERE customer_id IN (1,2,3) ORDER BY customer_id, order_date`, step2 `SELECT customer_id, order_id, order_date FROM (SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders) t WHERE rn=1 ORDER BY customer_id LIMIT 5` → `[[1,3,'2024-01-06'],[2,4,'2024-01-06'],[3,14,'2024-01-12'],[4,29,'2024-01-16'],[5,15,'2024-01-12']]` (`ordered: true`). Pitfall (runs, wrong): ลืม `PARTITION BY` — `SELECT COUNT(*) FROM (SELECT customer_id, order_id, ROW_NUMBER() OVER (ORDER BY order_date, order_id) AS rn FROM orders) t WHERE rn=1` → 1 (ทั้งตารางนับเป็นกลุ่มเดียว ไม่ใช่แยกตามลูกค้า) เทียบกับที่ถูกต้อง (มี PARTITION BY) → 2839.
- `x2` "หาจำนวนวันระหว่างออเดอร์ปัจจุบันกับออเดอร์ก่อนหน้าของลูกค้าคนเดียวกัน (LAG)": step1 `SELECT customer_id, order_date, LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS prev_date FROM orders WHERE customer_id=2 ORDER BY order_date`, step2 `SELECT customer_id, order_date, DATEDIFF('day', LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id), order_date) AS gap_days FROM orders WHERE customer_id=2 ORDER BY order_date` → `[['2024-01-06',null],['2024-01-15',9],['2024-04-16',92],['2024-04-17',1]]`. Pitfall: **text only, no code** — ถ้าลืม `ORDER BY` ใน `OVER(...)` ของ `LAG`, DuckDB จะจับคู่ "แถวก่อนหน้า" ตามลำดับที่เก็บในตารางจริง (ไม่รับประกันว่าตรงกับลำดับวันที่) ทำให้ gap ผิดโดยไม่มี error ให้เห็น — อันตรายกว่าการ error เสียอีก เพราะดูเหมือนรันผ่านปกติ

Faded (1):
- `f1` "ผลรวมสะสม (running total) ของจำนวนสินค้าที่มีในแต่ละหมวด เรียงตามชื่อหมวด A–Z": starter `SELECT category, COUNT(*) AS n, SUM(COUNT(*)) OVER (ORDER BY ___) AS running FROM products GROUP BY ___ ORDER BY category`, solution `ORDER BY category ... GROUP BY category` → `[[Beauty,20,20],[Books,10,30],[Electronics,25,55],[Fashion,25,80],[Home,25,105],[Sports,15,120]]`. `ordered: true`.

Exercises:
| id | level | prompt | solution | result |
|---|---|---|---|---|
| e1 | basic | จัดอันดับสินค้าหมวด Beauty ตามราคาจากแพงไปถูก (RANK) | `SELECT product_name, price, RANK() OVER (ORDER BY price DESC) AS rnk FROM products WHERE category='Beauty' ORDER BY rnk` | 20 rows (ranks 1,1,3,4,5,… — a genuine tie at rank 1, that's fine, both engine runs give the same output) |
| e2 | basic | หมายเลขลำดับการสมัคร (ROW_NUMBER) ของลูกค้าเมือง Phuket เรียงตามวันสมัคร (ใช้ customer_id เป็น tie-break) 5 คนแรก | `SELECT customer_id, signup_date, ROW_NUMBER() OVER (PARTITION BY city ORDER BY signup_date, customer_id) AS rn FROM customers WHERE city='Phuket' ORDER BY rn LIMIT 5` | `[[1,'2024-01-01',1],[30,'2024-01-09',2],[128,'2024-02-05',3],[165,'2024-02-13',4],[166,'2024-02-13',5]]` — `ordered: true` |
| e3 | basic | DENSE_RANK ของหมวดสินค้าตามราคาเฉลี่ย มากไปน้อย (คอลัมน์ category, avgp ปัดเป็นจำนวนเต็ม, rnk) | `SELECT category, ROUND(AVG(price),0) AS avgp, DENSE_RANK() OVER (ORDER BY AVG(price) DESC) AS rnk FROM products GROUP BY category ORDER BY rnk` | Electronics:6541:1, Sports:2077:2, Home:1421:3, Fashion:1059:4, Beauty:675:5, Books:535:6 — `ordered: true` |
| e4 | basic | ออเดอร์ล่าสุดของลูกค้าแต่ละคน (ROW_NUMBER แบบ DESC + order_id DESC เป็น tie-break) — นับจำนวนแถวทั้งหมดที่ได้ | `SELECT COUNT(*) FROM (SELECT customer_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn FROM orders) t WHERE rn=1` | 2839 |
| e5 | applied | จำนวนวันระหว่างออเดอร์กับออเดอร์ก่อนหน้าของลูกค้าคนที่ 5 (customer_id=5) เรียงตามวันที่ | `SELECT order_date, DATEDIFF('day', LAG(order_date) OVER (ORDER BY order_date, order_id), order_date) AS gap_days FROM orders WHERE customer_id=5 ORDER BY order_date` | `[['2024-01-12',null],['2024-01-25',13],['2024-03-27',62],['2024-04-16',20],['2024-07-25',100],['2024-08-16',22]]` |
| e6 | applied | ลูกค้าที่ใช้จ่ายมากที่สุด (completed) ของแต่ละเมือง (top-1 ต่อกลุ่มด้วย RANK) | `WITH rev AS (SELECT c.customer_id, c.city, SUM(i.quantity*i.unit_price) AS revenue FROM customers c JOIN orders o ON c.customer_id=o.customer_id JOIN order_items i ON o.order_id=i.order_id WHERE o.status='completed' GROUP BY c.customer_id, c.city), ranked AS (SELECT *, RANK() OVER (PARTITION BY city ORDER BY revenue DESC) AS rnk FROM rev) SELECT city, customer_id, revenue FROM ranked WHERE rnk=1 ORDER BY city` | 8 rows, one per city, e.g. Bangkok:2083:98881 … Udon Thani:858:84817 — `ordered: true` (city alphabetical, no ties at rnk=1 in any city) |
| e7 | applied | ผลรวมสะสมของจำนวนออเดอร์ต่อสถานะ เรียงตามชื่อสถานะ A–Z | `SELECT status, COUNT(*) AS n, SUM(COUNT(*)) OVER (ORDER BY status) AS running FROM orders GROUP BY status ORDER BY status` | cancelled:405:405, completed:6232:6637, returned:301:6938 — `ordered: true` |
| e8 | challenge | ลูกค้า customer_id=2083 (คนใช้จ่ายมากที่สุด) ใช้ออเดอร์ลำดับที่เท่าไร (เรียงตามวันที่) ยอดสะสมถึงจะทะลุ 50000 บาทเป็นครั้งแรก (completed เท่านั้น) | `WITH amt AS (SELECT o.order_id, o.order_date, SUM(i.quantity*i.unit_price) AS order_amt FROM orders o JOIN order_items i ON o.order_id=i.order_id WHERE o.customer_id=2083 AND o.status='completed' GROUP BY o.order_id, o.order_date), running AS (SELECT *, SUM(order_amt) OVER (ORDER BY order_date, order_id) AS cum, ROW_NUMBER() OVER (ORDER BY order_date, order_id) AS rn FROM amt) SELECT rn, order_date, cum FROM running WHERE cum >= 50000 ORDER BY order_date LIMIT 1` | rn=5, order_date=2025-10-10, cum=92324 |

Quiz (3): (1) ROW_NUMBER, RANK, DENSE_RANK ต่างกันยังไงเวลามีค่าเท่ากัน (ROW_NUMBER ให้เลขไม่ซ้ำเสมอ, RANK เว้นเลขข้ามเมื่อมี tie, DENSE_RANK ไม่เว้น); (2) PARTITION BY ต่างจาก GROUP BY ยังไง (window function ไม่ยุบแถว ยังเห็นทุกแถวเหมือนเดิม); (3) ทำไมเอาผลลัพธ์ของ window function ไปใช้ใน WHERE ของ SELECT เดียวกันตรงๆ ไม่ได้ (ต้องห่อด้วย subquery ก่อน)

Interview (1): `i1` "จะหา 'สินค้าขายดี 3 อันดับต่อหมวด' ด้วย SQL ทำยังไง" — อธิบายรูปแบบ: window function (RANK/ROW_NUMBER) `PARTITION BY` หมวด แล้วห่อด้วย subquery กรอง `WHERE rnk<=3`

- [ ] **Step 1–5:** same template, `order: 5, title: "Window Functions", minutes: 35, prereqs: [da/sql/04-subquery-cte]`.

Run test: `npx vitest run tests/content/content.test.ts -t "da/sql/05-window-functions"`

```bash
git commit -m "content: add SQL lesson 5 (ROW_NUMBER/RANK/LAG/running total)"
```

---

## Task 6: Lesson `06-dates` — จัดการวันที่

**Files:**
- Create: `src/content/lessons/da/sql/06-dates.mdx`, `src/content/lesson-data/da/sql/06-dates.yaml`

**Content (verified):** `EXTRACT(dow FROM date)`: 0=Sunday…6=Saturday (confirmed: 2024-01-06 Sat→6, 2024-01-07 Sun→0).

Goals: (1) ดึงส่วนของวันที่ (ปี/เดือน/วันในสัปดาห์) ด้วย `EXTRACT`; (2) ตัดวันที่ให้เป็นหน่วยที่ใหญ่ขึ้น (ต้นเดือน) ด้วย `DATE_TRUNC` เพื่อเทียบข้ามปีได้ถูกต้อง; (3) หาระยะห่างระหว่างวันที่ด้วย `DATEDIFF`

Worked examples (2):
- `x1` "ยอดขายรายเดือน — ทำไมต้องใช้ DATE_TRUNC ไม่ใช่ EXTRACT(month) เฉยๆ": step1 `SELECT EXTRACT(month FROM order_date) AS m, COUNT(*) AS n FROM orders WHERE EXTRACT(year FROM order_date)=2025 GROUP BY m ORDER BY m` → 12 rows (ม.ค.=304 … ธ.ค.=418), step2 `SELECT DATE_TRUNC('month', order_date) AS m, COUNT(*) AS n FROM orders GROUP BY m ORDER BY m` → ทุกเดือนของทั้ง 2 ปีแยกกัน (2024-01 ถึง 2025-12). Pitfall (runs, wrong — conflates years): `SELECT EXTRACT(month FROM order_date) AS m, COUNT(*) AS n FROM orders GROUP BY m ORDER BY m` (ไม่กรองปี) → ม.ค. รวม 2024+2025 ได้ 388 (คนละค่ากับ ม.ค. 2025 เดี่ยวๆ ที่ได้ 304) — อธิบายว่าถ้าต้องการดูแนวโน้มแยกปี ต้องกรองปีหรือใช้ DATE_TRUNC
- `x2` "ลูกค้าสมัครมานานกี่วันแล้ว (นับถึงวันล่าสุดที่มีข้อมูลในระบบ)": step1 `SELECT MAX(order_date) AS latest FROM orders` → 2025-12-31, step2 `SELECT customer_id, signup_date, DATEDIFF('day', signup_date, (SELECT MAX(order_date) FROM orders)) AS days_since_signup FROM customers ORDER BY customer_id LIMIT 5` → `[[1,'2024-01-01',730],[2,'2024-01-01',730],[3,'2024-01-01',730],[4,'2024-01-02',729],[5,'2024-01-02',729]]` (`ordered: true`, customer_id unique PK). Pitfall (runs, wrong sign): สลับ argument ของ `DATEDIFF` — `SELECT customer_id, DATEDIFF('day', (SELECT MAX(order_date) FROM orders), signup_date) AS days_wrong FROM customers ORDER BY customer_id LIMIT 5` → ค่าติดลบทั้งหมด (`[-730,-730,-730,-729,-729]`) — `DATEDIFF(unit, start, end)` นับจาก start ไป end เสมอ

Faded (1):
- `f1` "จำนวนออเดอร์ในแต่ละวันของสัปดาห์ (0=อาทิตย์...6=เสาร์)": starter `SELECT EXTRACT(___ FROM order_date) AS dow, COUNT(*) AS n FROM orders GROUP BY ___ ORDER BY dow`, solution `EXTRACT(dow FROM order_date) ... GROUP BY dow` → `[[0,976],[1,976],[2,979],[3,1027],[4,978],[5,1016],[6,986]]`. `ordered: true`.

Exercises:
| id | level | prompt | solution | result |
|---|---|---|---|---|
| e1 | basic | จำนวนออเดอร์ในแต่ละปี | `SELECT EXTRACT(year FROM order_date) AS y, COUNT(*) AS n FROM orders GROUP BY y` | 2024:3136, 2025:3802 |
| e2 | basic | จำนวนออเดอร์ทั้งหมดที่เกิดในเดือนธันวาคม (ทุกปีรวมกัน) | `SELECT COUNT(*) FROM orders WHERE EXTRACT(month FROM order_date)=12` | 911 |
| e3 | basic | วันที่ล่าสุดที่มีการสั่งซื้อในระบบ | `SELECT MAX(order_date) AS latest FROM orders` | 2025-12-31 |
| e4 | basic | จำนวนวันระหว่างออเดอร์แรกสุดกับออเดอร์ล่าสุดในระบบทั้งหมด | `SELECT DATEDIFF('day', MIN(order_date), MAX(order_date)) AS span_days FROM orders` | 728 |
| e5 | applied | ยอดขายรายเดือน (จำนวนออเดอร์) ของปี 2024 เท่านั้น | `SELECT DATE_TRUNC('month', order_date) AS m, COUNT(*) AS n FROM orders WHERE EXTRACT(year FROM order_date)=2024 GROUP BY m ORDER BY m` | 12 rows, Jan:84 … Dec:493 |
| e6 | applied | จำนวนลูกค้าที่สมัครมาแล้วเกิน 500 วัน (นับถึงวันล่าสุดในระบบ) | `SELECT COUNT(*) FROM customers WHERE DATEDIFF('day', signup_date, (SELECT MAX(order_date) FROM orders)) > 500` | 953 |
| e7 | applied | จำนวนออเดอร์ที่เกิดขึ้นวันเสาร์หรืออาทิตย์ (weekend) | `SELECT COUNT(*) FROM orders WHERE EXTRACT(dow FROM order_date) IN (0,6)` | 1962 |
| e8 | challenge | เดือนไหน (ปีไหน) ที่จำนวนออเดอร์เพิ่มขึ้นจากเดือนก่อนหน้ามากที่สุด (month-over-month, ใช้ LAG) | `WITH m AS (SELECT DATE_TRUNC('month', order_date) AS mo, COUNT(*) AS n FROM orders GROUP BY mo), g AS (SELECT mo, n - LAG(n) OVER (ORDER BY mo) AS delta FROM m) SELECT mo, delta FROM g ORDER BY delta DESC LIMIT 1` | mo=2024-11-01, delta=178 |

Quiz (3): (1) EXTRACT กับ DATE_TRUNC ต่างกันยังไง (EXTRACT ให้ตัวเลขส่วนหนึ่งของวันที่, DATE_TRUNC ตัดวันที่ทั้งก้อนให้เหลือความละเอียดที่กำหนด); (2) `DATEDIFF('day', a, b)` กับ `DATEDIFF('day', b, a)` ต่างกันยังไง (เครื่องหมายกลับกัน); (3) ทำไมเทียบยอดขาย "เดือนต่อเดือน" ด้วย `EXTRACT(month...)` เฉยๆ ข้ามปีถึงผิด

Interview (1): `i1` "จะเปรียบเทียบยอดขายแบบเดือนต่อเดือน (MoM) ข้ามปีให้ถูกต้องต้องทำยังไง" — ต้องแยกปีด้วย (`DATE_TRUNC('month', ...)` หรือ `GROUP BY year, month`) ไม่ใช่ `GROUP BY EXTRACT(month...)` เฉยๆ

- [ ] **Step 1–5:** same template, `order: 6, title: "จัดการวันที่ (Date functions)", minutes: 30, prereqs: [da/sql/05-window-functions]`.

Run test: `npx vitest run tests/content/content.test.ts -t "da/sql/06-dates"`

```bash
git commit -m "content: add SQL lesson 6 (EXTRACT, DATE_TRUNC, DATEDIFF)"
```

---

## Task 7: Lesson `07-interview-review` — โจทย์ SQL แนวสัมภาษณ์

**Files:**
- Create: `src/content/lessons/da/sql/07-interview-review.mdx`, `src/content/lesson-data/da/sql/07-interview-review.yaml`

**Ratio for this lesson only:** 3 examples, 1 faded, 4 basic + 4 applied + 2 challenge (10), 5 quiz, 3 interview (all within RATIO's ranges — this is the module's synthesis lesson).

Goals: (1) แก้โจทย์ "อันดับที่ N" แบบคลาสสิกโดยไม่ใช้ LIMIT/OFFSET; (2) รวมเทคนิคจากบทก่อนหน้า (subquery + join + window + date) แก้โจทย์ธุรกิจที่ซับซ้อนขึ้น; (3) รู้ทันกับดักที่พบบ่อยในห้องสัมภาษณ์ (RANK vs DENSE_RANK เมื่อมี tie, ลำดับการทำงานของ WHERE กับ window function)

Worked examples (3):
- `x1` "สินค้าราคาแพงอันดับ 2 ของหมวด Beauty โดยไม่ใช้ LIMIT/OFFSET" (ใช้หมวด Beauty เพราะราคาสูงสุดมีเสมอกัน 2 ชิ้นพอดี — เคสจริงที่ทำให้เห็นความต่างของ RANK/DENSE_RANK): step1 (แบบ LIMIT/OFFSET ธรรมดา ใช้ได้จริงแต่สัมภาษณ์มักห้าม) `SELECT product_name, price FROM products WHERE category='Beauty' ORDER BY price DESC LIMIT 1 OFFSET 1` → Beauty Item 11, 1759 (แถวที่ 2 ของราคาสูงสุดที่ผูกกัน — **ไม่ใช่คำตอบที่ถูกต้องในทางความหมาย** เพราะราคาอันดับ "2" ที่แท้จริงคือ 1309 ไม่ใช่ 1759 ซ้ำ อธิบายว่านี่คือข้อจำกัดของ LIMIT/OFFSET เมื่อมี tie), step2 `SELECT MAX(price) AS second_highest FROM products WHERE category='Beauty' AND price < (SELECT MAX(price) FROM products WHERE category='Beauty')` → 1309, step3 `SELECT product_name, price FROM (SELECT product_name, price, DENSE_RANK() OVER (ORDER BY price DESC) AS rnk FROM products WHERE category='Beauty') t WHERE rnk=2` → Beauty Item 05, 1309. Pitfall (runs, returns nothing): ใช้ `RANK` แทน `DENSE_RANK` — `SELECT product_name, price FROM (SELECT product_name, price, RANK() OVER (ORDER BY price DESC) AS rnk FROM products WHERE category='Beauty') t WHERE rnk=2` → 0 rows (RANK กระโดดจาก 1 ไป 3 ตรงเมื่อมี tie คู่บนสุด จึงไม่มีแถวไหนได้ rnk=2 เลย)
- `x2` "ลูกค้าที่ 'ซื้อซ้ำ' (มากกว่า 1 ออเดอร์) แต่ไม่เคยยกเลิกออเดอร์เลยสักครั้ง": step1 `SELECT COUNT(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 1) t` → 1676, step2 `WITH repeaters AS (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 1) SELECT COUNT(*) FROM repeaters r WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=r.customer_id AND o.status='cancelled')` → 1375. Pitfall (runs, wrong): กรอง `status <> 'cancelled'` ตั้งแต่ก่อน GROUP BY — `SELECT COUNT(*) FROM (SELECT customer_id, COUNT(*) AS n FROM orders WHERE status <> 'cancelled' GROUP BY customer_id HAVING COUNT(*) > 1) t` → 1591 (ตัดออเดอร์ cancelled ทิ้งไปตั้งแต่ต้น ทำให้ไม่เหลือหลักฐานว่าเคยยกเลิก — คนละความหมายกับ "ซื้อซ้ำ ≥2 ครั้งไม่นับ cancelled" ด้วย)
- `x3` "session ไหนผ่านครบทุกขั้นของ funnel (visit→view_product→add_to_cart→checkout→purchase)": step1 `SELECT session_id, COUNT(DISTINCT event_type) AS n_steps FROM events GROUP BY session_id ORDER BY n_steps DESC LIMIT 5`, step2 `SELECT COUNT(*) FROM (SELECT session_id, COUNT(DISTINCT event_type) AS n_steps FROM events GROUP BY session_id) t WHERE n_steps = 5` → 2139. Pitfall (runs, wrong — off-by-one on the threshold): ใช้ `n_steps >= 4` แทน `= 5` — `SELECT COUNT(*) FROM (SELECT session_id, COUNT(DISTINCT event_type) AS n_steps FROM events GROUP BY session_id) t WHERE n_steps >= 4` → 3178 (รวม session ที่ไปได้ถึงแค่ checkout แต่ยังไม่ purchase จริงปนเข้ามาด้วย)

Faded (1):
- `f1` "สินค้าราคาถูกอันดับ 2 (ไม่ใช้ LIMIT/OFFSET) ในหมวด Home": starter `SELECT product_name, price FROM (SELECT product_name, price, DENSE_RANK() OVER (ORDER BY price ___) AS rnk FROM products WHERE category='Home') t WHERE rnk = ___`, solution `ORDER BY price ASC ... WHERE rnk = 2` → Home Item 18, 209.

Exercises:
| id | level | prompt | solution | result |
|---|---|---|---|---|
| e1 | basic | 5 ลูกค้าที่สมัครก่อนใครในระบบ (customer_id น้อยกว่าถือว่าสมัครก่อนเมื่อวันที่ซ้ำ) | `SELECT customer_id, signup_date FROM customers ORDER BY signup_date ASC, customer_id ASC LIMIT 5` | `[[1,'2024-01-01'],[2,'2024-01-01'],[3,'2024-01-01'],[4,'2024-01-02'],[5,'2024-01-02']]` — `ordered: true` |
| e2 | basic | จำนวนออเดอร์ของแต่ละวิธีจ่ายเงิน ที่มีการให้ส่วนลด (discount_pct ไม่ใช่ NULL) | `SELECT payment_method, COUNT(*) AS n FROM orders WHERE discount_pct IS NOT NULL GROUP BY payment_method` | bank_transfer:211, cod:314, credit_card:758, promptpay:806 |
| e3 | basic | จำนวนลูกค้าที่เคยซื้อสินค้าหมวด Books (นับไม่ซ้ำคน) | `SELECT COUNT(DISTINCT o.customer_id) FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=p.product_id WHERE p.category='Books'` | 807 |
| e4 | basic | จำนวนลูกค้าที่ไม่เคยจ่ายด้วย cod เลยสักครั้ง | `SELECT COUNT(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.customer_id AND o.payment_method='cod')` | 2462 |
| e5 | applied | หมวดสินค้าที่มีราคาสูงสุด (MAX price) เป็นอันดับ 2 เมื่อเทียบราคาสูงสุดของแต่ละหมวดด้วยกัน (ไม่ใช้ LIMIT/OFFSET) | `WITH capmax AS (SELECT category, MAX(price) AS mx FROM products GROUP BY category), ranked AS (SELECT *, DENSE_RANK() OVER (ORDER BY mx DESC) AS rnk FROM capmax) SELECT category, mx FROM ranked WHERE rnk=2` | Home, 4769 |
| e6 | applied | ลูกค้าที่ออเดอร์แรกสุดของตัวเอง (เรียงตามวันที่ + order_id) มีมูลค่ารวมมากกว่า 5000 บาท มีกี่คน | `WITH first_o AS (SELECT customer_id, order_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders) SELECT COUNT(*) FROM (SELECT f.customer_id, SUM(i.quantity*i.unit_price) AS amt FROM first_o f JOIN order_items i ON f.order_id=i.order_id WHERE f.rn=1 GROUP BY f.customer_id) t WHERE amt > 5000` | 804 |
| e7 | applied | เดือนไหน (ปีไหน) ที่มีลูกค้าสมัครใหม่มากที่สุด | `SELECT DATE_TRUNC('month', signup_date) AS m, COUNT(*) AS n FROM customers GROUP BY m ORDER BY n DESC LIMIT 1` | m=2025-06-01, n=425 |
| e8 | applied | ค่าเฉลี่ยจำนวนวันระหว่างการสั่งซื้อแต่ละครั้ง ของลูกค้าที่มีออเดอร์อย่างน้อย 2 ครั้ง (ปัด 1 ตำแหน่ง) | `WITH gaps AS (SELECT customer_id, DATEDIFF('day', LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id), order_date) AS gap FROM orders) SELECT ROUND(AVG(gap),1) AS avg_gap FROM gaps WHERE gap IS NOT NULL` | 34.8 |
| e9 | challenge | หมวดสินค้าที่มีสัดส่วนรายได้ (completed) มากกว่า 10% ของรายได้รวมทั้งหมด — **ระวัง:** ถ้าคำนวณ % ด้วย `SUM(...) OVER ()` หลังจากกรองด้วย WHERE แล้ว window จะคิดจากยอดของแถวที่เหลือหลังกรองเท่านั้น ไม่ใช่ยอดรวมทั้งหมดจริง ต้องแยกคำนวณยอดรวมจริงไว้ก่อน (CTE ต่างหาก) แล้วค่อยกรอง | `WITH cat AS (SELECT p.category, SUM(i.quantity*i.unit_price) AS rev FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=p.product_id WHERE o.status='completed' GROUP BY p.category), total AS (SELECT SUM(rev) AS grand FROM cat) SELECT category, ROUND(100.0*rev/grand,1) AS pct FROM cat CROSS JOIN total WHERE rev > 0.1*grand ORDER BY pct DESC` | `[[Electronics,59],[Home,13.4],[Sports,11.6]]` — `ordered: true`. **Include the wrong version (`SUM(rev) OVER ()` computed after the outer `WHERE`, giving `[[Electronics,70.2],[Home,16],[Sports,13.8]]`) as this exercise's `hints`**, not as a runnable pitfall (this exercise has no worked-example pitfall slot; put the contrast directly in a hint so the learner can compare). |
| e10 | challenge | จำนวนลูกค้าที่เคยซื้อ (completed) ทั้งหมวด Electronics และหมวด Books (อาจคนละออเดอร์ก็ได้) | `SELECT COUNT(*) FROM customers c WHERE EXISTS (SELECT 1 FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=p.product_id WHERE o.customer_id=c.customer_id AND o.status='completed' AND p.category='Electronics') AND EXISTS (SELECT 1 FROM orders o JOIN order_items i ON o.order_id=i.order_id JOIN products p ON i.product_id=p.product_id WHERE o.customer_id=c.customer_id AND o.status='completed' AND p.category='Books')` | 452 |

Quiz (5): (1) ลำดับการประมวลผลจริงของ SQL (recap); (2) จะหา "อันดับที่ N" โดยไม่ใช้ LIMIT/OFFSET ทำยังไง (สองแนวทาง: correlated subquery นับ/เทียบค่าที่มากกว่า, หรือ DENSE_RANK แล้วกรอง); (3) DENSE_RANK ต่างจาก RANK ตอนมีค่าเท่ากันยังไง (ทำไมสำคัญกับโจทย์ "อันดับที่ N"); (4) NOT IN กับ NOT EXISTS ต่างกันยังไงเมื่อ subquery มี NULL; (5) เจอโจทย์ยากในห้องสัมภาษณ์ ควรทำยังไงก่อนเริ่มเขียนโค้ด (ถามให้ชัดเจนก่อน, เริ่มจาก query ง่ายๆที่ทำงานได้ก่อนค่อยปรับ, พูดความคิดออกมาดังๆ)

Interview (3): `i1` "ระหว่างทำโจทย์ SQL สดในห้องสัมภาษณ์ ควรอธิบายความคิดยังไงให้ผู้สัมภาษณ์ตามทัน"; `i2` "ยกตัวอย่างวิธีหา 'อันดับที่ N' โดยไม่ใช้ LIMIT/OFFSET พร้อมอธิบายว่าทำไมบางบริษัทถามแบบนี้" (ทดสอบว่าเข้าใจ window function/subquery จริง ไม่ใช่จำ syntax); `i3` "เจอผลลัพธ์หลัง JOIN ที่ดูเยอะเกินจริง ควรตรวจสอบอะไรก่อน" (recap fan-out จาก lesson 3, เชื่อมโยงกับ COUNT DISTINCT)

- [ ] **Step 1–5:** same template but with this lesson's own ratio (3/1/4+4+2/5/3, see above), `order: 7, title: "โจทย์ SQL แนวสัมภาษณ์", minutes: 40, prereqs: [da/sql/06-dates]`.

Run test: `npx vitest run tests/content/content.test.ts -t "da/sql/07-interview-review"`

```bash
git commit -m "content: add SQL lesson 7 (interview-style review)"
```

---

## Task 8: Module practice set `da/sql`

**Files:**
- Create: `src/content/practice/da/sql.yaml`

**Interfaces:**
- Consumes: `practiceSchema`, `practiceRuleErrors` (Plan 1 Task 5); the file's collection id is `da/sql`, matched by `src/lib/content/catalog.ts` against `modules` collection id `da/sql` to enable `mod.practiceUrl` and the `/da/sql/practice/` page (Plan 1 Task 10's `src/pages/da/[module]/practice.astro` already renders whatever is in this file — no page code changes needed).

**Content (16 exercises, verified, level assigned per difficulty; `title: "ชุดฝึกท้าย module: SQL"`):**

| id | level | prompt | solution | result |
|---|---|---|---|---|
| p1 | basic | สินค้าหมวด Fashion ราคาต่ำกว่า 500 บาท | `SELECT product_name, price FROM products WHERE category='Fashion' AND price<500` | 7 rows |
| p2 | basic | 5 ออเดอร์แรกสุดที่ถูกยกเลิก (order_id น้อยไปมาก) | `SELECT order_id, order_date FROM orders WHERE status='cancelled' ORDER BY order_id LIMIT 5` | `[[11,'2024-01-10'],[12,'2024-01-10'],[48,'2024-01-20'],[62,'2024-01-24'],[66,'2024-01-25']]` — `ordered: true` |
| p3 | basic | จำนวนสินค้าที่ราคามากกว่า 1000 บาท แยกตามหมวด | `SELECT category, COUNT(*) AS n FROM products WHERE price>1000 GROUP BY category` | Beauty:5, Electronics:21, Fashion:10, Home:15, Sports:9 |
| p4 | basic | ช่องทางสมัคร (channel) ที่มีลูกค้ามากกว่า 500 คน | `SELECT channel, COUNT(*) AS n FROM customers GROUP BY channel HAVING COUNT(*)>500` | ads:1065, organic:1493 |
| p5 | applied | จำนวนออเดอร์ที่จ่ายด้วย bank_transfer และมีส่วนลด | `SELECT COUNT(*) FROM orders WHERE payment_method='bank_transfer' AND discount_pct IS NOT NULL` | 211 |
| p6 | applied | 5 ลูกค้าเมือง Chiang Mai ที่ใช้จ่ายมากที่สุด (completed) เรียงมากไปน้อย | `SELECT c.customer_id, SUM(i.quantity*i.unit_price) AS revenue FROM customers c JOIN orders o ON c.customer_id=o.customer_id JOIN order_items i ON o.order_id=i.order_id WHERE c.city='Chiang Mai' AND o.status='completed' GROUP BY c.customer_id ORDER BY revenue DESC LIMIT 5` | `[[3147,75651],[1325,71413],[1513,68145],[1687,64661],[795,64284]]` — `ordered: true` |
| p7 | applied | จำนวนลูกค้าที่เคยซื้อสินค้าที่ราคาต่อชิ้น (unit_price ใน order_items) แพงกว่า 10000 บาท | `SELECT COUNT(DISTINCT o.customer_id) FROM orders o JOIN order_items i ON o.order_id=i.order_id WHERE i.unit_price>10000` | 671 |
| p8 | challenge | หมวดสินค้าที่มีจำนวนสินค้าน้อยกว่าค่าเฉลี่ยจำนวนสินค้าต่อหมวด | `WITH c AS (SELECT category, COUNT(*) AS n FROM products GROUP BY category) SELECT category, n FROM c WHERE n < (SELECT AVG(n) FROM c)` | Books:10, Sports:15 |
| p9 | applied | จัดอันดับสินค้าหมวด Sports ตามราคาจากแพงไปถูก (RANK) 3 อันดับแรก | `SELECT product_name, price, RANK() OVER (ORDER BY price DESC) AS rnk FROM products WHERE category='Sports' ORDER BY rnk LIMIT 3` | `[["Sports Item 10",4109,1],["Sports Item 14",3939,2],["Sports Item 07",3799,3]]` — `ordered: true` (top-3 distinct) |
| p10 | challenge | แต่ละเมืองมีสัดส่วนรายได้ (completed) เท่าไรของรายได้รวมทั้งหมด (ปัด 1 ตำแหน่งเป็น %) | `WITH cr AS (SELECT c.city, SUM(i.quantity*i.unit_price) AS rev FROM customers c JOIN orders o ON c.customer_id=o.customer_id JOIN order_items i ON o.order_id=i.order_id WHERE o.status='completed' GROUP BY c.city) SELECT city, ROUND(100.0*rev/SUM(rev) OVER (),1) AS pct FROM cr ORDER BY pct DESC` | 8 rows, Bangkok:40 … Hat Yai:6.3 — `ordered: true` (all distinct) |
| p11 | basic | จำนวนออเดอร์ทั้งหมดในเดือนกุมภาพันธ์ (ทุกปีรวมกัน) | `SELECT COUNT(*) FROM orders WHERE EXTRACT(month FROM order_date)=2` | 404 |
| p12 | applied | จำนวนลูกค้าที่สมัครในไตรมาส 4 ปี 2024 (ต.ค.–ธ.ค.) | `SELECT COUNT(*) FROM customers WHERE signup_date BETWEEN '2024-10-01' AND '2024-12-31'` | 406 |
| p13 | challenge | เดือนไหนในปี 2025 ที่จำนวนออเดอร์ลดลงจากเดือนก่อนหน้ามากที่สุด (month-over-month) | `WITH m AS (SELECT DATE_TRUNC('month', order_date) AS mo, COUNT(*) AS n FROM orders GROUP BY mo), g AS (SELECT mo, n - LAG(n) OVER (ORDER BY mo) AS delta FROM m) SELECT mo, delta FROM g WHERE EXTRACT(year FROM mo)=2025 ORDER BY delta LIMIT 1` | mo=2025-01-01, delta=-189 |
| p14 | basic | 3 สินค้าที่ถูกสั่งซื้อ (นับจำนวนแถวใน order_items) มากที่สุด เรียงจากมากไปน้อย | `SELECT p.product_name, COUNT(*) AS n FROM order_items i JOIN products p USING(product_id) GROUP BY p.product_name ORDER BY n DESC LIMIT 3` | `[["Sports Item 01",128],["Home Item 24",123],["Beauty Item 06",121]]` — `ordered: true` (top-3 distinct; **note:** ranks 5–7 tie at 117, so do not extend this to top-5 or top-7 without a tie-break column) |
| p15 | applied | ลูกค้าเมือง Khon Kaen ใช้จ่ายรวมเท่าไร (completed) | `SELECT SUM(i.quantity*i.unit_price) AS total FROM customers c JOIN orders o ON c.customer_id=o.customer_id JOIN order_items i ON o.order_id=i.order_id WHERE c.city='Khon Kaen' AND o.status='completed'` | 2374211 |
| p16 | basic | จำนวนสินค้าที่ไม่เคยอยู่ในออเดอร์ที่ถูกยกเลิกเลย (ใช้ NOT EXISTS) | `SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items i JOIN orders o ON i.order_id=o.order_id WHERE i.product_id=p.product_id AND o.status='cancelled')` | 0 (จริงๆ แล้วทุกสินค้าเคยอยู่ในออเดอร์ที่ถูกยกเลิกอย่างน้อยหนึ่งครั้ง — คำตอบ 0 ถูกต้อง ไม่ใช่บั๊ก) |

Give each `pX` 1–2 short hints in the same style as the lessons (a nudge toward the right function/clause, not the answer).

- [ ] **Step 1: Write `src/content/practice/da/sql.yaml`** with `title` and all 16 exercises above (fields: `id, level, lang: sql, prompt, starter, solution, ordered?, hints`). Starters can be a short `-- เขียน SQL ตรงนี้` comment (as Lesson 0's `e1` did) since there's no single fill-in-the-blank shape shared across 16 varied questions.
- [ ] **Step 2: Run content tests scoped to the practice set**

Run: `npx vitest run tests/content/content.test.ts -t "practice da/sql"`
Expected: `มี module ตรงกับชื่อไฟล์ และจำนวนข้อตาม spec` PASS (16 is within 15–20), and PASS for every `p1`…`p16` solution/starter pair.

- [ ] **Step 3: Build and check the practice page renders**

Run: `npm run build`
Expected: success, and this time (unlike Plan 1) there is **no** "collection practice is empty" warning; `dist/da/sql/practice/index.html` exists.

- [ ] **Step 4: Browser check**

Use the Browser preview tools: open `/da/sql/` and confirm the "ชุดฝึกท้าย module" button now appears and links to `/da/sql/practice/` with all 16 exercises rendered. Pick 2–3 exercises (including one `ordered: true` one, e.g. `p2` or `p9`) and verify in the browser that checking the solution passes and a wrong answer fails with a sensible message — same verification style as Plan 1 Task 10 Step 5.

- [ ] **Step 5: Full suite and commit**

Run: `npm test && npm run build`
Expected: all tests pass (this run now covers all 7 lessons + the practice set — expect on the order of 60 lessons/practice-scoped tests: `7×(1 pairing) + 7×(ratio) + Σ(2×tasks per lesson) + Σ(worked-example runs) + 1(practice ratio) + 16×2(practice tasks)`, plus the pre-existing Module 0 and platform tests).

```bash
git add -A
git commit -m "content: add SQL module practice set (16 exercises)"
```

---

## Task 9: Whole-module browser verification and README note

**Files:**
- Modify: `README.md` (only if a note is needed — see Step 3)

- [ ] **Step 1: Full regenerate + test + build**

Run: `npm test && npm run build`
Expected: all pass, no schema/ratio errors for any `da/sql/*` file.

- [ ] **Step 2: Browser walkthrough of the whole module**

Using the Browser preview tools (`preview_start {name: "data-career-lab"}`):
1. `/da/` — Module "SQL" no longer shows "กำลังเขียน"; its progress bar shows `0/7 บท`.
2. `/da/sql/` — 7 lessons listed in order, each with a "ชุดฝึกท้าย module" link.
3. Open `01-select-where-order`: run the `x1` worked example through all its steps, check `f1` (faded) and one basic + one challenge exercise (`e8`, the tie-broken top-3) end-to-end (wrong answer → error message → correct answer → ✓ + badge `ผ่านเอง`).
4. Open `05-window-functions`: verify `e6` (RANK per city) passes when the exact solution query is pasted, and that a plausible near-miss (e.g. omitting `PARTITION BY`) fails with a comparison message, not a false pass.
5. Open `07-interview-review`: verify the `x1` pitfall (`RANK` instead of `DENSE_RANK`) really does show zero rows when run in the worked-example's runner, matching the pitfall text.
6. Reload the page after passing a couple of exercises and confirm progress persists (same check as Plan 1 Task 11 Step 3), and that `/da/` now shows partial module progress (e.g. `2/7 บท`).
7. Take one screenshot of `/da/sql/` as proof.

- [ ] **Step 3: Update `README.md` if the "เพิ่มบทเรียน" section needs a concrete example** — it currently already describes the general steps generically; add one sentence noting that `docs/plans/2026-09-22-plan-2-sql-module.md` has 7 fully worked examples of populated lesson YAML/MDX pairs to copy the shape from. Only make this edit; do not restructure the rest of the README.

```bash
git add -A
git commit -m "docs: note Plan 2 as a content-authoring reference in README"
```

---

## Execution notes (fill in while executing)

Record deviations here, same convention as Plan 1. Read before starting Plan 3.

- Work happened on branch `feat/plan-2`, not directly on `main`.
- Tasks 1–8 each landed as their own commit, exactly as planned. No query logic changed from what was pre-verified — every number matched on the first content-test run for every lesson.
- Wrote the YAML/MDX files directly (not extracted from the plan via script, unlike some of Plan 1's tasks) since the plan's tables were the source of truth for content but not literal file text — this was a deliberate adaptation noted when the plan was written (see the plan's own comment on this) and worked cleanly.
- Total test count went from 89 (end of Plan 1) to 281 after Task 8 (192 new tests: 7 lessons × ~22–27 scoped tests + the practice set's 33, plus a couple of frontmatter/ratio checks counted once globally).
- Browser verification (Task 9): confirmed `/da/` shows Module 1 "SQL" with a real `0/7 บท` progress bar (Modules 2–6 still correctly show "กำลังเขียน"); the `da/sql/practice/` page renders exactly 16 exercises; a wrong answer on `p1` fails with a row-count mismatch message and the badge flips to "ยังไม่ผ่าน"; the corrected answer passes and shows "ผ่านเอง"; `p9` (an `ordered: true` RANK exercise) verified via "ดูเฉลย" → "คัดลอกเฉลยไปวางในช่องคำตอบ" → ตรวจคำตอบ, passing with the exact verified top-3 rows and badge "ผ่านด้วยเฉลย".
- One harness quirk noticed during manual testing (not a bug, just worth knowing): a click on "ตรวจคำตอบ" immediately after typing can silently miss if the CodeMirror editor's height changed between locating the button and clicking it (text wrapping shifts layout). Re-screenshotting before the click, or using `find`/`scroll_to` right before the click, avoids it. No code change needed — this is a browser-automation timing issue, not a site bug.
- Also updated `README.md`'s "เพิ่มบทเรียน" section: clarified that `<Runner>` in the MDX body is optional (worked examples/exercises/quiz from the YAML render automatically without it), since none of this module's 7 lessons used a standalone `<Runner>` in their MDX — the plan's own Task template had already called this out, and the README's original wording (written in Plan 1, before any second module existed) implied it was required.
- **Gotcha found while finishing the branch:** running `npm test` while the browser-preview dev server (`astro dev` from `preview_start`) is still running in the background caused 1 flaky test failure and a 597s runtime (vs. the normal ~4s) — almost certainly resource/file-lock contention between the dev server and the content tests' own DuckDB/Pyodide instances. Stopping the preview server first made the full suite pass cleanly and fast every time. **Always stop the preview server before the final `npm test` / finishing-branch check.**

## Self-review record

- **Spec coverage:** §3 Module 1 row (7 lessons: SELECT/WHERE/ORDER, GROUP BY/HAVING, JOIN, subquery/CTE, window functions, dates, interview review) → Tasks 1–7. §4 module practice set (15–20 exercises) → Task 8. All ratio numbers for lessons 1–6 sit at the low end of RATIO's ranges (spec's own prose range is 8–12 total exercises per lesson; 4+3+1=8 is the minimum of that range, which is valid — the binding constraint enforced by code is the per-level range in `RATIO`, not the prose total). Lesson 7 sits higher (10 exercises, 3 examples, 5 quiz, 3 interview) matching its role as review.
- **Placeholder scan:** every SQL query and its result in this plan (including Task 4's `e8` = 733, verified during self-review) came from a real `createDatasetDuck` run in this session — nothing was invented or left as a guess.
- **Ambiguity check / tie safety:** every exercise or worked-example step using `LIMIT` was checked for ties at the cutoff; where ties existed (Lesson 1 `f1`, Lesson 5/7's `ROW_NUMBER`/`LAG` partitions), an explicit tie-break column was added and is called out in the Global Constraints. Lesson 2's `e7` explicitly is NOT marked `ordered: true` because of a genuine 3-way tie — flagged inline so it isn't "fixed" incorrectly during implementation.
- **Type/schema consistency:** all exercises use the same shapes as `src/lib/content/schema.ts` established in Plan 1 (`level`, `lang: sql`, `solution`, optional `ordered`, `hints`); no `check` field is used anywhere in this plan (SQL exercises never use `check`, matching Plan 1's `refineTask` rule).
