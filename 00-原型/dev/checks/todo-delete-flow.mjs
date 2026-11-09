import assert from 'node:assert/strict';

export async function verifyTodoDeleteFlow(page,taskId){
 const root=page.locator('#ai'),detail=page.locator('.up-todo-dialog-detail[open]');
 const dialogs=page.locator('.up-todo-dialog[open]'),confirmation=()=>dialogs.last();
 const store=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')));
 const entry=()=>root.locator('[data-gd-task="'+taskId+'"]');
 await entry().locator('[data-gd-action]').click();
 const before=await store(),counts=await page.evaluate(()=>globalDiagnosisAudit().counts);
 await detail.locator('[data-responsibility-add]').click();
 const draft=detail.locator('[data-responsibility-form]');await draft.locator('[data-responsibility-action]').fill('取消删除后保留的执行事项草稿');
 await detail.locator('[data-todo-delete]').click();assert.equal(await dialogs.count(),2);
 assert.equal(await confirmation().locator('header h3').innerText(),'删除任务');assert.equal(await confirmation().locator('.up-todo-delete-question').innerText(),'确认删除这条任务？');
 assert.equal(await confirmation().locator('.up-todo-basic-section,.up-todo-heading,[data-todo-problem],[data-todo-execution],[data-todo-evidence]').count(),0,'删除确认只展示提示，不重复任务详情');
 assert.deepEqual(await store(),before,'进入删除确认不改变任务');
 const ids=await dialogs.evaluateAll(es=>es.map(e=>e.getAttribute('aria-labelledby')));assert.equal(new Set(ids).size,2,'父抽屉与确认窗口各自使用独立标题');
 await confirmation().locator('[data-todo-close]').last().click();assert.equal(await dialogs.count(),1);assert.deepEqual(await store(),before);
 assert.equal(await draft.locator('[data-responsibility-action]').inputValue(),'取消删除后保留的执行事项草稿');
 await detail.locator('[data-todo-delete]').click();await page.keyboard.press('Escape');assert.equal(await dialogs.count(),1,'Escape只关闭顶层删除确认');
 assert.equal(await draft.locator('[data-responsibility-action]').inputValue(),'取消删除后保留的执行事项草稿','Escape不取消父层草稿');assert.deepEqual(await store(),before);
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:900});
  const geometry=await detail.locator(':scope > form > header').evaluate(el=>{const title=el.querySelector('h3').getBoundingClientRect(),actions=el.querySelector('.up-todo-dialog-header-actions').getBoundingClientRect(),deleteButton=el.querySelector('[data-todo-delete]').getBoundingClientRect();return {titleRight:title.right,actionsLeft:actions.left,right:deleteButton.right,width:innerWidth}});
  assert(geometry.titleRight<=geometry.actionsLeft+1,'长对象标题不覆盖删除按钮');assert(geometry.right<=width,'窄屏删除按钮在可视区内');assert(await detail.locator('[data-todo-delete]').isVisible());
  await detail.locator('[data-todo-delete]').click();const compact=await confirmation().boundingBox();assert(compact.width<=420&&compact.height<260,'删除确认为紧凑弹窗');assert(compact.x>=0&&compact.x+compact.width<=width,'确认弹窗适配窄屏');await confirmation().locator('[data-todo-close]').last().click();
 }
 await detail.locator('[data-todo-delete]').click();await confirmation().locator('[data-todo-action="delete"]').click();await dialogs.waitFor({state:'detached'});
 const deleted=await store();assert(deleted[taskId].deletedAt&&deleted[taskId].deletedBy);assert.deepEqual(deleted[taskId].responsibilities,before[taskId].responsibilities,'删除任务保留原办理记录');
 for(const [id,task] of Object.entries(before))if(id!==taskId)assert.deepEqual(deleted[id],task,'其他任务不受影响');
 assert.equal(await entry().count(),0,'确认后任务退出当前列表');
 const after=await page.evaluate(()=>globalDiagnosisAudit().counts);for(const key of ['coordination','closure'])assert.equal(after.find(c=>c.key===key).count,counts.find(c=>c.key===key).count-1,'关联列表计数同步');
 await page.reload();await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="blocker"]').click();assert.equal(await entry().count(),0,'刷新后不重新生成已删除任务');assert.equal((await store())[taskId].deletedAt,deleted[taskId].deletedAt);
 await page.setViewportSize({width:1920,height:1080});
}
