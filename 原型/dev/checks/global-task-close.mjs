import assert from 'node:assert/strict';

// 已填写表单的回归清理必须显式放弃；导入窗口仍按原关闭行为。
export async function closeTaskEntry(page){
 const entry=page.locator('.gd-task-entry-dialog');await entry.locator('[data-gd-entry-close]').first().click();
 const confirmation=page.locator('.gd-task-discard-confirm');if(await confirmation.isVisible())await confirmation.locator('[data-gd-discard-confirm]').click();
 await entry.waitFor({state:'detached'});
}
export async function taskEntryClose(page){
 await page.clock.setFixedTime(new Date('2026-10-27T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const root=page.locator('#ai'),entry=page.locator('.gd-task-entry-dialog'),confirmation=page.locator('.gd-task-discard-confirm');
 await root.locator('[data-gd-part="tasks"]').click();
 const snapshot=()=>page.evaluate(()=>localStorage.getItem('dashboard.global-manual-tasks.v1')),initial=await snapshot();
 const open=()=>root.locator('[data-gd-task-create]').click();
 const attempt=async method=>{
  if(method==='x')await entry.locator('[data-gd-entry-close]').first().click();
  else if(method==='cancel')await entry.locator('footer [data-gd-entry-close]').click();
  else if(method==='backdrop')await page.mouse.click(50,200);
  else await page.keyboard.press('Escape');
 };
 for(const method of ['x','cancel','backdrop','escape']){
  await open();await attempt(method);await entry.waitFor({state:'detached'});assert.equal(await confirmation.count(),0,'空白直接关闭 '+method);
  await open();await entry.locator('[name=title]').fill('保留这份草稿');await attempt(method);await confirmation.waitFor();
  assert.equal(await confirmation.locator('h3').innerText(),'提醒');assert.equal(await confirmation.locator('#gd-task-discard-message>span').last().innerText(),'关闭后不保存已编辑数据，请确认是否关闭？');assert.equal(await confirmation.locator('textarea,input').count(),0,'无备注输入');
  assert.deepEqual(await confirmation.locator('footer button').allTextContents(),['取消','确定']);assert.equal(await snapshot(),initial);
  await confirmation.locator('[data-gd-discard-cancel]').click();assert(await entry.isVisible());assert.equal(await entry.locator('[name=title]').inputValue(),'保留这份草稿');
  await attempt(method);await confirmation.locator('[data-gd-discard-close]').click();assert.equal(await entry.locator('[name=title]').inputValue(),'保留这份草稿','提醒右上角关闭保留草稿');await attempt(method);await confirmation.locator('[data-gd-discard-confirm]').click();await entry.waitFor({state:'detached'});assert.equal(await snapshot(),initial,'放弃不生成任务');
 }
 await open();await entry.locator('[name=description]').fill('   ');await attempt('x');await entry.waitFor({state:'detached'});
 for(const [name,value]of [['description','尚未填写标题'],['plan','尚未选择负责人'],['due','2026-11-04'],['priority','P1'],['category','清洁'],['objectType','project']]){
  await open();const field=entry.locator('[name='+name+']');if(await field.evaluate(el=>el.tagName==='SELECT'))await field.selectOption(value);else await field.fill(value);
  await attempt('x');await confirmation.waitFor();await confirmation.locator('[data-gd-discard-confirm]').click();await entry.waitFor({state:'detached'});
 }
 await open();await entry.locator('[data-gd-assignee-query]').fill('林');await page.keyboard.press('Escape');assert.equal(await confirmation.count(),0,'Escape先收起匹配列表');assert(await entry.isVisible());
 await attempt('escape');await confirmation.waitFor();await page.keyboard.press('Escape');assert.equal(await confirmation.count(),0);assert.equal(await entry.locator('[data-gd-assignee-query]').inputValue(),'林');
 await entry.locator('[data-gd-assignee-query]').fill('林悦');await entry.locator('[data-gd-assignee-name="林悦"]').click();await attempt('cancel');await confirmation.waitFor();await confirmation.locator('[data-gd-discard-cancel]').click();assert.equal(await entry.locator('[name=assignee]').inputValue(),'林悦');
 await entry.locator('[data-gd-assignee-remove="林悦"]').click();await attempt('x');await entry.waitFor({state:'detached'});
 await open();await entry.locator('[name=title]').fill('改后清空');await entry.locator('[name=title]').fill('');await entry.locator('[name=priority]').selectOption('P1');await entry.locator('[name=priority]').selectOption('P2');await attempt('cancel');await entry.waitFor({state:'detached'});assert.equal(await confirmation.count(),0,'恢复初始值不确认');
 await page.setViewportSize({width:390,height:844});await open();await entry.locator('[name=title]').fill('窄屏草稿');await attempt('x');await confirmation.waitFor();const rect=await confirmation.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=390&&rect.y>=0&&rect.y+rect.height<=844);await confirmation.screenshot({path:'outputs/task-discard-confirm-390.png'});await confirmation.locator('[data-gd-discard-confirm]').click();await entry.waitFor({state:'detached'});
 await page.setViewportSize({width:1920,height:1080});assert.equal(await snapshot(),initial);
 console.log('通过：空白直接关闭、遮罩/×/取消/Escape未保存确认、继续编辑保留内容、放弃不落库、选择及待选内容识别、清空还原、候选菜单优先关闭、窄屏。');
}
