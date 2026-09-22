import { useEffect, useState } from 'react';
import { isDark, THEME_EVENT } from './theme';

export function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const update = () => setDark(isDark());
    update();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    window.addEventListener(THEME_EVENT, update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener(THEME_EVENT, update);
    };
  }, []);
  return dark;
}
