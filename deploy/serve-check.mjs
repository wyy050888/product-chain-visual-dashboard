import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),baseline=url.pathname.startsWith('/baseline/');
  const base=path.join(root,baseline?'outputs/release-baseline':'dist');
  const relative=decodeURIComponent(url.pathname.replace(/^\/(baseline|candidate)\//,''));
  const file=path.resolve(base,relative.endsWith('/')?relative+'index.html':relative||'index.html');
  const inside=path.relative(base,file);
  if(inside==='..'||inside.startsWith('..'+path.sep)||path.isAbsolute(inside)){res.writeHead(403).end();return}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control',/[/\\]releases[/\\]|dashboard\.[a-f0-9]+\.css$/.test(file)?'public, max-age=31536000, immutable':'no-cache');
  const data=fs.readFileSync(file);res.end(data);
 }catch{res.writeHead(404).end('Not found')}
}).listen(8931,'127.0.0.1',()=>console.log('Background QA: http://127.0.0.1:8931/candidate/'));
