import assert from 'node:assert/strict';
import {closeTaskEntry} from './global-task-close.mjs';

export async function taskDatePicker(page){
 await page.clock.setFixedTime(new Date('2026-10-27T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 // 全局原有的双月、两次点击选区保持不变。
 await page.locator('#risk-date-trigger').click();const global=page.locator('#risk-date-popover');
 assert.equal(await global.locator('.risk-calendar-month').count(),2);
 await global.locator('[data-range-date="2026-10-25"]:not(:disabled)').click();assert(await global.isVisible());
 await global.locator('[data-range-date="2026-10-26"]:not(:disabled)').click();await global.waitFor({state:'detached'});
 const root=page.locator('#ai'),entry=page.locator('.gd-task-entry-dialog'),calendar=page.locator('#gd-task-date-popover'),rows=()=>entry.locator('[data-gd-execution-row]');
 await root.locator('[data-gd-part="tasks"]').click();await root.locator('[data-gd-task-create]').click();
 const date=()=>rows().first().locator('[name=due]');
 await date().click();assert(await calendar.evaluate(node=>node.matches(':popover-open')&&!!node.closest('dialog[open]')),'日历在抽屉顶层可交互');
 assert.equal(await calendar.locator('.risk-calendar-month').count(),1);assert(await calendar.locator('[data-range-date="2026-10-26"]:not(.outside)').isDisabled());
 await rows().first().locator('[data-gd-date-open]').click();assert.equal(await calendar.count(),0,'重复点击日历图标可收起');await rows().first().locator('[data-gd-date-open]').click();assert(await calendar.isVisible());
 assert.equal(await calendar.locator('.risk-calendar-presets').count(),0,'单日面板无左侧快捷栏');assert.equal(await calendar.locator('[data-range-month]').count(),4,'跨年跨月四箭头');
 await calendar.locator('[data-range-month="12"]').click();assert.equal(await calendar.locator('h3').innerText(),'2027年 10月');await calendar.locator('[data-range-month="-12"]').click();assert.equal(await calendar.locator('h3').innerText(),'2026年 10月');assert(await calendar.locator('[data-range-month="-12"]').isDisabled(),'跨年遵守日期下限');
 await calendar.locator('[data-range-month="1"]').click();assert.equal(await date().inputValue(),'','翻月不修改日期');
 await page.keyboard.press('Escape');assert.equal(await calendar.count(),0);assert(await entry.isVisible());assert.equal(await page.locator('.gd-task-discard-confirm').count(),0,'Escape先收日历');
 await entry.locator('[data-gd-entry-close]').first().click();await entry.waitFor({state:'detached'});
 await root.locator('[data-gd-task-create]').click();await date().fill('2026-13-01');await date().click();assert.equal(await calendar.locator('.risk-calendar-month h3').innerText(),'2026年 10月','无效手输不破坏日历');await page.keyboard.press('Escape');await date().fill('');
 await date().press('ArrowDown');await calendar.locator('[data-range-date="2026-10-27"]:not(:disabled)').click();assert.equal(await date().inputValue(),'2026/10/27');assert(await date().evaluate(node=>node.checkValidity()),'斜线日期通过字段格式校验');
 await rows().first().locator('[data-gd-date-open]').click();const selected=calendar.locator('[aria-selected="true"]');assert.equal(await selected.count(),1);assert(await selected.evaluate(node=>{const style=getComputedStyle(node);return style.borderRadius==='50%'&&node.offsetWidth===node.offsetHeight}),'日期选中为圆形');
 await calendar.screenshot({path:'outputs/task-single-date-reference.png'});await page.keyboard.press('Escape');await rows().first().locator('[data-gd-date-clear]').click();assert.equal(await date().inputValue(),'');assert.equal(await date().evaluate(node=>node.checkValidity()),false,'清空后仍为必填');
 const field=rows().first().locator('[data-gd-task-date]');assert(await field.evaluate(node=>node.querySelector('[data-gd-date-open]').getBoundingClientRect().left<node.querySelector('input').getBoundingClientRect().left+5),'日历图标位于输入框左侧');
 await date().fill('2026/10/27');
 for(const width of [1920,390,320]){
  await page.setViewportSize({width,height:900});await date().click();const box=await calendar.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,'日历不超出屏幕 '+width);assert(await calendar.evaluate(node=>node.scrollWidth<=node.clientWidth+1));
  await entry.screenshot({path:'outputs/task-date-picker-'+width+'.png'});await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});await date().click();await calendar.locator('[data-range-month="1"]').click();await calendar.locator('[data-range-date="2026-11-05"]:not(:disabled)').click();assert.equal(await date().inputValue(),'2026/11/05');assert.equal(await calendar.count(),0,'点一次即选中单日');
 await entry.locator('[data-gd-execution-add]').click();await rows().nth(1).locator('[name=due]').click();await calendar.locator('[data-range-month="1"]').click();await calendar.locator('[data-range-date="2026-11-06"]:not(:disabled)').click();
 assert.deepEqual(await rows().locator('[name=due]').evaluateAll(nodes=>nodes.map(node=>node.value)),['2026/11/05','2026/11/06'],'执行行日期互不覆盖');
 await rows().nth(1).locator('[name=due]').click();await rows().nth(1).locator('[data-gd-execution-remove]').click();assert.equal(await calendar.count(),0,'删除执行行清理日历');
 await entry.locator('[name=title]').fill('共用日历保存回归');await entry.locator('[name=description]').fill('单日计划');await rows().first().locator('[name=plan]').fill('核对计划');await rows().first().locator('[data-gd-assignee-query]').fill('林悦');await entry.locator('[data-gd-assignee-name="林悦"]').click();
 await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')||'[]').find(task=>task.title==='共用日历保存回归'));assert.equal(saved.due,'2026-11-05');assert.equal(saved.responsibilities[0].due,'2026-11-05');
 await root.locator('[data-gd-task-create]').click();await date().click();await closeTaskEntry(page);assert.equal(await calendar.count(),0,'关闭抽屉清理日历');
 console.log('通过：参考图单月样式、四箭头年月导航、圆形选中、左侧图标及斜线日期、清空、收起、边界/保存/逐行隔离及宽窄屏；全局双月选区保持。');
}
