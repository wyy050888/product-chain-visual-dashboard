import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { smoke } from '../00-原型/dev/checks/smoke.mjs';
const require = createRequire(import.meta.url);
let playwright;
for (const location of ['playwright', path.resolve(path.dirname(process.execPath), '../node_modules/playwright')]) {
  try { playwright = require(location); break; } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
}
if (!playwright) throw new Error('找不到 Playwright，请使用项目内置 Node。');
const url = process.argv[2] || new URL('../00-原型/index.html', import.meta.url).href;
const output = new URL('../outputs/', import.meta.url);
fs.mkdirSync(output, { recursive: true });
// 主脚本被故意延迟时 document.fonts.ready 也不会完成，直接截图当前已绘制的帧。
async function capture(page, name) {
  const session = await page.context().newCDPSession(page);
  try {
    const { data } = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(new URL(name, output), Buffer.from(data, 'base64'));
  } finally { await session.detach(); }
}
const browser = await playwright.chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  if (!process.argv.includes('--retry-only')) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/app.js*', async route => { await gate; await route.continue(); });
  await page.goto(url, { waitUntil: 'commit' });
  await page.locator('#dashboard-boot').waitFor({ state: 'visible' });
  const view=await page.locator('html').getAttribute('data-dashboard-view');
  assert.equal(await page.locator('#boot-title').textContent(),'正在加载'+(view==='director'?'产品链看板':await page.title()),'加载文案与当前入口一致');
  assert.equal(await page.locator('main.page').isVisible(), false);
  assert.equal(await page.locator('.portal-header').isVisible(), true);
  assert.equal(await page.locator('main.page').getAttribute('inert'), '');
  assert.equal(await page.locator('.boot-card').count(), 6);
  await capture(page, 'loading-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.locator('#dashboard-boot').evaluate(el => el.scrollWidth <= el.clientWidth));
  await capture(page, 'loading-mobile.png');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.boot-mark i').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.waitForFunction(() => document.documentElement.dataset.dashboardBoot === 'slow', null, { timeout: 15000 });
  assert.equal(await page.locator('#boot-retry').isVisible(), true);
  await page.setViewportSize({ width: 1920, height: 1080 });
  release();
  await page.waitForFunction(() => document.documentElement.dataset.dashboardBoot === 'ready', null, { timeout: 30000 });
  assert.equal(await page.locator('#dashboard-boot').isVisible(), false);
  assert.equal(await page.locator('main.page').getAttribute('aria-busy'), 'false');
  assert.equal(await page.locator('main.page').getAttribute('inert'), null);
  if(view==='director')await smoke(page);
  else assert.equal(await page.locator('main.page').isVisible(),true,'部门入口就绪后展示实际页面');
  await page.close();
  console.log('通过：桌面/手机骨架、减少动态效果、慢加载提示、首屏就绪切换和基础交互。');
  }
  const failedPage = await browser.newPage();
  let firstRequest = true;
  await failedPage.route('**/assets/app.js*', route => {
    if (firstRequest) { firstRequest = false; return route.abort('failed'); }
    return route.continue();
  });
  await failedPage.goto(url, { waitUntil: 'domcontentloaded' });
  await failedPage.waitForFunction(() => document.documentElement.dataset.dashboardBoot === 'error');
  assert.equal(await failedPage.locator('#boot-retry').isVisible(), true);
  await Promise.all([failedPage.waitForNavigation({ waitUntil: 'commit' }), failedPage.locator('#boot-retry').click({ noWaitAfter: true })]);
  await failedPage.waitForFunction(() => document.documentElement.dataset.dashboardBoot === 'ready');
  await failedPage.close();
  console.log('通过：主脚本加载失败提示与重新加载恢复。');
} finally {
  await browser.close();
}
