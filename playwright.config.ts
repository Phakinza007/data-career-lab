import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    // astro preview จะแยกตัวไปทำงานเบื้องหลังเองเมื่อไม่มี TTY ทำให้ Playwright คิดว่า server ตาย
    // จึงเสิร์ฟ dist/ ด้วย static server ที่รันค้างอยู่หน้าเดียวกันแทน
    command: 'npm run build && python3 -m http.server 4321 --directory dist',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
