import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerRpc, type WorkerLike } from '../src/lib/runtime/worker-rpc';
import { TimeoutError, withTimeout } from '../src/lib/runtime/timeout';

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null;
  onerror: WorkerLike['onerror'] = null;
  sent: unknown[] = [];
  terminated = false;
  postMessage(msg: unknown) { this.sent.push(msg); }
  terminate() { this.terminated = true; }
  reply(data: unknown) { this.onmessage?.({ data }); }
}

afterEach(() => vi.useRealTimers());

describe('WorkerRpc', () => {
  it('sends a message with an id and resolves with the reply', async () => {
    const w = new FakeWorker();
    const rpc = new WorkerRpc(() => w);
    const p = rpc.call<number>('run', { code: '1' }, 1000);
    expect(w.sent[0]).toEqual({ id: 1, type: 'run', code: '1' });
    w.reply({ id: 1, ok: true, result: 42 });
    await expect(p).resolves.toBe(42);
  });
  it('rejects with the worker error message', async () => {
    const w = new FakeWorker();
    const p = new WorkerRpc(() => w).call('init', {}, 1000);
    w.reply({ id: 1, ok: false, error: 'โหลดไม่ได้' });
    await expect(p).rejects.toThrow('โหลดไม่ได้');
  });
  it('times out with TimeoutError', async () => {
    vi.useFakeTimers();
    const p = new WorkerRpc(() => new FakeWorker()).call('run', {}, 10_000);
    vi.advanceTimersByTime(10_001);
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });
  it('terminate kills the worker and rejects pending calls', async () => {
    const w = new FakeWorker();
    const rpc = new WorkerRpc(() => w);
    const p = rpc.call('run', {}, 1000);
    rpc.terminate();
    expect(w.terminated).toBe(true);
    await expect(p).rejects.toThrow('ถูกปิด');
  });
  it('rejects pending calls when the worker crashes', async () => {
    const w = new FakeWorker();
    const p = new WorkerRpc(() => w).call('run', {}, 1000);
    w.onerror?.({ message: 'boom' });
    await expect(p).rejects.toThrow('boom');
  });
});

describe('withTimeout', () => {
  it('passes values through and times out slow promises', async () => {
    await expect(withTimeout(Promise.resolve(1), 100)).resolves.toBe(1);
    vi.useFakeTimers();
    const slow = withTimeout(new Promise(() => {}), 10_000);
    vi.advanceTimersByTime(10_001);
    await expect(slow).rejects.toThrow('10 วินาที');
  });
});
