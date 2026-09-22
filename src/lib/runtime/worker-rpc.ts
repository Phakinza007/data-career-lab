import { TimeoutError } from './timeout';

export interface WorkerLike {
  postMessage(msg: unknown): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: { message: string }) => void) | null;
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
interface Reply {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

/** เรียก worker แบบ request/response พร้อม timeout ต่อคำขอ */
export class WorkerRpc {
  private worker: WorkerLike;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(factory: () => WorkerLike) {
    this.worker = factory();
    this.worker.onmessage = (e) => {
      const reply = e.data as Reply;
      const p = this.pending.get(reply.id);
      if (!p) return;
      this.pending.delete(reply.id);
      clearTimeout(p.timer);
      if (reply.ok) p.resolve(reply.result);
      else p.reject(new Error(reply.error ?? 'worker error'));
    };
    this.worker.onerror = (e) => this.rejectAll(new Error(e.message || 'worker ล่ม'));
  }

  call<T>(type: string, payload: object, timeoutMs: number): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new TimeoutError(timeoutMs));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.worker.postMessage({ id, type, ...payload });
    });
  }

  terminate(): void {
    this.worker.terminate();
    this.rejectAll(new Error('worker ถูกปิด'));
  }

  private rejectAll(error: Error) {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }
}
