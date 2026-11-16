import {verifyChannelContribution} from './detail-channel-contribution.mjs';
import {operatingEnhancements} from './detail-operating-enhancements.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function detailOperating(page){
 // 固定经营曲线样例的截止日，保留逐日汇总断言。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 const outer=await page.locator('#time-risk').innerText();
 await page.locator('#riskrail [data-risk="0"]').click();
 // 榜单只显示去退后销量，排序使用数值。
 for(const kind of [0,2,3,6]){
  await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();
  assert.equal(await page.locator('[data-rp-sort="sales"]').count(),0);
  const net=page.locator('[data-rp-sort="netSales"]');
  const index=await net.evaluate(e=>e.closest('th').cellIndex);
  await net.click();
  const values=await page.locator('.rp-list-table tbody tr').evaluateAll((rows,i)=>rows.flatMap(row=>{
   const text=row.cells[i].querySelector('strong')?.textContent.replaceAll(',','')||'';
   const value=parseFloat(text)*(text.endsWith('w')?10000:1);
   return Number.isFinite(value)?[value]:[];
  }),index);
  assert(values.length>0&&values.every((value,i)=>i===0||values[i-1]>=value));
 }
 await page.locator('[data-drawer-tab="ranking-2"]').click();
 await page.locator('#dialogsub [data-drawer-time-mode="month"]').click();
 await page.locator('#dialogsub [data-drawer-time-value]').selectOption('9');
 const parentPeriod=await page.locator('#dialogbody').getAttribute('data-ranking-period');
 assert.equal(JSON.parse(parentPeriod).value,9);
 await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
 assert.equal(await page.locator('#dialogtitle').innerText(),'产品详情');
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),'2026-09-01');
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-end'),'2026-09-30');
 assert.equal(await page.locator('.up-detail-period [data-drawer-time-value]').inputValue(),'9');
 await page.locator('[data-drawer-tab="operating"]').click();
 const layout=await page.locator('.up-detail').evaluate(root=>({hero:root.querySelector('.up-hero').getBoundingClientRect().bottom,tabs:root.querySelector('.drawer-tabs').getBoundingClientRect().top}));
 assert(layout.hero<=layout.tabs);
 assert.deepEqual(await page.locator('.up-operating-kpis .up-metric small').allTextContents(),['GSV','去退后销量','消耗','利润率','总退','已收退']);
 assert.deepEqual(await page.locator('.up-operating-comparison .rp-comparison-label').allTextContents(),['环比','环比','环比','环比','偏差','偏差']);
 assert.equal(await page.locator('.up-attainment').count(),0);
 assert.equal(await page.locator('.up-sales-trend [data-up-series]').count(),3);
 assert.equal(await page.locator('.up-operating-trend [data-up-axis]').count(),2);
 assert.equal(await page.locator('.up-operating-trend [data-up-series] text').count(),0);
 assert.equal(await page.locator('.up-operating-trend h3').count(),0);
 assert.equal(await page.locator('.up-operating-trend [data-up-series-toggle]').count(),3);
 const point=page.locator('[data-up-trend-point]').first();
 await point.hover();
 assert.equal(await page.locator('#up-sales-tooltip').isVisible(),true);
 assert.deepEqual(await page.locator('.up-sales-tooltip-row>span').allTextContents(),['GSV','销量','利润率']);
 assert.equal(await page.locator('.up-sales-tooltip-date').innerText(),(await point.getAttribute('data-date')).slice(2).replaceAll('-','/'));
 assert.deepEqual(await page.locator('.up-sales-tooltip-row>b').allTextContents(),await point.evaluate(e=>[e.dataset.gsv,e.dataset.sales,e.dataset.margin]));
 assert.match(await page.locator('.up-sales-tooltip-row>b').first().innerText(),/^[\d,]+\.\d万元$/);
 await page.mouse.move(0,0);
  await page.locator('#up-sales-tooltip').waitFor({state:'hidden'});
 assert.equal(await page.locator('[data-up-panel="operating"] .up-table').first().locator('tbody tr').count(),6);
 await verifyChannelContribution(page);await operatingEnhancements(page);
 const channelFacts=()=>page.locator('.up-channel-contribution li').evaluateAll(es=>es.map(e=>[e.dataset.upContributionChannel,e.dataset.gsvCents,e.dataset.profitCents]));
 const channelBefore=await channelFacts();
 await page.locator('[data-up-series-toggle="sales"]').click();
 assert.equal(await page.locator('[data-up-series="sales"]').evaluate(e=>getComputedStyle(e).display),'none');
 await page.locator('[data-up-series-toggle="sales"]').click();
 const before=await page.locator('[data-up-metric="gsv"] strong').innerText();
 await page.locator('.up-detail-period [data-drawer-time-day]').click();
 await page.locator('#up-date-trigger').click();
 await page.locator('#up-date-popover [data-range-preset="7"]').click();
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),'2026-10-04');
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-end'),'2026-10-10');
 assert.notEqual(await page.locator('[data-up-metric="gsv"] strong').innerText(),before);
 await verifyChannelContribution(page);
 // 渠道金额改变时占比可以相同；校验底层金额更新，不要求格式化百分比一定变化。
 assert.notDeepEqual(await channelFacts(),channelBefore,'各渠道贡献图金额随期间更新');
 // 相同结束日、不同开始日，经营指标按实际筛选区间更新。
 const sevenDayGsv=await page.locator('[data-up-metric="gsv"] strong').innerText();
 await page.locator('#up-date-trigger').click();
 await page.locator('#up-date-popover [data-range-preset="30"]').click();
 assert.equal(await page.locator('.up-grade-trend').getAttribute('data-grade-mode'),'month');
 assert.equal(await page.locator('.up-grade-trend [data-up-grade-tick]').last().textContent(),'2026/10','跨月日范围的趋势定位结束日所在月');
 assert.notEqual(await page.locator('[data-up-metric="gsv"] strong').innerText(),sevenDayGsv);
 await page.locator('#up-date-trigger').click();
 await page.locator('#up-date-popover [data-range-preset="7"]').click();
 await page.locator('#up-date-trigger').click();await page.keyboard.press('Escape');
 assert.equal(await page.locator('#up-date-popover').count(),0);assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),false);
 // 剩余页签正常切换，详情不再提供风险待办。
 assert.equal(await page.locator('[data-drawer-tab="handling"],[data-up-panel="handling"]').count(),0);
 await page.locator('[data-drawer-tab="quality"]').click();
 assert.equal(await page.locator('[data-up-panel="quality"] #up-quality-target').count(),0);
 await page.locator('[data-drawer-tab="stock"]').click();
 await page.locator('[data-drawer-tab="operating"]').click();
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),'2026-10-04');
 for(const width of [1920,1100,390]){
  await page.setViewportSize({width,height:1080});
  const bounds=await page.locator('#dialog').boundingBox();assert(bounds.x>=-1&&bounds.width<=width+1);
  const overflow=await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false,'详情横向溢出 '+width);
  const grid=await page.locator('.up-operating-kpis .up-metrics').evaluate(root=>{
   const cells=[...root.children].map(cell=>cell.getBoundingClientRect());
   const cards=root.getBoundingClientRect(),trend=root.closest('.up-operating-overview').querySelector('.up-operating-trend').getBoundingClientRect();
   return {columns:getComputedStyle(root).gridTemplateColumns.split(' ').length,rows:new Set(cells.map(cell=>cell.top)).size,
    widths:cells.map(cell=>cell.width),cards:cards.toJSON(),trend:trend.toJSON()};
  });
  assert.equal(grid.columns,2);assert.equal(grid.rows,3);
  assert(grid.widths.every(value=>Math.abs(value-grid.widths[0])<1),'指标卡等宽');
  if(width>=1100){
   assert(grid.cards.right<grid.trend.left&&Math.abs(grid.cards.top-grid.trend.top)<1,'趋势图与指标左右并排');
   assert(grid.cards.width<=410&&grid.trend.width>grid.cards.width,'卡片加宽后，趋势图仍占用较多空间');
  }else assert(grid.cards.bottom<grid.trend.top,'窄屏时趋势图排在指标下方');
  await page.waitForFunction(()=>{
   const host=document.querySelector('.up-operating-overview .up-trend-scroll'),svg=host.querySelector('svg'),box=svg.viewBox.baseVal;
   return box.width===Math.max(450,host.clientWidth)&&box.height===host.clientHeight;
  });
  if(width>=1100){
   const plot=await page.locator('.up-operating-trend svg').evaluate(svg=>{
    const line=svg.querySelector('line'),box=svg.getBoundingClientRect(),matrix=svg.getScreenCTM();
    return {left:matrix.e+line.x1.baseVal.value*matrix.a-box.left,right:box.right-matrix.e-line.x2.baseVal.value*matrix.a};
   });
   assert(plot.left<=49&&plot.right<=59,'折线铺满右侧，仅给刻度预留空间');
  }
 }
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/detail-operating.png',import.meta.url))});
 await page.locator('.drawer-back').click();
 assert.equal(await page.locator('#dialogbody').getAttribute('data-ranking-period'),parentPeriod);
 assert.equal(await page.locator('#dialogsub [data-drawer-time-value]').inputValue(),'9');
 await page.locator('#dialogsub [data-drawer-time-mode="year"]').click();
 await page.locator('#dialogsub [data-drawer-time-year]').selectOption('2025');
 assert.equal(JSON.parse(await page.locator('#dialogbody').getAttribute('data-ranking-period')).year,2025);
 await page.locator('#close').click();
 assert.equal(await page.locator('#time-risk').innerText(),outer);
 // 再次打开使用外侧期间，控件与标签只有一份。
 await page.locator('#riskrail [data-risk="0"]').click();
 assert.equal(JSON.parse(await page.locator('#dialogbody').getAttribute('data-ranking-period')).mode,'day');
 assert.equal(await page.locator('#drawer-tabs').count(),1);
 await page.locator('#close').click();
}
