import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 用原逐日生成器独立累加，核对前缀汇总、展开明细和目标配置快照。
function verifyAggregates(){
 const products=[{spuId:'a',sourceRow:1,chain:0,actualLaunch:'2024-02-29',profit:15},{spuId:'b',sourceRow:6,chain:1,actualLaunch:'2026-08-15',profit:12}];
 const platforms=['抖音','快手','视频号','天猫','京东','拼多多'];
 const fields=['sales','returned','received','orders','contacts','reviews','bad','gmvCents','refundCents','gsvCents','profitCents','costCents','expenseCents','targetCents','targetProfitCents'];
 const shift=(date,n)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const ctx=vm.createContext({sampleSpus:products,sampleProductRows:()=>products,withPeriod:(_,fn)=>fn(),brLossRows:()=>[],
  qrPlatforms:platforms,dpStore:{newTargets:[20,30],marginTarget:15},
  qrbMonthData:(_,platform,start,end)=>({points:Array.from({length:(Date.parse(end)-Date.parse(start))/86400000+1},(_,i)=>{
   const date=shift(start,i),sales=20+(+date.slice(8))%5+platforms.indexOf(platform);
   return {date,sales,returned:3,received:2,orders:sales-1,contacts:4,reviews:10,bad:1};
  })}),
  riskMonthShift:(month,n)=>{const d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,7)}
 });
 for(const file of ['performance/01-cache.js','unified-product/01-ledger.js','unified-product/01-aggregates.js'])
  vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 ctx.upProduct=p=>p;
 const plain=value=>JSON.parse(JSON.stringify(value));
 function expected(p,start,end,platform){
  const series=(platform==='all'?platforms:[platform]).map(channel=>ctx.upBuildDaily(p,channel,start,end));
  return series[0].map((day,i)=>Object.fromEntries([['date',day.date],...fields.map(f=>[f,series.reduce((n,rows)=>n+rows[i][f],0)])]));
 }
 const ranges=[['2024-02-28','2024-03-02'],['2025-01-01','2025-12-31'],['2026-08-14','2026-08-16'],['2026-01-01','2026-10-10'],['2025-12-28','2026-01-03']];
 for(const product of products)for(const [start,end] of ranges)for(const platform of [...platforms,'all']){
  const points=expected(product,start,end,platform),summary=ctx.upSummary(product,start,end,platform);
  assert.deepEqual(plain(summary.points),points);
  for(const field of fields)assert.equal(summary[field],points.reduce((n,row)=>n+row[field],0),field);
  assert(summary.expenseCents>=0&&Number.isInteger(summary.expenseCents));
  assert.equal(summary.feeRate,summary.gsvCents?summary.expenseCents/summary.gsvCents*100:null);
  assert.equal(summary.returnRate,summary.sales?summary.returned/summary.sales*100:null);
  assert.equal(summary.profitRate,summary.gsvCents?summary.profitCents/summary.gsvCents*100:null);
 }
 const args=[products[0],'2026-09-03','2026-09-08','抖音'];
 const old=ctx.upSummary(...args),oldPoints=plain(old.points);
 ctx.dpStore.newTargets[0]=99;ctx.dpStore.marginTarget=22;
 const changed=ctx.upSummary(...args);
 assert.notEqual(changed.targetCents,old.targetCents);
 vm.runInContext('upMonthCache.clear();upDailyCache.clear()',ctx);
 assert.deepEqual(plain(old.points),oldPoints,'旧汇总在配置变化及缓存淘汰后仍使用原目标版本');
 assert.equal(changed.targetCents,changed.points.reduce((n,row)=>n+row.targetCents,0));
 let calls=0;const build=ctx.upBuildDaily;ctx.upBuildDaily=(...a)=>{calls++;return build(...a)};
 ctx.upSummary(products[0],'2026-09-04','2026-09-07','抖音');
 assert.equal(calls,0,'同月新区间必须复用前缀和');
 assert.throws(()=>ctx.upSummary(products[0],'2026-10-10','2026-01-01'),/无效/);
}
export async function periodPerformance(page){
 verifyAggregates();
 const samples=[];
 const change=async(selector,value)=>page.evaluate(({selector,value})=>new Promise(resolve=>{
  const control=document.querySelector(selector),start=performance.now();
  if(value===null)control.click();else{control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}))}
  requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(Math.round(performance.now()-start))));
 }),{selector,value});
 const otherControl=await page.locator('#time-sales [data-time-year]').elementHandle();
 for(const [selector,value] of [['#risk [data-time-mode="year"]',null],['#risk [data-time-year]','2025'],['#risk [data-time-year]','2026'],['#risk [data-time-year]','2025']]){
  const ms=await change(selector,value);samples.push(ms);
  assert.equal(await page.locator('#riskrail>.riskcard').count(),6);
  if(value)assert.equal(await page.locator('#risk [data-time-year]').inputValue(),value);
 }
 assert(await otherControl.evaluate(el=>el.isConnected),'局部切换不能重建其他模块时间栏');
 // 宽松阈值仅拦截秒级回退；输出实测值便于在不同机器上比较。
 assert(Math.max(...samples)<4000,'年份切换退化为长任务：'+samples.join('/'));
 assert(samples.at(-1)<2000,'重复切换未复用数据：'+samples.at(-1));
 await change('#risk [data-time-mode="quarter"]',null);
 assert.deepEqual(await page.locator('#risk [data-time-value] option').allTextContents(),['Q1','Q2','Q3','Q4']);
 await page.evaluate(()=>document.querySelector('[data-risk-day]').click());
 console.log('年度/2025/2026/再次2025至下一帧(ms)：'+samples.join(' / '));
}
