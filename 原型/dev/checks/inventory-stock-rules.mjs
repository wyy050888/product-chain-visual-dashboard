import assert from 'node:assert/strict';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';
import {verifyStockRankingModel} from './stock-ranking-model.mjs';

function verifySelectableStockMetrics(){
 const ctx=businessRuleContext(),stock={warehouse:100,transit:100,factoryAvailable:50,totalUnits:1000,dailyNet15:10};
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.brcStockMetrics(stock))),{coverage15:10,sellableCoverage15:25,totalCoverage15:100});
 const defaults=vm.runInContext('brcDefaultConditions(brcDefaults)',ctx);
 for(const key of ['stock.slowDays','stock.shortDays','stock.transferDays']){
  const config=ctx.brcMetricConfig(key);assert.deepEqual(Array.from(config.choices,choice=>choice.label),['我司可售天数','可售天数','总可售天数']);
  for(const [index,metric] of config.choices.entries())for(const threshold of [20,50]){
   ctx.brcSaved={conditions:{...defaults,[key]:{op:'gte',a:threshold,metric:metric.id}}};
   assert.equal(ctx.brcStockRuleMatch(key,stock),[10,25,100][index]>=threshold,key+' '+metric.label);
  }
 }
 ctx.brcSaved={conditions:{...defaults,'stock.slowDays':{op:'all',conditions:[{op:'gte',a:20,metric:'sellableCoverage15'},{op:'lt',a:50,metric:'value'}]}}};
 assert(ctx.brcStockStagnant(stock),'且关系使用两个指标实际值');
 assert(!ctx.brcStockStagnant({...stock,dailyNet15:0}));assert(!ctx.brcStockStagnant({...stock,warehouse:0}));
 assert.equal(ctx.brcStockMetrics({...stock,transit:null}).sellableCoverage15,null,'缺组成不补0');
 assert.equal(ctx.brcStockRuleMatch('stock.slowDays',{...stock,dailyNet15:-1}),false);
 // 历史value仍是原规则的主指标，不因三个选项顺序变化而漂移。
 ctx.brcSaved={conditions:{...defaults}};assert.equal(ctx.brcStockRuleMatch('stock.shortDays',stock),false);assert.equal(ctx.brcStockRuleMatch('stock.transferDays',stock),false);
}
export async function inventoryStockRules(page){
 verifySelectableStockMetrics();verifyStockRankingModel();
 const key='dashboard-business-rules-v3',previous=await page.evaluate(key=>localStorage.getItem(key),key);
 const audit=()=>page.evaluate(()=>businessRuleConfigSnapshot()),top=()=>page.evaluate(()=>inventoryControlAudit().stagnantTop);
 try{
  const initial=await audit();
  await page.evaluate(({key,initial})=>localStorage.setItem(key,JSON.stringify({version:3,gradeRuleRevision:1,returnRuleRevision:1,revision:0,values:{...initial.values,'stock.top.minAgeDays':3000},conditions:initial.conditions})),{key,initial});
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#configure-global-rules').click();await page.locator('[data-brc-tab="stock"]').click();
  const tabs=await page.locator('[data-brc-section-tab]').allTextContents();assert(tabs.includes('库存规则'));assert(!tabs.includes('可售天数与库存风险'));assert(!tabs.includes('呆滞产品Top10'));
  await page.getByRole('tab',{name:'库存规则',exact:true}).click();
  assert.deepEqual(await page.locator('.brc-metric-table th[scope="rowgroup"]').allTextContents(),['呆滞','缺货','调货']);
  assert.equal(await page.locator('[data-brc-result-group="stock-platform"]').count(),0);
  for(const name of ['stock.slowDays','stock.shortDays','stock.transferDays'])assert.deepEqual(await page.locator('[data-brc-metric="'+name+'"] option').allTextContents(),['我司可售天数','可售天数','总可售天数']);
  const before=await audit();for(const name of ['stock.profit','stock.return','stock.received','stock.violations','stock.top.minAgeDays'])assert(!before.items.some(item=>item.key===name),'不再提交已撤下配置 '+name);
  const baselineTop=await top();assert(baselineTop.count>0,'历史库龄配置不覆盖确认的60天规则');
  const metric=page.locator('[data-brc-metric="stock.slowDays"]'),number=page.locator('[data-brc-field="stock.slowDays"]');
  for(const [value,threshold] of [['sellableCoverage15',80],['totalCoverage15',120],['value',60]]){
   await metric.selectOption(value);await number.fill(String(threshold));await page.locator('[data-brc-save]').click();assert.equal(await page.locator('#brc-error').innerText(),'');
   const data=await top();assert(data.count>=data.rows.length);assert(data.rows.length===Math.min(10,data.count));
   assert.equal(data.count,baselineTop.count,'可售天数配置不改变已发生呆滞的总数');
   assert.deepEqual(data.rows.map(row=>row.skuId),baselineTop.rows.map(row=>row.skuId),'Top10不跟随可售天数指标或阈值变化');
   for(const row of data.rows)assert(row.staleUnits>0&&row.staleMaxAgeDays>=60);
   const rule=await page.locator('#inventory-stagnant-top .metric-help').getAttribute('data-metric-rule');assert.match(rule,/存在库龄≥60天的库存/);assert.doesNotMatch(rule,/可售天数|净销量/);
   const current=await audit();assert.equal(current.values['stock.top.minAgeDays'],3000,'历史键保留但不生效');assert.equal(current.values['stock.profit'],before.values['stock.profit']);
  }
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-brc-tab="stock"]').click();await page.getByRole('tab',{name:'库存规则',exact:true}).click();assert.equal(await number.inputValue(),'60');assert.equal(await metric.inputValue(),'value');
  await page.locator('[data-brc-tab="products"]').click();await page.locator('[data-brc-tab="stock"]').click();assert(await page.getByRole('tab',{name:'库存规则',exact:true}).isVisible());
  for(const width of [1920,1024,390]){await page.setViewportSize({width,height:1000});assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1))}
 }finally{await page.evaluate(({key,previous})=>{if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous)},{key,previous});await page.reload({waitUntil:'domcontentloaded'})}
 console.log('通过：库存规则三指标真实计算、Top10库龄与可售天数配置隔离、取消独立Top10及高危库存配置、旧键兼容和刷新');
}
