import assert from 'node:assert/strict';

export async function taskLedgerAutosave(page){
 await page.clock.setFixedTime(new Date('2026-11-06T04:12:34Z'));
 await page.evaluate(()=>{localStorage.setItem('dashboard.task-ledger-source-samples.202610.v2','1');localStorage.setItem('dashboard.global-manual-tasks.v1','[]')});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const root=page.locator('#ai'),entry=page.locator('.gd-task-entry-dialog'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')||'[]'));
 await root.locator('[data-gd-part=tasks]').click();await root.locator('[data-gd-task-create]').click();
 assert.equal(await entry.locator('[name=completedAt]').count(),0);
 await entry.locator('[name=registrationDate]').fill('2026-11-01');await entry.locator('[name=title]').fill('自动保存专项');await entry.locator('[name=due]').fill('2026-11-10');await entry.locator('[name=department]').selectOption('采购部');
 const choose=async(key,name)=>{const field=entry.locator('[data-ledger-field='+key+']');await field.locator('[data-gd-assignee-query]').fill(name);await field.locator('[data-gd-assignee-name="'+name+'"]').click()};
 await choose('primaryOwner','林悦');await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});
 const id=(await saved())[0].id,task=async()=>(await saved()).find(t=>t.id===id);
 const open=async()=>{await root.locator('[data-gd-search]').fill('自动保存专项');await root.locator('[data-gd-action=task-detail]').click()};
 const edit=async(key,value)=>{await entry.locator('[data-ledger-field='+key+'] [data-ledger-display]').click();await entry.locator('[name='+key+']').fill(value)};
 const blur=()=>entry.locator('header h3').click();
 await open();assert.equal(await entry.locator('footer').count(),0,'详情无保存和取消');assert.equal(await entry.locator('.gd-ledger-field.is-editing').count(),0);
 await edit('latestProgress','第一行\n第二行');assert.equal((await task()).latestProgress,'','输入过程中不逐字写日志');await blur();assert.equal((await task()).latestProgress,'第一行\n第二行');assert.equal((await task()).logs.length,2,'创建与一次字段编辑');
 await entry.locator('[data-ledger-field=status] [data-ledger-display]').click();await entry.locator('[data-ledger-status=done]').click();assert.equal((await task()).status,'done');assert.equal((await task()).completedAt,'2026-11-06');
 await edit('completedAt','2026-11-04');await blur();assert.equal((await task()).completedAt,'2026-11-04','已完成仍可修改实际完成日期');
 await edit('due','2026-10-30');await blur();assert.equal((await task()).due,'2026-11-10');assert.match(await entry.locator('.gd-ledger-save-error').innerText(),/不能早于/);assert.equal(await entry.locator('[name=due]').inputValue(),'2026-10-30','校验失败保留输入');
 await entry.locator('[name=due]').fill('2026-11-12');await blur();assert.equal((await task()).due,'2026-11-12');assert.equal(await entry.locator('.gd-ledger-save-error').count(),0);
 await page.evaluate(()=>{window.autoSaveSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dashboard.global-manual-tasks.v1')throw Error('quota');return window.autoSaveSet.call(this,k,v)}});
 await edit('deliverable','存储失败草稿');await blur();assert.match(await entry.locator('.gd-ledger-save-error').innerText(),/本地保存失败/);assert.equal((await task()).deliverable,'');assert.equal(await entry.locator('[name=deliverable]').inputValue(),'存储失败草稿');
 await page.evaluate(()=>{Storage.prototype.setItem=window.autoSaveSet;delete window.autoSaveSet});await blur();assert.equal((await task()).deliverable,'存储失败草稿');
 await entry.locator('[data-ledger-field=requestor] [data-ledger-display]').click();await choose('requestor','唐琪');assert.equal((await task()).requestor,'唐琪','选人立即保存');await choose('requestor','刘畅');assert.equal((await task()).requestor,'唐琪、刘畅','连续多选不丢失');await blur();
 const panel=entry.locator('.gd-ledger-change-panel');assert(await panel.locator('time').count()>0);assert((await panel.locator('time').allTextContents()).every(text=>text==='26/11/06 12:12:34'));assert.match(await panel.innerText(),/将状态从 未开始 变更为 已完成/);assert.match(await panel.innerText(),/更新了最新进展/);assert.doesNotMatch(await panel.innerText(),/原执行记录/);
 await edit('due','2026-10-30');await blur();await entry.locator('header [data-gd-entry-close]').click();
 const confirm=page.locator('.gd-task-discard-confirm');assert(await confirm.isVisible(),'保存失败仍能退出或继续编辑');await confirm.locator('[data-gd-discard-cancel]').click();assert(await entry.isVisible());
 await entry.locator('[name=due]').fill('2026-11-12');await blur();
 const count=(await task()).logs.length;await entry.locator('header [data-gd-entry-close]').click();await entry.waitFor({state:'detached'});assert.equal(await page.locator('.gd-task-discard-confirm').count(),0);assert.equal((await task()).logs.length,count,'关闭不重复保存');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');const restored=await task();assert.equal(restored.latestProgress,'第一行\n第二行');assert.equal(restored.completedAt,'2026-11-04');assert.equal(restored.requestor,'唐琪、刘畅');
 await root.locator('[data-gd-part=tasks]').click();await root.locator('[data-gd-task-create]').click();
 await entry.locator('[name=title]').fill('新建已完成专项');await entry.locator('[name=due]').fill('2026-11-12');await entry.locator('[name=department]').selectOption('采购部');await choose('primaryOwner','林悦');
 await entry.locator('.gd-ledger-status-trigger').click();assert.equal(await entry.locator('[data-ledger-status=done]').count(),0);assert.equal(await entry.locator('[name=status] option[value=done]').count(),0);await page.keyboard.press('Escape');
 await entry.locator('[name=status]').evaluate(select=>{select.add(new Option('已完成','done'));select.value='done'});await entry.locator('[data-gd-entry-save]').click();assert.match(await entry.locator('[data-gd-entry-error]').innerText(),/新建任务不能选择已完成/);assert.equal((await saved()).filter(t=>t.title==='新建已完成专项').length,0,'提交层也阻止新建已完成');
 console.log('通过：新建无实际完成日期、详情无底部按钮、失焦/选择自动保存、状态日期联动、实际日期可编辑、校验与存储失败保留草稿、逐条秒级变更、刷新保留。');
}
