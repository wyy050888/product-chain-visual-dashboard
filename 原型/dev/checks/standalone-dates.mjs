import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
export async function verifyStandaloneDates(page){
 const context=await page.context().browser().newContext({timezoneId:'America/Los_Angeles',viewport:{width:1920,height:1080}}),errors=[];
 try{
  const backend=await context.newPage();backend.setDefaultTimeout(15000);backend.on('pageerror',e=>errors.push(e.message));
  await backend.clock.setFixedTime(new Date('2026-12-31T16:01:00Z'));
  await backend.goto(pathToFileURL(fileURLToPath(new URL('../../数智罗盘/目标管理/目标管理.html',import.meta.url))).href,{timeout:30000,waitUntil:'domcontentloaded'});
  const data=await backend.evaluate(()=>({localYear:new Date().getFullYear(),today:GoalPrototype.clock.today(),period:GoalPrototype.overviewPeriod.selection(),entry:GoalPrototype.entry.context(),calendar:GoalPrototype.calendarGrid.current()}));
  assert.equal(data.localYear,2026);assert.equal(data.today,'2027-01-01');assert.equal(data.period.year,2027);assert.equal(data.entry.year,2027);assert.deepEqual(data.entry.monthList,[1]);assert.equal(data.calendar.year,2027);assert.equal(await backend.locator('#statYear').inputValue(),'2027');assert.equal(await backend.locator('#daboYear').inputValue(),'2027');
  await backend.locator('#statMonthTrigger').click();
  await backend.locator('[data-period-preset="current"]').click();
  assert.deepEqual((await backend.evaluate(()=>GoalPrototype.overviewPeriod.selection())).months,[1]);await backend.keyboard.press('Escape');
  // 不重新加载，组件打开时跨月；本月必须使用点击时的新月份。
  await backend.clock.setFixedTime(new Date('2026-10-31T15:59:00Z'));await backend.locator('#statMonthTrigger').click();
  await backend.clock.setFixedTime(new Date('2026-10-31T16:01:00Z'));await backend.locator('[data-period-preset="current"]').click();
  assert.deepEqual(await backend.evaluate(()=>({year:GoalPrototype.overviewPeriod.selection().year,months:GoalPrototype.overviewPeriod.selection().months})),{year:2026,months:[11]});
  await backend.locator('.stat-segments [data-period="quarter"]').click();await backend.locator('#statMonthTrigger').click();await backend.locator('[data-period-preset="current"]').click();
  assert.deepEqual((await backend.evaluate(()=>GoalPrototype.overviewPeriod.selection())).quarters,[4]);
  assert.deepEqual(errors,[]);console.log('通过：独立目标后台北京时间、默认年份月份、本月/本季度及跨月快捷项（美国时区浏览器）');
 }finally{await context.close()}
}
