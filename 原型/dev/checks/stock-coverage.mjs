import {businessRuleContext} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyStockCoverage(){
 const ctx=businessRuleContext({fmt:String,upMoney:String,DATA_CUTOFF:'2026-10-10',
  upIdentity:p=>p,upSummary:()=>({sales:180,returned:30}),shiftDate:()=> '2026-09-26',newLaunchSamples:new Map(),window:{}});
 vm.runInContext(fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),ctx);
 for(const file of ['ui-controls/00-stock-quantity.js','unified-product/06-stock-model.js','inventory-detail/00-ledger.js','inventory-detail/01-coverage-samples.js','new-products/01-model.js'])
  vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 const tags=(warehouse,total,daily=10)=>Array.from(ctx.upStockRiskTags({warehouse,...ctx.upStockCoverage(warehouse,total,daily)}));
 assert.deepEqual(tags(600,700),['stagnant'],'恰好60天触发滞销');
 assert.deepEqual(tags(599,700),[]);
 assert.deepEqual(tags(70,300),['transfer'],'恰好7天调货、30天不缺货');
 assert.deepEqual(tags(71,299),['shortage'],'大于7天不调货、小于30天缺货');
 assert.deepEqual(tags(40,120),['shortage','transfer']);
 assert.deepEqual(tags(0,0),['shortage','transfer']);
 for(const daily of [0,-1,null,NaN])assert.deepEqual(tags(100,200,daily),[],'无有效净销量不虚构可售天数');
 assert.deepEqual(tags(0,0,0),[]);
 assert.equal(ctx.upStockRiskTags({warehouse:0,coverage15:60,totalCoverage15:90}).includes('stagnant'),false);
 // 新品销售状态与详情风险共用60/30天边界，人工流程状态不被自动覆盖。
 const salesState=(state,warehouse,total,daily=10)=>ctx.nspSalesState(state,{warehouse,...ctx.upStockCoverage(warehouse,total,daily)});
 assert.equal(salesState('在售',600,700),'滞销');
 assert.equal(salesState('滞销',599,700),'在售');
 assert.equal(salesState('在售',71,299),'缺货');
 assert.equal(salesState('缺货',70,300),'在售','仅调货不等于缺货');
 assert.equal(salesState('在售',0,0),'缺货');
 for(const state of ['整改','清仓','下架']){
  assert.equal(salesState(state,600,700),state);
  assert.equal(salesState(state,40,120),state);
 }
 for(const daily of [0,-1,null,NaN])assert.equal(salesState('滞销',100,200,daily),'滞销','不可计算时保留原状态');
 assert.equal(ctx.nspSalesState('缺货',null),'缺货');
 const base={spuId:'demo',num:1000,amountCents:100000,staleCents:20000,avg:800,sourceRow:2};
 for(const spuId of ['SPU-SOURCE-026','SPU-SOURCE-019','SPU-SOURCE-027','SPU-SOURCE-017']){
  const original={...base,spuId,staleUnits:200},sample=ctx.inventoryStaleSample(original);
  for(const key of ['num','amountCents','staleUnits','staleCents'])assert.equal(sample[key],original[key],'补最早批次不改变原余额 '+key);
  assert(sample.staleOldestReceivedDate<ctx.DATA_CUTOFF&&sample.staleOldestSellableUnits>0&&sample.staleOldestSellableUnits<=sample.staleUnits);
  const known={...original,staleOldestReceivedDate:'2026-01-01',staleOldestSellableUnits:20};assert.deepEqual(ctx.inventoryStaleSample(known),known,'不覆盖已有批次');
  const zero={...original,staleUnits:0};assert.deepEqual(ctx.inventoryStaleSample(zero),zero,'零呆滞不造批次');
 }
 const batch=ctx.inventoryStaleSample(base);
 assert.notEqual((batch.staleUnits/batch.num*100).toFixed(1),(batch.staleCents/batch.amountCents*100).toFixed(1),'呆滞批次单价不等于总体均价，数量和金额占比应分别计算');
 assert(batch.staleUnits>=0&&batch.staleUnits<=batch.num&&batch.staleCents<=batch.amountCents);
 const scaled=ctx.inventoryCoverageSample({...batch,stockSampleScenario:'stagnant'});
 assert.equal(scaled.staleUnits,Math.round(batch.staleUnits*scaled.num/batch.num),'库存场景缩放保留独立批次数量');
 for(const [scenario,expected] of [['shortage',['shortage']],['transfer',['transfer']],['shortage-transfer',['shortage','transfer']],['stagnant',['stagnant']]]){
  const row=ctx.inventoryCoverageSample({...base,stockSampleScenario:scenario}),total=row.num+row.sampleFactoryUnits+row.sampleUndeliveredUnits;
  assert.deepEqual(tags(row.num,total),expected);
  assert.equal(row.amountCents/row.num,base.amountCents/base.num);
  assert(row.staleCents<=row.amountCents);
 }
 ctx.newLaunchSamples.set('demo',{salesState:'清仓'});
 assert.deepEqual(ctx.inventoryCoverageSample(base),base,'清仓不反推库存，也不自动更改人工状态');
 ctx.newLaunchSamples.set('demo',{salesState:'滞销'});
 const slow=ctx.inventoryCoverageSample({...base,stockSampleScenario:'transfer'});
 assert(tags(slow.num,slow.num+slow.sampleFactoryUnits+slow.sampleUndeliveredUnits).includes('stagnant'));
}
