import assert from 'node:assert/strict';
import {fillTodoRoleFeedback} from './todo-inline-helpers.mjs';

// AI演示任务仍只在当前页面有效；全局手工任务另行验证本地保存。
export async function todoPageLifetime(page){
 const root=page.locator('#ai'),dialog=page.locator('.up-todo-dialog[open]');
 const reload=async()=>{
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 };
 const open=async()=>{
  await root.locator('[data-gd-part="tasks"]').click();
  const task=await page.evaluate(()=>globalDiagnosisAudit().tasks.find(row=>row.task.source!=='manual'&&row.businessObjects.some(object=>object.type==='project')&&row.task.responsibilities?.length>1).task);
  await root.locator('[data-gd-task="'+task.id+'"] [data-gd-action]').click();
  return task;
 };
 const original=await open(),table=dialog.locator('table[aria-label="任务下发"]'),groups=table.locator('[data-execution-group]');
 const initialCount=await groups.count();
 await page.evaluate(task=>{
  const stale={...task,responsibilities:[...task.responsibilities,{...task.responsibilities[0],id:'stale-role',actionId:'stale-action',action:'旧缓存的手动新增事项'}]};
  localStorage.setItem('product-risk-todos-v1',JSON.stringify({[task.id]:stale}));
  localStorage.setItem('product-chain-ai-tasks-v1',JSON.stringify({old:{title:'旧缓存任务'}}));
  localStorage.setItem('global-diagnosis-v2',JSON.stringify({resolutions:{'work-core-delivery':{note:'旧缓存备注'}}}));
  localStorage.setItem('todo-lifetime-unrelated','保留其他偏好');
 },original);
 const stored=await page.evaluate(()=>Object.fromEntries(['product-risk-todos-v1','product-chain-ai-tasks-v1','global-diagnosis-v2','todo-lifetime-unrelated'].map(k=>[k,localStorage.getItem(k)])));
 await reload();await open();
 assert.equal(await groups.count(),initialCount);
 assert.doesNotMatch(await dialog.innerText(),/旧缓存的手动新增事项|旧缓存备注/);
 await fillTodoRoleFeedback(groups.first(),'本次页面的反馈备注');
 await dialog.locator('[data-responsibility-add]').click();
 const draft=table.locator('[data-responsibility-form]');
 await draft.locator('[data-responsibility-action]').fill('本次页面手动新增事项');
 await draft.locator('[data-responsibility-due]').fill('2100-01-15');
 await draft.locator('[data-people-display]').click();
 await draft.locator('[data-people-query]').fill('林悦');
 await draft.locator('[role=option]').filter({hasText:'林悦-'}).click();
 await draft.locator('[data-responsibility-submit]').click();
 assert.equal(await groups.count(),initialCount+1);
 await dialog.locator('[data-todo-close]').click();await open();
 assert.equal(await groups.count(),initialCount+1,'关闭再打开仍保留当前页面新增');
 assert.match(await table.innerText(),/本次页面的反馈备注/);
 await groups.first().locator('[data-execution-delete]').click();
 await dialog.locator('[data-execution-delete-confirm]').click();
 assert.equal(await groups.count(),initialCount,'删除在本页立即生效');
 await reload();await open();
 assert.equal(await groups.count(),initialCount,'刷新恢复原始事项数');
 assert.doesNotMatch(await table.innerText(),/本次页面手动新增事项|本次页面的反馈备注|旧缓存的手动新增事项/);
 assert.match(await table.innerText(),/确认样机/,'被删除的样例也恢复');
 const after=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(stored));
 assert.deepEqual(after,stored,'不写入任务缓存，也不清理其他偏好或旧缓存');
 await dialog.locator('[data-todo-close]').click();
 console.log('通过：AI演示任务仅当前页面有效，执行事项新增/修改/删除刷新恢复样例，忽略旧任务缓存且不改其他偏好。');
}
