import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function verifyTodoPriorityPicker(page,dialog,taskId){
 const field=dialog.locator('[data-todo-field="priority"]'),read=field.locator('[data-todo-field-edit]'),popup=dialog.locator('[data-todo-priority-popup]'),store=()=>page.evaluate(id=>JSON.parse(localStorage.getItem('product-risk-todos-v1'))[id],taskId),before=await store();
 await read.click();assert(await popup.isVisible());assert.deepEqual(await popup.locator('[data-todo-priority-choice]').evaluateAll(ns=>ns.map(n=>n.dataset.todoPriorityChoice)),['P0','P1','P2','P3']);
 const colors=await popup.locator('.up-todo-priority').evaluateAll(ns=>ns.map(n=>({key:n.innerText,bg:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color})));
 assert.equal(new Set(colors.map(c=>c.bg)).size,4);assert.equal(new Set(colors.map(c=>c.color)).size,4,'P0-P3沿用四种标签颜色');
 assert.equal(await popup.locator('[aria-selected="true"]').getAttribute('data-todo-priority-choice'),before.priority);
 await page.keyboard.press('End');assert.equal(await field.locator('[data-todo-priority-trigger]').getAttribute('aria-activedescendant'),await popup.locator('[data-todo-priority-choice="P3"]').getAttribute('id'));assert.equal((await store()).priority,before.priority,'方向键仅定位，不提前保存');await page.keyboard.press('Escape');assert(await dialog.isVisible());assert.equal((await store()).priority,before.priority,'Esc取消并保留原值');
 for(const width of [1920,1440,390]){
  await page.setViewportSize({width,height:900});await read.click();const box=await popup.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=900,'选项不被信息栏/窄屏截断 '+width);
  if(width===1920||width===390)await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/todo-priority-'+width+'.png',import.meta.url))});await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});await read.click();await popup.locator('[data-todo-priority-choice="P3"]').click();assert.equal((await store()).priority,'P3');assert.equal(await read.locator('.up-todo-priority').innerText(),'P3','选中后恢复彩色只读标签');
 await read.click();await page.keyboard.press('Home');await page.keyboard.press('Enter');assert.equal((await store()).priority,'P0','键盘确认直接保存');assert(await read.evaluate(e=>e===document.activeElement),'保存后焦点回到当前字段');
 await read.click();await dialog.locator('header h3').click();assert.equal(await popup.count(),0,'外部点击清理浮层');assert.equal((await store()).priority,'P0');
 await read.click();await popup.locator('[data-todo-priority-choice="'+before.priority+'"]').click();
 const after=await store();assert.equal(after.priority,before.priority);assert.deepEqual(after.responsibilities,before.responsibilities);assert.equal(after.assignedAt,before.assignedAt);
 console.log('通过：四级彩色标签选项、当前值/键盘高亮、点击/键盘保存、Esc取消、外部关闭及窄屏');
}
