import { createStore, type StorageLike, type Store } from './store';

export const PROGRESS_EVENT = 'dcl:progress';
let store: Store | null = null;

function browserStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    s.setItem('dcl:probe', '1');
    s.removeItem('dcl:probe');
    return s;
  } catch {
    return null;
  }
}

/** store เดียวต่อหน้า — ทุก island ใช้ร่วมกันและได้ event เมื่อข้อมูลเปลี่ยน */
export function getProgress(): Store {
  store ??= createStore(browserStorage(), () => window.dispatchEvent(new Event(PROGRESS_EVENT)));
  return store;
}
