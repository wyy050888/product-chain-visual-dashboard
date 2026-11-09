import assert from 'node:assert/strict';
const shown=date=>date.slice(2).replaceAll('-','/');
export async function productDates(page){
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const snapshot=id=>page.evaluate(id=>id==='new'?dashboardNewProductsSnapshot():dashboardKeyProductsSnapshot(),id);
 const expected={mode:'day',year:2026,value:10,start:'2026-09-29',end:'2026-10-28'};
 for(const id of ['new','matrix']){
  const scope=page.locator('#time-'+id),trigger=page.locator('#product-date-trigger-'+id),other=id==='new'?'matrix':'new';
  assert.deepEqual((await snapshot(id)).period,expected,'默认日模式近30天');
  assert.deepEqual(await scope.locator('[data-time-mode]').allTextContents(),['日','月','季','年']);
  assert.equal(await scope.locator('[data-time-mode="day"]').getAttribute('aria-pressed'),'true');
  assert.equal(await scope.locator('select').count(),0);assert.equal(await page.locator('#time-note-'+id).innerText(),'');
  assert.equal(await trigger.innerText(),shown(expected.start)+' — '+shown(expected.end));
  const appearance=el=>{const s=getComputedStyle(el);return [s.height,s.borderRadius,s.borderColor,s.backgroundColor,s.fontSize,s.display]};
  assert.deepEqual(await trigger.evaluate(appearance),await page.locator('#risk-date-trigger').evaluate(appearance),'日期触发器与现有模块样式一致');
  await scope.screenshot({path:'outputs/'+id+'-day-controls-1920.png'});
  await page.locator('a[href="#'+id+'"]').click();
  const otherPeriod=(await snapshot(other)).period,initial=(await snapshot(id)).rows;
  await trigger.click();const picker=page.locator('#product-date-popover');
  assert.equal(await picker.locator('.risk-calendar-month').count(),2);
  assert.equal(await picker.locator('[data-range-preset="30"]').getAttribute('aria-pressed'),'true');
  assert.equal(await picker.locator('[data-range-date]:not(:disabled)').evaluateAll(ns=>ns.some(n=>n.dataset.rangeDate>'2026-10-28')),false);
  await picker.locator('[data-range-preset="7"]').click();
  let selected=await snapshot(id);assert.equal(selected.period.start,'2026-10-22');assert.equal(selected.period.end,'2026-10-28');
  const amounts=rows=>rows.map(p=>id==='new'?p.current.gsvCents:p.facts.gsvCents).reduce((a,b)=>a+b,0);
  assert(amounts(selected.rows)<amounts(initial),'经营数据按所选日期汇总');
  assert.deepEqual((await snapshot(other)).period,otherPeriod,'另一模块期间保持独立');
  await trigger.click();await picker.locator('[data-range-date="2026-10-01"]:not(:disabled)').click();await picker.locator('[data-range-date="2026-10-07"]:not(:disabled)').click();
  selected=await snapshot(id);assert.equal(selected.period.start,'2026-10-01');assert.equal(selected.period.end,'2026-10-07');
  if(id==='matrix')for(const row of selected.rows){assert.equal(row.assessment.previous.start,'2026-09-24');assert.equal(row.assessment.previous.end,'2026-09-30')}
  await scope.locator('[data-time-mode="month"]').click();assert.equal(await scope.locator('[data-time-value]').inputValue(),'10');
  await scope.locator('[data-time-mode="quarter"]').click();assert.equal((await snapshot(id)).period.value,4);
  await scope.locator('[data-time-mode="year"]').click();assert.equal((await snapshot(id)).period.mode,'year');
  await scope.locator('[data-time-mode="day"]').click();assert.equal((await snapshot(id)).period.start,'2026-10-01','切回日保留手选范围');
  await trigger.click();await picker.locator('[data-range-preset="today"]').click();assert.equal((await snapshot(id)).period.start,'2026-10-28');
  if(id==='new')assert.equal((await snapshot(id)).success.label,'Q4','日筛选不改变季度考核口径');
  await trigger.click();await page.keyboard.press('Escape');assert.equal(await picker.count(),0);assert.equal(await trigger.getAttribute('aria-expanded'),'false');
  await trigger.click();await trigger.click();assert.equal(await picker.count(),0,'点击触发器可以收起');
  await trigger.click();await picker.locator('[data-range-preset="30"]').click();assert.deepEqual((await snapshot(id)).period,expected);
  for(const width of [1920,390,320]){
   await page.setViewportSize({width,height:1000});await trigger.scrollIntoViewIfNeeded();
   assert(await scope.evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1),'时间控件不超出视口 '+width);
   await trigger.click();const rect=await picker.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1,'日历不超出视口');await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:1920,height:1080});
 }
 await page.screenshot({path:'outputs/product-day-periods-1920.png'});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 for(const id of ['new','matrix'])assert.deepEqual((await snapshot(id)).period,expected,'刷新默认近30天');
 console.log('通过：新品/关键产品日月季年、默认近30天、任意日期及单日、数据更新、等长上期、相互隔离、范围记忆、关闭及宽窄屏。');
}
