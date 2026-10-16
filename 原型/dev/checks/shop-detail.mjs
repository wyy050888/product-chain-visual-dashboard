import {verifyShopMetrics} from './shop-metrics.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function shopDetail(page){
 const root=page.locator('.sd-detail'),dialog=page.locator('.up-todo-dialog');
 // 通过统一详情事件覆盖六渠道；绿色店铺未必在当前高危榜中。
 const open=async id=>{await page.evaluate(id=>{const b=document.createElement('button');b.dataset.riskitem='1,'+id;document.body.append(b);b.click();b.remove()},id);await root.waitFor()};
 const close=()=>page.locator('#close').click();
 const choose=async(picker,name)=>{await picker.locator('[data-people-query]').fill(name);await picker.locator('[role=option]').filter({hasText:name}).first().click()};
 const prompts=new Set();
 const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')));
 for(const [id,channel] of [[4,'抖音'],[3,'快手'],[5,'视频号'],[2,'天猫'],[1,'京东'],[6,'拼多多']]){
  await open(id);assert.equal(await page.locator('#dialogtitle').innerText(),'店铺详情');
  assert.deepEqual(await root.locator('.drawer-tabs [data-drawer-tab]').allTextContents(),['业绩表现','店铺违规','风险待办']);
  const fields=await root.locator('.up-hero dl').innerText();assert(fields.includes(channel));
  if(channel==='视频号')assert.doesNotMatch(fields,/负责人|店铺推广|店铺策略/);
  else if(channel==='抖音')assert.match(fields,/负责人[\s\S]*抖音[一二三]区-/);
  else if(channel==='快手')assert.match(fields,/负责人[\s\S]*剪运[一二三]区-/);
  else{assert.match(fields,/店铺推广[\s\S]*品牌[一二三]区-/);assert.match(fields,/店铺策略[\s\S]*品牌[一二三]区-/)}
  const geometry=await root.evaluate(e=>({hero:e.querySelector('.up-hero').getBoundingClientRect().bottom,tabs:e.querySelector('.drawer-tabs').getBoundingClientRect().top}));assert(geometry.hero<=geometry.tabs);
  assert(await root.locator('[data-sd-ai-content]').isVisible());await root.locator('[data-sd-ai-toggle]').click();assert(await root.locator('[data-sd-ai-content]').isHidden());await root.locator('[data-sd-ai-toggle]').click();
  await root.locator('[data-sd-prompt]').click();assert(await root.locator('.up-ai-prompt-dialog').isVisible());const prompt=await root.locator('.up-ai-prompt-dialog pre').innerText();assert(prompt.includes(channel+'店铺经营与风险分析专家'));for(const label of ['# 一、角色','# 二、任务','# 三、输入数据','# 四、业务规则','# 五、分析要求','# 六、输出格式','# 七、输出纪律','仅有评分、业绩、违规三类业务数据','没有额外阈值','冻结事件金额不等于当前冻结余额'])assert(prompt.includes(label));assert.deepEqual(await root.locator('.sd-diagnosis-dimension>b').allTextContents(),['评分','业绩','违规']);assert.deepEqual(await root.locator('.up-ai-section>strong').allTextContents(),['经营结论','问题分析','部门行动']);assert.doesNotMatch(await root.locator('[data-sd-ai-content]').innerText(),/批次|直播场次|首响|私域|客服根因待核实|undefined/);prompts.add(prompt);await page.keyboard.press('Escape');assert(await root.isVisible());
  assert.equal(await root.locator('[data-up-series]').count(),3);await root.locator('[data-up-trend-point]').first().hover();assert.deepEqual(await page.locator('.up-sales-tooltip-row>span').allTextContents(),['GSV','去退后销量','总退']);await page.mouse.move(0,0);
  const departmentActions=await root.locator('.up-ai-actions p').innerText();
  assert.equal((departmentActions.match(/店铺负责人：/g)||[]).length,1,'店铺负责人统一名称且仅列一条');
  assert.doesNotMatch(departmentActions,/抖音[一二三]区|剪运[一二三]区|品牌[一二三]区|具体部门待明确/);
  assert(await root.locator('.up-ai-mark.owner').count()>0);
  const coloredRisk=root.locator('.up-ai-mark.risk').first();assert(await coloredRisk.isVisible());
  assert(await coloredRisk.evaluate(e=>getComputedStyle(e).color!==getComputedStyle(e.parentElement).color),'风险字色与正文区分');
  assert.deepEqual(await root.locator('.sd-kpis small').allTextContents(),['GSV','去退后销量','总退']);assert.equal(await root.locator('.sd-kpis .up-operating-value>span').count(),3);assert.deepEqual(await root.locator('[data-sd-spu-table] th').allTextContents(),['SPU信息','GSV','去退后销量','利润率']);
  await root.locator('[data-drawer-tab="violations"]').click();assert(await root.locator('[data-sd-violation-quality]').isChecked());const headers=await root.locator('[data-sd-violation-table] th').allTextContents();assert(headers.includes(({抖音:'情节级别',快手:'申诉和整改状态',视频号:'信用变更',天猫:'扣分',京东:'申诉截止日期',拼多多:'赔付金额'})[channel]),channel+': '+JSON.stringify(headers));const stats=Number((await root.locator('.sd-violation-stats strong').first().innerText()).replace('次',''));assert.equal(await root.locator('[data-sd-violation-table] tbody tr').count(),stats);
  await root.locator('[data-sd-type="fine"]').click();const rows=await root.locator('[data-sd-violation-table] tbody tr').allTextContents();assert(rows.every(r=>r.includes('平台罚款')||channel==='拼多多'));
  await root.locator('[aria-label="搜索店铺违规"]').fill('不存在编号');assert.equal(await root.locator('[data-sd-violation-table] tbody tr').count(),0);await root.locator('[aria-label="搜索店铺违规"]').fill('');await root.locator('[data-sd-type="all"]').click();
  if(id===4)await page.screenshot({path:fileURLToPath(new URL('../../outputs/shop-detail-violations.png',import.meta.url))});await close();
 }
 assert.equal(prompts.size,6);
 // 主列表入口、独立期间与返回保持。
 await page.locator('#riskrail [data-risk="1"]').click();await page.locator('#dialogsub [data-drawer-time-mode="month"]').click();await page.locator('#dialogsub [data-drawer-time-value]').selectOption('9');
 await page.locator('#rf-list-table [data-riskitem]').first().click();assert.equal(await root.getAttribute('data-start'),'2026-09-01');
 const aiText=await root.locator('.up-ai-section p').allTextContents(),scope=await root.locator('.up-ai-scope').innerText();
 assert.equal(scope,'截至26/10/10');assert(aiText.join('').includes('累计GSV')&&aiText.join('').includes('近30日GSV'));
 const september=await root.locator('.sd-kpis strong').first().textContent();
 await root.locator('[data-drawer-tab="violations"]').click();const qualityCount=Number((await root.locator('.sd-violation-stats strong').first().innerText()).replace('次',''));await root.locator('[data-sd-violation-quality]').uncheck();const allCount=Number((await root.locator('.sd-violation-stats strong').first().innerText()).replace('次',''));assert(allCount>qualityCount);
 await page.locator('#dialogsub [data-drawer-time-value]').selectOption('10');assert.equal(await root.getAttribute('data-start'),'2026-10-01');
 assert.notEqual(await root.locator('.sd-kpis strong').first().textContent(),september,'页面业绩继续支持日期筛选');
 assert.deepEqual(await root.locator('.up-ai-section p').allTextContents(),aiText,'AI不跟随月份变化');assert.equal(await root.locator('.up-ai-scope').innerText(),scope);
 await root.locator('[data-drawer-tab="handling"]').click();await root.locator('[data-todo-tab="suggestions"]').click();
 const suggestions=()=>root.locator('#up-todo-table [data-todo-open="detail"]').evaluateAll(es=>es.map(e=>e.dataset.todoId));
 const octoberIds=await suggestions();assert(octoberIds.length>0);
 await page.locator('#dialogsub [data-drawer-time-value]').selectOption('9');
 assert.deepEqual(await suggestions(),octoberIds,'AI建议及稳定ID不跟随页面日期变化');
 assert.deepEqual(await root.locator('.up-ai-section p').allTextContents(),aiText);
 await page.locator('.drawer-back').click();assert.equal(JSON.parse(await page.locator('#dialogbody').getAttribute('data-ranking-period')).value,9);await close();
 // 店铺待办复用同一增删改、自动保存、批量下发及完成流程。
 await open(4);await root.locator('[data-drawer-tab="handling"]').click();assert.equal(await root.locator('#up-todo-actor').count(),0);await root.locator('[data-todo-create]').click();assert.deepEqual(await dialog.locator('.up-todo-common dt').allTextContents(),['负责人','截止日期','优先级']);
 await dialog.locator('[name="title"]').fill('店铺冻结材料核对');await dialog.locator('[name="description"]').fill('逐条核对本期冻结通知及解冻材料');const owner=Object.values(await records()).find(t=>t.scope==='shop'&&t.shopId).assignees[0].name;await choose(dialog.locator('[data-people-picker]'),owner);await dialog.locator('[name="due"]').fill('2027-01-03');await dialog.locator('[data-todo-action="create"]').click();
 const task=Object.values(await records()).find(t=>t.scope==='shop'&&t.title==='店铺冻结材料核对');assert(task);assert(task.assignees.length);
 await root.locator(`[data-todo-id="${task.id}"][data-todo-open="detail"]`).click();await dialog.locator('[data-todo-field-edit="plan"]').click();await dialog.locator('[data-inline-value]').fill('核验通知并归档平台回执');await dialog.locator('header h3').click();assert.equal((await records())[task.id].plan,'核验通知并归档平台回执');await dialog.locator('[data-todo-status-select]').selectOption('done');await dialog.locator('header h3').click();assert.equal((await records())[task.id].status,'done');assert((await records())[task.id].completedAt);await page.keyboard.press('Escape');
 await root.locator('[data-todo-tab="suggestions"]').click();const boxes=root.locator('[data-todo-select]');assert(await boxes.count()>=2);await boxes.nth(0).check();await boxes.nth(1).check();await root.locator('[data-todo-batch]').click();await dialog.locator('[data-batch-due]').fill('2027-01-04');await dialog.locator('h3').click();for(const picker of await dialog.locator('[data-people-picker]').all())await choose(picker,owner);await dialog.locator('[data-batch-submit]').click();assert.equal(await dialog.count(),0);assert(Object.values(await records()).filter(t=>t.spuId===task.spuId&&t.source==='ai').length===2);
 await root.locator(`[data-todo-id="${task.id}"][data-todo-open="delete"]`).click();await dialog.locator('[data-todo-action="delete"]').click();assert((await records())[task.id].deletedAt);
 await page.setViewportSize({width:390,height:900});assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);await page.setViewportSize({width:1920,height:1080});await close();
 await open(1);await root.locator('[data-drawer-tab="handling"]').click();assert.equal(await root.locator(`[data-todo-id="${task.id}"]`).count(),0);await close();await page.reload();await open(4);await root.locator('[data-drawer-tab="handling"]').click();assert.equal(await root.locator(`[data-todo-id="${task.id}"]`).count(),0);assert.equal(Object.values(await records()).filter(t=>t.spuId===task.spuId&&t.source==='ai').length,2);await close();
 await verifyShopMetrics(page);
}
