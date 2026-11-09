import assert from 'node:assert/strict';

export async function taskLedgerForm(page){
 await page.clock.setFixedTime(new Date('2026-11-05T04:00:00Z'));
 await page.evaluate(()=>{localStorage.setItem('dashboard.task-ledger-source-samples.202610.v2','1');localStorage.setItem('dashboard.global-manual-tasks.v1','[]')});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const root=page.locator('#ai'),entry=page.locator('.gd-task-entry-dialog'),chains=['环境','清洁','厨电','个护&健康','无'];
 await root.locator('[data-gd-part="tasks"]').click();
 assert.deepEqual(await root.locator('[data-gd-category]').evaluateAll(nodes=>nodes.map(n=>n.dataset.gdCategory)),['all',...chains]);
 await root.locator('[data-gd-task-create]').click();
 assert.equal(await entry.locator('.gd-ledger-info [data-ledger-field]').count(),9,'新增不显示实际完成日期');
 for(const name of ['title','deliverable','latestProgress'])assert.equal(await entry.locator('[name='+name+']').evaluate(n=>n.tagName),'TEXTAREA');
 for(const name of ['registrationDate','priority','title','status','primaryOwner'])assert(await entry.locator('[data-ledger-field='+name+'] .gd-task-required').isVisible());
 assert.equal(await entry.locator('[data-ledger-field=requestor] .gd-task-required').isVisible(),false,'提需人仍为选填');
 for(const name of ['registrationDate','priority','title','status','primaryOwner','department','due'])assert(await entry.locator('[data-ledger-field='+name+'] .gd-task-field-label').evaluate(n=>n.firstElementChild.matches('.gd-task-required')&&n.textContent.trim().startsWith('*')),'必填星号位于字段名前 '+name);
 assert.equal(await entry.locator('[data-gd-task-executions],[data-ledger-executions]').count(),0,'单任务表单不再有下发区域');
 await entry.locator('[data-todo-priority-trigger]').click();assert.deepEqual(await entry.locator('[data-todo-priority-popup] .up-todo-priority').allTextContents(),['紧急','重要','一般']);
 await entry.locator('[data-todo-priority-choice=P0]').click();assert.equal(await entry.locator('[data-priority-value] .up-todo-priority').innerText(),'紧急');assert.equal(await entry.locator('[name=priority]').inputValue(),'P0');
 await entry.locator('[data-todo-priority-trigger]').click();await page.keyboard.press('Escape');assert(await entry.isVisible());assert.equal(await entry.locator('[data-todo-priority-popup]').isVisible(),false,'Escape仅关闭优先级下拉');

 assert.deepEqual(await entry.locator('[name=gdCategory] option').allTextContents(),chains);
 await entry.locator('.gd-ledger-status-trigger').click();assert.deepEqual(await entry.locator('.gd-ledger-status-options .up-todo-status').allTextContents(),['未开始','跟进中','已暂停']);
 assert.equal(await entry.locator('[data-ledger-status=done]').count(),0);await entry.locator('[data-ledger-status=working]').click();assert.equal(await entry.locator('[name=completedAt]').count(),0,'新建切换状态也不出现实际完成日期');assert(await entry.locator('[data-ledger-field=due] .gd-task-required').isVisible());
 await entry.locator('.gd-ledger-status-trigger').click();await entry.locator('[data-ledger-status=pending]').click();assert.equal(await entry.locator('[data-ledger-field=due] input').inputValue(),'');
 const choose=async(name,person)=>{const field=entry.locator('[data-ledger-field='+name+']');await field.locator('[data-gd-assignee-query]').fill(person);await field.locator('[data-gd-assignee-name="'+person+'"]').click()};
 await choose('requestor','王磊');await choose('primaryOwner','林悦');await choose('primaryOwner','唐琪');await choose('secondaryOwner','刘畅');await choose('secondaryOwner','沈舟');
 await entry.locator('[name=ledgerTaskType]').fill('交付保障专项');await entry.locator('[name=title]').fill('多选与链群回归\n第二行');await entry.locator('[name=deliverable]').fill('交付物第一行\n第二行');await entry.locator('[name=latestProgress]').fill('最新进展第一行\n第二行');
 await entry.locator('[name=due]').fill('2026-11-10');await entry.locator('[name=department]').selectOption('计划管理部');
 assert.equal(await entry.locator('[name=due]').evaluate(n=>n.readOnly),false,'计划日期直接编辑');
 for(const width of [1024,390]){await page.setViewportSize({width,height:900});assert(await entry.evaluate(n=>n.scrollWidth<=n.clientWidth+1),'抽屉不横向溢出 '+width)}await page.setViewportSize({width:1920,height:1080});
 await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')||'[]'));let task=(await saved())[0];
 assert.equal(task.priority,'P0');assert.equal(task.primaryOwner,'林悦、唐琪');assert.equal(task.secondaryOwner,'刘畅、沈舟');assert.equal(task.gdCategory,'无');assert.match(task.title,/\n第二行/);assert.equal(task.due,'2026-11-10');assert.equal(task.completedAt,'');
 const search=root.locator('[data-gd-search]');assert.equal(await search.getAttribute('placeholder'),'搜索任务类型 / 任务 / 目标/交付物 / 最新进展 / 责任人');
 for(const query of ['交付保障专','多选与链群','交付物第一行','最新进展第一行','王磊','林悦','唐琪','刘畅','沈舟']){await search.fill(query);assert.equal(await root.locator('[data-gd-task]').count(),1,'支持搜索 '+query)}
 assert.equal(await root.locator('[data-gd-other-departments] .gd-filter-count').innerText(),'1','其他展示所含部门任务总数');
 await search.fill('不存在的内容');assert.equal(await root.locator('[data-gd-task]').count(),0);assert.equal(await root.locator('[data-gd-other-departments] .gd-filter-count').innerText(),'0','其他计数随搜索变化');await search.fill('');assert.equal(await root.locator('[data-gd-task]').count(),1,'清空搜索恢复任务');
 const widths=await root.locator('[data-gd-table] th').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert(widths[0]<widths[4]&&widths[1]<widths[4]&&widths[6]>widths[2],'日期优先级收紧，长文列扩宽');assert(await root.locator('[data-gd-table] :is(th,td)').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).verticalAlign==='middle')),'所有单元格垂直居中');
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});const bar=root.locator('.gd-filter-groups.gd-panel-navigation');assert(await bar.evaluate(n=>n.scrollHeight<=n.clientHeight+1&&n.scrollWidth<=n.clientWidth+1),'筛选栏不产生内滚动 '+width);
  const other=root.locator('[data-gd-other-departments]');await other.click();const menu=root.locator('#gd-ledger-other-menu');assert(await menu.evaluate(n=>n.matches(':popover-open')),'其他部门浮层保持展开 '+width);const box=await menu.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);assert(await menu.locator('[data-gd-department="计划管理部"]').evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'其他菜单不被遮挡');await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});await root.locator('[data-gd-other-departments]').click();await root.locator('#gd-ledger-other-menu [data-gd-department="计划管理部"]').click();assert.equal(await root.locator('[data-gd-task]').count(),1);assert(await root.locator('[data-gd-other-departments]').evaluate(n=>n.classList.contains('active')));
 await root.locator('[data-gd-category="无"]').click();assert.equal(await root.locator('[data-gd-task]').count(),1);assert.equal(await root.locator('.gd-ledger-none').innerText(),'无');assert.equal(await root.locator('.gd-ledger-none').evaluate(n=>getComputedStyle(n).color),'rgb(152, 162, 179)');
 assert.equal(await root.locator('[data-gd-other-departments] .gd-filter-count').innerText(),'1','选中具体其他部门后总数仍正确');
 await root.locator('[data-gd-action=task-detail]').click();assert.equal(await entry.locator('[data-ledger-field=primaryOwner] .gd-task-person-chip').count(),2);assert.equal(await entry.locator('[data-ledger-field=secondaryOwner] .gd-task-person-chip').count(),2);
 await entry.locator('[data-ledger-field=primaryOwner] [data-ledger-display]').click();await entry.locator('[data-ledger-field=primaryOwner] [data-gd-assignee-remove=唐琪]').click();await entry.locator('[data-ledger-field=gdCategory] [data-ledger-display]').click();await entry.locator('[name=gdCategory]').selectOption('清洁');await entry.locator('header [data-gd-entry-close]').click();await entry.waitFor({state:'detached'});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');task=(await saved())[0];assert.equal(task.primaryOwner,'林悦');assert.equal(task.secondaryOwner,'刘畅、沈舟');assert.equal(task.gdCategory,'清洁');assert.match(task.latestProgress,/\n第二行/);
 console.log('通过：三列同排、多行内容、状态候选与选中标签、必填星号、单任务计划日期直接填写、两类负责人多选/回显/移除、固定链群与灰色无、保存编辑刷新、列宽/垂直居中、其他部门浮层与无内滚动。');
}
