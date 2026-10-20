import {verifyDateShortcuts} from './date-shortcuts.mjs';
import assert from 'node:assert/strict';
const shift=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
const shown=date=>date.slice(2).replaceAll('-','/');
// 固定浏览器时钟验证真实组件；覆盖北京时间跨日、跨月和跨年，不移动源台账日期。
export async function dynamicDates(page){
 await verifyDateShortcuts(page);
 const realNow=new Date(),url=page.url(),browser=page.context().browser();
 const cases=[{now:realNow,today:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(realNow)},
  {now:new Date('2026-10-19T16:01:00Z'),today:'2026-10-20'},
  {now:new Date('2026-11-02T04:00:00Z'),today:'2026-11-02'},
  {now:new Date('2027-01-02T04:00:00Z'),today:'2027-01-02'}];
 for(const {now,today} of cases){
  const fixture=await browser.newContext({viewport:{width:1920,height:1080}}),page=await fixture.newPage();page.setDefaultTimeout(20000);
  try{
   await page.clock.setFixedTime(now);await page.goto(url,{timeout:30000,waitUntil:'domcontentloaded'});
   const start=shift(today,-29),label=shown(start)+' — '+shown(today),month=Number(today.slice(5,7));
   assert.equal(await page.locator('#risk-date-trigger').innerText(),label,'首页默认当天及前29天');
   assert.equal(await page.locator('#ai .risk-date-trigger').innerText(),label,'总诊断与首页默认一致');
   assert.deepEqual(await page.locator('.ip-metric-range').allTextContents(),[label,label],'库存双表默认一致');
   assert.equal(await page.locator('#time-note-matrix .period-range').innerText(),label,'关键产品默认一致');
   await page.locator('#risk-date-trigger').click();
   const panel=page.locator('#risk-date-popover');
   assert.equal(await panel.locator('[data-range-preset="30"]').getAttribute('aria-pressed'),'true');
   assert.equal(await panel.locator('[data-range-date]:not(:disabled)').evaluateAll((nodes,end)=>nodes.some(n=>n.dataset.rangeDate>end),today),false,'不能选择明天');
   await panel.locator('[data-range-preset="7"]').click();assert.equal(await page.locator('#risk-date-trigger').innerText(),shown(shift(today,-6))+' — '+shown(today));
   await page.locator('#risk-date-trigger').click();await page.locator('#risk-date-popover [data-range-preset="30"]').click();
   await page.locator('#riskrail [data-risk="1"]').click();
   assert.equal(await page.locator('#dialogsub .risk-date-trigger').innerText(),label,'完整榜单继承近30天');
   await page.locator('#dialogsub .risk-date-trigger').click();
   await page.locator('#up-date-popover [data-range-preset="30"]').click();
   assert.equal(await page.locator('#dialogsub .risk-date-trigger').innerText(),label,'抽屉快捷日期以当天计算');
   await page.locator('#close').click();
   await page.locator('#time-risk [data-time-mode="month"]').click();
   assert.equal(await page.locator('#time-risk [data-time-year]').inputValue(),today.slice(0,4));
   assert.equal(await page.locator('#time-risk [data-time-value]').inputValue(),String(month));
   assert.equal(await page.locator('#time-risk [data-time-value] option').count(),month,'当前年度月份上限自动更新');
   await page.locator('#time-risk [data-time-mode="year"]').click({timeout:30000,waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#time-note-risk .period-range').innerText(),shown(today.slice(0,4)+'-01-01')+' — '+shown(today));
   const supplier=page.locator('.scp-resource-card [data-scp-annual-metric="newCooperation"] [data-scp-members]');
   await supplier.click();
   const cooperation=page.locator('[data-scp-date="cooperation"]');
   assert.equal(await cooperation.locator('[data-scp-date-from]').inputValue(),today.slice(0,4)+'-01-01');
   assert.equal(await cooperation.locator('[data-scp-date-to]').inputValue(),today,'年度新增仍为年初至当天');
   for(const key of ['registered','reserved','admitted','cooperation']){
    const field=page.locator('[data-scp-date="'+key+'"]');await field.locator('[data-scp-date-open]').click();
    await page.locator('#up-date-popover [data-range-preset="30"]').click();
    assert.equal(await field.locator('[data-scp-date-from]').inputValue(),start);
    assert.equal(await field.locator('[data-scp-date-to]').inputValue(),today,'供应商四日期快捷项共用当天');
   }
   await page.locator('#close').click();console.log('通过：动态近30天 '+start+'—'+today);
  }finally{await fixture.close()}
 }
}
