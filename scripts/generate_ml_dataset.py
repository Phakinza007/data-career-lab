#!/usr/bin/env python3
"""สร้าง public/data/ml_customers.csv สำหรับสาย ML จาก dataset หลักที่มีอยู่แล้ว (ไม่สุ่มอะไรเพิ่ม → ผลเหมือนเดิมทุกไบต์)

หนึ่งแถวต่อลูกค้าที่เคยมีออเดอร์อย่างน้อย 1 ออเดอร์ โดย feature ทั้งหมดรู้ได้ ณ เวลาที่ลูกค้าสั่งครั้งแรก
เป้าหมาย (target):
  - repeated          1 ถ้าลูกค้ามีออเดอร์รวม (ทุกสถานะ) ตั้งแต่ 2 ออเดอร์ขึ้นไป  → โจทย์ classification
  - first_order_value มูลค่าออเดอร์แรก (บาท)                                     → โจทย์ regression

รัน: python3 scripts/generate_ml_dataset.py  (ต้องรัน scripts/generate_dataset.py ก่อน)
"""
import csv
from collections import defaultdict
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "public" / "data"
END = date(2025, 12, 31)


def read(name):
    with (DATA / name).open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    customers = read("customers.csv")
    orders = read("orders.csv")
    items = read("order_items.csv")
    category = {p["product_id"]: p["category"] for p in read("products.csv")}

    by_order = defaultdict(list)
    for it in items:
        by_order[it["order_id"]].append(it)
    by_customer = defaultdict(list)
    for o in orders:
        by_customer[o["customer_id"]].append(o)

    rows = []
    for c in customers:
        mine = by_customer.get(c["customer_id"])
        if not mine:
            continue
        mine.sort(key=lambda o: (o["order_date"], int(o["order_id"])))
        first = mine[0]
        first_items = by_order[first["order_id"]]
        first_date = date.fromisoformat(first["order_date"])
        signup = date.fromisoformat(c["signup_date"])
        rows.append({
            "customer_id": c["customer_id"],
            "city": c["city"],
            "channel": c["channel"],
            "signup_month": signup.month,
            "days_to_first_order": (first_date - signup).days,
            "first_payment_method": first["payment_method"],
            "first_status": first["status"],
            "first_discount_pct": int(first["discount_pct"]) if first["discount_pct"] else 0,
            "first_n_items": len(first_items),
            "first_has_electronics": int(any(category[i["product_id"]] == "Electronics" for i in first_items)),
            "first_order_value": sum(int(i["quantity"]) * int(i["unit_price"]) for i in first_items),
            "days_since_first_order": (END - first_date).days,
            "repeated": int(len(mine) >= 2),
        })

    out = DATA / "ml_customers.csv"
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"ml_customers.csv: {len(rows):,} แถว")


if __name__ == "__main__":
    main()
