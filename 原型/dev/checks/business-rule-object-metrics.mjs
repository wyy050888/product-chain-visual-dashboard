import assert from 'node:assert/strict';
import {revealBusinessRule} from './business-rules-context.mjs';

export async function businessRuleObjectMetrics(page){
 await page.getByRole('button',{name:'配置全局规则',exact:true}).click();
 const snapshot=()=>page.evaluate(()=>window.businessRuleConfigSnapshot()),runtime=()=>page.evaluate(()=>window.businessRuleRuntimeSnapshot());
 const initial=await snapshot(),seen=new Set(),unit=source=>['元','万元'].includes(source)?'w':source;
 const save=async()=>{await page.locator('[data-brc-save]').click();await page.waitForFunction(()=>document.querySelector('[data-brc-save]').disabled);assert.equal(await page.locator('#brc-error').innerText(),'')};
 // 遍历所有对象和二级模块，检查全部条件行，参数字段不伪装成布尔条件。
 for(const [group,sections] of Object.entries(initial.sections)){
  await page.locator('[data-brc-tab="'+group+'"]').click();
  for(const section of sections){
   await page.locator('[data-brc-section-tab="'+section.id+'"]').click();
   const rows=page.locator('[data-brc-row]');
   for(const key of await rows.evaluateAll(nodes=>nodes.map(node=>node.dataset.brcRow)))seen.add(key);
   assert.equal(await page.locator('.brc-fixed-metric,.brc-fixed-operator').count(),0,'不将参数伪装为条件 '+section.title);
   for(const row of await rows.all()){
    for(const clause of await row.locator('.brc-condition-clause').all()){
     assert.deepEqual(await clause.evaluate(el=>[...el.children].slice(0,4).map(n=>n.matches('[data-brc-metric]')?'metric':n.matches('[data-brc-op],[data-brc-term-op]')?'operator':n.matches('.brc-condition-value')?'value':'relation')),['relation','metric','operator','value'],group+' / '+section.title);
     const metric=clause.locator('[data-brc-metric]');assert(await metric.isEnabled());assert(await metric.locator('option').count()>0);
     const input=clause.locator('[data-brc-bound]');assert.equal((await clause.locator('.brc-unit').textContent()).trim(),unit(await input.getAttribute('data-brc-unit')));
    }
   }
   if(await rows.count()){
    const row=rows.first(),key=await row.getAttribute('data-brc-row'),before=JSON.stringify((await snapshot()).draftConditions[key]);
    const parent=await row.evaluate(el=>{let group=el.closest('[data-brc-result-group]');while(group?.parentElement.closest('[data-brc-result-group]'))group=group.parentElement.closest('[data-brc-result-group]');return group?{id:group.dataset.brcResultGroup,instance:group.dataset.brcInstance}:null});
    const owner=parent?page.locator('[data-brc-result-group="'+parent.id+'"][data-brc-instance="'+parent.instance+'"]'):row;
    await owner.locator('[data-brc-add]').first().click();
    const addedKey=await owner.locator('[data-brc-add]').first().getAttribute('data-brc-add'),added=page.locator('[data-brc-row="'+addedKey+'"] .brc-condition-clause').last();
    assert(await added.locator('[data-brc-metric]').isEnabled(),'新增条件可选指标 '+section.title);
    assert.deepEqual(await added.locator('[data-brc-join] option,[data-brc-result-join] option').allTextContents(),['且','或']);
    await page.locator('[data-brc-row="'+addedKey+'"] [data-brc-remove]').last().click();
    assert.equal(JSON.stringify((await snapshot()).draftConditions[key]),before,'移除新增条件恢复原规则');
   }
   await page.setViewportSize({width:390,height:1000});
   assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),group+' / '+section.title+' 窄屏无页面溢出');
   await page.setViewportSize({width:1920,height:1080});
  }
 }
 // 已撤下的品质风险触发仍保留运行时键，仅核对当前页面声明的配置入口。
 const visibleKeys=new Set(Object.values(initial.sections).flatMap(sections=>sections.flatMap(section=>section.keys)));
 for(const item of initial.items.filter(item=>item.kind==='condition'&&visibleKeys.has(item.key)))assert(seen.has(item.key),'每个可编辑条件均归属于明确模块 '+item.key);
 await page.locator('[data-brc-tab=shops]').click();
 assert.deepEqual(await page.locator('[data-brc-section-tab]').allTextContents(),['店铺评分判灯','拼多多核心链接']);
 for(const key of ['shops.penalties','shops.fine','shops.returnExcess'])assert.equal(await page.locator('[data-brc-field="'+key+'"]').count(),0,'已移除配置入口');
 // 旧库存风险入口已撤下；仅在该入口仍对外提供时执行旧台账联动断言。
 if(visibleKeys.has('stock.shortDays')){
 await revealBusinessRule(page,'stock.shortDays');
 assert(!(await runtime()).stockCoverage10Total40.includes('shortage'));
 await page.locator('[data-brc-metric="stock.shortDays"]').selectOption('coverage15');await save();
 assert((await runtime()).stockCoverage10Total40.includes('shortage'),'库存风险按所选我司可售天数判定');
 await page.locator('[data-brc-add="stock.shortDays"]').click();
 await page.locator('[data-brc-metric="stock.shortDays"]').last().selectOption('value');
 await page.locator('[data-brc-term-op="stock.shortDays"]').selectOption('lt');await page.locator('[data-brc-upper="stock.shortDays"]').fill('30');await save();
 assert(!(await runtime()).stockCoverage10Total40.includes('shortage'),'两个可售天数指标可按且判定');
 await page.locator('[data-brc-join="stock.shortDays"]').selectOption('any');await save();
 assert((await runtime()).stockCoverage10Total40.includes('shortage'),'两个可售天数指标可按或判定');
 }
 await page.setViewportSize({width:390,height:1000});assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
}
