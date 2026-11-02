import assert from 'node:assert/strict';

// 任务只经当前tasks入口办理；共享详情中的依据原位展开。
export async function diagnosisRebuildTasks(page){
 const root=page.locator('#ai');
 await root.locator('[data-gd-part="tasks"]').click();
 assert.equal(await root.locator('[data-gd-part="closure"]').count(),0);
 const rows=root.locator('[data-gd-task]');assert(await rows.count()>0);
 assert.equal(await rows.locator('[data-label="状态"] select,[data-label="状态"] input').count(),0,'主表状态只读');
 const ids=await page.evaluate(()=>globalDiagnosisAudit().tasks.map(row=>row.task.id).sort());
 await rows.first().locator('[data-gd-action="task-detail"]').click();
 const dialog=page.locator('.up-todo-dialog[open]');await dialog.waitFor();
 assert.match(await dialog.locator('header h3').first().innerText(),/任务详情/);
 const basis=dialog.locator('[data-todo-evidence]');assert.equal(await basis.count(),1);
 assert.equal(await basis.getAttribute('aria-expanded'),'false');
 await basis.click();assert.equal(await basis.getAttribute('aria-expanded'),'true');
 assert(await dialog.locator('[data-todo-evidence-panel]').isVisible());
 assert(await dialog.locator('[data-todo-basis-source]').count()>0);
 await basis.click();assert.equal(await basis.getAttribute('aria-expanded'),'false');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
 assert.deepEqual(await page.evaluate(()=>globalDiagnosisAudit().tasks.map(row=>row.task.id).sort()),ids);
 assert(await root.locator('[data-gd-action="task-detail"]').count()>0);
 console.log('通过：任务清单现用入口、主表只读、共用详情/依据、关闭返回且不新增任务');
}
