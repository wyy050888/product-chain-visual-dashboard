import {verifyKeyProductNetSales} from './key-products-net-sales.mjs';
import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import {verifyGradeHelp} from './key-products-help.mjs';
import {verifyKeyProductScope} from './key-products-scope.mjs';
import {verifyKeyProductDropdowns} from './key-products-dropdowns.mjs';
import {verifyKeyProductDetail} from './key-products-detail.mjs';
import {verifyKeyProductChart} from './key-products-chart.mjs';
import {verifyKeyProductGrades} from './key-products-grades.mjs';
import {verifyKeyProductZoom} from './key-products-zoom.mjs';
import {verifyKeyProductTooltip} from './key-products-tooltip.mjs';
import {verifyKeyProductScopeTabs} from './key-products-scope-tabs.mjs';
import assert from 'node:assert/strict';
export async function keyProducts(page){
 // 既有分级样例按10月10日验算，动态截止日另有专项。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('a[href="#matrix"]').click();
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const reset=()=>clearKeyProductFilters(page);
 const control=key=>root.locator('[data-kpm-filter="'+key+'"]');
 const ids=()=>root.locator('#matrixtable [data-kpm-detail]').evaluateAll(es=>es.map(e=>e.dataset.kpmDetail));
 const defaults=await snapshot();
 assert.deepEqual(defaults.sort,{key:'sales',direction:'desc'},'初始默认GSV降序');
 assert(defaults.visible.every((row,i,rows)=>!i||rows[i-1].facts.gsvCents>=row.facts.gsvCents),'按全量GSV原始金额降序后分页');
 assert.equal(await root.locator('[data-kpm-sort="sales"]').getAttribute('data-direction'),'desc');
 await verifyKeyProductNetSales(page);
 const alternate=root.locator('[data-kpm-sort="units"]');
 for(let i=0;i<3;i++)await alternate.click();
 assert.deepEqual((await snapshot()).sort,defaults.sort,'其他列第三次恢复GSV降序');
 assert.deepEqual((await snapshot()).visible.map(row=>row.spuId),defaults.visible.map(row=>row.spuId),'恢复默认同时恢复实际顺序');
 await root.locator('[data-kpm-sort="sales"]').click();await root.locator('[data-kpm-sort="sales"]').click();
 assert.deepEqual((await snapshot()).sort,defaults.sort,'GSV列升序后恢复降序');
 await alternate.click();await reset();assert.deepEqual((await snapshot()).sort,defaults.sort,'重置恢复GSV降序');

 await verifyGradeHelp(page);
 await verifyKeyProductScopeTabs(page);
 await verifyKeyProductDropdowns(page);
 let data=await snapshot();const first=data;await verifyKeyProductDetail(page);await verifyKeyProductChart(page);await verifyKeyProductTooltip(page,first);await verifyKeyProductZoom(page);
 assert.equal(data.period.mode,'day');assert.equal(data.rows.length,50);assert.equal(new Set(data.rows.map(p=>p.spuId)).size,50);
 assert.equal(data.grade,'all');assert.equal(data.visible.length,50);
 assert(await root.locator('#matrixchart svg').evaluate(e=>{
  const box=e.getBoundingClientRect(),origin=new DOMPoint(0,0).matrixTransform(e.getScreenCTM());
  return Math.abs(origin.y-box.top)<1&&box.height>250;
 }),'普通矩阵按比例适配高度，不产生顶部居中留白');

 assert.match(await root.locator('[data-kpm-sort="sales"]').innerText(),/^GSV/);
 assert.match(await root.locator('.kpm-axis-gsv').textContent(),/^GSV（w）$/);
 assert.equal(await root.locator('#matrixtable .kpm-value-gsv').first().evaluate(e=>getComputedStyle(e).color),await root.locator('#matrixtable [data-kpm-metric="units"] strong').first().evaluate(e=>getComputedStyle(e).color),'GSV主值与普通指标同色');
 for(const p of data.rows){
  assert.equal(p.facts.gsvCents,p.facts.gmvCents-p.facts.refundCents,'GSV使用扣退台账值');assert.equal(p.sales,p.facts.gsvCents/1000000);
  const a=p.assessment.current,factor=data.period.mode==='year'?12:data.period.mode==='quarter'?3:1,amount=a.gsvCents/1000000/factor,rate=a.profitRate;
  const expected=a.sales>0&&Number.isFinite(rate)?amount>600&&rate>12?'S':amount>300&&rate<12?'A':amount>=60&&amount<=300&&rate>15?'B':amount<60&&rate<12?'C':null:null;
  assert.equal(p.level,expected,'按所选周期换算月销门槛，空档未分级');
  if(p.stock&&p.stock.dailyNet15>0){
   assert(Math.abs(p.stock.coverage15-p.stock.warehouse/p.stock.dailyNet15)<1e-8);
   assert.equal(p.stockRisks.includes('stagnant'),p.stock.warehouse>0&&p.stock.coverage15>=60);
   assert.equal(p.stockRisks.includes('shortage'),p.stock.totalCoverage15<30);
   assert.equal(p.stockRisks.includes('transfer'),p.stock.coverage15<=7);
  }
 }
 assert.equal(await root.locator('#matrixchart circle').count(),data.base.filter(p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate)).length);
 assert.equal(await root.locator('#matrixtable th').count(),11);
 assert.equal(await root.locator('#matrixtable .kpm-grade').count(),10);
 assert.deepEqual(await ids(),data.visible.slice(0,10).map(p=>p.spuId));
 for(const grade of ['S','A','B','C']){
  await root.locator('[data-kpm-grade="'+grade+'"]').click();data=await snapshot();
  assert(data.visible.length>0&&data.visible.every(p=>p.level===grade));
  assert.equal(await root.locator('#matrixchart circle').count(),data.base.filter(p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate)).length);await verifyKeyProductChart(page);
  assert((await root.locator('#matrixtable .kpm-grade b').allTextContents()).every(g=>g===grade));
  await root.locator('[data-kpm-grade="'+grade+'"]').click();assert.equal((await snapshot()).grade,'all');
 }
 await verifyKeyProductGrades(page,first);
 await root.locator('#matrix-product-pager [aria-label="第2页"]').click();assert.equal((await snapshot()).page,2);
 const search=root.locator('[data-kpm-search]'),sample=first.rows[0];
 await search.fill(sample.spuCode.toLowerCase());data=await snapshot();
 assert.equal(data.page,1);assert.deepEqual(data.visible.map(p=>p.spuId),[sample.spuId]);
 await search.press('End');await search.type(' ');assert.equal(await search.inputValue(),sample.spuCode.toLowerCase()+' ','搜索输入持续保留焦点');
 await search.fill(sample.name);assert((await snapshot()).visible.some(p=>p.spuId===sample.spuId));
 await search.fill('没有该产品<test>');assert.equal((await snapshot()).visible.length,0);assert.match(await root.locator('#matrixtable').innerText(),/暂无符合条件/);assert.equal(await root.locator('#matrixchart circle').count(),0);
 await reset();
 const brands=[...new Set(first.rows.map(p=>p.brand))].slice(0,2),cats=[...new Set(first.rows.filter(p=>brands.includes(p.brand)).map(p=>p.category))].slice(0,2);
 await control('brand').selectOption(brands,{force:true});for(const category of cats)await root.locator(`[data-kpm-scope-filter="category"][data-kpm-scope-value="${category}"]`).click();data=await snapshot();
 assert.deepEqual(data.visible.map(p=>p.spuId).sort(),first.rows.filter(p=>brands.includes(p.brand)&&cats.includes(p.category)).map(p=>p.spuId).sort(),'同项多选取并集，跨项取交集');
 const menu=root.locator('[data-pf-multi-label="品牌"]');await menu.locator('summary').click();await menu.locator('input[value="all"]').check();
 assert.equal(await menu.getAttribute('open'),'','多选后保持菜单展开');await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('open'),null);
 await reset();
 for(const season of ['夏季品','冬季品','四季品']){await root.locator(`[data-kpm-scope-filter="season"][data-kpm-scope-value="${season}"]`).click();data=await snapshot();assert(data.visible.length&&data.visible.every(p=>p.season===season));await reset()}
 for(const key of ['sales','profit','units','returns','received','total','warehouse']){
  const header=root.locator('[data-kpm-sort="'+key+'"]');await header.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'}));await header.click();
  data=await snapshot();const value=p=>({sales:p.facts.gsvCents,amount:p.facts.profitCents,profit:p.profit,units:p.facts.netSales,returns:p.facts.returnRate,received:p.facts.receivedRate,warehouse:p.stock?.warehouse,total:p.stock?.totalUnits,coverage:p.stock?.coverage15,totalCoverage:p.stock?.totalCoverage15})[key];
  const values=data.visible.map(value).filter(Number.isFinite);
  assert(values.every((n,i)=>!i||(data.sort.direction==='asc'?values[i-1]<=n:values[i-1]>=n)),'全量原值排序 '+key);
  assert.deepEqual(await ids(),data.visible.slice(0,10).map(p=>p.spuId));
  await root.locator('#matrix-product-pager [aria-label="第2页"]').click();data=await snapshot();assert.deepEqual(await ids(),data.visible.slice(10,20).map(p=>p.spuId));
 }
 await reset();await control('brand').selectOption('康佳',{force:true});
 const management=await page.evaluate(()=>window.dashboardKeyProductManagementSnapshot());assert.equal(management.baseIds.length,(await snapshot()).visible.length,'经营面板同步产品筛选');
 await reset();data=await snapshot();const chosen=data.visible[0];
 const tableGsv=await root.locator('#matrixtable .kpm-value-gsv').first().innerText();
 await root.locator('#matrixtable [data-kpm-detail]').first().click();await page.locator('.up-detail').waitFor();
 assert.equal(await page.locator('[data-up-metric="gsv"] strong').innerText(),tableGsv,'关键产品表格与统一详情采用同一GSV金额');
 assert.match(await page.locator('#dialogbody').innerText(),new RegExp(chosen.name));assert.equal(await page.locator('#up-platform').inputValue(),'all');await page.locator('#close').click();
 assert.equal((await snapshot()).visible.length,50);
 // 部门已使用独立入口，跨页行为由pageEntries/productCenter专项覆盖。
 // 切换期间后等级、经营值重算，最新库存快照保持一致，未销售数据不伪造分级。
 await root.locator('[data-time-mode="year"]').click();await verifyKeyProductChart(page);await root.locator('[data-time-year]').selectOption('2025');data=await snapshot();await verifyKeyProductChart(page);
 assert(data.rows.some(p=>!p.level&&p.facts.sales===0));assert.equal(await root.locator('[data-kpm-grade="unrated"]').count(),0);
 for(const p of data.rows)assert.deepEqual(p.stock,first.rows.find(a=>a.spuId===p.spuId).stock,'期间切换不改变公司最新库存');
 assert(data.visible.some(p=>!p.level),'全部明细保留未分级产品');
 await root.locator('[data-time-mode="day"]').click();await reset();
 for(const width of [1440,1100,390,1920]){
  await page.setViewportSize({width,height:1080});
  assert(await root.evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));
  assert(await root.locator('.matrixlist').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'明细筛选不撑破容器');
  if(width<1740)assert(await root.locator('#matrixtable').evaluate(e=>e.scrollWidth>e.clientWidth),'窄屏表格仅内部横向滚动');
  else assert(await root.locator('#matrixtable').evaluate(e=>e.querySelector('table').getBoundingClientRect().width<=e.clientWidth+1),'桌面全宽可直接展示全部列');
  assert(await root.locator('#matrixtable tbody tr').first().evaluate(e=>e.cells[0].getBoundingClientRect().right<=e.cells[e.cells.length-1].getBoundingClientRect().left+1),'固定产品列与操作列不重叠');
 }
 await verifyKeyProductScope(page);
}
