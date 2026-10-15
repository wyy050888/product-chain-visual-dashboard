import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function verifyProductTodos(page,detailRef){
 await page.locator('[data-drawer-tab="handling"]').click();
 const panel=page.locator('[data-up-panel="handling"]'),dialog=page.locator('.up-todo-dialog'),table=page.locator('#up-todo-table');
 const open=(id,mode)=>page.locator(`[data-todo-id="${id}"][data-todo-open="${mode}"]`).click();
 const choose=async(picker,name)=>{await picker.locator('[data-people-query]').fill(name);await picker.locator('[role=option]').filter({hasText:name}).first().click()};
 const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')));
 assert.equal(await page.locator('#up-todo-actor,[data-todo-dialog-actor]').count(),0);
 assert.doesNotMatch(await panel.innerText(),/协同部门|操作人|验收|开始处理/);
 assert.equal(await page.locator('.up-detail>.up-toolbar').isVisible(),false);
 const clipped=table.locator('.up-todo-description').first();await clipped.hover();await page.locator('#ui-cell-tooltip').waitFor({state:'visible'});assert.equal(await page.locator('#ui-cell-tooltip').innerText(),await clipped.innerText());await page.mouse.move(0,0);
 const overdue=table.locator('tbody tr').filter({has:page.locator('.up-todo-overdue')}).first();assert.equal(await overdue.locator('td').nth(6).locator('.up-todo-overdue').count(),0);assert.equal(await overdue.locator('td').nth(3).locator('.up-todo-overdue').count(),1);
 const initial=await table.locator('tbody').innerText();
 const description=await table.locator('.up-todo-description').first().innerText();
 assert(description.includes('判断理由')&&description.includes('统计期间'),'列表保留完整描述，只由样式截断');
 const firstId=await table.locator('[data-todo-open="detail"]').first().getAttribute('data-todo-id');
 const originalDescription=(await records())[firstId].description;
 await open(firstId,'detail');
 assert.equal(await dialog.locator('.up-todo-problem-group.reason').count(),1);
 assert.equal(await dialog.locator('.up-todo-problem-group.period').count(),1);
 assert(await dialog.locator('.up-todo-problem-group.facts .up-todo-problem-line').count()>0);
 assert.equal((await dialog.locator('.up-todo-problem').innerText()).replace(/\s/g,''),description.replace(/\s/g,''),'列表、悬浮和详情使用同一描述');
 assert.equal((await records())[firstId].description,originalDescription,'查看描述不改写已下发记录');
 await page.keyboard.press('Escape');
 await page.locator('[data-drawer-tab="quality"]').click();await page.locator('#up-platform').evaluate(e=>{e.value='京东';e.dispatchEvent(new Event('change',{bubbles:true}))});await page.locator('[data-drawer-tab="handling"]').click();assert.equal(await table.locator('tbody').innerText(),initial);
 await page.locator('#up-todo-query').fill('不存在的任务');assert.equal(await table.locator('tbody tr').count(),0);await page.locator('[data-todo-reset]').click();
 // 创建任务：当前账号自动记录，不提供操作人或协同部门字段。
 await page.locator('[data-todo-create]').click();await dialog.locator('[data-todo-action="create"]').click();assert.ok(await dialog.isVisible());
 await dialog.locator('[name="title"]').fill('核查重点链接退货原因');await dialog.locator('[name="description"]').fill('天猫总退高于目标，需按链接核对订单和售后原因');
 assert.deepEqual(await dialog.locator('.up-todo-common dt').allTextContents(),['负责人','截止日期','优先级']);await dialog.locator('[data-people-query]').click();assert(await dialog.locator('[role=listbox]').isHidden());await choose(dialog.locator('[data-people-picker]'),'刘畅');await dialog.locator('[name="due"]').fill('2027-01-02');await dialog.locator('[name="priority"]').selectOption('green');
 assert.equal(await dialog.locator('[role="tab"]').count(),0);assert.doesNotMatch(await dialog.innerText(),/操作人|协同部门/);
 await dialog.locator('[data-todo-action="create"]').click();
 const manual=Object.values(await records()).find(t=>t.source==='manual'&&!t.deletedAt);assert(manual);assert.equal(manual.assignedBy,'林悦');
 await open(manual.id,'detail');assert.equal(await dialog.locator('[data-todo-field-edit]').count(),6);assert.equal(await dialog.locator('footer').count(),0);
 assert.equal(await dialog.locator('[data-inline-save],[data-inline-cancel]').count(),0);
 const common=await dialog.locator('.up-todo-common').boundingBox(),body=await dialog.locator('.up-todo-dialog-body').boundingBox();assert(common.y+common.height<=body.y+1);assert.equal(await dialog.locator('.up-todo-common dt').first().innerText(),'任务状态');assert.equal(await dialog.locator('h5').first().innerText(),'待办事项');
 const ys=await dialog.locator('.up-todo-common dt').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert(ys.every(y=>Math.abs(y-ys[0])<1));
 const editField=async(key,value)=>{
  if(key==='status'){await dialog.locator('[data-todo-status-select]').selectOption(value);return}
  await dialog.locator(`[data-todo-field-edit="${key}"]`).click();const input=dialog.locator('[data-inline-value]');
  if(key==='assignee')await choose(dialog.locator('[data-people-picker]'),value);else if(key==='priority')await input.selectOption(value);else await input.fill(value);
  await dialog.locator('header h3').click();assert.equal(await dialog.locator('[data-inline-value]').count(),0);assert.ok(await dialog.isVisible());
 };
 // 无效修改保留输入，不写入存储；Escape可恢复。
 await dialog.locator('[data-todo-field-edit="title"]').click();await dialog.locator('[data-inline-value]').fill('');await dialog.locator('header h3').click();assert.equal((await records())[manual.id].title,manual.title);assert.equal(await dialog.locator('[data-inline-value]').count(),1);await page.keyboard.press('Escape');assert.ok(await dialog.isVisible());
 await editField('title','核查重点链接退货原因并归档');await editField('plan','逐项核对订单并提交原因分类');await editField('assignee','王磊');await editField('due','2027-01-03');await editField('priority','red');
 await dialog.locator('[data-todo-field-edit="description"]').click();await dialog.locator('[data-inline-value]').fill('按重点链接核对售后原因和批次');await dialog.locator('header h3').click();assert.equal((await records())[manual.id].description,'按重点链接核对售后原因和批次');assert.ok(await dialog.locator('.up-todo-common').isVisible());
 const edited=(await records())[manual.id];assert.equal(edited.assignee,'王磊');assert.equal(edited.priority,'red');assert.equal(edited.assignedAt,manual.assignedAt);assert.equal(edited.status,'pending');
 // 状态编辑前保存当前字段；完成记日期，重新打开清空日期。
 await dialog.locator('[data-todo-field-edit="plan"]').click();await dialog.locator('[data-inline-value]').fill('已整理订单与原因分类');await dialog.locator('[data-todo-status-select]').selectOption('done');await dialog.locator('header h3').click();
 const completed=(await records())[manual.id];assert.equal(completed.status,'done');assert.ok(completed.completedAt);assert.equal(completed.plan,'已整理订单与原因分类');assert.equal(await dialog.locator('[data-todo-complete]').count(),0);
 assert.doesNotMatch(await dialog.innerText(),/验收|流转|操作人|协同部门|诊断依据|标记完成/);
 await editField('status','working');assert.equal((await records())[manual.id].completedAt,'');assert.equal(await dialog.locator('[data-todo-completed-date]').innerText(),'—');await editField('status','done');completed.completedAt=(await records())[manual.id].completedAt;
 await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/detail-todo-common.png',import.meta.url))});await page.keyboard.press('Escape');
 // 批量下发：选中多条，分别指定负责人；必填缺失时没有部分下发。
 await page.locator('[data-todo-tab="suggestions"]').click();assert.equal(await panel.locator('[data-todo-open="complete"],[data-todo-open="basis"]').count(),0);await table.locator('[data-todo-open="detail"]').first().click();assert.match(await dialog.locator('#up-todo-panel-detail').innerText(),/判断理由：/);assert.match(await dialog.locator('#up-todo-panel-detail').innerText(),/统计期间：/);assert.equal(await dialog.locator('[data-todo-field-edit="status"]').count(),0);await page.keyboard.press('Escape');const count=await table.locator('[data-todo-select]').count();assert(count>=2);assert.ok(await page.locator('[data-todo-batch]').isDisabled());
 await table.locator('[data-todo-select-all]').check();assert.equal(await table.locator('[data-todo-select]:checked').count(),count);await table.locator('[data-todo-select-all]').uncheck();
 const boxes=table.locator('[data-todo-select]');const ids=[await boxes.nth(0).getAttribute('data-todo-select'),await boxes.nth(1).getAttribute('data-todo-select')];await boxes.nth(0).check();await boxes.nth(1).check();await page.locator('[data-todo-batch]').click();
 await dialog.locator('[data-batch-due]').fill('2027-01-04');await dialog.locator('h3').click();await choose(dialog.locator('[data-batch-index="0"] [data-people-picker]'),'刘畅');await dialog.locator('[data-batch-submit]').click();assert.ok(await dialog.isVisible());const before=await records();assert(ids.every(id=>!before[id]));
 await choose(dialog.locator('[data-batch-index="1"] [data-people-picker]'),'唐琪');await dialog.locator('[name="priority-0"]').selectOption('red');await dialog.locator('[data-batch-submit]').click();assert.equal(await dialog.count(),0);
 const after=await records();for(const id of ids){assert.equal(after[id].status,'pending');assert.equal(after[id].due,'2027-01-04');assert.equal(after[id].assignedBy,'林悦')}assert.equal(after[ids[1]].assignee,'唐琪');
 await open(ids[0],'detail');await editField('status','done');assert.equal((await records())[ids[0]].status,'done');await page.keyboard.press('Escape');
 await page.locator('[data-todo-tab="suggestions"]').click();assert.equal(await table.locator('[data-todo-select]').count(),count-2);await page.locator('[data-todo-tab="execution"]').click();
 // 删除及刷新持久化；完成日期不因刷新发生变化。
 await open(ids[1],'delete');await dialog.locator('[data-todo-action="delete"]').click();assert.ok((await records())[ids[1]].deletedAt);
 for(const tab of ['stock','handling']){await page.locator('[data-drawer-tab="'+tab+'"]').click();await page.setViewportSize({width:390,height:900});assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);await page.setViewportSize({width:1920,height:1080})}
 await open(manual.id,'detail');await page.setViewportSize({width:390,height:900});assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);await page.setViewportSize({width:1920,height:1080});await page.keyboard.press('Escape');
 await page.reload();await page.locator('#riskrail [data-risk="0"]').click();await page.locator('#dialogsub [data-drawer-time-mode="month"]').click();await page.locator('#dialogsub [data-drawer-time-value]').selectOption('9');await page.locator('button[data-qr-detail="'+detailRef+'"]').last().click();await page.locator('[data-drawer-tab="handling"]').click();
 assert.equal((await records())[manual.id].completedAt,completed.completedAt);assert.equal(await page.locator(`[data-todo-id="${ids[1]}"]`).count(),0);
 await page.locator('.drawer-back').click();await page.locator('#close').click();
}
