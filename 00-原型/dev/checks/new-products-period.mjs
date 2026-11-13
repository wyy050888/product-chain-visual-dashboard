import assert from 'node:assert/strict';
import {verifyNewProductOperatingTotals} from './new-products-overview.mjs';
const shown=date=>date.slice(2).replaceAll('-','/');
// 新增经营期间不新增成功标准；月与滚动期仍按截止季度考核。
export async function verifyNewProductPeriods(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await page.locator('a[href="#new"]').click();
 const scope=page.locator('#time-new'),snapshot=()=>page.evaluate(()=>window.dashboardNewProductsSnapshot());
 const initial=await snapshot(),today=await page.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()));
 const start=new Date(Date.parse(today+'T00:00:00Z')-29*86400000).toISOString().slice(0,10),quarter=Math.ceil(Number(today.slice(5,7))/3);
 const assertDeliveryPeriod=async ({success,timeliness})=>{
  const year=Number(success.start.slice(0,4)),firstMonth=Number(success.start.slice(5,7));
  const periodEnd=new Date(Date.UTC(year,success.annual?12:firstMonth+2,0)).toISOString().slice(0,10);
  assert.deepEqual([timeliness.range.start,timeliness.range.end,timeliness.range.cutoff],[success.start,periodEnd,success.end]);
  assert.equal(timeliness.annual,success.annual);
  const card=page.locator('[data-nsp-static-metric="ontime"]');
  assert.equal(await card.locator(':scope > span').textContent(),success.label+'新品上市及时率');
  assert.equal(await card.locator('small').innerText(),`按期完成 ${timeliness.ontime} / 应上市项目 ${timeliness.planned}`);
 };
 assert.deepEqual(await scope.locator('[data-time-mode]').allTextContents(),['日','月','季','年']);
 assert.equal(initial.period.mode,'day');
 assert.equal(await scope.locator('select').count(),0,'滚动期不显示无关年月下拉');
 assert.equal(await page.locator('#product-date-trigger-new').innerText(),shown(start)+' — '+shown(today));
 assert.deepEqual((await page.locator('#newtable th').allTextContents()).slice(3,6),['近30天GSV','近30天销量','近30天利润率']);
 assert.equal(initial.success.label,'Q'+quarter);assert.equal(initial.success.end,today);
 await assertDeliveryPeriod(initial);
 await verifyNewProductOperatingTotals(page,initial.visible,'近30日');
 const other=await page.locator('#time-note-sales').innerText();
 await scope.locator('[data-time-mode="month"]').click();
 let state=await snapshot();assert.equal(state.period.mode,'month');
 assert.equal(await scope.locator('[data-time-value]').inputValue(),String(Number(today.slice(5,7))));
 assert.equal(await page.locator('#time-note-new .period-range').innerText(),shown(today.slice(0,7)+'-01')+' — '+shown(today));
 assert.equal(state.success.label,'Q'+quarter,'月度沿用季度考核');assert.equal(state.success.end,today);
 await assertDeliveryPeriod(state);
 await verifyNewProductOperatingTotals(page,state.visible,Number(today.slice(5,7))+'月');
 assert.deepEqual(state.timeliness,initial.timeliness,'同一统计日切换日和月，及时率及项目范围一致');
 assert.deepEqual((await page.locator('#newtable th').allTextContents()).slice(3,6),[Number(today.slice(5,7))+'月GSV',Number(today.slice(5,7))+'月销量',Number(today.slice(5,7))+'月利润率']);
 if(Number(today.slice(5,7))>1){
  await scope.locator('[data-time-value]').selectOption(String(Number(today.slice(5,7))-1),{force:true});state=await snapshot();
  const end=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1,0)).toISOString().slice(0,10);
  assert.equal(state.success.label,'Q'+Math.ceil(Number(end.slice(5,7))/3));assert.equal(state.success.end,end,'历史月按月末截止');
  await assertDeliveryPeriod(state);
 }
 await scope.locator('[data-time-mode="day"]').click();
 state=await snapshot();assert.equal(state.period.mode,'day');
 assert.deepEqual(state.rows.map(p=>p.current.gsvCents),initial.rows.map(p=>p.current.gsvCents),'切回近30天恢复同区间数据');
 await scope.locator('[data-time-mode="quarter"]').click();state=await snapshot();assert.equal(state.period.mode,'quarter');
 await assertDeliveryPeriod(state);
 assert.deepEqual(state.timeliness,initial.timeliness,'季度与同截止日的日模式采用相同项目范围');
 await verifyNewProductOperatingTotals(page,state.visible,'Q'+quarter);
 await scope.locator('[data-time-mode="year"]').click();state=await snapshot();assert(state.success.annual);assert.equal(state.success.label,today.slice(2,4)+'年');
 await assertDeliveryPeriod(state);
 await verifyNewProductOperatingTotals(page,state.visible,today.slice(2,4)+'年');
 await scope.locator('[data-time-mode="day"]').click();
 const dateTrigger=page.locator('#product-date-trigger-new'),picker=page.locator('#product-date-popover');
 await dateTrigger.click();
 const customStart=new Date(Date.parse(today+'T00:00:00Z')-6*86400000).toISOString().slice(0,10);
 const chooseDay=date=>picker.locator('[data-range-date="'+date+'"]:not(.outside)');
 await chooseDay(customStart).click();
 await chooseDay(today).click();
 await verifyNewProductOperatingTotals(page,(await snapshot()).visible,'所选期间');
 await dateTrigger.click();await picker.locator('[data-range-preset="30"]').click();
 assert.equal(await page.locator('#time-note-sales').innerText(),other,'新品时间独立于销售达成');
 for(const width of [1920,1440,1024,390,320]){
  await page.setViewportSize({width,height:1080});
  assert(await page.locator('#new').evaluate(n=>n.scrollWidth<=n.clientWidth+2),'新品无横向溢出 '+width);
  assert(await scope.locator('[data-time-mode]').evaluateAll(ns=>ns.every(n=>n.getBoundingClientRect().width>0)));
 }
 await page.setViewportSize({width:1920,height:1080});
}
