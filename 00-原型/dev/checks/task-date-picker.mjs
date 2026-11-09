import assert from 'node:assert/strict';
import {closeTaskEntry} from './global-task-close.mjs';

export async function taskDatePicker(page){
 await page.clock.setFixedTime(new Date('2026-11-06T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const root=page.locator('#ai'),entry=page.locator('.gd-task-entry-dialog'),calendar=page.locator('#gd-task-date-popover');
 await root.locator('[data-gd-part=tasks]').click();
 const icon=root.locator('#gd-date-trigger .ui-dropdown-icon'),trigger=root.locator('#gd-date-trigger');
 const [i,t]=await Promise.all([icon.boundingBox(),trigger.boundingBox()]);assert(Math.abs(i.y+i.height/2-t.y-t.height/2)<1,'登记筛选箭头垂直居中');
 await root.locator('[data-gd-task-create]').click();
 const field=key=>entry.locator('[data-ledger-field='+key+']'),input=key=>field(key).locator('input'),day=date=>calendar.locator('[data-range-date="'+date+'"]:not(.outside)');
 assert.equal(await entry.locator('input[type=date]').count(),0,'抽屉统一使用公共单日组件');
 await input('registrationDate').click();assert(await calendar.evaluate(n=>n.matches(':popover-open')&&!!n.closest('dialog[open]')));assert.equal(await calendar.locator('.risk-calendar-month').count(),1);
 await day('2026-11-01').click();assert.equal(await input('registrationDate').inputValue(),'2026-11-01');
 await input('due').click();assert(await calendar.locator('[data-range-date="2026-10-31"]').isDisabled(),'计划日期不能早于登记日期');
 assert.equal(await calendar.locator('[data-range-month]').count(),4);assert.equal(await calendar.locator('.risk-calendar-presets').count(),0);
 await calendar.locator('[data-range-month="12"]').click();assert.equal(await calendar.locator('h3').innerText(),'2027年 11月');await calendar.locator('[data-range-month="-12"]').click();
 await calendar.locator('[data-range-month="1"]').click();await page.keyboard.press('Escape');assert.equal(await calendar.count(),0);assert(await entry.isVisible());assert.equal(await page.locator('.gd-task-discard-confirm').count(),0);
 await input('due').press('ArrowDown');await day('2026-11-10').click();assert.equal(await input('due').inputValue(),'2026-11-10');assert.equal(await calendar.count(),0,'单击日期直接选中');
 await field('due').locator('[data-gd-date-open]').click();const selected=calendar.locator('[aria-selected=true]');assert.equal(await selected.count(),1);assert.equal(await selected.evaluate(n=>getComputedStyle(n).borderRadius),'50%');await field('due').locator('[data-gd-date-open]').click();assert.equal(await calendar.count(),0);
 await field('due').locator('[data-gd-date-clear]').click();assert.equal(await input('due').inputValue(),'');assert.equal(await input('due').evaluate(n=>n.checkValidity()),false);
 await input('due').fill('2026-11-10');await entry.locator('[name=title]').fill('统一日历专项');await entry.locator('[name=department]').selectOption('项目部');const owner=field('primaryOwner');await owner.locator('[data-gd-assignee-query]').fill('林悦');await owner.locator('[data-gd-assignee-name=林悦]').click();
 await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});
 await root.locator('[data-gd-search]').fill('统一日历专项');await root.locator('[data-gd-action=task-detail]').click();
 await field('status').locator('[data-ledger-display]').click();await entry.locator('[data-ledger-status=done]').click();
 await field('completedAt').locator('[data-ledger-display]').click();await calendar.waitFor();assert(await day('2026-11-07').isDisabled());assert(await calendar.locator('[data-range-date="2026-10-31"]').isDisabled());
 await day('2026-11-04').click();
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')).find(t=>t.title==='统一日历专项'));
 assert.equal((await saved()).completedAt,'2026-11-04','公共日历选择后直接保存实际日期');assert.equal(await field('completedAt').locator('.gd-ledger-save-error').count(),0);
 await entry.locator('header h3').click();assert.match(await field('completedAt').locator('[data-ledger-display]').innerText(),/26\/11\/04/);
 for(const width of [1920,390,320]){await page.setViewportSize({width,height:900});await field('due').locator('[data-ledger-display]').click();await calendar.waitFor();const box=await calendar.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,'日历不超出屏幕 '+width);await page.keyboard.press('Escape');await entry.locator('header h3').click()}
 await page.setViewportSize({width:1920,height:1000});await field('due').locator('[data-ledger-display]').click();await calendar.waitFor();await closeTaskEntry(page);assert.equal(await calendar.count(),0,'关闭详情清理公共日历');
 console.log('通过：登记箭头居中、新增和详情统一单日公共日历、日期边界、四箭头年月导航、键盘/Escape、圆形选中、清空、实际完成日即时保存、宽窄屏与关闭清理。');
}
