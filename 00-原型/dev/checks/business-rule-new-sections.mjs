import assert from 'node:assert/strict';
// 本地只保存仍开放的新品规则；SABC等级及经营标签使用统一的只读配置来源。
export async function businessRuleNewSections(page){
 const keys=['dashboard-business-rules-v3','dashboard-business-rules-v2','dashboard-business-rules-v1'];
 const previous=await page.evaluate(keys=>keys.map(key=>[key,localStorage.getItem(key)]),keys);
 const snap=()=>page.evaluate(()=>businessRuleConfigSnapshot()),runtime=()=>page.evaluate(()=>businessRuleRuntimeSnapshot());
 const save=async()=>{await page.locator('[data-brc-save]').click();await page.waitForFunction(()=>document.querySelector('[data-brc-save]').disabled);assert.equal(await page.locator('#brc-error').innerText(),'')};
 try{
  await page.evaluate(keys=>keys.forEach(key=>localStorage.removeItem(key)),keys);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  const initial=await snap(),baseRuntime=await runtime(),grades=Object.fromEntries(Object.entries(initial.values).filter(([key])=>key.startsWith('grades.')));
  await page.evaluate(()=>{const source=businessRuleConfigSnapshot(),values={...source.values,'grades.S.salesAbove':900,'grades.S.profitAbove':99,'new.exitDays':45},conditions={...source.conditions,'grades.S.salesAbove':{op:'gt',a:900},'grades.S.profitAbove':{op:'gt',a:99}};localStorage.setItem('dashboard-business-rules-v3',JSON.stringify({version:3,revision:9,gradeRuleRevision:1,returnRuleRevision:1,deliveryRuleRevision:1,shopReturnRuleRevision:1,values,conditions}))});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#system-business-rules');await page.locator('#business-rule-page').waitFor();
  assert.deepEqual(await page.locator('[data-brc-new-tab]').allTextContents(),['新品判定','新品销售成功率','新品上市及时率']);
  const loaded=await snap();assert.equal(loaded.values['new.exitDays'],45,'非SABC自定义规则保留');assert(loaded.items.every(item=>!item.key.startsWith('grades.')));
  assert(loaded.definitions.filter(item=>item.key.startsWith('grades.')).every(item=>item.configurable===false&&item.source==='数智罗盘SABC规则配置'));
  assert.deepEqual(Object.fromEntries(Object.entries(loaded.values).filter(([key])=>key.startsWith('grades.'))),grades,'旧的本地等级及利润条件不覆盖共享来源');
  let actual=await runtime();assert.equal(actual.grade650,baseRuntime.grade650);assert.equal(actual.aiGrade650,baseRuntime.aiGrade650);assert.equal(actual.gradeHelp,baseRuntime.gradeHelp);
  for(const group of ['new','products','shops','stock']){await page.locator(`[data-brc-tab="${group}"]`).click();assert.equal(await page.locator('#brc-cards [data-brc-field^="grades."],#brc-cards [data-brc-op^="grades."]').count(),0);assert.equal(await page.getByRole('tab',{name:'SABC规则',exact:true}).count(),0)}
  await page.locator('[data-brc-tab="new"]').click();await page.locator('[data-brc-new-tab="identify"]').click();await page.locator('[data-brc-field="new.exitDays"]').fill('46');await page.locator('[data-brc-new-tab="delivery"]').click();assert.equal((await snap()).draft['new.exitDays'],46,'保留其他新品页签未保存内容');
  await page.locator('[data-brc-field="new.deliveryDays"]').fill('20');await save();
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-business-rules-v3')));assert(Object.keys(persisted.values).every(key=>!key.startsWith('grades.')));assert(Object.keys(persisted.conditions).every(key=>!key.startsWith('grades.')));assert.equal(persisted.values['new.deliveryDays'],20);assert.equal(persisted.values['new.exitDays'],46);
  actual=await runtime();assert.equal(actual.grade650,baseRuntime.grade650);assert.equal(actual.aiGrade650,baseRuntime.aiGrade650);assert.equal(actual.aiPrompt,baseRuntime.aiPrompt);
  await page.locator('[data-brc-field="new.deliveryDays"]').fill('21');
  await page.evaluate(()=>location.hash='#new');
  const timely=page.locator('[data-nsp-static-metric="ontime"]');
  assert.match(await timely.innerText(),/新品上市及时率/);
  const help=timely.locator('.metric-help');await help.hover();
  const tip=page.locator('#metric-tooltip');await tip.waitFor({state:'visible'});
  assert.match(await tip.innerText(),/实际上市项目数 ÷ 应上市项目数 × 100%/);
  assert.match(await tip.innerText(),/计划完成时间＋20天/,'未保存的21天不影响已生效提示');
  await page.mouse.move(0,0);await page.evaluate(()=>location.hash='#system-business-rules');
  await page.locator('[data-brc-new-tab="delivery"]').click();await page.locator('[data-brc-cancel]').click();
  assert.equal((await snap()).values['new.deliveryDays'],20,'取消后仍保留已保存值');
  await page.locator('[data-brc-defaults]').click();await save();assert.deepEqual(Object.fromEntries(Object.entries((await snap()).values).filter(([key])=>key.startsWith('grades.'))),grades,'恢复本地默认不修改外部SABC条件');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');assert.equal((await runtime()).grade650,baseRuntime.grade650);
  for(const width of [1920,390]){await page.setViewportSize({width,height:1080});await page.evaluate(()=>location.hash='#system-business-rules');assert(await page.locator('#business-rule-page').evaluate(el=>el.scrollWidth<=el.clientWidth+1))}
 }finally{
  await page.evaluate(previous=>previous.forEach(([key,value])=>value===null?localStorage.removeItem(key):localStorage.setItem(key,value)),previous);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 }
 console.log('通过：新品仅三页签、SABC与标签只读来源、本地旧覆盖值失效、其他规则保存/恢复及AI一致。');
}
