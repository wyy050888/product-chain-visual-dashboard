import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve(path.dirname(process.execPath), '../node_modules/playwright'));
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'outputs/performance');
fs.mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
async function measure(label, url, context) {
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  const requests = new Map();
  await session.send('Network.enable');
  await session.send('Performance.enable');
  await session.send('Profiler.enable');
  session.on('Network.requestWillBeSent', event => requests.set(event.requestId, { ...(requests.get(event.requestId) || {}), url: event.request.url }));
  session.on('Network.responseReceived', event => requests.set(event.requestId, { ...(requests.get(event.requestId) || {}), status: event.response.status, cached: !!(event.response.fromDiskCache || event.response.fromPrefetchCache) }));
  session.on('Network.responseReceivedExtraInfo', event => requests.set(event.requestId, { ...(requests.get(event.requestId) || {}), wireStatus: event.statusCode }));
  await page.addInitScript(() => {
    window.__startupAudit = { readyAt: null, longTasks: [] };
    window.addEventListener('dashboard:ready', () => { window.__startupAudit.readyAt = performance.now(); }, { once: true });
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver(list => window.__startupAudit.longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })))).observe({ type: 'longtask', buffered: true });
    }
  });
  const failures = [];
  page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
  await session.send('Profiler.start');
  let error;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.documentElement.dataset.dashboardBoot === 'ready', null, { timeout: 30000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  } catch (failure) { error = failure.message.split('\n')[0]; }
  const result = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource').map(entry => ({
      url: entry.name, type: entry.initiatorType, start: entry.startTime, firstByte: entry.responseStart,
      end: entry.responseEnd, duration: entry.duration, bytes: entry.transferSize, encoded: entry.encodedBodySize,
    }));
    return { url: location.href, readyAt: window.__startupAudit?.readyAt,
      navigation: navigation?.toJSON(), paints: performance.getEntriesByType('paint').map(entry => ({ name: entry.name, at: entry.startTime })),
      longTasks: window.__startupAudit?.longTasks || [], resources, nodes: document.getElementsByTagName('*').length };
  });
  const { profile } = await session.send('Profiler.stop');
  const metrics = await session.send('Performance.getMetrics');
  fs.writeFileSync(path.join(directory, label + '.cpuprofile'), JSON.stringify(profile));
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const samples = new Map();
  for (let i = 0; i < (profile.samples || []).length; i++) samples.set(profile.samples[i], (samples.get(profile.samples[i]) || 0) + (profile.timeDeltas?.[i] || 0));
  const hot = [...samples].map(([id, us]) => ({ name: nodes.get(id)?.callFrame.functionName || '(anonymous)', ms: Math.round(us / 1000) })).filter(entry => !['(idle)', '(program)'].includes(entry.name)).sort((a, b) => b.ms - a.ms).slice(0, 12);
  Object.assign(result, { label, error, failures, requests: [...requests.values()], metrics: Object.fromEntries(metrics.metrics.map(entry => [entry.name, entry.value])), hot });
  fs.writeFileSync(path.join(directory, label + '.json'), JSON.stringify(result, null, 2));
  const app = result.resources.find(entry => /\/assets\/app\.js(?:[?#]|$)/.test(entry.url));
  const styles = result.resources.filter(entry => /\.css(?:[?#]|$)/.test(entry.url));
  console.log(JSON.stringify({ label, error, readyMs: result.readyAt && Math.round(result.readyAt), firstByteMs: Math.round(result.navigation?.responseStart || 0), appDownloadMs: app && Math.round(app.duration), appWireKB: app && Math.round(app.bytes / 1024), appEncodedKB: app && Math.round(app.encoded / 1024), cssRequests: styles.length, scriptCpuMs: Math.round(result.metrics.ScriptDuration * 1000), layoutMs: Math.round(result.metrics.LayoutDuration * 1000), nodes: result.nodes, failedRequests: failures.length, hot: hot.slice(0, 5) }));
  await page.close();
  return result;
}
try {
  const target = process.argv[2] || 'https://chainboard-wyy.pages.dev/';
  const prefix = process.argv[3] || 'optimized';
  const online = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await measure(prefix + '-cold', target, online);
  await measure(prefix + '-warm', target, online);
  await online.close();
  if (process.env.DASHBOARD_CONTROL_URL) {
    const local = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await measure(prefix + '-control', process.env.DASHBOARD_CONTROL_URL, local);
    await local.close();
  }
} finally { await browser.close(); }