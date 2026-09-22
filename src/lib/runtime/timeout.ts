export const RUN_TIMEOUT_MS = 10_000;

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`โค้ดรันนานเกิน ${ms / 1000} วินาที จึงถูกหยุด`);
    this.name = 'TimeoutError';
  }
}

/** โหลด Python หรือ DuckDB ไม่สำเร็จ — UI จะแสดงปุ่มลองใหม่ */
export class RuntimeLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeLoadError';
  }
}

export const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
