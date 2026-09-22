#!/usr/bin/env python3
"""สร้าง dataset ร้านค้าออนไลน์สมมติสำหรับสาย Data Analyst

- ใช้แค่ standard library และ fix seed → รันกี่ครั้งก็ได้ไฟล์เหมือนเดิมทุกไบต์
- pattern ที่ฝังไว้ (ตรวจโดย tests/dataset.test.ts):
  1. ฤดูกาล: ออเดอร์ พ.ย.–ธ.ค. สูงกว่าเดือนปกติ
  2. A/B test ช่วง ส.ค.–ก.ย. 2025: กลุ่ม B ซื้อมากกว่า A เล็กน้อยแต่มีนัยสำคัญ
  3. cohort มิ.ย. 2025 (แคมเปญ promo) กลับมาซื้อซ้ำน้อย
  4. raw/customers_raw.csv มีข้อมูลสกปรกสำหรับบท cleaning

รัน: python3 scripts/generate_dataset.py
"""
import csv
import math
import random
from bisect import bisect_right
from datetime import date, datetime, timedelta
from pathlib import Path

SEED = 161
OUT = Path(__file__).resolve().parent.parent / "public" / "data"
START = date(2024, 1, 1)
END = date(2025, 12, 31)
LAST_SIGNUP = date(2025, 12, 15)
N_REGULAR_CUSTOMERS = 3000
N_PROMO_CUSTOMERS = 300
PROMO_MONTH = (date(2025, 6, 1), date(2025, 6, 30))
EXPERIMENT = (date(2025, 8, 1), date(2025, 9, 30))
N_EXPERIMENT_SESSIONS = 16000
N_OTHER_SESSIONS = 12000

CITIES = ["Bangkok", "Chiang Mai", "Khon Kaen", "Phuket", "Hat Yai", "Nakhon Ratchasima", "Udon Thani", "Chon Buri"]
CITY_WEIGHTS = [40, 10, 7, 8, 7, 10, 8, 10]
CHANNELS = ["organic", "ads", "referral"]
CHANNEL_WEIGHTS = [50, 35, 15]
CATEGORIES = {  # หมวด: (จำนวนสินค้า, ราคาต่ำสุด, ราคาสูงสุด, สัดส่วนต้นทุน)
    "Electronics": (25, 490, 25900, 0.78),
    "Home": (25, 159, 4990, 0.60),
    "Beauty": (20, 99, 1890, 0.45),
    "Fashion": (25, 199, 2990, 0.50),
    "Sports": (15, 249, 6990, 0.62),
    "Books": (10, 120, 890, 0.70),
}
SEASON_EXTRA = {11: 0.6, 12: 0.8}  # โอกาสที่ลูกค้าซื้อเพิ่มอีกออเดอร์ในเดือนเดียวกัน
FUNNEL = ["visit", "view_product", "add_to_cart", "checkout", "purchase"]


def rand_date(rng, a, b):
    return a + timedelta(days=rng.randint(0, (b - a).days))


def month_end(d):
    return (d.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)


def make_products(rng):
    rows = []
    for category, (count, low, high, cost_ratio) in CATEGORIES.items():
        for i in range(1, count + 1):
            raw = math.exp(rng.uniform(math.log(low), math.log(high)))
            price = int(raw // 10) * 10 + 9  # ราคาลงท้ายด้วย 9 แบบร้านจริง
            cost = round(price * cost_ratio * rng.uniform(0.9, 1.1), 2)
            rows.append({"product_id": len(rows) + 1, "product_name": f"{category} Item {i:02d}",
                         "category": category, "price": price, "cost": cost})
    return rows


def make_customers(rng):
    people = [(rand_date(rng, START, LAST_SIGNUP), rng.choices(CHANNELS, CHANNEL_WEIGHTS)[0])
              for _ in range(N_REGULAR_CUSTOMERS)]
    # แคมเปญ promo เดือน มิ.ย. 2025: ได้ลูกค้าใหม่เยอะ แต่เป็นขาจรที่ไม่ค่อยกลับมา
    people += [(rand_date(rng, *PROMO_MONTH), "promo") for _ in range(N_PROMO_CUSTOMERS)]
    people.sort(key=lambda p: p[0])
    return [{"customer_id": i, "email": f"customer{i:05d}@example.com",
             "city": rng.choices(CITIES, CITY_WEIGHTS)[0], "signup_date": signup, "channel": channel}
            for i, (signup, channel) in enumerate(people, 1)]


def make_orders(rng, customers, products):
    raw = []
    for c in customers:
        if rng.random() > 0.85:
            continue  # สมัครแล้วไม่เคยซื้อ
        p_repeat = 0.15 if c["channel"] == "promo" else 0.6
        d = c["signup_date"] + timedelta(days=rng.randint(0, 14))
        while d <= END:
            raw.append((d, c["customer_id"]))
            if rng.random() < SEASON_EXTRA.get(d.month, 0):
                extra = d + timedelta(days=rng.randint(0, (month_end(d) - d).days))
                if extra <= END:
                    raw.append((extra, c["customer_id"]))
            if rng.random() > p_repeat:
                break
            d += timedelta(days=max(1, round(rng.expovariate(1 / 45))))
    raw.sort()
    orders, items = [], []
    for order_id, (d, customer_id) in enumerate(raw, 1):
        orders.append({
            "order_id": order_id,
            "customer_id": customer_id,
            "order_date": d,
            "status": rng.choices(["completed", "cancelled", "returned"], [90, 6, 4])[0],
            "discount_pct": rng.choices([None, 5, 10, 15, 20], [70, 12, 10, 5, 3])[0],
            "payment_method": rng.choices(["credit_card", "promptpay", "cod", "bank_transfer"], [35, 40, 15, 10])[0],
        })
        for p in rng.sample(products, rng.choices([1, 2, 3, 4], [50, 30, 15, 5])[0]):
            items.append({"order_item_id": len(items) + 1, "order_id": order_id, "product_id": p["product_id"],
                          "quantity": rng.choices([1, 2, 3], [75, 20, 5])[0], "unit_price": p["price"]})
    return orders, items


def make_events(rng, customers):
    signups = [c["signup_date"] for c in customers]  # customers เรียงตามวันสมัครอยู่แล้ว
    exp_start, exp_end = EXPERIMENT
    other_days = [date(2025, 1, 1) + timedelta(days=i) for i in range(365)]
    other_days = [d for d in other_days if not exp_start <= d <= exp_end]
    sessions = [(rand_date(rng, exp_start, exp_end), True) for _ in range(N_EXPERIMENT_SESSIONS)]
    sessions += [(rng.choice(other_days), False) for _ in range(N_OTHER_SESSIONS)]
    sessions.sort(key=lambda s: s[0])
    rows = []
    for session_id, (day, in_experiment) in enumerate(sessions, 1):
        variant = rng.choice(["A", "B"]) if in_experiment else None
        known = bisect_right(signups, day)
        customer_id = customers[rng.randrange(known)]["customer_id"] if known and rng.random() < 0.6 else None
        device = rng.choices(["mobile", "desktop"], [65, 35])[0]
        t = datetime(day.year, day.month, day.day, rng.randint(0, 23), rng.randint(0, 59), rng.randint(0, 59))
        # หน้า checkout แบบใหม่ (B) ทำให้คนที่ถึง checkout ซื้อจริงมากขึ้น
        probs = [1.0, 0.6, 0.35, 0.55, 0.78 if variant == "B" else 0.62]
        for event_type, p in zip(FUNNEL, probs):
            if rng.random() >= p:
                break
            rows.append({"event_id": len(rows) + 1, "session_id": session_id, "customer_id": customer_id,
                         "event_type": event_type, "event_time": t.strftime("%Y-%m-%d %H:%M:%S"),
                         "device": device, "variant": variant})
            t += timedelta(seconds=rng.randint(5, 600))
    return rows


def make_customers_raw(rng, customers):
    rows = []
    for c in customers:
        row = dict(c)
        d = c["signup_date"]
        fmt = rng.choices(["iso", "dmy", "ymd_slash"], [70, 20, 10])[0]
        row["signup_date"] = {"iso": d.isoformat(), "dmy": d.strftime("%d/%m/%Y"), "ymd_slash": d.strftime("%Y/%m/%d")}[fmt]
        if rng.random() < 0.05:
            row["email"] = ""
        if rng.random() < 0.04:
            row["city"] = ""
        elif rng.random() < 0.08:
            row["city"] = rng.choice([row["city"].upper(), row["city"].lower(), f" {row['city']} "])
        rows.append(row)
        if rng.random() < 0.03:
            rows.append(dict(row))  # แถวซ้ำจากการ import ข้อมูลสองรอบ
    return rows


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: "" if v is None else v.isoformat() if isinstance(v, date) else v for k, v in row.items()})


def main():
    rng = random.Random(SEED)
    products = make_products(rng)
    customers = make_customers(rng)
    orders, items = make_orders(rng, customers, products)
    events = make_events(rng, customers)
    raw = make_customers_raw(rng, customers)
    outputs = [("customers.csv", customers), ("products.csv", products), ("orders.csv", orders),
               ("order_items.csv", items), ("events.csv", events), ("raw/customers_raw.csv", raw)]
    for name, rows in outputs:
        write_csv(OUT / name, rows)
        print(f"{name}: {len(rows):,} แถว")


if __name__ == "__main__":
    main()
