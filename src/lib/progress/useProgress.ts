import { useSyncExternalStore } from 'react';
import { getProgress, PROGRESS_EVENT } from './index';
import type { Store } from './store';

function subscribe(callback: () => void) {
  window.addEventListener(PROGRESS_EVENT, callback);
  return () => window.removeEventListener(PROGRESS_EVENT, callback);
}

/** คืน null ตอน render ฝั่ง server และตอน hydrate เพื่อไม่ให้ HTML ไม่ตรงกัน */
export function useProgress(): Store | null {
  const version = useSyncExternalStore(subscribe, () => getProgress().version, () => -1);
  return version === -1 ? null : getProgress();
}
