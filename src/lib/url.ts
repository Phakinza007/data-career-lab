/** สร้างลิงก์ภายในเว็บที่ใช้ได้ทั้งตอน dev (/) และตอน deploy ใต้ sub-path */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
