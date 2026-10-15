import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
for (const location of ['playwright', path.resolve(path.dirname(process.execPath), '../node_modules/playwright')]) {
  try { playwright = require(location); break; } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
}
if (!playwright) throw new Error('需要 Playwright；请使用项目说明中的内置 Node。');
const baseUrl = process.argv[2] || 'https://chainboard-wyy.pages.dev/';
const manifest = JSON.parse(fs.readFileSync(new URL('../原型/manifest.json', import.meta.url), 'utf8'));
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await playwright.chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#riskrail .rp-detail-link').first().waitFor();
  const results = await page.evaluate(async paths => {
    const results = [];
    // 限制并发，验证真实图片解码结果，避免把 HTTP 200 当成图片显示成功。
    const queue = [...paths];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const src = queue.shift();
        const image = new Image();
        image.loading = 'eager';
        const loaded = new Promise(resolve => {
          const timer = setTimeout(() => finish(false), 20000);
          function finish(ok) { clearTimeout(timer); image.remove(); resolve({ src, ok }); }
          image.onload = () => finish(image.naturalWidth > 0);
          image.onerror = () => { if (new URL(image.src).searchParams.get('_img_retry') === '2') finish(false); };
        });
        image.src = src;
        image.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px';
        document.body.append(image);
        results.push(await loaded);
      }
    }));
    return results;
  }, manifest.images);
  const failed = results.filter(result => !result.ok);
  assert.deepEqual(failed, [], '图片加载或解码失败：' + JSON.stringify(failed));
  console.log('图片逐张解码通过：' + results.length + ' 张；' + baseUrl);
  await page.locator('img[src]').evaluateAll(imgs => imgs.forEach(image => { image.loading = 'eager'; }));
  await page.waitForFunction(() => [...document.querySelectorAll('img[src]')].every(image => image.complete && image.naturalWidth > 0), null, { timeout: 30000 });
  console.log('页面已有图片全部显示正常。');
} finally {
  await browser.close();
}
