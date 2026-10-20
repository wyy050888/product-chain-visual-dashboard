import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve(path.dirname(process.execPath), '../node_modules/playwright'));
const baseUrl = process.argv[2] || 'https://chainboard-wyy.pages.dev/';
const reportFile = new URL('../outputs/image-audit/' + new URL(baseUrl).hostname + '/report.json', import.meta.url);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const failedRequests = [];
  page.on('requestfailed', request => {
    if (request.resourceType() === 'image') failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert.equal(response.status(), 200);
      break;
    } catch (error) {
      if (attempt === 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION_RESET|ERR_QUIC_PROTOCOL_ERROR/.test(error.message)) throw error;
      console.log('网络连接中断，重新访问第 ' + (attempt + 1) + ' 次');
    }
  }
  await page.waitForFunction(() => document.documentElement.dataset.dashboardBoot === 'ready', null, { timeout: 60000 });
  await page.locator('img[src]').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
  const check = () => [...document.querySelectorAll('img[src]')]
    .filter(image => image.getAttribute('src').trim())
    .every(image => image.complete && image.naturalWidth > 0);
  await page.waitForFunction(check, null, { timeout: 60000 });
  const displayed = await page.locator('img[src]').evaluateAll(images => images
    .filter(image => image.getAttribute('src').trim())
    .map(image => ({ src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight })));
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  report.pageCheck = { status: 'passed', checkedAtUtc: new Date().toISOString(), imageElements: displayed.length, broken: 0, failedRequests, displayed };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  console.log('线上页面检查通过：' + displayed.length + ' 个图片元素全部显示，破图0个。');
} finally {
  await browser.close();
}
