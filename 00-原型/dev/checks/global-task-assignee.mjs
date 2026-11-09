import {closeTaskEntry} from './global-task-close.mjs';
import assert from 'node:assert/strict';

export async function verifyTaskAssigneePicker(page){
 const root=page.locator('#ai'),dialog=()=>page.locator('.gd-task-entry-dialog');
 await root.locator('[data-gd-task-create]').click();let d=dialog(),input=d.locator('[data-gd-assignee-query]'),menu=d.locator('#gd-task-assignee-options');
 assert.equal(await d.locator('select[name=assignee]').count(),0);
 await input.click();assert(await menu.isHidden());assert.equal(await input.getAttribute('aria-expanded'),'false');
 await input.press('ArrowDown');assert(await menu.isHidden(),'空搜索词不展示全员');
 await input.fill('林');assert(await menu.isVisible());assert.equal(await menu.locator('[role=option]').count(),1);assert.match(await menu.innerText(),/林悦/);
 assert.equal(await d.locator('[name=assignee]').inputValue(),'');assert.equal(await input.evaluate(el=>el.checkValidity()),false,'键入未选择不能冒充负责人');
 await input.press('Escape');assert(await menu.isHidden());assert(await d.isVisible());await input.click();assert(await menu.isHidden(),'保留搜索词时点击也不自动展开');
 await input.fill('产品');assert.equal(await menu.locator('[role=option]').count(),4);assert((await menu.locator('[role=option]').allTextContents()).every(label=>label.includes('产品')),'按部门模糊匹配');
 await input.press('ArrowDown');assert(await input.getAttribute('aria-activedescendant'));await input.press('Enter');assert.equal(await d.locator('[name=assignee]').inputValue(),'林悦');assert(await menu.isHidden());
 await input.click();assert(await menu.isHidden(),'选中后点击不展开');
 await input.fill('采购');assert.equal(await d.locator('[name=assignee]').inputValue(),'林悦','搜索下一位不清除已选负责人');await menu.locator('[data-gd-assignee-name="唐琪"]').click();assert.deepEqual(JSON.parse(await d.locator('[name=assignee]').inputValue()),['林悦','唐琪']);assert.equal(await d.locator('[data-gd-assignee-remove]').count(),2);
 await input.fill('林');assert.equal(await menu.locator('[role=option]').count(),0,'已选人员不重复出现');
 await input.fill('无此人员xyz');assert.equal(await menu.locator('[role=option]').count(),0);assert.match(await menu.innerText(),/没有匹配的负责人/);assert.equal(await input.evaluate(el=>el.checkValidity()),false);
 await input.fill('');assert(await menu.isHidden());assert.equal(await input.evaluate(el=>el.checkValidity()),true);
 await d.locator('[data-gd-assignee-remove="林悦"]').click();assert.equal(await d.locator('[name=assignee]').inputValue(),'唐琪');await input.press('Backspace');assert.equal(await input.evaluate(el=>el.checkValidity()),false,'全部移除后仍必填');
 await input.fill('沈');await input.press('Enter');assert.equal(await d.locator('[name=assignee]').inputValue(),'沈舟','唯一候选可直接回车选择');
 await closeTaskEntry(page);
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1080});await root.locator('[data-gd-task-create]').click();d=dialog();input=d.locator('[data-gd-assignee-query]');menu=d.locator('#gd-task-assignee-options');
  await input.click();assert(await menu.isHidden());await input.fill('产品');const rect=await menu.boundingBox();assert(rect&&rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=1080,'匹配菜单不超出视口 '+width);
  assert(await d.evaluate(node=>node.scrollWidth<=node.clientWidth+1));await menu.locator('[role=option]').first().click();assert(await menu.isHidden());await closeTaskEntry(page);
 }
 await page.setViewportSize({width:1920,height:1080});
}
