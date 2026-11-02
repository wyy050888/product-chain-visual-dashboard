import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

// 同一浏览器、独立空缓存上下文串行测量；CPU采样不进入页面业务代码。
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.DASHBOARD_PLAYWRIGHT_PATH||path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const label=process.argv[2]||'global-load';
const folder=path.resolve(root,'../outputs/performance');fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const runs=[];
try{
 for(let run=0;run<3;run++){
  const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   window.__loadMeasure={longTasks:[]};
   new PerformanceObserver(list=>window.__loadMeasure.longTasks.push(...list.getEntries().map(entry=>({start:entry.startTime,ms:entry.duration})))).observe({type:'longtask',buffered:true});
   window.addEventListener('dashboard:ready',()=>{
    window.__loadMeasure.ready=performance.now();
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.__loadMeasure.settled=performance.now()));
   },{once:true});
  });
  const client=await context.newCDPSession(page);await client.send('Performance.enable');
  if(run===0){await client.send('Profiler.enable');await client.send('Profiler.start')}
  await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.__loadMeasure?.settled,{timeout:60000});
  await page.waitForTimeout(400);
  const result=await page.evaluate(()=>({...window.__loadMeasure,paint:performance.getEntriesByType('paint').map(entry=>({name:entry.name,ms:entry.startTime})),navigation:performance.getEntriesByType('navigation').map(({domContentLoadedEventEnd,loadEventEnd})=>({domContentLoadedEventEnd,loadEventEnd})),sections:[...document.querySelectorAll('section.section')].map(node=>({id:node.id,text:node.textContent.length,rows:node.querySelectorAll('tbody tr').length})),nodes:document.querySelectorAll('*').length}));
  const {metrics}=await client.send('Performance.getMetrics');result.metrics=Object.fromEntries(metrics.filter(({name})=>/^(LayoutCount|LayoutDuration|RecalcStyleCount|RecalcStyleDuration|ScriptDuration|TaskDuration|JSHeapUsedSize)$/.test(name)).map(({name,value})=>[name,value]));result.errors=errors;
  if(run===0){
   const {profile}=await client.send('Profiler.stop');fs.writeFileSync(path.join(folder,label+'.cpuprofile'),JSON.stringify(profile));
   const nodes=new Map(profile.nodes.map(node=>[node.id,node])),times=new Map();
   profile.samples.forEach((id,index)=>times.set(id,(times.get(id)||0)+(profile.timeDeltas[index]||0)));
   result.hotspots=[...times].sort((a,b)=>b[1]-a[1]).slice(0,28).map(([id,us])=>({name:nodes.get(id).callFrame.functionName,line:nodes.get(id).callFrame.lineNumber+1,ms:Math.round(us/1000)}));
  }
  runs.push(result);console.log(JSON.stringify({run:run+1,ready:result.ready,settled:result.settled,metrics:result.metrics,hotspots:result.hotspots,errors}));
  await context.close();
 }
 fs.writeFileSync(path.join(folder,label+'.json'),JSON.stringify({label,runs},null,2));
}finally{await browser.close()}
