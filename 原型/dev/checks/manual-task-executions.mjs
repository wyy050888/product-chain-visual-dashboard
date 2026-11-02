import assert from 'node:assert/strict';
import {setTodoRoleStatus,editTodoField} from './todo-inline-helpers.mjs';

export async function manualTaskExecutions(page){
 await page.clock.setFixedTime(new Date('2026-10-27T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const root=page.locator('#ai'),entry=page.locator('.gd-task-entry-dialog'),detail=page.locator('.up-todo-dialog-detail'),rows=()=>entry.locator('[data-gd-execution-row]');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')||'[]')),record=async()=>(await saved()).find(task=>task.title==='多事项分工回归');
 await root.locator('[data-gd-part="tasks"]').click();
 const open=()=>root.locator('[data-gd-task-create]').click();
 await open();assert.equal(await rows().count(),1);assert(await rows().first().locator('[data-gd-execution-remove]').isDisabled());
 await entry.locator('[data-gd-execution-add]').click();await rows().last().locator('[data-gd-execution-remove]').click();
 await entry.locator('[data-gd-execution-add]').click();await entry.locator('[data-gd-entry-close]').first().click();await entry.waitFor({state:'detached'});assert.equal(await page.locator('.gd-task-discard-confirm').count(),0,'增删空行不算已填内容');assert.equal((await saved()).length,0);
 await open();await entry.locator('[name=title]').fill('多事项分工回归');await entry.locator('[name=description]').fill('核对样机、排期和验收分工');
 const fill=async(row,action,names,date)=>{await row.locator('[name=plan]').fill(action);for(const name of names){await row.locator('[data-gd-assignee-query]').fill(name);await row.locator('[data-gd-assignee-name="'+name+'"]').click()}await row.locator('[name=due]').fill(date)};
 await fill(rows().first(),'确认样机交付',['林悦','唐琪'],'2026-11-03');
 await entry.locator('[data-gd-execution-add]').click();await entry.locator('[data-gd-entry-save]').click();assert.equal((await saved()).length,0,'空执行行不保存部分任务');assert(await entry.isVisible());
 await fill(rows().nth(1),'确认品质验收',['刘畅'],'2026-11-07');
 await entry.locator('[data-gd-execution-add]').click();await fill(rows().nth(2),'稍后取消的分工',['沈舟'],'2026-11-12');
 assert.equal(await entry.locator('[role=listbox][id^="gd-task-assignee-options"]').evaluateAll(nodes=>new Set(nodes.map(node=>node.id)).size),3,'多行搜索候选ID隔离');
 await rows().nth(2).locator('[data-gd-execution-remove]').click();assert.equal(await rows().count(),2);assert.deepEqual(await rows().locator('[name=due]').evaluateAll(nodes=>nodes.map(node=>node.value)),['2026-11-03','2026-11-07']);
 await rows().nth(1).locator('[name=plan]').fill('确认样机交付');await entry.locator('[data-gd-entry-save]').click();assert.match(await entry.locator('[data-gd-entry-error]').innerText(),/相同执行事项/);assert.equal((await saved()).length,0);
 await rows().nth(1).locator('[name=plan]').fill('确认品质验收');await rows().nth(1).locator('[name=due]').fill('2026-10-26');await entry.locator('[data-gd-entry-save]').click();assert.equal((await saved()).length,0,'每行都校验过期日期');await rows().nth(1).locator('[name=due]').fill('2026-11-07');
 for(const width of [1920,1024,390,320]){await page.setViewportSize({width,height:1080});assert(await entry.evaluate(node=>node.scrollWidth<=node.clientWidth+1));assert(await rows().evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1)),'执行行不溢出 '+width);if([1920,390].includes(width))await entry.screenshot({path:'outputs/task-executions-create-'+width+'.png'})}
 await page.setViewportSize({width:1920,height:1080});await entry.locator('[data-gd-entry-close]').first().click();await page.locator('[data-gd-discard-cancel]').click();assert.equal(await rows().count(),2);assert.equal(await rows().nth(1).locator('[name=plan]').inputValue(),'确认品质验收');
 const before=await saved();await page.evaluate(()=>{window.executionStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dashboard.global-manual-tasks.v1')throw Error('quota');return window.executionStorageSet.call(this,k,v)}});await entry.locator('[data-gd-entry-save]').click();assert.match(await entry.locator('[data-gd-entry-error]').innerText(),/本地保存失败/);assert.deepEqual(await saved(),before);assert.equal(await rows().count(),2);await page.evaluate(()=>{Storage.prototype.setItem=window.executionStorageSet;delete window.executionStorageSet});
 await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});assert.equal(await page.locator('.gd-task-discard-confirm').count(),0,'保存成功不触发关闭确认');
 let task=await record();const id=task.id;assert.equal((await saved()).length,1);assert.equal(task.responsibilities.length,3);assert.equal(new Set(task.responsibilities.map(row=>row.actionId)).size,2);assert.equal(task.due,'2026-11-07');assert.equal(task.status,'pending');assert.deepEqual(task.responsibilities.map(row=>[row.action,row.assignee,row.due]),[['确认样机交付','林悦','2026-11-03'],['确认样机交付','唐琪','2026-11-03'],['确认品质验收','刘畅','2026-11-07']]);
 await root.locator('[data-gd-search]').fill('多事项分工回归');await root.locator('[data-gd-action="task-detail"]').click();
 const groups=()=>detail.locator('[data-execution-group]');assert.equal(await groups().count(),2);assert.match(await groups().first().locator('[data-people-label]').innerText(),/林悦[\s\S]*唐琪/);assert.match(await groups().nth(1).locator('[data-people-label]').innerText(),/刘畅/);
 await setTodoRoleStatus(groups().first(),'done');task=await record();assert.equal(task.status,'working');assert.equal(task.responsibilities[2].status,'pending','另一执行事项状态不受影响');
 const due=await editTodoField(groups().nth(1),'due');await due.locator('input').fill('2026-11-09');await due.locator('input').press('Enter');task=await record();assert.equal(task.due,'2026-11-09');assert.equal(task.responsibilities[0].due,'2026-11-03');
 await detail.locator('[data-todo-close]').first().click();await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});await root.locator('[data-gd-part="tasks"]').click();task=await record();assert.equal(task.id,id);assert.equal(task.responsibilities.length,3);assert.equal(task.due,'2026-11-09');assert.equal(task.status,'working');
 console.log('通过：多执行行增删、逐行多人/日期、候选隔离、整单最晚日期、重复/缺项/日期校验、失败不落库、关闭保护、详情独立办理及刷新、宽窄屏。');
}
