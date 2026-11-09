import {verifyStandaloneDates} from './standalone-dates.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');
const short=date=>date.slice(2).replaceAll('-','/');
function modelBoundaries(){
 let now='2026-10-18T16:01:00Z';
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return Date.parse(now)}}
 const ctx=vm.createContext({Date:Clock,iso:d=>d.toISOString().slice(0,10),shiftDate:(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10)});
 vm.runInContext(read('src/modules/period/01.js').split('const moduleIds=')[0]+'\n'+read('src/modules/date-range/01-model.js'),ctx);
 for(const [instant,today,yesterday,week,month,year] of [
  ['2026-10-18T16:01:00Z','2026-10-19','2026-10-18','2026-10-19','2026-10-01','2026-01-01'],
  ['2026-10-18T08:00:00Z','2026-10-18','2026-10-17','2026-10-12','2026-10-01','2026-01-01'],
  ['2027-01-01T00:01:00Z','2027-01-01','2026-12-31','2026-12-28','2027-01-01','2027-01-01'],
  ['2028-03-01T00:01:00Z','2028-03-01','2028-02-29','2028-02-28','2028-03-01','2028-01-01']
 ]){
  now=instant;assert.equal(ctx.dashboardToday(),today);
  for(const [key,expected] of [['today',[today,today]],['yesterday',[yesterday,yesterday]],['week',[week,today]],['month',[month,today]],['year',[year,today]]])assert.deepEqual(Array.from(ctx.dateRangePreset(key)),expected,key+'按北京时间当天计算');
 }
 now='2028-03-01T00:01:00Z';assert.deepEqual(Array.from(ctx.dateRangePreset('lastmonth')),['2028-02-01','2028-02-29']);
 assert.deepEqual(Array.from(ctx.dateRangePreset('30')),['2028-02-01','2028-03-01']);
 assert.deepEqual(Array.from(ctx.dateRangePreset('lastweek')),['2028-02-21','2028-02-27']);
 assert.equal(ctx.dashboardPeriodLimit({year:2028,mode:'month'}),3);assert.equal(ctx.dashboardYears(1).at(-1),2029);
}
export async function verifyDateShortcuts(page){
 modelBoundaries();await verifyStandaloneDates(page);const realNow=new Date(),url=page.url();
 try{
  // 运行设备可在美国；快捷日仍以北京时间为准。
  await page.clock.setFixedTime(new Date('2026-10-18T16:01:00Z'));await page.goto(url,{timeout:30000,waitUntil:'domcontentloaded'});
  const expected={today:['2026-10-19','2026-10-19'],yesterday:['2026-10-18','2026-10-18'],week:['2026-10-19','2026-10-19'],month:['2026-10-01','2026-10-19'],year:['2026-01-01','2026-10-19'],lastweek:['2026-10-12','2026-10-18'],lastmonth:['2026-09-01','2026-09-30']};
  const root=page.locator('#risk-date-trigger'),calendar=page.locator('#risk-date-popover');
  for(const [key,[start,end]] of Object.entries(expected)){
   await root.click();assert.equal(await calendar.locator('[data-range-preset]').count(),10);
   await calendar.locator('[data-range-preset="'+key+'"]').click();
   assert.equal(await root.innerText(),short(start)+' — '+short(end));
  }
  const aiTrigger=page.locator('#gd-date-trigger'),aiCalendar=page.locator('#up-date-popover');
  for(const key of ['today','yesterday','week','month','year']){
   await aiTrigger.click();await aiCalendar.locator('[data-range-preset="'+key+'"]').click();
   const [start,end]=expected[key];assert.deepEqual((await page.evaluate(()=>window.globalDiagnosisAudit())).range,{start,end},'总诊断快捷项 '+key+' 不被覆盖起点截断');
  }
  // 日历已打开时跨午夜，不刷新页面，今日/昨日/本年都重新取日。
  for(const [before,after,key,start,end] of [
   ['2026-10-19T15:59:00Z','2026-10-19T16:01:00Z','today','2026-10-20','2026-10-20'],
   ['2026-10-20T15:59:00Z','2026-10-20T16:01:00Z','yesterday','2026-10-20','2026-10-20'],
   ['2026-12-31T15:59:00Z','2026-12-31T16:01:00Z','year','2027-01-01','2027-01-01']
  ]){
   await page.clock.setFixedTime(new Date(before));await root.click();
   await page.clock.setFixedTime(new Date(after));await calendar.locator('[data-range-preset="'+key+'"]').click();
   assert.equal(await root.innerText(),short(start)+' — '+short(end),'弹层跨午夜 '+key);
  }
  // 后台默认年月、年份枚举随当前年更新，而非停留在2026年10月。
  await page.goto(url+'#system-cost-efficiency',{timeout:30000,waitUntil:'domcontentloaded'});await page.reload({timeout:30000,waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#cec-time [data-cec-time-year]').inputValue(),'2027');
  assert.equal(await page.locator('#cec-time [data-cec-time-value]').inputValue(),'1');
  await page.goto(url+'#system-lifecycle-targets',{timeout:30000,waitUntil:'domcontentloaded'});await page.reload({timeout:30000,waitUntil:'domcontentloaded'});await page.locator('#lt-target-page').waitFor({state:'visible'});assert.equal(await page.locator('#lt-year').inputValue(),'2027');
  console.log('通过：全部日期快捷项、周边界、闰日、北京时间与常驻页面跨午夜、后台默认年月');
 }finally{await page.clock.setFixedTime(realNow);await page.goto(url,{timeout:30000,waitUntil:'domcontentloaded'})}
}
