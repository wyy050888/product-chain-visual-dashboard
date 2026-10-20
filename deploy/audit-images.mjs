import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { downloadImage } from './lib/image-download.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.argv[2] || 'https://chainboard-wyy.pages.dev/';
const host = new URL(baseUrl).hostname;
const directory = path.join(root, 'outputs/image-audit', host);
const cacheRoot = path.join(directory, 'cache');
const reportFile = path.join(directory, 'report.json');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, '.gitignore'), '/cache/\n');
const files = JSON.parse(fs.readFileSync(path.join(root, '原型/manifest.json'), 'utf8')).images;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const previous = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
const resume = process.argv.includes('--resume') && previous.url === baseUrl;
const results = new Map((resume ? previous.results || [] : []).map(result => [result.path, result]));
const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve(path.dirname(process.execPath), '../node_modules/playwright'));
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const decoder = await browser.newPage();
function checkpoint(state = 'running') {
  const entries = files.map(file => results.get(file)).filter(Boolean);
  const passed = entries.filter(entry => entry.status === 'passed').length;
  const report = { url: baseUrl, state, total: files.length, passed, updatedAtUtc: new Date().toISOString(), results: entries };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  return report;
}
async function verify(file, round) {
  assert.ok(file.startsWith('assets/') && !file.split('/').includes('..'), '非法图片路径');
  const destination = path.join(cacheRoot, file);
  const local = path.join(root, 'dist', file);
  const expected = hash(fs.readFileSync(local));
  const old = results.get(file);
  if (old?.status === 'passed' && old.sha256 === expected && fs.existsSync(destination)
      && hash(fs.readFileSync(destination)) === expected) return;
  const entry = { path: file, status: 'failed', attempts: (old?.attempts || 0) + 1 };
  try {
    const response = await downloadImage(new URL(file, baseUrl).href, destination, round === 1 ? 45 : 120);
    const bytes = fs.readFileSync(destination);
    assert.equal(hash(bytes), expected, '线上文件与发布包哈希不一致');
    assert.ok(response.contentType.startsWith('image/'), '响应不是图片：' + response.contentType);
    const dimensions = await decoder.evaluate(async payload => {
      const image = new Image();
      try {
        image.src = 'data:' + payload.type + ';base64,' + payload.base64;
        await image.decode();
        return { width: image.naturalWidth, height: image.naturalHeight };
      } finally { image.src = ''; }
    }, { type: response.contentType, base64: bytes.toString('base64') });
    assert.ok(dimensions.width > 0 && dimensions.height > 0, '图片解码尺寸为0');
    Object.assign(entry, response, dimensions, { status: 'passed', bytes: bytes.length, sha256: expected });
  } catch (error) {
    entry.error = error.message.split('\n')[0];
    console.log('待重试：' + file + '；' + entry.error);
  }
  results.set(file, entry);
  const report = checkpoint();
  if (report.passed % 15 === 0 || entry.status !== 'passed') console.log('已通过 ' + report.passed + '/' + files.length);
}
try {
  for (let round = 1; round <= 3; round++) {
    const queue = files.filter(file => results.get(file)?.status !== 'passed'
      || results.get(file).sha256 !== hash(fs.readFileSync(path.join(root, 'dist', file))));
    if (!queue.length) break;
    console.log('第' + round + '轮：检查 ' + queue.length + ' 张图片');
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (queue.length) await verify(queue.shift(), round);
    }));
  }
  const report = checkpoint();
  assert.equal(report.passed, files.length, '仍有图片未通过，详见 ' + reportFile);
  checkpoint('passed');
  console.log('全部通过：' + report.passed + ' 张图片，HTTP状态、文件哈希、浏览器解码均正常。');
  console.log('报告：' + reportFile);
} catch (error) {
  checkpoint('failed');
  throw error;
} finally {
  await browser.close();
}
