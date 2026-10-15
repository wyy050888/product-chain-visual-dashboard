import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function detailOperating(page){
 const checkChannelChart=async()=>{
  const bars=await page.locator('.up-channel-gsv li').evaluateAll(es=>es.map(e=>[e.dataset.upChannel,e.querySelector('strong').textContent]));
  const rows=await page.locator('[data-up-panel="operating"] .up-table tbody tr').evaluateAll(es=>es.map(e=>[e.cells[0].textContent,e.cells[1].textContent]));
  assert.deepEqual(bars,rows,'各渠道GSV图与平台表格共用金额');
  assert.equal(bars.length,9,'当前经营渠道包含百度&CID及两类达播，共9项');
 };
 const outer=await page.locator('#time-risk').innerText();
 await page.locator('#riskrail [data-risk="0"]').click();
 // 销量来自原值，并在净销量之前；排序不能按带逗号的显示字符串。
 for(const kind of [0,2,3,6]){
  await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();
  const sales=page.locator('[data-rp-sort="sales"]'),net=page.locator('[data-rp-sort="netSales"]');
  const index=await sales.evaluate(e=>e.closest('th').cellIndex);
  assert.equal(await net.evaluate(e=>e.closest('th').cellIndex),index+1);
  await sales.click();
  const values=await page.locator('.rp-list-table tbody tr').evaluateAll((rows,i)=>rows.map(r=>[r.cells[i],r.cells[i+1]].map(c=>Number(c.querySelector('strong').textContent.replaceAll(',','')))),index);
  assert(values.length>0);assert(values.every(([gross,net])=>Number.isInteger(gross)&&gross>=net));
  assert(values.every((v,i)=>i===0||values[i-1][0]>=v[0]));
 }
 await page.locator('#dialogsub [data-drawer-time-mode="month"]').click();
 await page.locator('#dialogsub [data-drawer-time-value]').selectOption('9');
 await page.locator('[data-drawer-tab="ranking-2"]').click();
 const parentPeriod=await page.locator('#dialogbody').getAttribute('data-ranking-period');
 assert.equal(JSON.parse(parentPeriod).value,9);
 await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
 assert.equal(await page.locator('#dialogtitle').innerText(),'产品详情');
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),'2026-09-01');
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-end'),'2026-09-30');
 assert.equal(await page.locator('#dialogsub [data-drawer-time-value]').inputValue(),'9');
 await page.locator('[data-drawer-tab="operating"]').click();
 const layout=await page.locator('.up-detail').evaluate(root=>({hero:root.querySelector('.up-hero').getBoundingClientRect().bottom,tabs:root.querySelector('.drawer-tabs').getBoundingClientRect().top}));
 assert(layout.hero<=layout.tabs);
 assert.equal(await page.locator('.up-operating-kpis .up-metric').count(),8);
 assert.deepEqual(await page.locator('.up-operating-kpis .up-metric small').allTextContents(),['GSV','销量','去退后销量','消耗','费率','利润率','总退','已收退']);
 assert.deepEqual(await page.locator('.up-operating-comparison .rp-comparison-label').allTextContents(),['环比','环比','环比','环比','环比','环比','偏差','偏差']);
 const overview=await page.locator('.up-operating-overview').evaluate(root=>{
  const left=root.querySelector('.up-operating-kpis').getBoundingClientRect(),right=root.querySelector('.up-attainment').getBoundingClientRect();
  return {leftEnd:left.right,rightStart:right.left,topGap:Math.abs(left.top-right.top)};
 });
 assert(overview.leftEnd<overview.rightStart&&overview.topGap<1,'桌面指标在左，达成在右');
 assert.equal(await page.locator('.up-sales-trend [data-up-series]').count(),3);
 assert.equal(await page.locator('.up-operating-trend [data-up-axis]').count(),1);
 assert.equal(await page.locator('.up-operating-trend [data-up-series] text').count(),0);
 const point=page.locator('[data-up-trend-point]').first();
 await point.hover();
 assert.equal(await page.locator('#up-sales-tooltip').isVisible(),true);
 assert.deepEqual(await page.locator('.up-sales-tooltip-row>span').allTextContents(),['GSV','销量','利润率']);
 assert.equal(await page.locator('.up-sales-tooltip-date').innerText(),await point.getAttribute('data-date'));
 assert.deepEqual(await page.locator('.up-sales-tooltip-row>b').allTextContents(),await point.evaluate(e=>[e.dataset.gsv,e.dataset.sales,e.dataset.margin]));
 await page.mouse.move(0,0);
 assert.equal(await page.locator('#up-sales-tooltip').isVisible(),false);
 assert.equal(await page.locator('[data-up-panel="operating"] .up-table').first().locator('tbody tr').count(),9);
 await checkChannelChart();
 const channelBefore=await page.locator('.up-channel-gsv li').allTextContents();
 await page.locator('[data-up-series-toggle="sales"]').click();
 assert.equal(await page.locator('[data-up-series="sales"]').evaluate(e=>getComputedStyle(e).display),'none');
 await page.locator('[data-up-series-toggle="sales"]').click();
 const before=await page.locator('[data-up-metric="gsv"] strong').innerText();
 await page.locator('#dialogsub [data-drawer-time-day]').click();
 await page.locator('#up-date-trigger').click();
 await page.locator('#up-date-popover [data-up-preset="7"]').click();
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),'2026-10-04');
 assert.equal(await page.locator('.up-detail').getAttribute('data-up-end'),'2026-10-10');
 assert.notEqual(await page.locator('[data-up-metric="gsv"] strong').innerText(),before);
 await checkChannelChart();
 assert.notDeepEqual(await page.locator('.up-channel-gsv li').allTextContents(),channelBefore,'各渠道GSV图随期间更新');
 // 相同结束日、不同开始日：右侧月度达成不变，左侧经营区间改变。
 assert.deepEqual(await page.locator('.up-attainment-primary small').allTextContents(),['10月GSV','10月利润率']);
 assert.equal(await page.locator('.up-attainment .ms-inline-deviation').count(),2);
 const monthlyAttainment=await page.locator('.up-attainment').innerText();
 const sevenDayGsv=await page.locator('[data-up-metric="gsv"] strong').innerText();
 await page.locator('#up-date-trigger').click();
 await page.locator('#up-date-popover [data-up-preset="30"]').click();
 assert.equal(await page.locator('.up-attainment').innerText(),monthlyAttainment);
 assert.notEqual(await page.locator('[data-up-metric="gsv"] strong').innerText(),sevenDayGsv);
 await page.locator('#dialogsub [data-drawer-time-mode="month"]').click();
 assert.equal(await page.locator('.up-attainment-primary strong').first().innerText(),await page.locator('[data-up-metric="gsv"] strong').innerText());
 assert.equal(await page.locator('.up-attainment-primary strong').first().innerText(),monthlyAttainment.split('\n').find(v=>/w|元/.test(v)));
 await page.locator('#dialogsub [data-drawer-time-day]').click();
 await page.locator('#up-date-trigger').click();
 await page.locator('#up-date-popover [data-up-preset="7"]').click();
 await page.locator('#up-date-trigger').click();await page.keyboard.press('Escape');
 assert.equal(await page.locator('#up-date-popover').count(),0);assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),false);
 // 改期间后平台切换仍保留日期，处理草稿按原范围保存。
 await page.locator('[data-drawer-tab="handling"]').click();
 await page.locator('[data-todo-tab="suggestions"]').click();
 await page.locator('[data-todo-open="assign"]').first().click();
 await page.locator('.up-todo-dialog [name="plan"]').fill('此为验证草稿，切换标签后应完整保留内容');
 await page.keyboard.press('Escape');
 await page.locator('[data-drawer-tab="quality"]').click();
 assert.equal(await page.locator('[data-up-panel="quality"] #up-quality-target').count(),0);
 await page.locator('[data-drawer-tab="handling"]').click();
 await page.locator('[data-todo-open="assign"]').first().click();
 assert.match(await page.locator('.up-todo-dialog [name="plan"]').inputValue(),/验证草稿/);
 await page.keyboard.press('Escape');
 await page.locator('[data-drawer-tab="operating"]').click();
 for(const width of [1920,1100,390]){
  await page.setViewportSize({width,height:1080});
  const bounds=await page.locator('#dialog').boundingBox();assert(bounds.x>=-1&&bounds.width<=width+1);
  const overflow=await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false,'详情横向溢出 '+width);
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
