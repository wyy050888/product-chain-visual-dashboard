import assert from 'node:assert/strict';
import vm from 'node:vm';
import {businessRuleContext} from './business-rules-context.mjs';

function verifyScoreConditions(){
 const ctx=businessRuleContext({window:{}}),values=vm.runInContext('({...brcDefaults})',ctx);
 const baseline=ctx.brcDefaultConditions(values),copy=value=>JSON.parse(JSON.stringify(value));
 assert.equal(ctx.brcValidate(values,baseline),null,'原评分边界保持有效');
 const keys=['shops.抖音.red','shops.抖音.yellow','shops.抖音.green'];
 for(const metric of['value','productScore','logisticsScore','serviceScore']){
  const conditions=copy(baseline),set=node=>{if(node.conditions)node.conditions.forEach(set);else if(metric!=='value')node.metric=metric};
  keys.forEach(key=>set(conditions[key]));ctx.brcConditions=()=>conditions;
  assert.equal(ctx.brcValidate(values,conditions),null,'四项评分均可独立保存 '+metric);
  for(const[value,tone]of[[0,'red'],[4.6,'red'],[4.7,'yellow'],[4.8,'green'],[5,'green']]){
   assert.equal(ctx.brcBandTone('score.抖音',metric==='value'?value:4.95,{[metric]:value}),tone,metric+'边界 '+value);
  }
  if(metric!=='value')assert.equal(ctx.brcBandTone('score.抖音',4.95,{}),'gray','缺失所选评分不借用店铺分');
 }
 const conditions=copy(baseline),metrics=['value','productScore','logisticsScore','serviceScore'];
 const leaf=(metric,op,a)=>({metric,op,a});
 conditions[keys[0]]={op:'any',conditions:metrics.map(metric=>leaf(metric,'lte',3))};
 conditions[keys[1]]={op:'all',conditions:[...metrics.map(metric=>leaf(metric,'gt',3)),{op:'any',conditions:metrics.map(metric=>leaf(metric,'lt',4))}]};
 conditions[keys[2]]={op:'all',conditions:metrics.map(metric=>leaf(metric,'gte',4))};
 assert.equal(ctx.brcValidate(values,conditions),null,'四维且或条件无重叠、无遗漏');ctx.brcConditions=()=>conditions;
 for(const a of[0,3,3.5,4,5])for(const b of[0,3,3.5,4,5])for(const c of[0,3,3.5,4,5])for(const d of[0,3,3.5,4,5]){
  const data=[a,b,c,d],tone=data.some(n=>n<=3)?'red':data.some(n=>n<4)?'yellow':'green';
  assert.equal(ctx.brcBandTone('score.抖音',a,{productScore:b,logisticsScore:c,serviceScore:d}),tone);
 }
 const overlap=copy(baseline);overlap[keys[2]].metric='productScore';assert.match(ctx.brcValidate(values,overlap).message,/重叠/);
 const gap=copy(conditions);gap[keys[1]]={op:'any',conditions:[]};assert.match(ctx.brcValidate(values,gap).message,/未覆盖/);
 const before=copy(baseline[keys[2]]),after={...before,a:4.9,metric:'productScore'},peers=copy(baseline);
 ctx.brcLinkBandBoundary(keys[2],{...before,metric:'productScore'},after,peers);assert.deepEqual(copy(peers),copy(baseline),'不同评分的边界不会被连带修改');
}
export async function shopScoreRules(page){
 verifyScoreConditions();
 await page.getByRole('button',{name:'配置全局规则',exact:true}).click();await page.locator('[data-brc-tab="shops"]').click();await page.locator('[data-brc-section-tab="scores"]').click();
 const expected=['店铺分','商品分','物流分','服务分'],selects=page.locator('[data-brc-metric]');
 assert.equal(await selects.count(),16);
 assert.equal(await page.locator('[data-brc-metric^="shops.视频号."]').count(),0,'视频号不提供评分配置');
 for(const select of await selects.all())assert.deepEqual(await select.locator('option').allTextContents(),expected);
 for(const metric of['productScore','logisticsScore','serviceScore']){
  const fields=page.locator('[data-brc-metric^="shops.抖音."]');
  for(let i=0;i<await fields.count();i++)await fields.nth(i).selectOption(metric);
  await page.locator('[data-brc-save]').click();await page.waitForFunction(()=>document.querySelector('[data-brc-save]').disabled);
  assert.equal(await page.locator('#brc-error').innerText(),'');
  await page.reload();await page.locator('[data-brc-tab="shops"]').click();await page.locator('[data-brc-section-tab="scores"]').click();
  assert((await page.locator('[data-brc-metric^="shops.抖音."]').evaluateAll(nodes=>nodes.map(node=>node.value))).every(value=>value===metric),'保存刷新保留评分指标');
  // 首页店铺判灯与保存后的对应字段取同一数据。
  await page.evaluate(()=>location.hash='#overview');
  const rows=await page.locator('#riskrail .rp-shop-entry').evaluateAll(nodes=>nodes.map(node=>({id:Number(node.dataset.rpRow.split(':')[1]),tone:node.querySelector('[data-rp-field="score"] strong')?.className})));
  const shops=await page.evaluate(()=>shopRiskAudit());
  assert(rows.length>0);
  for(const row of rows){const score=shops.find(shop=>shop.id===row.id)[metric],tone=!Number.isFinite(score)?'gray':score<=4.6?'red':score<4.8?'yellow':'green';assert.equal(row.tone,'rp-quality-'+tone,'首页判灯读取 '+metric)}
  await page.evaluate(()=>location.hash='#system-business-rules');await page.locator('[data-brc-tab="shops"]').click();await page.locator('[data-brc-section-tab="scores"]').click();
 }
 // 新增条件也只提供四项评分；拼多多条件目录不受影响。
 await page.locator('[data-brc-add="shops.抖音.red"]').click();assert.deepEqual(await page.locator('[data-brc-metric="shops.抖音.red"]').last().locator('option').allTextContents(),expected);await page.locator('[data-brc-remove="shops.抖音.red"]').last().click();
 await page.setViewportSize({width:390,height:1000});assert(await page.locator('#business-rule-page').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
 console.log('通过：四平台评分下拉四选项、新增条件、三项切换保存刷新、首页真实评分判灯、缺失与边界、四维且或条件、重叠/空档及跨评分不联动。');
}
