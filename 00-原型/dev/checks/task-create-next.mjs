import assert from 'node:assert/strict';

export async function taskCreateNext(page){
 await page.clock.setFixedTime(new Date('2026-11-05T04:00:00Z'));
 await page.evaluate(()=>{localStorage.setItem('dashboard.task-ledger-source-samples.202610.v2','1');localStorage.setItem('dashboard.global-manual-tasks.v1','[]')});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const root=page.locator('#ai'),entry=page.locator('.gd-task-create-drawer'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')||'[]'));
 await root.locator('[data-gd-part=tasks]').click();await root.locator('[data-gd-task-create]').click();
 assert.deepEqual(await entry.locator('footer button').allTextContents(),['取消','提交','提交并创建下一个任务']);
 const complete=async title=>{
  await entry.locator('[name=title]').fill(title);await entry.locator('[name=deliverable]').fill('交付内容');await entry.locator('[name=due]').fill('2026-11-12');await entry.locator('[name=department]').selectOption('采购部');await entry.locator('[name=gdCategory]').selectOption('环境');
  const field=entry.locator('[data-ledger-field=primaryOwner]');await field.locator('[data-gd-assignee-query]').fill('林悦');await field.locator('[data-gd-assignee-name=林悦]').click();
 };
 await entry.locator('[data-gd-entry-next]').click();assert.equal((await saved()).length,0,'校验失败不保存也不重置');
 await complete('连续任务一');
 await page.evaluate(()=>{window.createNextSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dashboard.global-manual-tasks.v1')throw Error('quota');return window.createNextSet.call(this,k,v)}});
 await entry.locator('[data-gd-entry-next]').click();assert.match(await entry.locator('[data-gd-entry-error]').innerText(),/本地保存失败/);assert.equal(await entry.locator('[name=title]').inputValue(),'连续任务一');assert.equal((await saved()).length,0);
 await page.evaluate(()=>{Storage.prototype.setItem=window.createNextSet;delete window.createNextSet});
 await entry.locator('[data-gd-entry-next]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')||'[]').length===1);assert.equal(await entry.count(),1,'成功后只保留一个新增抽屉');
 for(const name of ['title','deliverable','latestProgress','primaryOwner','secondaryOwner','requestor','department','due'])assert.equal(await entry.locator('[name='+name+']').inputValue(),'','下一条清空 '+name);
 assert.equal(await entry.locator('[name=priority]').inputValue(),'P2');assert.equal(await entry.locator('[name=status]').inputValue(),'pending');assert.equal(await entry.locator('[name=gdCategory]').inputValue(),'无');assert.equal(await entry.locator('[name=registrationDate]').inputValue(),'2026-11-05');
 assert.equal(await entry.locator('[name=title]').evaluate(n=>n===document.activeElement),true);
 await entry.locator('footer [data-gd-entry-close]').click();await entry.waitFor({state:'detached'});assert.equal(await page.locator('.gd-task-discard-confirm').count(),0,'新空白表单取消不误报未保存');assert.equal((await saved()).length,1);
 await root.locator('[data-gd-task-create]').click();await complete('普通提交任务二');await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});const tasks=await saved();assert.equal(tasks.length,2);assert.notEqual(tasks[0].id,tasks[1].id);assert.equal(await root.locator('[data-gd-task]').count(),2,'普通提交后回到已更新列表');
 await root.locator('[data-gd-task-create]').click();for(const width of [1920,390]){await page.setViewportSize({width,height:900});assert(await entry.locator('footer').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'三按钮不溢出 '+width)}
 console.log('通过：新增三按钮、连续创建成功后重置与焦点、校验/保存失败保留草稿、取消不误报、普通提交关闭回列表及窄屏。');
}
