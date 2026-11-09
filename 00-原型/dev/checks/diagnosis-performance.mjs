import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function diagnosisPerformance(page){
 await page.addInitScript(()=>{
  window.__diagnosisPerf={writes:0,ready:0};
  const save=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key==='dashboard.ai-results.v1')window.__diagnosisPerf.writes++;return save.call(this,key,value)};
  window.addEventListener('dashboard:ready',()=>{window.__diagnosisPerf.ready=performance.now()},{once:true});
 });
 const client=await page.context().newCDPSession(page);
 await client.send('Profiler.enable');await client.send('Profiler.start');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const ready=await page.evaluate(()=>window.__diagnosisPerf.ready);
 await page.locator('a[href="#ai"]').click();
 const before=await page.evaluate(()=>({history:JSON.stringify(aiResultHistoryAudit()),writes:window.__diagnosisPerf.writes}));
 const samples=[];
 for(const part of ['resource','execution','tasks','coordination','resource','execution','coordination']){
  const result=await page.evaluate(part=>new Promise(resolve=>{
   const start=performance.now();document.querySelector('[data-gd-part="'+part+'"]').click();
   const handlerMs=performance.now()-start;let microtaskMs=0;queueMicrotask(()=>{microtaskMs=performance.now()-start});
   requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({part,ms:performance.now()-start,handlerMs:Math.round(handlerMs),microtaskMs:Math.round(microtaskMs),active:document.querySelector('[data-gd-part="'+part+'"]').getAttribute('aria-pressed')})));
  }),part);
  assert.equal(result.active,'true');samples.push(result);
 }
 await page.locator('[data-gd-part="resource"]').click();
 for(const tab of ['omission','blocker','solution','focus-shift','omission'])await page.locator('[data-gd-tab="'+tab+'"]').click();
 await page.locator('[data-gd-search]').fill('演示样例');
 assert.equal(await page.locator('[data-gd-deviation="demo-omission-two-checks"]').count(),1);
 await page.locator('[data-gd-search]').fill('');
 const after=await page.evaluate(()=>({history:JSON.stringify(aiResultHistoryAudit()),writes:window.__diagnosisPerf.writes}));
 const {profile}=await client.send('Profiler.stop');await client.detach();
 const nodes=new Map(profile.nodes.map(node=>[node.id,node])),times=new Map();
 for(let i=0;i<(profile.samples||[]).length;i++){
  const name=nodes.get(profile.samples[i])?.callFrame.functionName||'(anonymous)';
  times.set(name,(times.get(name)||0)+(profile.timeDeltas?.[i]||0)/1000);
 }
 const hot=[...times].filter(([name])=>!['(idle)','(program)'].includes(name)).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([name,ms])=>({name,ms:Math.round(ms)}));
 const result={readyMs:Math.round(ready),cards:samples.map(s=>({...s,ms:Math.round(s.ms)})),historyWrites:after.writes-before.writes,hot};
 const folder=new URL('../../../outputs/performance/',import.meta.url);fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(new URL('diagnosis-'+(process.env.DASHBOARD_PERF_BASELINE?'before':'after')+'.json',folder),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
 if(!process.env.DASHBOARD_PERF_BASELINE){
  assert.equal(after.history,before.history,'卡片、Tab及搜索不重新生成诊断历史');
  assert.equal(result.historyWrites,0,'只切换视图不写诊断存储');
  // 完整两帧含浏览器布局；事件处理另设预算，避免只让选中态变快、正文仍卡住。
  for(const sample of samples){
   assert(sample.handlerMs<100,'卡片事件不应阻塞主线程：'+JSON.stringify(sample));
   assert(sample.ms<800,'卡片正文应在800ms内完成布局：'+JSON.stringify(sample));
  }
  // 产品中心复用同一数据视图；角色变化必须重新取数，卡片切换只复用该角色的数据。
  await page.goto(new URL('产品中心.html',page.url()).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  for(const role of ['manager','owner']){
   await page.locator('#pc-person').selectOption(role);
   for(const part of ['coordination','resource','execution','tasks']){
    await page.locator('[data-gd-part="'+part+'"]').click();
    const scope=await page.evaluate(()=>globalDiagnosisAudit());
    assert.equal(scope.state.part,part);
    for(const row of [...scope.work,...scope.deviations]){
     assert(row.participants.every(p=>['产品中心','产品部'].includes(p.department)),'不复用其他角色或部门的人员');
     if(role==='owner')assert(row.categories.includes('环境'),'产品经理只读取环境链群');
    }
   }
  }
  console.log('产品中心总监/产品经理四卡片切换及范围隔离通过');
 }
}
