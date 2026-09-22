export const MAX_BOX = 5;

/** กล่องยิ่งน้อย ยิ่งมีโอกาสถูกหยิบมาทวนมากกว่า */
export function boxWeight(box: number): number {
  return 1 / Math.max(box, 1);
}

/** ตอบถูกเลื่อนขึ้นกล่อง (สูงสุด MAX_BOX) ตอบผิดกลับไปกล่อง 1 */
export function nextBox(box: number, remembered: boolean): number {
  return remembered ? Math.min(box + 1, MAX_BOX) : 1;
}

/** สุ่มลำดับการ์ดหนึ่งรอบทบทวน (สุ่มแบบไม่ใส่คืน) โดยกล่องน้อยมีโอกาสมาก่อน */
export function drawSession<T>(cards: T[], boxOf: (c: T) => number, rng: () => number = Math.random): T[] {
  const pool = [...cards];
  const order: T[] = [];
  while (pool.length > 0) {
    const weights = pool.map((c) => boxWeight(boxOf(c)));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    order.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return order;
}
