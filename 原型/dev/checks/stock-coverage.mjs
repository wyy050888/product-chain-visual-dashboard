import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyStockCoverage(){
 const ctx=vm.createContext({fmt:String,upMoney:String,DATA_CUTOFF:'2026-10-10',
  upIdentity:p=>p,upSummary:()=>({sales:180,returned:30}),shiftDate:()=> '2026-09-26',newLaunchSamples:new Map()});
 for(const file of ['unified-product/06-stock-model.js','inventory-detail/01-coverage-samples.js'])
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
 const base={spuId:'demo',num:1000,amountCents:100000,staleCents:20000,avg:800,sourceRow:2};
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
