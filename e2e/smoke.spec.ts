import { expect, test } from '@playwright/test';

const LESSON = '/da/start/02-workflow-and-tools/';

// island ใช้ client:visible — ต้องเลื่อนให้เห็นก่อน React ถึงจะ hydrate และสร้าง editor
test('ทำแบบฝึก SQL ผ่านแล้วความคืบหน้าถูกบันทึกหลัง reload', async ({ page }) => {
  await page.goto(LESSON);
  const ex = page.locator('[data-exercise-id="da/start/02-workflow-and-tools/e1"]');
  await ex.scrollIntoViewIfNeeded();
  await ex.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('SELECT COUNT(*) AS n_orders FROM orders');
  await page.keyboard.press('Escape');
  await ex.getByRole('button', { name: 'ตรวจคำตอบ' }).click();
  await expect(ex.getByRole('status')).toContainText('ถูกต้อง', { timeout: 60_000 });
  await expect(ex.locator('[data-status="self"]')).toBeVisible();

  await page.reload();
  const again = page.locator('[data-exercise-id="da/start/02-workflow-and-tools/e1"]');
  await again.scrollIntoViewIfNeeded();
  await expect(again.locator('[data-status="self"]')).toBeVisible();
});

test('Python runner โหลด Pyodide และแสดงตารางผลลัพธ์', async ({ page }) => {
  await page.goto(LESSON);
  const runner = page.locator('.prose .runner').nth(1);
  await runner.scrollIntoViewIfNeeded();
  await expect(runner.locator('.cm-content')).toBeVisible();
  await runner.getByRole('button', { name: '▶ Run' }).click();
  await expect(runner.locator('table')).toBeVisible({ timeout: 90_000 });
  await expect(runner.locator('th').first()).toHaveText('payment_method');
});
