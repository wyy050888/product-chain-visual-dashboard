import assert from 'node:assert/strict';
import {riskBoardDatesModel} from './risk-board-dates-model.mjs';
export async function riskBoardDates(page){
 riskBoardDatesModel();await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const audit=()=>page.evaluate(()=>riskBoardPeriodAudit()),board=kind=>page.locator('#riskrail [data-rp-board="'+kind+'"]'),controls=kind=>board(kind).locator('[data-rp-board-date]');
 assert.equal(await page.locator('#time-risk').innerText(),'');assert.equal(await page.locator('#risk-date-trigger').count(),0);
 assert.equal(await page.locator('#riskrail [data-rp-board-date]').count(),5);
 const initial=await audit();
 const warningSources=await page.evaluate(()=>globalDiagnosisRiskSnapshot().sources);
 for(const kind of [0,1,2]){
  const row=initial.find(row=>row.kind===kind);assert.equal(row.period.start,'2026-09-29');assert.equal(row.period.end,'2026-10-28');
  assert.deepEqual(await controls(kind).locator('[data-drawer-time-mode],[data-drawer-time-day]').allTextContents(),['日','月','季','年']);
 }
 for(const kind of [3,4])assert.equal(await controls(kind).count(),0);
 const returnGsvLabel=()=>board(6).locator('[data-rp-metric-label="gsv"]').first().innerText();
 assert.equal(await returnGsvLabel(),'10/6–10/12 GSV');
 const stable=initial.find(row=>row.kind===6);assert.equal(stable.period.start,'2026-10-06');assert.equal(stable.period.end,'2026-10-12');assert.equal(stable.comparison.previousStart,'2026-09-29');assert.equal(stable.comparison.previousEnd,'2026-10-05');
 for(const kind of [1,2,3,4,6])await board(kind).evaluate(e=>e.dataset.unchanged='yes');
 await controls(0).locator('[data-drawer-time-mode="month"]').click();await controls(0).locator('[data-drawer-time-value]').selectOption('9');
 let state=await audit();assert.equal(state.find(row=>row.kind===0).period.value,9);
 for(const kind of [1,2,3,4,6]){assert.equal(await board(kind).getAttribute('data-unchanged'),'yes');assert.deepEqual(state.find(row=>row.kind===kind).period,initial.find(row=>row.kind===kind).period)}
 await board(0).locator('[data-risk="0"]').click();assert.equal(await page.locator('#dialogbody').getAttribute('data-ranking-period').then(JSON.parse).then(p=>p.value),9);
 await page.locator('#dialogbody [data-qr-detail]').first().click();assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),'2026-09-01');await page.locator('#close').click();
 if(await page.locator('#overlay').isVisible())await page.locator('#close').click();
 await controls(6).locator('[data-rp-return-mode="month"]').click();
 state=await audit();const monthly=state.find(row=>row.kind===6);assert.equal(monthly.period.start,'2026-10-01');assert.equal(monthly.period.end,'2026-10-12');assert.equal(monthly.comparison.previousStart,'2026-09-01');assert.equal(monthly.comparison.previousEnd,'2026-09-30');
 assert.equal(await returnGsvLabel(),'10/1–10/12 GSV');
 assert.match((await board(6).locator('.qr-card-date').innerText()).replace(/\s+/g,' '),/26\/10\/01.*26\/10\/12.*26\/09\/01.*26\/09\/30/);
 await board(6).locator('[data-risk="6"]').click();assert.equal(await page.locator('#dialogsub [data-rp-return-mode]').count(),2);
 let inherited=JSON.parse(await page.locator('#dialogbody').getAttribute('data-ranking-period'));assert.equal(inherited.previousStart,'2026-09-01');
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 assert.equal(JSON.parse(await page.locator('#dialogbody').getAttribute('data-ranking-period')).value,9,'换榜继承该榜首页期间');
 await page.locator('#dialogsub [data-drawer-time-value]').selectOption('8');
 await page.locator('[data-drawer-tab="ranking-6"]').click();
 assert.equal(JSON.parse(await page.locator('#dialogbody').getAttribute('data-ranking-period')).previousEnd,'2026-09-30','换榜保留退货月对比');
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 assert.equal(JSON.parse(await page.locator('#dialogbody').getAttribute('data-ranking-period')).value,8,'每个榜单独立记忆抽屉期间');
 await page.locator('[data-drawer-tab="ranking-4"]').click();assert.equal(await page.locator('#dialogsub .period-picker').count(),0,'实时榜完整榜单无日期控件');
 await page.locator('#close').click();
 const monthlyFact=await page.evaluate(()=>riskPlatformCardsSnapshot().boards.find(row=>row.kind===6));
 assert.equal(monthlyFact.previousStart,'2026-09-01');assert.equal(monthlyFact.previousEnd,'2026-09-30');
 const firstReturnRow=board(6).locator('[data-rp-platform-row]').first(),returnPlatform=await firstReturnRow.getAttribute('data-rp-platform-row');
 const firstFact=monthlyFact.records[0].platforms.find(row=>row.platform===returnPlatform);
 assert.equal(Number(await firstReturnRow.locator('[data-rp-field="gsv"]').getAttribute('data-value')),firstFact.gsvCents);
 for(const [key,current,previous] of [['return',firstFact.returnRate,firstFact.previousReturnRate],['received',firstFact.receivedRate,firstFact.previousReceivedRate]]){
  const cell=firstReturnRow.locator('[data-rp-field="'+key+'"] strong'),growth=Number.isFinite(current)&&previous>0?(current-previous)/previous*100:null;
  const delta=growth===null?null:Math.sign(growth)*Math.round(Math.abs(growth)*10)/10;
  const expected=delta===null?'—':delta===0?'持平':(delta>0?'↑ ':'↓ ')+Math.abs(delta).toFixed(1)+'%';
  assert.equal((await cell.innerText()).replace(/\s+/g,' '),expected,'两期退货率的环比增长率 '+key);
  assert(await cell.evaluate((e,tone)=>e.classList.contains('rp-quality-'+tone),delta===null||delta===0?'gray':delta>0?'red':'green'));
 }
 const returnRate=(await firstReturnRow.locator('[data-rp-field="return"] small').innerText()).replace(/^实际 /,'');
 await firstReturnRow.locator('[data-rp-platform-detail]').click();
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),'2026-10-01');assert.equal(await page.locator('.up-detail').getAttribute('data-up-end'),'2026-10-12');
 assert.equal(await page.locator('.up-detail .up-return-metrics .number-signal--red').count(),0,'从退货恶化榜打开的详情使用红字');
 assert.equal(await page.locator('.up-return-metrics [data-up-quality-metric="returned"] strong').innerText(),returnRate,'成熟期间卡片/详情同源');await page.locator('#close').click();
 await board(6).screenshot({path:'outputs/risk-board-return-month-1920.png'});
 await controls(6).locator('[data-rp-return-month]').selectOption('9');state=await audit();assert.equal(state.find(row=>row.kind===6).period.end,'2026-09-30');assert.equal(state.find(row=>row.kind===6).comparison.previousEnd,'2026-08-31');
 assert.equal(await returnGsvLabel(),'9月 GSV');
 await controls(6).locator('[data-rp-return-mode="week"]').click();await controls(6).locator('[data-rp-return-anchor]').click();await page.locator('#rp-return-date-popover [data-range-date="2026-10-27"]:not(:disabled)').click();
 assert.equal((await audit()).find(row=>row.kind===6).period.end,'2026-10-11');
 assert.equal(await returnGsvLabel(),'10/5–10/11 GSV');
 for(const kind of [1,2]){
  await controls(kind).locator('[data-drawer-time-mode="month"]').click();await controls(kind).locator('[data-drawer-time-value]').selectOption('9');
  const selected=(await audit()).find(row=>row.kind===kind);assert.equal(selected.range.end,'2026-09-30');
  if(kind===1)assert(selected.records.every(row=>row.scoreAsOf==='2026-09-30'),'评分统一读取结束日');
  await controls(kind).locator('[data-drawer-time-mode="quarter"]').click();assert.equal((await audit()).find(row=>row.kind===kind).period.mode,'quarter');
  await controls(kind).locator('[data-drawer-time-mode="year"]').click();assert.equal((await audit()).find(row=>row.kind===kind).period.mode,'year');
 }
 const assertViolationDay=async(start,end,label)=>{
  const model=await page.evaluate(()=>riskPlatformCardsSnapshot().boards.find(row=>row.kind===0));
  assert.deepEqual(model.range,{start,end});
  const card=board(0).locator('.rp-platform-product').first(),row=card.locator('[data-rp-platform-row]').first();
  assert.equal(await card.locator('.rp-platform-metric-label').last().innerText(),label);
  const platform=await row.getAttribute('data-rp-platform-row');
  assert.equal(Number(await row.locator('[data-rp-field="gsv"]').getAttribute('data-value')),model.records[0].platforms.find(item=>item.platform===platform).gsvCents);
 };
 await controls(0).locator('[data-drawer-time-mode="quarter"]').click();
 await controls(0).locator('[data-drawer-time-day]').click();
 await assertViolationDay('2026-09-29','2026-10-28','近30日 GSV');
 await controls(0).locator('#rp-board-date-0').click();
 for(const day of ['2026-10-01','2026-10-15'])await page.locator('#up-date-popover [data-range-date="'+day+'"]:not(:disabled)').click();
 await controls(0).locator('[data-drawer-time-mode="month"]').click();
 await controls(0).locator('[data-drawer-time-day]').click();
 await assertViolationDay('2026-10-01','2026-10-15','GSV');
 assert.deepEqual(await page.evaluate(()=>globalDiagnosisRiskSnapshot().sources),warningSources,'人工筛选不改写真实出现记录的取数期间');
 for(const width of [1920,1280,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const kind of [0,1,2,6,8]){
   const host=controls(kind);await host.scrollIntoViewIfNeeded();assert(await host.evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1),'日期控件不超视口 '+kind+'/'+width);
  }
  assert(await page.locator('#riskrail').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'风险区无外部横向溢出 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});await controls(0).scrollIntoViewIfNeeded();await board(0).screenshot({path:'outputs/risk-board-dates-1920.png'});
 for(const [day,month] of [['15','8'],['20','9'],['21','10']]){
  await page.clock.setFixedTime(new Date('2026-10-'+day+'T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
  await controls(6).locator('[data-rp-return-mode="month"]').click();
  assert.equal(await controls(6).locator('[data-rp-return-month]').inputValue(),month,'默认最近成熟月 '+day);
  assert.equal(await controls(6).locator('[data-rp-return-month] option').last().getAttribute('value'),month,'未开放月份不可选 '+day);
 }
 console.log('通过：五榜独立控件、移除总日期、库存固定实时、周月成熟区间、期间隔离、榜单/详情继承及宽窄屏。');
}
