import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

function verifyShopReturnPeriods(){
 const read=file=>fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8');
 const shift=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
 const ctx=businessRuleContext({DATA_CUTOFF:'2026-10-28',dashboardSyncDate:()=> '2026-10-28',shiftDate:shift,periodKey:()=>'',
  dateRangeMonthShift:(month,step)=>{const [year,value]=month.split('-').map(Number);return new Date(Date.UTC(year,value-1+step,1)).toISOString().slice(0,7)}});
 vm.runInContext(read('risk-board-period/01-model.js'),ctx);vm.runInContext(read('risk-presentation/01-shop.js'),ctx);
 for(const reference of ['2026-10-28','2026-11-02','2027-01-02']){
  const period=ctx.rpShopReturnPeriod(reference);
  assert.deepEqual([period.start,period.end,period.previousStart,period.previousEnd],[shift(reference,-22),shift(reference,-16),shift(reference,-29),shift(reference,-23)]);
 }
 for(const [previous,current,expected] of [[13,14,false],[13.00000000001,14,false],[13.1,13.2,true],[14,14,false],[14,13.5,false],[10.4,10.5,false],[null,14,false]])
  assert.equal(ctx.rpShopProblemHit({target:10,previous,current}),expected,'严格超目标3%，且后一期高于前一期');
 assert.equal(ctx.rpShopProblemHit({currentTarget:11,previousTarget:10,previous:13.1,current:14}),false,'两期分别核对目标');
 const calls=[];
 ctx.qrbReturnTargets=()=>({returnTarget:10});ctx.sampleShopSpuSales=(_shop,start,end)=>{
  calls.push([start,end]);return [{product:{spuId:'A',name:'单品A',model:'A'},sales:1000,returned:start==='2026-10-06'?150:140}];
 };
 const [product]=ctx.rpShopReturnProducts({channel:'抖音'},'2026-10-28');
 assert.deepEqual(calls,[['2026-09-29','2026-10-05'],['2026-10-06','2026-10-12']]);
 assert(Math.abs(product.current-15)<1e-9);assert(Math.abs(product.previous-14)<1e-9);assert(ctx.rpShopProblemHit(product));
 ctx.qrbReturnTargets=()=>({returnTarget:null});assert.equal(ctx.rpShopProblemHit(ctx.rpShopReturnProducts({channel:'抖音'},'2026-10-28')[0]),false,'无目标不判定');
 ctx.localStorage={getItem:()=>JSON.stringify({version:3,revision:7,gradeRuleRevision:1,returnRuleRevision:1,deliveryRuleRevision:1,values:{'shops.returnExcess':5,'finance.deduction':17},conditions:{'shops.returnExcess':{op:'gt',a:5}}})};
 vm.runInContext(read('business-rules/01-store.js'),ctx);
 const migrated=ctx.brcRead();assert.equal(migrated.shopReturnRuleRevision,1);assert.equal(migrated.values['shops.returnExcess'],3);assert.equal(migrated.values['finance.deduction'],17,'其他配置保持');
 assert.equal(ctx.brcMatch('shops.returnExcess',3),false);assert.equal(ctx.brcMatch('shops.returnExcess',3.1),true);
}

export async function shopReturnPeriods(page){
 verifyShopReturnPeriods();
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const board=page.locator('#riskrail [data-rp-board="1"]');
 const help=board.locator('.card-metric-help').first();await help.scrollIntoViewIfNeeded();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await help.focus();
 await page.locator('#metric-tooltip').waitFor({state:'visible'});
 assert.match(await page.locator('#metric-tooltip').innerText(),/店铺内单品总退连续 2 周期超出预设目标值 3% 以上，环比持续恶化；/);
 await page.keyboard.press('Escape');
 for(const [month,dates] of [[null,['2026-10-06','2026-10-12','2026-09-29','2026-10-05']],['9',['2026-09-08','2026-09-14','2026-09-01','2026-09-07']]]){
  if(month){await board.locator('[data-drawer-time-mode="month"]').click();await board.locator('[data-drawer-time-value]').selectOption(month)}
  const shops=await page.evaluate(()=>shopRiskAudit());assert(shops.length>0);
  let checked=0;
  for(const shop of shops)for(const product of shop.returnProducts){
   assert.deepEqual([product.start,product.end,product.previousStart,product.previousEnd],dates);
   if(product.currentSales>0)assert(Math.abs(product.current-product.currentReturned/product.currentSales*100)<1e-9);
   if(product.previousSales>0)assert(Math.abs(product.previous-product.previousReturned/product.previousSales*100)<1e-9);
   checked++;
  }
  assert(checked>0,'实际店铺SPU使用两期台账');
 }
 console.log('通过：店铺两期超目标差值、稳定周窗口、无目标/持平/边界及旧配置迁移。');
}
