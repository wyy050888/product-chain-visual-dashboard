import assert from 'node:assert/strict';

export async function taskRowExpansion(page){
 await page.clock.setFixedTime(new Date('2026-11-05T04:00:00Z'));
 await page.evaluate(()=>{const key='dashboard.global-manual-tasks.v1',base=JSON.parse(localStorage.getItem(key)||'[]').find(t=>t.gdLedger);if(!base)throw Error('缺少台账样例');localStorage.setItem(key,JSON.stringify([1,2].map(n=>({...base,id:'manual|expand-'+n,spuId:'GLOBAL|expand-'+n,gdSingleTask:true,status:'working',registrationDate:'2026-11-04',title:('任务'+n+'说明').repeat(20),deliverable:('交付物'+n+'验证内容，').repeat(35),latestProgress:('进展'+n+'详细记录。').repeat(40)}))))});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const root=page.locator('#ai');await root.locator('[data-gd-part=tasks]').click();
 const rows=root.locator('[data-gd-table] tbody tr'),first=rows.nth(0),second=rows.nth(1),saved=await page.evaluate(()=>localStorage.getItem('dashboard.global-manual-tasks.v1'));
 await page.waitForFunction(()=>[...document.querySelectorAll('#ai [data-gd-task]')].every(row=>row.querySelectorAll('[data-gd-cell-more]:not([hidden])').length===3));
 const before=await second.boundingBox();await first.locator('[data-gd-cell-more]').first().click();
 assert.equal(await first.locator('[aria-expanded=true][data-gd-cell-more]').count(),3,'一列展开同步整行长文本');assert.equal(await second.locator('[aria-expanded=true][data-gd-cell-more]').count(),0,'其他行不受影响');assert((await second.boundingBox()).y>before.y,'后续行随自然行高下移');
 assert(await first.locator('.gd-task-preview').evaluateAll(nodes=>nodes.every(n=>n.scrollHeight<=n.clientHeight+1)),'同行三列显示完整正文');
 assert.equal(await first.locator('[data-gd-cell-more]').first().getAttribute('aria-controls'),await first.locator('.gd-task-preview').evaluateAll(nodes=>nodes.map(n=>n.id).join(' ')));
 await first.locator('[data-gd-cell-more]').nth(2).click();assert.equal(await first.locator('.gd-task-cell.is-expanded').count(),0,'任意列收起同步整行');
 await second.locator('[data-gd-cell-more]').nth(1).click();await first.locator('[data-gd-cell-more]').first().focus();await page.keyboard.press('Enter');assert.equal(await first.locator('.gd-task-cell.is-expanded').count(),3);assert.equal(await second.locator('.gd-task-cell.is-expanded').count(),3,'两行可以分别保持展开');
 await first.locator('[data-gd-cell-more]').nth(1).click();assert.equal(await second.locator('.gd-task-cell.is-expanded').count(),3,'收起一行不影响另一行');
 await page.setViewportSize({width:1280,height:900});assert.equal(await second.locator('.gd-task-cell.is-expanded').count(),3);assert(await second.locator('.gd-task-preview').evaluateAll(nodes=>nodes.every(n=>n.scrollHeight<=n.clientHeight+1)));
 assert.equal(await page.evaluate(()=>localStorage.getItem('dashboard.global-manual-tasks.v1')),saved,'展开收起不改写任务数据');
 await root.locator('[data-gd-search]').fill('任务');assert.equal(await root.locator('.gd-task-cell.is-expanded').count(),0,'筛选重绘恢复收起');
 console.log('通过：同行三列联动展开/收起、跨行隔离、键盘操作、正文完整、自然行高、窄屏重排及数据不变。');
}
