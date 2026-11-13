import {revealBusinessRule} from './business-rules-context.mjs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function ruleStoreModel(){
 const memory=new Map(),ctx=vm.createContext({localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}});
 for(const file of ['00-definitions.js','00-refurb-cycle.js','00-condition-catalog.js','00-condition-math.js','00-score-rules.js','00-condition-runtime.js','00-result-groups.js','01-validation.js','01-store.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/'+file,import.meta.url),'utf8'),ctx);
 const defaults=vm.runInContext('({...brcDefaults})',ctx);assert.equal(ctx.brcValidate(defaults),null);
 memory.set('dashboard-business-rules-v1',JSON.stringify({version:1,revision:0,values:{...defaults,'finance.deduction':15,'suppliers.purchase':9000,'grades.new.sales':1,'grades.S.salesAbove':700}}));
 const legacy=ctx.brcRead();assert.equal(legacy.values['finance.deduction'],15);assert.equal('suppliers.purchase' in legacy.values,false,'旧供应商配置不再作为可编辑数据读取');assert.equal('grades.new.sales' in legacy.values,false,'移除旧的独立新品分级键');assert.equal(legacy.values['grades.S.salesAbove'],600,'按用户月销规范升级旧SABC配置');memory.clear();

 assert.match(ctx.brcValidate({...defaults,'lights.green':50}).message,/区间终点|条件无法同时满足/);
 assert.match(ctx.brcValidate({...defaults,'shops.pddCount':2.5}).message,/整数/);
 assert.match(ctx.brcValidate({...defaults,'grades.S.profitAbove':8}).message,/重叠/);
 assert.match(ctx.brcValidate({...defaults,'stock.refurbDays':50}).message,/条件无法同时满足/);
 assert.equal(ctx.brcValidate({...defaults,'grades.S.salesAbove':900}),null,'允许原有分级空档，不擅自补齐');
 assert.throws(()=>ctx.brcCommit('common',{...defaults,'lights.green':null}),/业务对象不存在/);
 const hiddenValues={...defaults,'lights.green':120,'lights.yellow':90};memory.set('dashboard-business-rules-v3',JSON.stringify({version:3,revision:0,returnRuleRevision:1,values:hiddenValues,conditions:ctx.brcDefaultConditions(hiddenValues)}));vm.runInContext('brcSaved=brcRead()',ctx);
 const saved=ctx.brcCommit('products',{...defaults,'finance.deduction':15,'stock.slowDays':100});
 assert.equal(saved.values['lights.green'],120,'移除入口后保留历史达成率规则');assert.equal(saved.values['finance.deduction'],10,'已移除的配置不再接受编辑提交');assert.equal(saved.values['stock.slowDays'],60,'只保存当前模块');
 memory.set('dashboard-business-rules-v3',JSON.stringify({...saved,revision:10}));assert.throws(()=>ctx.brcCommit('products',defaults),/其他页面更新/);
}
export async function businessRules(page){
 ruleStoreModel();
 const entry=page.getByRole('button',{name:'配置全局规则',exact:true});const a=await entry.boundingBox(),b=await page.locator('#dashboard-fullscreen').boundingBox();assert(a&&b&&a.x+a.width<=b.x,'文字入口位于全屏按钮左侧');await entry.click();
 assert.match(page.url(),/#system-business-rules$/);assert.equal(await page.locator('#business-rule-page .sm-page-title').innerText(),'规则配置');
 assert(await page.locator('.lt-menu-group').filter({has:page.locator('summary', {hasText:'业务配置'})}).getByRole('link',{name:'规则配置',exact:true}).isVisible());
 assert.deepEqual(await page.locator('#brc-tabs [role=tab]').allTextContents(),['新品','产品','店铺','库存']);
 const snapshot=()=>page.evaluate(()=>window.businessRuleConfigSnapshot()),runtime=()=>page.evaluate(()=>window.businessRuleRuntimeSnapshot());
 const initial=await snapshot(),baseline=await runtime();
 assert.equal(initial.activeGroup,'new');assert(initial.definitions.length>0);
 assert.equal(new Set(initial.definitions.map(rule=>rule.key)).size,initial.definitions.length);
 const owner=key=>initial.definitions.find(rule=>rule.key===key)?.group;
 for(const [key,group] of [['quality.returnDelta','products'],['finance.deduction','products'],['lights.return','products'],['lights.turn.month.green','stock'],['lights.projectDelay','projects'],['lights.decline','common']])assert.equal(owner(key),group,key);
 assert(initial.definitions.every(rule=>!rule.key.startsWith('suppliers.')));
 for(const group of ['new','products','shops','stock']){
  await page.locator('[data-brc-tab="'+group+'"]').click();
  const keys=new Set(),sections=initial.sections[group];
  assert.deepEqual(await page.locator('[data-brc-section-tab]').allTextContents(),sections.map(part=>part.title),'模块标题 '+group);
  for(const section of sections){
   await page.locator('[data-brc-section-tab="'+section.id+'"]').click();
   assert.equal(await page.locator('#brc-cards [role=tabpanel]').count(),1,'仅渲染当前模块');
   assert.equal(await page.locator('#brc-cards [role=tabpanel]').getAttribute('data-brc-section'),section.id);
   for(const key of await page.locator('[data-brc-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.brcField)))keys.add(key);
  }
  assert.equal(keys.size,initial.items.filter(rule=>rule.group===group).length,'全部配置均有对应模块 '+group);
  await page.locator('[data-brc-section-tab]').last().focus();await page.keyboard.press('Home');assert.equal((await snapshot()).activeSection,sections[0].id);
  await page.keyboard.press('End');assert.equal((await snapshot()).activeSection,sections.at(-1).id);
  await page.keyboard.press('ArrowRight');assert.equal((await snapshot()).activeSection,sections[0].id);
  assert.equal(await page.locator('#brc-fixed').count(),0);
  if(group!=='new'){
   await page.locator('[data-brc-section-tab]').first().click();
   const headers=await page.locator('.brc-condition-head').evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('span')].map(span=>span.textContent)));
   assert(headers.length>0&&headers.every(row=>row.join('|')==='条件|指标|连接条件|数值|'),'统一条件行表头 '+group);
   assert.equal(await page.locator('[data-brc-metric]').count(),await page.locator('.brc-condition-value').count(),'每个有数值的条件都有指标下拉 '+group);
   await page.setViewportSize({width:390,height:1000});assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'各业务对象窄屏无页面横向溢出 '+group);await page.setViewportSize({width:1920,height:1080});
  }
  if(group!=='new')await page.screenshot({path:fileURLToPath(new URL('../../outputs/business-rule-table-'+group+'-1920.png',import.meta.url))});
 }

 assert.equal(baseline.attainment100,'green');assert.equal(baseline.grade650,'S');assert.equal(baseline.aiGrade650,'S');assert.equal(baseline.qualityGrowth4,true);assert.equal(baseline.delivery10,1);assert.equal(baseline.refurb40,1);
 const tab=async key=>page.locator('[data-brc-tab="'+key+'"]').click();
 const fill=async(key,value)=>{await revealBusinessRule(page,key);const item=initial.items.find(i=>i.key===key),upper=item.anchor==='b'&&Array.isArray(initial.conditions[key]?.conditions);await page.locator('['+(upper?'data-brc-upper':'data-brc-field')+'="'+key+'"]').first().fill(String(value))};
 const save=async()=>{await page.locator('[data-brc-save]').click();await page.waitForFunction(()=>!document.querySelector('[data-brc-save]')||document.querySelector('[data-brc-save]').disabled)};
 await tab('products');await fill('lights.return',-1);await revealBusinessRule(page,'quality.returnDelta');await page.locator('[data-brc-save]').click();assert.equal((await snapshot()).activeSection,initial.sections.products.find(part=>part.keys.includes('lights.return')).id,'保存自动定位未展示模块的错误');assert.match(await page.locator('#brc-error').innerText(),/区间终点|条件无法同时满足/);assert.equal((await snapshot()).revision,initial.revision);await page.locator('[data-brc-cancel]').click();
 await tab('products');await fill('lights.return',4);await save();assert.equal((await runtime()).returnGap3,'rp-quality-yellow');
 assert.equal(await page.locator('[data-brc-field^="grades."]').count(),0,'本地不配置SABC或经营标签');
 await tab('products');await fill('quality.returnDelta',5);await fill('quality.contactDelta',25);await save();let actual=await runtime();assert.equal(actual.qualityGrowth4,false);assert.equal(actual.contactGrowth21,false);assert.deepEqual(actual.worsening11,['总退环比恶化']);assert.match(actual.riskRule,/进线率环比增长率＞25%/);
 await tab('shops');await fill('shops.抖音.red',4.75);await fill('shops.pddValue',35);await save();actual=await runtime();assert.equal(actual.shop47,'rp-quality-red');assert.equal(actual.pdd31,0);assert.match(actual.shopHint,/4.75/);
 await tab('stock');await fill('stock.slowDays',70);await fill('stock.refurbDays',30);await save();actual=await runtime();assert.deepEqual(actual.stock65,[]);assert.equal(actual.refurb40,0);
 await tab('new');await fill('new.quarterGsv',600);await fill('new.deliveryDays',5);await save();actual=await runtime();assert.equal(actual.new550,false);assert.equal(actual.delivery10,0);assert.match(actual.newRule,/＋5天/);
 await tab('products');assert.equal(await page.locator('[data-brc-field="finance.deduction"]').count(),0);assert(!/净利润率预估|利润率扣减/.test(await page.locator('#brc-cards').innerText()));assert.equal((await runtime()).net20,baseline.net20,'移除配置不改变现有测算');
 assert.equal((await runtime()).supplierRule,baseline.supplierRule,'供应商认定仅作说明，不受配置保存覆盖');
 const values=(await snapshot()).values;await page.reload();await page.locator('#business-rule-page').waitFor({state:'visible'});assert.deepEqual((await snapshot()).values,values,'刷新保留保存配置');assert.equal((await runtime()).net20,baseline.net20);
 await tab('products');await fill('quality.returnDelta',6);assert.equal(await page.locator('[data-brc-section-tab][aria-selected=true] .brc-dirty').count(),1);await revealBusinessRule(page,'quality.worsenReturn');await revealBusinessRule(page,'quality.returnDelta');assert.equal(await page.locator('[data-brc-field="quality.returnDelta"]').inputValue(),'6','同对象模块切换保留草稿');await tab('stock');await tab('products');assert.equal(await page.locator('[data-brc-field="quality.returnDelta"]').inputValue(),'6','切换模块保留草稿');assert.equal((await runtime()).qualityGrowth6,true,'草稿不影响已保存规则');await page.locator('[data-brc-cancel]').click();assert.equal(await page.locator('[data-brc-field="quality.returnDelta"]').inputValue(),'5');
 await page.locator('[data-brc-defaults]').click();assert.equal((await runtime()).net20,baseline.net20,'恢复默认保持历史测算参数');await save();assert.equal((await runtime()).net20,baseline.net20);
 for(const key of ['products','shops','stock','new']){await tab(key);await page.locator('[data-brc-defaults]').click();if(await page.locator('[data-brc-save]').isEnabled())await save()}
 assert.deepEqual((await snapshot()).values,initial.values,'所有模块可恢复默认');
 await tab('products');await page.locator('#toast').waitFor({state:'hidden'});
 for(const width of [1920,1100,390]){await page.setViewportSize({width,height:1000});assert.equal(await page.locator('#business-rule-page').evaluate(host=>host.scrollWidth<=host.clientWidth+1),true,'配置页不横向溢出 '+width)}
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/business-rules-mobile.png',import.meta.url))});
 await page.setViewportSize({width:1920,height:1080});await tab('products');await page.screenshot({path:fileURLToPath(new URL('../../outputs/business-rules-desktop.png',import.meta.url))});
 await tab('new');await page.locator('#brc-tab-new').focus();await page.keyboard.press('ArrowRight');assert.equal((await snapshot()).activeGroup,'products');
}
