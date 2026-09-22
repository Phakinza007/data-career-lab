export const LEVELS = ['basic', 'applied', 'challenge'] as const;
export type Level = (typeof LEVELS)[number];
export const LANGS = ['sql', 'python'] as const;
export type Lang = (typeof LANGS)[number];
export const LEVEL_LABELS: Record<Level, string> = {
  basic: '🟢 พื้นฐาน',
  applied: '🟡 ประยุกต์',
  challenge: '🔴 ท้าทาย',
};
