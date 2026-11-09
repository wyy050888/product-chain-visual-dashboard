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
 assert(ctx.rpStagnantEligible({...row,coverage15:60}));assert(!ctx.rpStagnantEligible({...row,coverage15:59.999}));assert(!ctx.rpStagnantEligible({...row,coverage15:null}));assert(!ctx.rpStagnantEligible({...row,coverage15:60,warehouse:0}));
 ctx.brcSaved.conditions['stock.shortage.sellableDays'].groupOp='all';publish();assert(!ctx.rpShortageEligible({...row,sellableCoverage15:15}),'天数改为且时不能只满足其中一项');assert(ctx.rpShortageEligible({...row,sellableCoverage15:15,totalCoverage15:45}));
 reset();ctx.brcSaved.conditions['stock.shortage.excluded'].a=1;assert(!ctx.rpShortageEligible({...row,sellableCoverage15:15}));assert(ctx.rpShortageEligible({...row,sellableCoverage15:15,state:'下架'}),'状态条件按是/否实际生效');
 reset();ctx.brcSaved.conditions['stock.shortage.excluded'].groupOp='any';assert(ctx.rpShortageEligible({...row,state:'下架'}),'上层或关系不被硬编码前置条件覆盖');assert.equal(ctx.rpShortageType({...row,state:'下架'}),null);assert.equal(ctx.rpShortageTypeLabel({...row,state:'下架'}),'缺货预警条件');assert.equal(ctx.rpShortageTone({...row,state:'下架'}),'rp-quality-yellow');
 reset();ctx.brcSaved.conditions['stock.warning.coverageDays']={op:'gte',a:45,metric:'totalCoverage15'};assert(ctx.rpStagnantEligible(row),'修改指标读取总可售天数');assert.equal(ctx.rpStagnantTone(row),'rp-quality-red');assert(ctx.rpStagnantRule().includes('总可售天数≥45天'));
 ctx.brcSaved.conditions['stock.warning.warehouse']={op:'all',conditions:[{op:'gt',a:0},{op:'gt',a:200,metric:'netSales15'}]};publish();assert(!ctx.rpStagnantEligible(row),'新增条件读取另一指标实际值');
 reset();ctx.brcSaved.conditions['stock.shortage.excluded'].op='gte';assert.match(ctx.brcValidate(values,ctx.brcSaved.conditions).message,/状态条件/);
 // 原参数键生成新条件；不清空其他对象已经保存的规则。
 const oldValues={...values,'stock.warning.coverageDays':90,'stock.shortage.sellableDays':12,'stock.shortage.totalDays':33,'finance.deduction':7},oldConditions=ctx.brcCopyConditions(defaults);
 for(const key of Object.keys(oldConditions).filter(key=>key.startsWith('stock.warning.')||key.startsWith('stock.shortage.')))delete oldConditions[key];
 ctx.localStorage={getItem:()=>JSON.stringify({version:3,revision:4,gradeRuleRevision:1,returnRuleRevision:1,values:oldValues,conditions:oldConditions})};
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/01-store.js',import.meta.url),'utf8'),ctx);
 const migrated=ctx.brcRead();assert(migrated);assert.equal(migrated.conditions['stock.warning.coverageDays'].a,90);assert.equal(migrated.conditions['stock.shortage.sellableDays'].a,12);assert.equal(migrated.conditions['stock.shortage.totalDays'].a,33);assert.equal(migrated.values['finance.deduction'],7);
}

export async function inventoryWarningRules(page){
 verifyWarningPredicates();
 const storage='dashboard-business-rules-v3',previous=await page.evaluate(key=>localStorage.getItem(key),storage),audit=()=>page.evaluate(()=>businessRuleConfigSnapshot()),ranking=()=>page.evaluate(()=>({shortage:shortageRankingSnapshot(),warning:stagnantRankingSnapshot()}));
 const field=key=>page.locator('[data-brc-field="'+key+'"]'),metric=key=>page.locator('[data-brc-metric="'+key+'"]');
 const save=async()=>{await page.locator('[data-brc-save]').click();assert.equal(await page.locator('#brc-error').innerText(),'');assert(await page.locator('[data-brc-save]').isDisabled())};
 try{
  const initial=await audit(),baseline=await ranking();
  await page.locator('#configure-global-rules').click();await page.locator('[data-brc-tab="stock"]').click();await page.getByRole('tab',{name:'库存预警规则',exact:true}).click();
  const titles=await page.locator('[data-brc-section-tab]').allTextContents();assert(!titles.includes('缺货预警榜')&&!titles.includes('呆滞预警榜'));assert.deepEqual(await page.locator('.brc-metric-table th[scope="rowgroup"]').allTextContents(),['呆滞预警','缺货预警']);
  assert.equal(await page.locator('[data-brc-result-group="stock-stagnant-warning"] .brc-condition-clause').count(),3);assert.equal(await page.locator('[data-brc-result-group="stock-shortage-warning"] .brc-condition-clause').count(),4);
  assert.equal(await field('stock.shortage.excluded').inputValue(),'0');assert.deepEqual(await field('stock.shortage.excluded').locator('option').allTextContents(),['请选择','否','是']);assert.equal(await page.locator('[data-brc-result-join="stock-shortage-days"]').inputValue(),'any');
  await field('stock.warning.coverageDays').fill('120');assert.deepEqual((await ranking()).warning.rows,baseline.warning.rows,'草稿不触发前台判定');await save();
  const stricter=await ranking();assert.deepEqual(stricter.warning.rows.map(row=>row.id),baseline.warning.rows.filter(row=>row.coverage15>=120).map(row=>row.id));assert(stricter.warning.rule.includes('我司可售天数≥120天'));
  await field('stock.warning.coverageDays').fill('180');await page.locator('[data-brc-cancel]').click();assert.equal(await field('stock.warning.coverageDays').inputValue(),'120');
  await page.locator('[data-brc-add="stock.warning.warehouse"]').click();const added=page.locator('[data-brc-row="stock.warning.warehouse"] .brc-condition-clause').last();
  await added.locator('[data-brc-metric]').selectOption('netSales15');await added.locator('[data-brc-term-op]').selectOption('gte');await added.locator('[data-brc-bound]').fill('2000');await save();
  assert.deepEqual((await ranking()).warning.rows.map(row=>row.id),stricter.warning.rows.filter(row=>Math.round(row.dailyNet15*15)>=2000).map(row=>row.id),'新增条件、指标和数值联动前台');
  await page.locator('[data-brc-row="stock.warning.warehouse"] [data-brc-remove]').last().click();await save();
  await metric('stock.warning.coverageDays').selectOption('sellableCoverage15');await save();const switched=await ranking();assert(switched.warning.rows.length>0);assert(switched.warning.rows.every(row=>row.sellableCoverage15>=120));assert(switched.warning.rule.includes('可售天数≥120天'));
  await page.locator('[data-brc-result-join="stock-shortage-days"]').selectOption('all');await save();const both=await ranking();assert.deepEqual(both.shortage.rows.map(row=>row.id),baseline.shortage.rows.filter(row=>row.sellableCoverage15<=15&&row.totalCoverage15<=45).map(row=>row.id));
  await field('stock.shortage.excluded').selectOption('1');await save();const excluded=await ranking();assert(excluded.shortage.rule.includes('是否清仓或下架＝是'));assert(excluded.shortage.rows.every(row=>row.clearance||['清仓','清仓品','下架','下架品'].includes(row.state)));await field('stock.shortage.excluded').selectOption('0');await save();
  await metric('stock.shortage.excluded').selectOption('warehouse');assert.equal(await field('stock.shortage.excluded').getAttribute('type'),'number','从状态改数值后不能遗留布尔控件');await page.locator('[data-brc-cancel]').click();assert.equal(await field('stock.shortage.excluded').inputValue(),'0');
  const saved=await audit();assert.equal(saved.values['finance.deduction'],initial.values['finance.deduction']);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-brc-tab="stock"]').click();await page.getByRole('tab',{name:'库存预警规则',exact:true}).click();assert.equal(await metric('stock.warning.coverageDays').inputValue(),'sellableCoverage15');assert.equal(await field('stock.warning.coverageDays').inputValue(),'120');assert.equal(await page.locator('[data-brc-result-join="stock-shortage-days"]').inputValue(),'all');assert.deepEqual((await ranking()).shortage.rows,both.shortage.rows);
  await page.locator('[data-brc-defaults]').click();assert.equal(await field('stock.warning.coverageDays').inputValue(),'60');assert.equal(await page.locator('[data-brc-result-join="stock-shortage-days"]').inputValue(),'any');await save();assert.deepEqual((await ranking()).warning.rows,baseline.warning.rows);
  for(const width of [1920,1024,390]){await page.setViewportSize({width,height:1000});assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'窄屏条件表不撑破页面')}
 }finally{await page.evaluate(({storage,previous})=>{if(previous===null)localStorage.removeItem(storage);else localStorage.setItem(storage,previous)},{storage,previous});await page.reload({waitUntil:'domcontentloaded'})}
 console.log('通过：库存预警合并、前台完整条件及括号、指标/状态/且或/增删、保存取消恢复刷新、旧阈值兼容');
}
