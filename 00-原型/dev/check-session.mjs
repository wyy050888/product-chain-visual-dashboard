import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {acquireProcessLock} from './process-lock.mjs';

const ttl=5*60*1000;
function filesBelow(directory){
 return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(directory,entry.name);return entry.isDirectory()?filesBelow(file):[file];
 });
}
// 全部运行源文件、台账、图片及检查代码纳入指纹，不按不完整依赖图猜测复用。
export function checkFingerprint(root,env=process.env){
 root=path.resolve(root);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 const files=new Set(['manifest.json','build.mjs','dev.mjs',manifest.template,
  ...manifest.scripts.map(item=>item.file),...manifest.styles.map(item=>item.file),...manifest.images,
  ...manifest.pages.map(item=>item.file),'assets/app.js',
  ...filesBelow(path.join(root,'src')),...filesBelow(path.join(root,'assets')),
  ...filesBelow(path.join(root,'dev'))].map(file=>path.resolve(root,file)));
 const hash=createHash('sha256');
 for(const file of [...files].sort()){if(!fs.statSync(file).isFile())continue;hash.update(path.relative(root,file));hash.update(fs.readFileSync(file))}
 const options=Object.fromEntries(Object.entries(env).filter(([key])=>key.startsWith('DASHBOARD_')&&!['DASHBOARD_CHECK_NAMES','DASHBOARD_CHECK_REPORT','DASHBOARD_CONTINUE_CHECKS'].includes(key)).sort());
 const browser=env.DASHBOARD_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 const browserStat=fs.existsSync(browser)?fs.statSync(browser):null;
 hash.update(JSON.stringify({node:process.version,executable:process.execPath,browser:browserStat&&[browserStat.size,browserStat.mtimeMs],day:new Date().toLocaleDateString('en-CA'),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,options}));
 return hash.digest('hex');
}
export async function checkSession(root,plan,run,{env=process.env,log=console.log,fingerprint=()=>checkFingerprint(root,env)}={}){
 const cacheFile=path.join(root,'.dev-cache/check-results.json'),reusable=!plan.force&&!env.DASHBOARD_TEST_URL&&!env.DASHBOARD_CHECK_REPORT;
 const inspect=()=>{
  const key=fingerprint();let cache={};
  try{cache=JSON.parse(fs.readFileSync(cacheFile,'utf8'))}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error}
  const previous=cache.fingerprint===key?cache.passed||{}:{},now=Date.now();
  return {key,previous,pending:plan.names.filter(name=>!reusable||!Number.isFinite(previous[name])||now<previous[name]||now-previous[name]>ttl)};
 };
 const reused=pending=>{for(const name of plan.names.filter(name=>!pending.includes(name)))log('复用已通过：'+name+'（相同代码，5分钟内；--force可重跑）')};
 // 已有完整成功记录时无需排队；缓存原子替换，读者不会读到半份记录。
 const ready=inspect();if(!ready.pending.length){reused([]);return {reused:plan.names.length,executed:0}}
 const lease=await acquireProcessLock(root,'browser-check',{onWait:owner=>log('已有会话正在验证'+(owner?.pid?'（PID '+owner.pid+'）':'')+'，等待后复用相同版本结果。')});
 try{
  const {key,previous,pending}=inspect();reused(pending);
  if(!pending.length)return {reused:plan.names.length,executed:0};
  await run(pending);
  if(fingerprint()!==key){log('验证期间有其他会话修改了文件，本轮结果不进入复用缓存。');return {reused:plan.names.length-pending.length,executed:pending.length,changed:true}}
  const passed={...previous,...Object.fromEntries(pending.map(name=>[name,Date.now()]))},temporary=cacheFile+'.'+randomUUID()+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify({fingerprint:key,passed}));fs.renameSync(temporary,cacheFile);
  return {reused:plan.names.length-pending.length,executed:pending.length};
 }finally{lease.release()}
}
