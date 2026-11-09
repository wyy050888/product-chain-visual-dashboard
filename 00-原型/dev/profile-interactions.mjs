import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {interactionCases,applyMeasuredInteraction} from './interaction-cases.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.DASHBOARD_PLAYWRIGHT_PATH||path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.resolve(root,'../outputs/performance');
const label=process.argv[2]||'interactions',runs=[];
fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.DASHBOARD_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 for(let run=0;run<Number(process.env.DASHBOARD_PROFILE_RUNS||3);run++){
  const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],samples=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));
  await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const client=await context.newCDPSession(page);if(run===0){await client.send('Profiler.enable');await client.send('Profiler.start')}
  let module='';
  for(const step of interactionCases){
   if(module!==step.module){module=step.module;await page.locator('.jumpnav a[href="#'+module+'"]').evaluate(node=>node.click());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
   const times=await applyMeasuredInteraction(page,step);
   const result=await page.locator('#'+module).evaluate(node=>({text:node.textContent.replace(/\s+/g,' ').trim(),rows:node.querySelectorAll('tbody tr').length,period:window.dashboardPeriodSnapshot().modules[node.id]}));
   const signature=createHash('sha256').update(result.text).digest('hex').slice(0,16);
   const sample={id:step.id,module,...times,signature,rows:result.rows,period:result.period};
   // 只用于独立一致性核对；正式性能轮次不执行额外刷新，避免把预热算作优化。
   if(process.env.DASHBOARD_PROFILE_VERIFY_FULL==='1'&&/^risk-(platform|season)-/.test(step.id)){
    await page.locator('#risk [data-time-year]').selectOption(String(result.period.year));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
    const full=await page.locator('#risk').evaluate(node=>node.textContent.replace(/\s+/g,' ').trim());
    sample.fullSignature=createHash('sha256').update(full).digest('hex').slice(0,16);
    sample.matchesFull=full===result.text;
   }
   samples.push(sample);
  }
  if(run===0){const {profile}=await client.send('Profiler.stop');fs.writeFileSync(path.join(folder,label+'.cpuprofile'),JSON.stringify(profile))}
  runs.push({samples,errors});console.log(JSON.stringify({run:run+1,slowest:[...samples].sort((a,b)=>b.frameMs-a.frameMs).slice(0,12).map(({id,handlerMs,frameMs})=>({id,handlerMs:Math.round(handlerMs),frameMs:Math.round(frameMs)})),errors}));
  await context.close();
 }
 fs.writeFileSync(path.join(folder,label+'.json'),JSON.stringify({label,cases:interactionCases,runs},null,2));
}finally{await browser.close()}
