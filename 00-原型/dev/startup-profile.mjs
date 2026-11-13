import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {acquireProcessLock} from './process-lock.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),option=(name,fallback)=>args.find(arg=>arg.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const label=option('label','startup'),runs=Number(option('runs','5'));
if(!/^[\w-]+$/.test(label)||!Number.isInteger(runs)||runs<1||runs>20)throw Error('label只允许字母数字和连字符；runs为1–20');
const target=option('url',pathToFileURL(path.join(root,'index.html')).href);
const out=path.resolve(root,option('out','../outputs/performance/startup'));
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.DASHBOARD_PLAYWRIGHT_PATH||path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const lease=await acquireProcessLock(root,'browser-check',{onWait:()=>console.log('等待现有浏览器验证结束')});
let browser;
try{
 fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.DASHBOARD_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const samples=[];
 // 同一浏览器逐次新建隔离上下文；每次都是空存储/冷缓存，避免后台并发和旧快照干扰。
 for(let run=0;run<runs;run++){
  const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
  try{
   const page=await context.newPage(),session=await context.newCDPSession(page),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('requestfailed',request=>errors.push(request.url()+': '+request.failure()?.errorText));
   await session.send('Performance.enable');
   await page.addInitScript(()=>{
    window.__startupSample={readyAt:null,usableAt:null,longTasks:[]};
    window.addEventListener('dashboard:ready',()=>{
     window.__startupSample.readyAt=performance.now();
     // 包括业务渲染后的微任务、年份控件挂载和首轮布局，避免只量“ready”事件。
     requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__startupSample.usableAt=performance.now()}));
    },{once:true});
    new PerformanceObserver(list=>window.__startupSample.longTasks.push(...list.getEntries().map(task=>({start:task.startTime,duration:task.duration})))).observe({type:'longtask',buffered:true});
   });
   if(run===0){await session.send('Profiler.enable');await session.send('Profiler.start')}
   await page.goto(target,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>window.__startupSample?.usableAt!==null,null,{timeout:30000});
   // 另记首屏后的布局成本；固定等待只用于收集，不计入usableAt。
   await page.waitForTimeout(500);
   const data=await page.evaluate(()=>({
    ...window.__startupSample,paints:performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime})),
    navigation:performance.getEntriesByType('navigation')[0]?.toJSON(),
    resources:performance.getEntriesByType('resource').map(r=>({url:r.name,type:r.initiatorType,start:r.startTime,end:r.responseEnd,duration:r.duration,bytes:r.transferSize,encoded:r.encodedBodySize})),
    nodes:document.getElementsByTagName('*').length,
    yearControls:document.querySelectorAll('.ui-year-trigger').length,
    staleCharts:document.querySelectorAll('[data-ip-stale-trend-plot]>svg').length
   }));
   const {metrics}=await session.send('Performance.getMetrics');
   data.metrics=Object.fromEntries(metrics.map(m=>[m.name,m.value]));data.errors=errors;
   if(run===0){const {profile}=await session.send('Profiler.stop');fs.writeFileSync(path.join(out,label+'.cpuprofile'),JSON.stringify(profile))}
   samples.push(data);
   console.log(JSON.stringify({label,run:run+1,readyMs:Math.round(data.readyAt),usableMs:Math.round(data.usableAt),loadedMs:Math.round(data.navigation.loadEventEnd),scriptMs:Math.round(data.metrics.ScriptDuration*1000),styleMs:Math.round(data.metrics.RecalcStyleDuration*1000),layoutMs:Math.round(data.metrics.LayoutDuration*1000),layouts:data.metrics.LayoutCount,errors}));
  }finally{await context.close()}
 }
 const median=key=>{const values=samples.map(key).sort((a,b)=>a-b);return values[Math.floor(values.length/2)]};
 const summary={label,target,runs,measuredAt:new Date().toISOString(),viewport:{width:1920,height:1080},median:{readyMs:median(s=>s.readyAt),usableMs:median(s=>s.usableAt),loadedMs:median(s=>s.navigation.loadEventEnd),scriptMs:median(s=>s.metrics.ScriptDuration*1000),styleMs:median(s=>s.metrics.RecalcStyleDuration*1000),layoutMs:median(s=>s.metrics.LayoutDuration*1000),layouts:median(s=>s.metrics.LayoutCount)},samples};
 fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(summary,null,2));
 console.log(JSON.stringify({label,median:summary.median}));
 if(samples.some(s=>s.errors.length))process.exitCode=1;
}finally{await browser?.close();lease.release()}
