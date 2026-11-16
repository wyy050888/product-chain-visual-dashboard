import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

function verifyWarningPredicates(){
 const ctx=businessRuleContext({window:{},pfIdentity:row=>row});
 for(const file of ['01-stock-skus.js','01-shortage.js','01-stagnant.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/'+file,import.meta.url),'utf8'),ctx);
 const values=vm.runInContext('({...brcDefaults})',ctx),defaults=ctx.brcDefaultConditions(values),reset=()=>ctx.brcSaved={conditions:ctx.brcCopyConditions(defaults)},row={warehouse:100,transit:50,factoryAvailable:50,totalUnits:500,dailyNet15:10,coverage15:10,sellableCoverage15:20,totalCoverage15:50};
 const publish=()=>ctx.brcSaved={conditions:ctx.brcCopyConditions(ctx.brcSaved.conditions)};
 reset();assert(!ctx.rpShortageEligible(row));assert(ctx.rpShortageEligible({...row,sellableCoverage15:15}));assert(ctx.rpShortageEligible({...row,totalCoverage15:45}));assert(!ctx.rpShortageEligible({...row,sellableCoverage15:15,state:'下架'}));assert(!ctx.rpShortageEligible({...row,sellableCoverage15:15,dailyNet15:0}));
 assert(ctx.rpStagnantEligible({...row,coverage15:60}));assert(!ctx.rpStagnantEligible({...row,coverage15:59.999,sellableCoverage15:120}));assert(!ctx.rpStagnantEligible({...row,coverage15:null}));assert(!ctx.rpStagnantEligible({...row,coverage15:60,warehouse:0}));
 ctx.brcSaved.conditions['stock.shortage.sellableDays'].groupOp='all';publish();assert(!ctx.rpShortageEligible({...row,sellableCoverage15:15}),'天数改为且时不能只满足其中一项');assert(ctx.rpShortageEligible({...row,sellableCoverage15:15,totalCoverage15:45}));
 reset();ctx.brcSaved.conditions['stock.shortage.excluded'].a=1;assert(!ctx.rpShortageEligible({...row,sellableCoverage15:15}));assert(ctx.rpShortageEligible({...row,sellableCoverage15:15,state:'下架'}),'状态条件按是/否实际生效');
 reset();ctx.brcSaved.conditions['stock.shortage.excluded'].groupOp='any';assert(ctx.rpShortageEligible({...row,state:'下架'}),'上层或关系不被硬编码前置条件覆盖');assert.equal(ctx.rpShortageType({...row,state:'下架'}),null);assert.equal(ctx.rpShortageTypeLabel({...row,state:'下架'}),'缺货预警条件');assert.equal(ctx.rpShortageTone({...row,state:'下架'}),'rp-quality-yellow');
 reset();ctx.brcSaved.conditions['stock.shortage.excluded'].op='gte';assert.match(ctx.brcValidate(values,ctx.brcSaved.conditions).message,/状态条件/);
 // 原参数键生成新条件；不清空其他对象已经保存的规则。
 const oldValues={...values,'stock.warning.coverageDays':90,'stock.shortage.sellableDays':12,'stock.shortage.totalDays':33,'finance.deduction':7},oldConditions=ctx.brcCopyConditions(defaults);
 for(const key of Object.keys(oldConditions).filter(key=>key.startsWith('stock.warning.')||key.startsWith('stock.shortage.')))delete oldConditions[key];
 ctx.localStorage={getItem:()=>JSON.stringify({version:3,revision:4,gradeRuleRevision:1,returnRuleRevision:1,values:oldValues,conditions:oldConditions})};
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/01-store.js',import.meta.url),'utf8'),ctx);
 const migrated=ctx.brcRead();assert(migrated);assert.equal(migrated.conditions['stock.warning.coverageDays'].a,60);assert.equal(migrated.conditions['stock.shortage.sellableDays'].a,12);assert.equal(migrated.conditions['stock.shortage.totalDays'].a,33);assert.equal(migrated.values['finance.deduction'],7);
}

export async function inventoryWarningRules(page){
 verifyWarningPredicates();
 const storage='dashboard-business-rules-v3';
 const previous=await page.evaluate(key=>localStorage.getItem(key),storage);
 const audit=()=>page.evaluate(()=>({rules:businessRuleConfigSnapshot(),shortage:shortageRankingSnapshot(),warning:stagnantRankingSnapshot()}));
 const reload=async()=>{
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 };
 try{
  const baseline=await audit();
  const {revision,values,conditions}=baseline.rules;
  assert(!baseline.rules.items.some(item=>item.key.startsWith('stock.warning.')),'呆滞规则采用固定口径');
  const saved={version:3,revision,successDefaultRevision:1,returnRuleRevision:1,deliveryRuleRevision:1,shopReturnRuleRevision:1,values,conditions:{
   ...conditions,
   'stock.warning.warehouse':{op:'gt',a:0,metric:'sellableUnits',groupOp:'any'},
   'stock.warning.netSales':{op:'gte',a:0},
   'stock.warning.coverageDays':{op:'gte',a:120,metric:'sellableCoverage15'},
   'stock.shortage.sellableDays':{op:'lte',a:15,groupOp:'all'}
  }};
  await page.evaluate(({storage,saved})=>localStorage.setItem(storage,JSON.stringify(saved)),{storage,saved});
  await reload();
  const restored=await audit();
  assert.deepEqual(restored.warning,baseline.warning,'旧阈值、合算指标和或条件均不覆盖当前呆滞规则');
  assert.deepEqual(restored.shortage.rows.map(row=>row.id),baseline.shortage.rows.filter(row=>row.sellableCoverage15<=15&&row.totalCoverage15<=45).map(row=>row.id));
  assert.equal(restored.rules.values['finance.deduction'],values['finance.deduction']);
 }finally{
  await page.evaluate(({storage,previous})=>{if(previous===null)localStorage.removeItem(storage);else localStorage.setItem(storage,previous)},{storage,previous});
  await reload();
 }
 console.log('通过：预警入榜边界、旧呆滞条件失效及缺货规则保留');
}
