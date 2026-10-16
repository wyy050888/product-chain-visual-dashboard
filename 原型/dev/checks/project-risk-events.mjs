import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export async function projectRiskEvents(page){
 const ctx=vm.createContext({window:{}});
 for(const file of ['01-model','10-risk-events-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const rows=[{id:1,ledger:[{id:'a',light:'红灯',recordedAt:'2026-10-01',closedAt:'2026-10-10'},{id:'a',light:'红灯',recordedAt:'2026-10-01'},{id:'b',light:'黄灯',recordedAt:'2026-09-30',closedAt:'2026-10-01'},{id:'c',light:'红灯',deadline:'2026-10-05'},{id:'d',light:'绿灯',recordedAt:'2026-10-01'}]}];
 const facts=ctx.ppRiskEvents(rows,{start:'2026-10-01',end:'2026-10-10'});
 assert.equal(facts.filter(e=>e.kind==='new').length,1);assert.equal(facts.filter(e=>e.kind==='closed').length,2);
 const calendar=vm.createContext({nspFilters:{}});
 for(const file of ['new-products/02-launch-picker','ui-controls/06-natural-period-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file+'.js',import.meta.url),'utf8'),calendar);
 assert.equal(calendar.uiPeriodValidDate('2024-02-29'),true);assert.equal(calendar.uiPeriodValidDate('2025-02-29'),false);
 assert.equal(calendar.uiNaturalPeriodRange({mode:'month',year:2024,value:2}).end,'2024-02-29');
 assert.equal(calendar.uiNaturalPeriodRange({mode:'quarter',year:2024,value:1}).end,'2024-03-31');
 assert.equal(calendar.uiNaturalPeriodRange({mode:'year',year:2026,value:1},'2026-10-10').end,'2026-10-10');
 assert.equal(calendar.uiNaturalPeriodRange({mode:'year',year:2027,value:1},'2026-10-10'),null);
 assert.equal(calendar.uiNaturalPeriodRange({mode:'day',start:'2026-10-10',end:'2026-10-01'}),null);
 assert.match(calendar.uiPeriodMonthMarkup(2024,2,{start:null,end:null},null),/data-natural-day="2024-02-29"/);
 assert.doesNotMatch(calendar.uiPeriodMonthMarkup(2025,2,{start:null,end:null},null),/data-natural-day="2025-02-29"/);
 await page.locator('a[href="#projects"]').click();
 const audit=()=>page.evaluate(()=>projectRiskEventsAudit());
 let data=await audit();assert(data.groups.some(g=>g.new.length));assert(data.groups.some(g=>g.closed.length));
 const verify=async()=>{
  const d=await audit();
  for(const g of d.groups)for(const kind of ['new','closed']){
   const button=page.locator(`[data-pp-event-group="${g.key}"][data-kind="${kind}"]`);
   const dateKey=kind==='new'?'recordedAt':'closedAt';
   const records=d.rows.filter(p=>p[d.state.dimension]===g.key).flatMap(p=>p.ledger).filter(r=>['红灯','黄灯'].includes(r.light)&&r[dateKey]>=d.range.start&&r[dateKey]<=d.range.end);
   assert.equal(g[kind].length,records.length);
   assert.deepEqual(await button.locator('b').allTextContents(),['红灯','黄灯'].map(light=>String(records.filter(r=>r.light===light).length)));
  }
 };
 await verify();
 for(const kind of ['new','closed']){
  data=await audit();const group=data.groups.find(g=>g[kind].length);
  await page.locator(`[data-pp-event-group="${group.key}"][data-kind="${kind}"]`).click();
  assert.equal(await page.locator('.pp-analysis-table tbody tr').count(),group[kind].length);
  assert((await page.locator('.pp-analysis-table th').allTextContents()).includes('闭环验证日期'));
  await page.locator('#modalclose').click();
 }
 await page.locator('[data-pp-event-dimension="category"]').click();await verify();
 const panel=page.locator('#pp-event-period-panel');
 const open=async()=>{await page.locator('[data-pp-event-period]').click();assert(await panel.isVisible());assert(await page.locator('#overlay').isHidden());assert.equal(await panel.locator('[data-natural-mode]').count(),4)};
 const day=date=>panel.locator(`[data-natural-day="${date}"]`);
 await open();assert.equal(await panel.locator('[data-natural-mode="day"]').getAttribute('aria-pressed'),'true');
 await day('2026-10-01').click();await panel.locator('[data-natural-confirm]').click();
 assert.deepEqual((await audit()).range,{start:'2026-10-01',end:'2026-10-01'});await verify();
 await open();assert(await day('2026-10-11').isDisabled());
 await panel.locator('[data-natural-month-step="-1"]').click();
 await day('2026-10-03').click();await day('2026-09-28').click();await panel.locator('[data-natural-confirm]').click();
 assert.deepEqual((await audit()).range,{start:'2026-09-28',end:'2026-10-03'});await verify();
 // 未确认的单日编辑在Escape后取消，重新打开仍显示上次生效区间。
 await open();await day('2026-09-29').click();await page.keyboard.press('Escape');assert(await panel.isHidden());
 assert.deepEqual((await audit()).range,{start:'2026-09-28',end:'2026-10-03'});
 await open();assert.equal(await day('2026-09-28').getAttribute('aria-pressed'),'true');
 await panel.locator('[data-natural-mode="month"]').click();await panel.locator('[data-natural-value="10"]').click();
 assert.deepEqual((await audit()).range,{start:'2026-10-01',end:'2026-10-10'});assert.equal((await audit()).state.period.mode,'month');await verify();
 await open();await panel.locator('[data-natural-mode="quarter"]').click();await panel.locator('[data-natural-value="3"]').click();
 assert.deepEqual((await audit()).range,{start:'2026-07-01',end:'2026-09-30'});await verify();
 await open();await panel.locator('[data-natural-mode="year"]').click();assert(await panel.locator('[data-natural-value="2027"]').isDisabled());await panel.locator('[data-natural-value="2026"]').click();
 assert.deepEqual((await audit()).range,{start:'2026-01-01',end:'2026-10-10'});await verify();
 await open();await panel.locator('[data-natural-year-step="-1"]').click();await panel.locator('[data-natural-value="2020"]').click();
 assert.deepEqual((await audit()).range,{start:'2020-01-01',end:'2020-12-31'});assert((await audit()).groups.every(g=>!g.new.length&&!g.closed.length));
 await page.locator('[data-pp-event-group]').first().click();assert.match(await page.locator('.pp-analysis-detail').innerText(),/暂无风险记录/);await page.locator('#modalclose').click();
 await page.locator('[data-pp-event-clear]').click();assert.equal((await audit()).state.all,true);assert.match(await page.locator('[data-pp-event-period]').innerText(),/全部日期/);await verify();
 // 清空后从自然日重新选择，跨月导航只改变浏览月份。
 await open();await day('2026-10-01').click();await day('2026-10-10').click();await panel.locator('[data-natural-confirm]').click();
 assert.deepEqual((await audit()).range,{start:'2026-10-01',end:'2026-10-10'});await verify();
 const categoryMenu=page.locator('#pp-scope .pf-multi').filter({has:page.locator('#pp-filter-category')});await categoryMenu.locator('summary').click();await categoryMenu.locator('input[value="清洁类"]').check();await page.keyboard.press('Escape');assert((await audit()).rows.every(p=>p.category==='清洁类'));await verify();
 await categoryMenu.locator('summary').click();await categoryMenu.locator('input[value="all"]').check();await page.keyboard.press('Escape');
 for(const width of [1920,1440,900,600]){await page.setViewportSize({width,height:1080});assert(await page.locator('#pp-overview').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await page.locator('.pp-events').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
 await page.setViewportSize({width:1920,height:1080});
 await open();assert.equal(await panel.locator('.ui-period-month:visible').count(),2);
 await panel.screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-period-calendar.png',import.meta.url))});
 for(const width of [900,600,360]){
  await page.setViewportSize({width,height:900});
  assert(await panel.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1}),'日历在屏幕范围内');
  if(width===360)assert.equal(await panel.locator('.ui-period-month:visible').count(),1);
 }
 await page.keyboard.press('Escape');await page.setViewportSize({width:1920,height:1080});
 // 查询重绘后仍只有一个可用日历实例。
 await page.locator('[data-pp-event-dimension="type"]').click();await open();assert.equal(await page.locator('#pp-event-period-panel:popover-open').count(),1);await page.keyboard.press('Escape');
 await page.locator('#pp-overview').screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-events.png',import.meta.url))});
}
