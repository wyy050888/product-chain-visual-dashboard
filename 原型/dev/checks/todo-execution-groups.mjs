import assert from 'node:assert/strict';
import {verifyTodoDialogLayout} from './todo-dialog-layout.mjs';
import {todoExecutionGroup,todoOwnerPicker,fillTodoRoleFeedback,setTodoRoleStatus} from './todo-inline-helpers.mjs';

export async function todoExecutionGroups(page){
 await verifyTodoDialogLayout(page);
 const root=page.locator('#ai'),dialog=page.locator('.up-todo-dialog[open]');
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="blocker"]').click();
 const original=(await page.evaluate(()=>globalDiagnosisAudit())).visible.find(r=>r.id==='work-block-package');
 await root.locator('[data-gd-task="'+original.task.id+'"] [data-gd-action]').click();
 const store=()=>page.evaluate(id=>JSON.parse(localStorage.getItem('product-risk-todos-v1'))[id],original.task.id),member=dialog.locator('[data-responsibility-row="'+original.participants[0].id+'"]');
 const group=()=>todoExecutionGroup(member),owners=()=>todoOwnerPicker(member),form=dialog.locator('[data-responsibility-form]');
 await group().locator('[data-execution-add-owner]').click();assert(await owners().locator('[data-people-query]').evaluate(e=>e===document.activeElement),'加人入口聚焦本事项多选框');
 await owners().locator('[data-people-query]').fill('林悦');await owners().locator('[role=option]').filter({hasText:'林悦-'}).click();
 assert.equal(await group().locator('[data-responsibility-row]').count(),2);assert.equal(await group().locator('[data-todo-field="action"]').count(),1);
 await setTodoRoleStatus(member,'done');assert.match(await group().locator('.up-execution-progress').innerText(),/1\/2人完成/);assert.match(await dialog.locator('.up-collaboration>header small').innerText(),/0\/3/);
 await dialog.locator('[data-responsibility-add]').click();await form.locator('[data-responsibility-action]').fill('对齐包材承认样与首批进料验收清单');
 const choose=async name=>{await form.locator('[data-people-query]').fill(name);await form.locator('[role=option]').filter({hasText:name+'-'}).click()};
 await choose('王磊');await choose('唐琪');const checkpoint=await store();
 await fillTodoRoleFeedback(member,'文案已确认，等待包材样件');
 assert(await form.isVisible());assert.equal(await form.locator('[data-responsibility-action]').inputValue(),'对齐包材承认样与首批进料验收清单');assert.equal(await form.locator('.up-todo-person-chip').count(),2,'其他人反馈重绘时保留新增草稿');
 assert.equal((await store()).responsibilities.length,checkpoint.responsibilities.length,'确认前不产生新事项');
 await form.locator('[data-people-query]').focus();await page.keyboard.press('Escape');assert(await dialog.isVisible());assert(await form.isHidden(),'Escape先取消事项草稿');
 await dialog.locator('[data-responsibility-add]').click();assert.equal(await form.locator('[data-responsibility-action]').inputValue(),'');
 await form.locator('[data-responsibility-action]').fill(original.participants[0].action);await choose('唐琪');const beforeDuplicate=await store();
 await form.locator('[data-responsibility-submit]').click();assert.match(await form.locator('[role=alert]').innerText(),/已有相同执行事项/);assert.deepEqual(await store(),beforeDuplicate);
 await form.locator('[data-responsibility-cancel]').click();
 for(const width of [1920,1024,390]){await page.setViewportSize({width,height:900});assert(await dialog.locator('.up-todo-dialog-body').evaluate(e=>e.scrollWidth<=e.clientWidth+1));for(const el of await dialog.locator('[data-execution-group],.up-collaboration-scroll,[data-responsibility-owners]').all())assert(await el.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'分组与反馈区不横向溢出 '+width)}
 await dialog.locator('[data-todo-close]').click();await page.setViewportSize({width:1920,height:1080});
 console.log('通过：任务/事项/人员三层、组内内容唯一、进度计数、加人入口、草稿跨重绘保留、Escape取消、重复事项拦截及三种宽度');
}
