import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrototype } from '../原型/build.mjs';
import { optimizeAssets } from './lib/optimize-assets.mjs';
import { copyFiles } from './lib/copy-files.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const from = process.argv.find(arg => arg.startsWith('--from='))?.slice(7);
const prototypeRoot = from ? path.resolve(projectRoot, from) : path.join(projectRoot, '原型');
const outputRoot = path.join(projectRoot, 'dist');
if (!from) buildPrototype();

// 仅发布运行页面需要的文件，不包含需求文档、开发脚本和验证截图。
if (path.relative(projectRoot, outputRoot) !== 'dist') {
  throw new Error('发布目录必须是项目根目录下的 dist');
}
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
const manifest=JSON.parse(fs.readFileSync(path.join(prototypeRoot,'manifest.json'),'utf8'));
const pages=manifest.pages?.map(entry=>entry.file)||['index.html'];
for (const entry of [...pages, 'assets', 'styles']) {
  copyFiles(path.join(prototypeRoot, entry), path.join(outputRoot, entry), {
    recursive: true,
  });
}
// 店铺配置及目标来源页是独立运行入口，保留相对路径，排除源码和测试。
for (const entry of ['数智罗盘/店铺配置.html', '数智罗盘/目标管理', 'src/data/filter-catalog.js']) {
  const destination = path.join(outputRoot, entry);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  copyFiles(path.join(prototypeRoot, entry), destination, {
    recursive: true,
    filter: file => !file.endsWith('.md'),
  });
}

const optimization = await optimizeAssets(outputRoot);
const reportRoot = path.join(projectRoot, 'outputs/performance');
fs.mkdirSync(reportRoot, { recursive: true });
fs.writeFileSync(path.join(reportRoot, 'optimized-build.json'), JSON.stringify(optimization, null, 2));
console.log(JSON.stringify(optimization));

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(file) : [file];
  });
}
const files = collectFiles(outputRoot);
for (const file of files) {
  if (fs.statSync(file).size > 25 * 1024 * 1024) {
    throw new Error('文件超过 Cloudflare Pages 单文件限制：' + file);
  }
}
console.log('发布目录：' + outputRoot + '；共 ' + files.length + ' 个文件。');
