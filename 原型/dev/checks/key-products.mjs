import {verifyKeyProductZoom} from './key-products-zoom.mjs';
import {verifyKeyProductTooltip} from './key-products-tooltip.mjs';
import assert from 'node:assert/strict';
export async function keyProducts(page){
 await page.locator('a[href="#matrix"]').click();
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const reset=()=>root.locator('[data-kpm-reset]').click();
 const control=key=>root.locator('[data-kpm-filter="'+key+'"]');
 const ids=()=>root.locator('#matrixtable [data-kpm-detail]').evaluateAll(es=>es.map(e=>e.dataset.kpmDetail));
 let data=await snapshot();const first=data;await verifyKeyProductTooltip(page,first);await verifyKeyProductZoom(page);
 assert.equal(data.period.mode,'recent30');assert.equal(data.rows.length,50);assert.equal(new Set(data.rows.map(p=>p.spuId)).size,50);
 assert.equal(data.grade,'all');assert.equal(data.visible.length,50);
 assert(await root.locator('#matrixchart svg').evaluate(e=>e.getBoundingClientRect().height>=420),'矩阵由280px放大');

 const [high,margin]=[data.thresholds.salesWan,data.thresholds.profitRate];
 for(const p of data.rows){
  const expected=p.facts.sales>0&&Number.isFinite(p.profit)?p.sales>=high?p.profit>=margin?'A':'B':p.profit>=margin?'C':'D':null;
  assert.equal(p.level,expected,'分级使用原始销售额、利润率和含等号阈值');
  if(p.stock&&p.stock.dailyNet15>0){
   assert(Math.abs(p.stock.coverage15-p.stock.warehouse/p.stock.dailyNet15)<1e-8);
   assert.equal(p.stockRisks.includes('stagnant'),p.stock.warehouse>0&&p.stock.coverage15>=60);
   assert.equal(p.stockRisks.includes('shortage'),p.stock.totalCoverage15<30);
   assert.equal(p.stockRisks.includes('transfer'),p.stock.coverage15<=7);
  }
 }
 assert.equal(await root.locator('#matrixchart circle').count(),data.visible.filter(p=>p.level).length);
 assert.equal(await root.locator('#matrixtable th').count(),12);
 assert.equal(await root.locator('#matrixtable .kpm-grade').count(),10);
 assert.deepEqual(await ids(),data.visible.slice(0,10).map(p=>p.spuId));
 for(const grade of ['A','B','C','D']){
  await root.locator('#matrixtabs [data-kpm-grade="'+grade+'"]').click();data=await snapshot();
  assert(data.visible.length>0&&data.visible.every(p=>p.level===grade));
  assert.equal(await root.locator('#matrixchart circle').count(),data.visible.length);
  assert((await root.locator('#matrixtable .kpm-grade b').allTextContents()).every(g=>g===grade));
  await root.locator('#matrixtabs [data-kpm-grade="'+grade+'"]').click();assert.equal((await snapshot()).grade,'all');
 }
 await root.locator('#matrix-product-pager [aria-label="第2页"]').click();assert.equal((await snapshot()).page,2);
 const search=root.locator('[data-kpm-search]'),sample=first.rows[0];
 await search.fill(sample.spuCode.toLowerCase());data=await snapshot();
 assert.equal(data.page,1);assert.deepEqual(data.visible.map(p=>p.spuId),[sample.spuId]);
 await search.press('End');await search.type(' ');assert.equal(await search.inputValue(),sample.spuCode.toLowerCase()+' ','搜索输入持续保留焦点');
 await search.fill(sample.name);assert((await snapshot()).visible.some(p=>p.spuId===sample.spuId));
 await search.fill('没有该产品<test>');assert.equal((await snapshot()).visible.length,0);assert.match(await root.locator('#matrixtable').innerText(),/暂无符合条件/);assert.equal(await root.locator('#matrixchart circle').count(),0);
 await reset();
 const brands=[...new Set(first.rows.map(p=>p.brand))].slice(0,2),cats=[...new Set(first.rows.filter(p=>brands.includes(p.brand)).map(p=>p.category))].slice(0,2);
 await control('brand').selectOption(brands,{force:true});await control('category').selectOption(cats,{force:true});data=await snapshot();
 assert.deepEqual(data.visible.map(p=>p.spuId).sort(),first.rows.filter(p=>brands.includes(p.brand)&&cats.includes(p.category)).map(p=>p.spuId).sort(),'同项多选取并集，跨项取交集');
 const menu=root.locator('[data-pf-multi-label="品牌"]');await menu.locator('summary').click();await menu.locator('input[value="all"]').check();
 assert.equal(await menu.getAttribute('open'),'','多选后保持菜单展开');await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('open'),null);
 await reset();
 for(const risk of ['stagnant','shortage','transfer']){
  await control('risk').selectOption(risk,{force:true});data=await snapshot();assert(data.visible.length>0&&data.visible.every(p=>p.stockRisks.includes(risk)));
 }
 await reset();const channel=first.rows.find(p=>p.channels.length).channels[0];
 await control('channel').selectOption(channel,{force:true});data=await snapshot();assert(data.visible.length&&data.visible.every(p=>p.channels.includes(channel)));
 for(const p of data.visible)assert.equal(p.facts.gmvCents,first.rows.find(a=>a.spuId===p.spuId).facts.gmvCents,'渠道筛选不拆分公司金额');
 await reset();
 for(const key of ['sales','amount','profit','units','returns','warehouse','total','coverage','totalCoverage']){
  const header=root.locator('[data-kpm-sort="'+key+'"]');await header.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'}));await header.click();
  data=await snapshot();const value=p=>({sales:p.facts.gmvCents,amount:p.facts.profitCents,profit:p.profit,units:p.facts.sales,returns:p.facts.returnRate,warehouse:p.stock?.warehouse,total:p.stock?.totalUnits,coverage:p.stock?.coverage15,totalCoverage:p.stock?.totalCoverage15})[key];
  const values=data.visible.map(value).filter(Number.isFinite);
  assert(values.every((n,i)=>!i||(data.sort.direction==='asc'?values[i-1]<=n:values[i-1]>=n)),'全量原值排序 '+key);
  assert.deepEqual(await ids(),data.visible.slice(0,10).map(p=>p.spuId));
  await root.locator('#matrix-product-pager [aria-label="第2页"]').click();data=await snapshot();assert.deepEqual(await ids(),data.visible.slice(10,20).map(p=>p.spuId));
 }
 await reset();await control('brand').selectOption('康佳',{force:true});
 const redCount=Number(await root.locator('.mk-light.red strong').innerText().then(t=>t.replace(/\D/g,'')));
 if(redCount){await root.locator('.mk-light.red').click();assert.equal(Number(await page.locator('#mk-list-pages nav').getAttribute('data-list-total')),redCount,'预警下钻沿用当前品牌及等级范围');await page.locator('#close').click()}
 await reset();data=await snapshot();const chosen=data.visible[0];
 await root.locator('#matrixtable [data-kpm-detail]').first().click();await page.locator('.up-detail').waitFor();
 assert.match(await page.locator('#dialogbody').innerText(),new RegExp(chosen.name));assert.equal(await page.locator('#up-platform').inputValue(),'all');await page.locator('#close').click();
 assert.equal((await snapshot()).visible.length,50);
 await control('brand').selectOption('康佳',{force:true});const scopedIds=(await snapshot()).visible.map(p=>p.spuId);
 await page.locator('.head .nav button').nth(1).evaluate(e=>e.click());
 assert.equal(await page.locator('#department-view').isVisible(),true);assert.equal(await page.locator('#dx-matrixtable table').count(),1);
 assert.equal(await page.locator('#dp-matrix .kpm-tools').count(),0,'产品部不克隆总看板筛选');
 await page.locator('.head .nav button').nth(5).evaluate(e=>e.click());
 assert.equal(await page.locator('#pmx-matrixtable table').count(),1);assert.equal(await page.locator('#pnp-newtable table').count(),1,'采购新品兼容渲染正常');assert.equal(await page.locator('#pb-matrix .kpm-tools').count(),0,'采购不克隆总看板筛选');
 await page.locator('.head .nav button').nth(0).evaluate(e=>e.click());
 assert.deepEqual((await snapshot()).visible.map(p=>p.spuId),scopedIds,'返回总看板保留自身品牌筛选');await reset();
 // 切换期间后等级、经营值重算，最新库存快照保持一致，未销售数据不伪造分级。
 await root.locator('[data-time-mode="year"]').click();await root.locator('[data-time-year]').selectOption('2025');data=await snapshot();
 assert(data.rows.some(p=>!p.level&&p.facts.sales===0));assert.equal(await root.locator('[data-kpm-grade="unrated"]').count(),1);
 for(const p of data.rows)assert.deepEqual(p.stock,first.rows.find(a=>a.spuId===p.spuId).stock,'期间切换不改变公司最新库存');
 await root.locator('#matrixtabs [data-kpm-grade="unrated"]').click();assert((await snapshot()).visible.every(p=>!p.level));
 await root.locator('[data-time-mode="recent30"]').click();await reset();
 for(const width of [1440,1100,390,1920]){
  await page.setViewportSize({width,height:1080});
  assert(await root.evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));
  assert(await root.locator('.matrixlist').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'明细筛选不撑破容器');
  assert(await root.locator('#matrixtable').evaluate(e=>e.scrollWidth>e.clientWidth),'表格仅内部横向滚动');
  assert(await root.locator('#matrixtable tbody tr').first().evaluate(e=>e.cells[0].getBoundingClientRect().right<=e.cells[11].getBoundingClientRect().left+1),'固定产品列与操作列不重叠');
 }
}
