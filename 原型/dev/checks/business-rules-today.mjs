import assert from 'node:assert/strict';
import vm from 'node:vm';
import {businessRuleContext,revealBusinessRule} from './business-rules-context.mjs';
export async function verifyTodayRules(page){
 const context=businessRuleContext(),values=vm.runInContext('({...brcDefaults})',context);assert.equal(context.brcValidate(values,context.brcDefaultConditions(values)),null);const invalid={...values,'stock.top.minAgeDays':0};assert.equal(context.brcValidate(invalid,context.brcDefaultConditions(invalid)).key,'stock.top.minAgeDays');
 const original=await page.evaluate(()=>localStorage.getItem('dashboard-business-rules-v3'));
 const runtime=()=>page.evaluate(()=>({shortage:shortageRankingSnapshot(),warning:stagnantRankingSnapshot(),top:inventoryControlAudit().stagnantTop,supplier:supplierPlanningAudit(),rules:businessRuleConfigSnapshot()}));
 try{
  await page.locator('a[href="#inventory"]').click();const initial=await runtime();
  await page.locator('#configure-global-rules').click();
  const field=key=>page.locator('[data-brc-field="'+key+'"]'),save=async()=>{await page.locator('[data-brc-save]').click();assert.equal(await page.locator('#brc-error').innerText(),'')};
  await revealBusinessRule(page,'stock.slowDays');assert.equal(await field('stock.slowDays').inputValue(),'60');
  await field('stock.slowDays').fill('0');await page.locator('[data-brc-save]').click();assert(await page.locator('#brc-error').innerText());assert.equal((await runtime()).rules.values['stock.slowDays'],60);
  await field('stock.slowDays').fill('85');await save();let state=await runtime();assert.match(await page.locator('#inventory-stagnant-top .metric-help').getAttribute('data-metric-rule'),/我司可售天数≥85天/);assert(state.top.rows.every(row=>row.coverage15>=85));
  assert.deepEqual(state.shortage.rows,initial.shortage.rows);assert.deepEqual(state.warning.rows,initial.warning.rows);assert.deepEqual(state.supplier.materialTotal,initial.supplier.materialTotal);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});assert.equal((await runtime()).rules.values['stock.slowDays'],85);
  await revealBusinessRule(page,'stock.warning.coverageDays');await field('stock.warning.coverageDays').fill('70');await save();state=await runtime();assert.match(state.warning.rule,/我司可售天数≥70天/);assert(state.warning.rows.every(row=>row.coverage15>=70));assert.match(state.shortage.rule,/≤15天/);assert.match(await page.locator('#inventory-stagnant-top .metric-help').getAttribute('data-metric-rule'),/≥85天/);
  await revealBusinessRule(page,'stock.shortage.sellableDays');await field('stock.shortage.sellableDays').fill('12');await save();assert.match((await runtime()).shortage.rule,/可售天数≤12天/);
  assert.equal(await page.locator('[data-brc-tab="suppliers"],[data-brc-tab="cost"]').count(),0,'已移除供应商和降本增效规则页签');
  for(const [group,section,needles] of [['new','新品销售成功率',['跨季度、跨年','季度成功不代表年度成功','已出池']]]){
   await page.locator('[data-brc-tab="'+group+'"]').click();await page.getByRole('tab',{name:section,exact:true}).click();const text=await page.locator('#brc-cards').innerText();for(const needle of needles)assert(text.includes(needle),group+'补充 '+needle);
  }
  for(const width of [1920,1366,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'规则页不外溢 '+width)}
  await page.evaluate(()=>location.hash='#system-cost-efficiency');await page.locator('#cec-page').waitFor({state:'visible'});assert.equal(await page.locator('#cec-page h2').innerText(),'降本增效目标');assert.equal(await page.locator('[data-system-route="#system-cost-efficiency"]').innerText(),'降本增效目标');
 }finally{await page.evaluate(value=>{if(value===null)localStorage.removeItem('dashboard-business-rules-v3');else localStorage.setItem('dashboard-business-rules-v3',value)},original);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});await page.setViewportSize({width:1920,height:1080})}
 console.log('通过：共享呆滞与预警阈值保存生效、非法边界保护、刷新持久化及其他模块口径和菜单');
}
