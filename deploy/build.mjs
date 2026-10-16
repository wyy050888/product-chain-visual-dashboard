import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrototype } from '../原型/build.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const prototypeRoot = path.join(projectRoot, '原型');
const outputRoot = path.join(projectRoot, 'dist');
buildPrototype();

// 仅发布运行页面需要的文件，不包含需求文档、开发脚本和验证截图。
if (path.relative(projectRoot, outputRoot) !== 'dist') {
  throw new Error('发布目录必须是项目根目录下的 dist');
}
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
for (const entry of ['index.html', 'assets', 'styles']) {
  fs.cpSync(path.join(prototypeRoot, entry), path.join(outputRoot, entry), {
    recursive: true,
  });
}
// 店铺配置及目标来源页是独立运行入口，保留相对路径，排除源码和测试。
for (const entry of ['数智罗盘/店铺配置.html', '数智罗盘/目标管理']) {
  const destination = path.join(outputRoot, entry);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(path.join(prototypeRoot, entry), destination, {
    recursive: true,
    filter: file => !file.endsWith('.md'),
  });
}

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
