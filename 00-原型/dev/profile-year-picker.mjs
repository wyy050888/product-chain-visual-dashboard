import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.DASHBOARD_PLAYWRIGHT_PATH);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.resolve(root,'../outputs/performance'),label=process.argv[2]||'year-picker-profile';
fs.mkdirSync(folder,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const sourceHashes=Object.fromEntries(manifest.scripts.map(({file})=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const variants=process.env.DASHBOARD_YEAR_COMPARE==='1'?['before','after']:['current'];
const bundles=Object.fromEntries(variants.map(variant=>{
 const read=file=>fs.readFileSync(variant==='before'&&fs.existsSync(path.join(folder,process.env.DASHBOARD_PROFILE_BASELINE||'year-picker-before',file))?path.join(folder,process.env.DASHBOARD_PROFILE_BASELINE||'year-picker-before',file):path.join(root,file),'utf8');
 const css=manifest.styles.map(({file})=>read(file)).join('\n');
 return [variant,{body:read('src/runtime/open.js')+'const drawerPreviewCss='+JSON.stringify(css)+';\nconst dashboardPages='+JSON.stringify(manifest.pages)+';\n'+manifest.scripts.map(({file})=>read(file)).join('')+read('src/runtime/close.js'),hashes:Object.fromEntries(manifest.scripts.map(({file})=>[file,createHash('sha256').update(read(file)).digest('hex')]))}];
}));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),runs=[];
try{
 for(let round=0;round<Number(process.env.DASHBOARD_PROFILE_RUNS||3);round++)for(const variant of (round%2?[...variants].reverse():variants)){
  const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  await page.route('**/assets/app.js*',route=>route.fulfill({contentType:'text/javascript',body:bundles[variant].body}));
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(process.env.DASHBOARD_PROFILE_TIME||'2026-10-26T04:00:00Z'));
  await page.addInitScript(()=>{
   const blank=()=>({observerCalls:0,observerMs:0,flushes:0,flushMs:0,attributeWrites:0,yearLayouts:0,yearStyleReads:0});
   window.__yearPerf={now:blank(),reset(){this.now=blank()}};
   const NativeObserver=window.MutationObserver;
   window.MutationObserver=class extends NativeObserver{constructor(fn){const year=fn.toString().includes('uiYearPending');super(year?(records,observer)=>{const start=performance.now();try{fn(records,observer)}finally{__yearPerf.now.observerCalls++;__yearPerf.now.observerMs+=performance.now()-start}}:fn)}};
   const micro=window.queueMicrotask;window.queueMicrotask=function(fn){if(!fn.toString().includes('uiYear'))return micro(fn);return micro(()=>{const start=performance.now();try{fn()}finally{__yearPerf.now.flushes++;__yearPerf.now.flushMs+=performance.now()-start}})};
   new NativeObserver(records=>{for(const r of records)if(r.type==='attributes'&&r.target.matches('.ui-year-field,.ui-year-trigger'))__yearPerf.now.attributeWrites++}).observe(document,{attributes:true,childList:false,subtree:true});
   const bounds=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){if(this.matches('.ui-year-trigger,.ui-year-panel'))__yearPerf.now.yearLayouts++;return bounds.call(this)};
   const style=window.getComputedStyle;window.getComputedStyle=function(node,...args){if(node.matches?.('select')&&[...node.options].some(o=>/^\d{4}\s*年?$/.test(o.textContent.trim())))__yearPerf.now.yearStyleReads++;return style.call(this,node,...args)};
   window.addEventListener('dashboard:ready',()=>{window.__yearReady=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__yearSettled=performance.now()))},{once:true});
  });
  const client=await context.newCDPSession(page);await client.send('Performance.enable');
  await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'load'});await page.waitForFunction(()=>window.__yearSettled);
  const load=await page.evaluate(()=>({ready:__yearReady,settled:__yearSettled,year:{...__yearPerf.now}}));
  const measure=async(name,action)=>{
   const value=await page.evaluate(async({name,action})=>{__yearPerf.reset();const begin=performance.now();const handler=Function('return ('+action+')')();await handler();const handlerMs=performance.now()-begin;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));return {name,handlerMs,frameMs:performance.now()-begin,...__yearPerf.now}}, {name,action:action.toString()});
   return value;
  };
  const samples=[];
  samples.push(await measure('risk-year-mode',()=>document.querySelector('#time-risk [data-time-mode=year]').click()));
  samples.push(await measure('open-year',()=>document.querySelector('#time-risk .ui-year-trigger').click()));
  const cpu=process.env.DASHBOARD_YEAR_CPU==='1'&&round===0&&variant!=='before';if(cpu){await client.send('Profiler.enable');await client.send('Profiler.start')}
  samples.push(await measure('choose-2025',()=>document.querySelector('.ui-year-panel:popover-open [data-ui-year-value="2025"]').click()));
  if(cpu){const {profile}=await client.send('Profiler.stop');fs.writeFileSync(path.join(folder,label+'.cpuprofile'),JSON.stringify(profile));const nodes=new Map(profile.nodes.map(n=>[n.id,n])),times=new Map();profile.samples.forEach((id,i)=>times.set(id,(times.get(id)||0)+(profile.timeDeltas[i]||0)));const hotspots=[...times].sort((a,b)=>b[1]-a[1]).slice(0,16).map(([id,us])=>({name:nodes.get(id).callFrame.functionName,ms:Math.round(us/1000)}));fs.writeFileSync(path.join(folder,label+'-hotspots.json'),JSON.stringify(hotspots,null,2));console.log(JSON.stringify({hotspots}))}
  samples.push(await measure('open-year-again',()=>document.querySelector('#time-risk .ui-year-trigger').click()));
  samples.push(await measure('choose-2026',()=>document.querySelector('.ui-year-panel:popover-open [data-ui-year-value="2026"]').click()));
  await page.evaluate(()=>{const host=document.createElement('div');host.id='year-unrelated';host.hidden=true;document.body.append(host)});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  samples.push(await measure('unrelated-10-updates',async()=>{for(let i=0;i<10;i++){document.querySelector('#year-unrelated').append(document.createElement('span'));await new Promise(r=>requestAnimationFrame(r))}}));
  await page.evaluate(()=>{const host=document.createElement('div');host.id='year-gc';host.innerHTML='<select aria-label="清理测试年份"><option>2025年</option><option selected>2026年</option></select>';document.body.append(host)});await page.waitForFunction(()=>!!document.querySelector('#year-gc .ui-year-trigger'));
  await page.evaluate(()=>{window.__removedYear=new WeakRef(document.querySelector('#year-gc select'));document.querySelector('#year-gc').remove()});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await client.send('HeapProfiler.collectGarbage');await client.send('HeapProfiler.collectGarbage');
  const retainedRemoved=await page.evaluate(()=>!!__removedYear.deref());
  const facts=await page.evaluate(()=>({period:dashboardPeriodSnapshot(),newProducts:dashboardNewProductsSnapshot().success,risk:[...document.querySelectorAll('#risk .rp-entry')].map(n=>n.textContent)}));
  const metrics=Object.fromEntries((await client.send('Performance.getMetrics')).metrics.filter(x=>['LayoutCount','LayoutDuration','RecalcStyleCount','RecalcStyleDuration','JSHeapUsedSize'].includes(x.name)).map(x=>[x.name,x.value]));
  const result={variant,load,samples,retainedRemoved,facts,metrics,errors};runs.push(result);console.log(JSON.stringify({round:round+1,variant,load,samples,retainedRemoved,errors}));await context.close();
 }
 fs.writeFileSync(path.join(folder,label+'.json'),JSON.stringify({label,sourceHashes,bundleHashes:Object.fromEntries(variants.map(variant=>[variant,bundles[variant].hashes])),runs},null,2));
}finally{await browser.close()}
