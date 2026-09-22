export const THEME_EVENT = 'dcl:theme';
const KEY = 'dcl:theme';

export function isDark(): boolean {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function toggleTheme(): void {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // บันทึกไม่ได้ก็ใช้ได้แค่รอบนี้
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}
