import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseUrl = process.argv[2] || 'https://chainboard-wyy.pages.dev/';
// 资源下载/解码与实际页面渲染分开核验，避免检查容器触发业务页面整页重绘。
for (const script of ['audit-images.mjs', 'check-page-images.mjs']) {
  const args = [fileURLToPath(new URL(script, import.meta.url)), baseUrl];
  if (process.argv.includes('--resume')) args.push('--resume');
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(script + ' 检查未通过，退出码 ' + code)));
  });
}
