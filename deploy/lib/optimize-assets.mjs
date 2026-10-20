import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { transform } from 'esbuild';

const hash = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
const sizes = text => ({ raw: Buffer.byteLength(text), gzip: gzipSync(text).length, brotli: brotliCompressSync(Buffer.from(text)).length });

// 仅优化发布产物；业务闭包、模块顺序和开发入口保持原构建规则。
export async function optimizeAssets(root) {
  const entry = path.join(root, 'index.html');
  let html = fs.readFileSync(entry, 'utf8');
  const links = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="(styles\/[^"?]+)(?:\?[^\"]*)?"\s*\/?\s*>/g)];
  if (!links.length) throw new Error('未找到待合并样式，停止发布');
  const css = links.map(([, file]) => {
    if (file.includes('..')) throw new Error('样式路径越界');
    return fs.readFileSync(path.join(root, file), 'utf8');
  }).join('\n');
  const cssResult = await transform(css, { loader: 'css', minify: true, charset: 'utf8', target: 'es2020', legalComments: 'none' });
  if (cssResult.warnings.length) throw new Error(cssResult.warnings.map(item => item.text).join('\n'));
  const cssPath = 'styles/dashboard.' + hash(cssResult.code) + '.css';
  fs.writeFileSync(path.join(root, cssPath), cssResult.code);
  html = html.replace(links[0][0], '<link id="dashboard-styles" rel="stylesheet" href="' + cssPath + '">');
  for (const link of links.slice(1)) html = html.replace(link[0], '');

  const original = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
  const declaration = /const drawerPreviewCss = [^\r\n]*;\r?\n/;
  if (!declaration.test(original)) throw new Error('抽屉样式声明已变化，停止发布');
  // 同源样式在 defer 脚本前就绪；复用 CSSOM，避免脚本重复携带整份 CSS。
  const source = original.replace(declaration, 'const drawerPreviewCss = Array.from(document.getElementById("dashboard-styles").sheet.cssRules, rule => rule.cssText).join("\\n");');
  const result = await transform(source, { loader: 'js', minify: true, keepNames: true, treeShaking: false, charset: 'utf8', target: 'es2020', legalComments: 'none' });
  if (result.warnings.length) throw new Error(result.warnings.map(item => item.text).join('\n'));
  new vm.Script(result.code, { filename: 'release-app.js' });
  const jsPath = 'releases/' + hash(result.code) + '/assets/app.js';
  fs.mkdirSync(path.dirname(path.join(root, jsPath)), { recursive: true });
  fs.writeFileSync(path.join(root, jsPath), result.code);
  const script = /src="assets\/app\.js(?:\?[^\"]*)?"/;
  if (!script.test(html)) throw new Error('主脚本入口已变化，停止发布');
  html = html.replace(script, 'src="' + jsPath + '"');
  fs.writeFileSync(entry, html);
  fs.writeFileSync(path.join(root, '_headers'), [jsPath, cssPath].map(file => '/' + file + '\n  Cache-Control: public, max-age=31536000, immutable').join('\n\n') + '\n');
  return { stylesBefore: links.length, stylesAfter: 1, jsPath, cssPath, scriptBefore: sizes(original), scriptAfter: sizes(result.code), cssBefore: sizes(css), cssAfter: sizes(cssResult.code) };
}
