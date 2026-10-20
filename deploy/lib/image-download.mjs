import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// curl 使用独立 HTTP/1.1 连接，避免浏览器的 QUIC 故障影响资源完整性核对。
export async function downloadImage(url, destination, timeoutSeconds) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const partial = destination + '.partial';
  const resume = fs.existsSync(partial) && fs.statSync(partial).size > 0;
  const args = ['--http1.1', '--fail', '--silent', '--show-error',
    '--connect-timeout', '15', '--max-time', String(timeoutSeconds),
    '--max-filesize', '26214400', '--output', partial,
    '--write-out', '%{http_code}|%{size_download}|%{content_type}'];
  if (resume) args.push('--continue-at', '-');
  args.push(url);
  const result = await new Promise((resolve, reject) => {
    const child = spawn('curl.exe', args, { windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  if (result.code !== 0) {
    // 服务端不接受续传时，下轮从完整文件重新开始。
    if ([22, 33, 36].includes(result.code) && fs.existsSync(partial)) fs.unlinkSync(partial);
    throw new Error(result.stderr.trim() || 'curl exit ' + result.code);
  }
  const [status, , contentType] = result.stdout.trim().split('|');
  if (!['200', '206'].includes(status)) throw new Error('图片响应状态异常：' + status);
  fs.renameSync(partial, destination);
  return { httpStatus: Number(status), contentType };
}
