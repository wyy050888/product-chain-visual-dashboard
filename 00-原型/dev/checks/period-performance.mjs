import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {verifyLazyRiskFacts,verifyRiskRenderBatch} from './lazy-risk-facts.mjs';

// 用原逐日生成器独立累加，核对前缀汇总、展开明细和目标配置快照。
function verifyAggregates(){
 const products=[{spuId:'a',sourceRow:1,chain:0,actualLaunch:'2024-02-29',profit:15},{spuId:'b',sourceRow:6,chain:1,actualLaunch:'2026-08-15',profit:12},{spuId:'SPU-SOURCE-024',sourceRow:24,chain:0,actualLaunch:'2025-01-01',profit:18},{spuId:'SPU-SOURCE-028',sourceRow:28,chain:1,actualLaunch:'2025-01-01',profit:6}];
 const platforms=['抖音','快手','视频号','天猫','京东','拼多多'];
 const fields=['sales','returned','received','orders','contacts','qualityContacts','experienceContacts','reviews','bad','gmvCents','refundCents','gsvCents','profitCents','costCents','expenseCents','targetCents','targetProfitCents'];
 const shift=(date,n)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const ctx=vm.createContext({DATA_CUTOFF:'2026-10-10',aiFlowDayDiff:(start,end)=>(Date.parse(end)-Date.parse(start))/86400000,sampleSpus:products,sampleProductRows:()=>products,withPeriod:(_,fn)=>fn(),brLossRows:()=>[],
  qrPlatforms:platforms,qrRate:(n,total)=>total?n/total*100:0,dpStore:{newTargets:[20,30],marginTarget:15},
  qrbMonthData:(_,platform,start,end)=>({points:Array.from({length:(Date.parse(end)-Date.parse(start))/86400000+1},(_,i)=>{
   const date=shift(start,i),sales=20+(+date.slice(8))%5+platforms.indexOf(platform);
   return {date,sales,returned:3,received:2,orders:sales-1,contacts:4,qualityContacts:3,experienceContacts:1,reviews:10,bad:1};
  })}),
  riskMonthShift:(month,n)=>{const d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,7)}
 });
 for(const file of ['performance/01-cache.js','unified-product/00-grade-samples.js','unified-product/00-price-samples.js','unified-product/00-new-success-samples.js','unified-product/01-ledger.js','unified-product/01-aggregates.js'])
  vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 ctx.upProduct=p=>p;
 for(const [spuId,cents] of [['SPU-SOURCE-039',7900],['SPU-SOURCE-038',15900],['SPU-SOURCE-029',19900],['SPU-SOURCE-036',25900]]){
  const product={spuId,chain:3,sourceRow:Number(spuId.slice(-3)),actualLaunch:'2026-08-01',profit:15};
  assert.equal(ctx.upSamplePriceCents(product),cents);
  const facts=ctx.upSummary(product,'2026-09-01','2026-09-30');
  assert(facts.sales>0);assert.equal(facts.gmvCents,facts.sales*cents);assert.equal(facts.refundCents,facts.returned*cents);assert.equal(facts.gsvCents,facts.gmvCents-facts.refundCents);
 }
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
  assert.equal(summary.qualityContacts+summary.experienceContacts,summary.contacts);
  assert.equal(summary.qualityContactRate,summary.sales?summary.qualityContacts/summary.sales*100:null);
  assert.equal(summary.experienceContactRate,summary.sales?summary.experienceContacts/summary.sales*100:null);
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
 // 质量汇总只取总量；图表读取明细时才展开，且字段与逐日独立计算一致。
 let expansions=0;const daily=ctx.upDaily;
 ctx.upDaily=(...args)=>{expansions++;return daily(...args)};
 const quality=ctx.upQualityData(products[0],'抖音','2026-09-04','2026-09-07');
 assert.equal(expansions,0,'读取质量汇总不能提前生成逐日对象');
 assert.equal(quality.sales,ctx.upSummary(products[0],'2026-09-04','2026-09-07','抖音').sales);
 const qualityPoints=expected(products[0],'2026-09-04','2026-09-07','抖音').map(day=>({...day,returnRate:day.returned/day.sales*100,contactRate:day.contacts/day.sales*100}));
 assert.deepEqual(plain(quality.points),qualityPoints);
 assert.equal(expansions,1);assert.equal(quality.points,quality.points,'重复图表读取复用同一份明细');
 assert.equal(expansions,1);assert(Object.keys(quality).includes('points'),'导出仍包含逐日明细');
}
export async function periodPerformance(page){
 verifyAggregates();
 verifyLazyRiskFacts();verifyRiskRenderBatch();
 const samples=[];
 const change=async(selector,value)=>page.evaluate(({selector,value})=>new Promise(resolve=>{
  const control=document.querySelector(selector),start=performance.now();
  if(value===null)control.click();else{control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}))}
  requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(Math.round(performance.now()-start))));
 }),{selector,value});
 const otherControl=await page.locator('#time-sales [data-time-year]').elementHandle();
 for(const [selector,value] of [['#risk [data-time-mode="year"]',null],['#risk [data-time-year]','2025'],['#risk [data-time-year]','2026'],['#risk [data-time-year]','2025']]){
  const ms=await change(selector,value);samples.push(ms);
  assert.equal(await page.locator('#riskrail .riskcard').count(),6);
  if(value)assert.equal(await page.locator('#risk [data-time-year]').inputValue(),value);
 }
 assert(await otherControl.evaluate(el=>el.isConnected),'局部切换不能重建其他模块时间栏');
 // 宽松阈值仅拦截秒级回退；输出实测值便于在不同机器上比较。
 const baseline=Number(process.env.DASHBOARD_PERIOD_BASELINE_MS||0);
 assert(Number.isFinite(baseline)&&baseline>=0,'性能对照值必须是非负有限数');
 const coldLimit=Math.max(4000,baseline*1.15);
 assert(Math.max(...samples)<coldLimit,'年份切换退化为长任务：'+samples.join('/')+'；同机阈值'+Math.round(coldLimit));
 assert(samples.at(-1)<2000,'重复切换未复用数据：'+samples.at(-1));
 await change('#risk [data-time-mode="quarter"]',null);
 assert.deepEqual(await page.locator('#risk [data-time-value] option').allTextContents(),['Q1','Q2','Q3','Q4']);
 await page.evaluate(()=>document.querySelector('[data-risk-day]').click());
 console.log('年度/2025/2026/再次2025至下一帧(ms)：'+samples.join(' / '));
}
