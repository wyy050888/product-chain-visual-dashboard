import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function keyProductPrice(page){
 await page.locator('a[href="#matrix"]').click();const main=page.locator('#matrix'),model=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());await clearKeyProductFilters(page);
 const price=scope=>page.locator('[data-kpm-price-host="'+scope+'"]'),mode=scope=>price(scope).locator('[data-kpm-price-mode]'),min=scope=>price(scope).locator('[data-kpm-price-min]'),max=scope=>price(scope).locator('[data-kpm-price-max]');
 async function choose(scope,key){const host=price(scope);if(await host.locator('[data-kpm-price-trigger]').getAttribute('aria-expanded')!=='true')await host.locator('[data-kpm-price-trigger]').click();if(key==='custom')await min(scope).focus();else await host.locator('[data-kpm-price-preset="'+key+'"]').click()}
 const toolsHeight=await main.locator('.kpm-tools').evaluate(e=>e.getBoundingClientRect().height);
 const original=await model(),all=original.rows,options=['all','under100','100-200','200-300','300-500','500-1000','over1000','custom'];
 assert.deepEqual(await mode('main').locator('option').evaluateAll(ns=>ns.map(n=>n.value)),options);
 async function checkMain(expected){const s=await model();assert.deepEqual(s.visible.map(p=>p.spuId).sort(),expected.map(p=>p.spuId).sort());assert.equal(s.page,1);assert.equal(await main.locator('#matrixchart circle').count(),expected.filter(p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate)).length);assert.equal((await page.evaluate(()=>window.dashboardKeyProductManagementSnapshot())).baseIds.length,expected.length)}
 const bands=[['under100',0,10000],['100-200',10000,20000],['200-300',20000,30000],['300-500',30000,50000],['500-1000',50000,100000],['over1000',100000,Infinity]];
 for(const [key,lower,upper] of bands){await choose('main',key);await checkMain(all.filter(p=>p.priceCents!==null&&p.priceCents>=lower&&p.priceCents<upper))}
 const chosen=all.find(p=>p.level==='A'&&p.priceCents>0),cents=chosen.priceCents,amount=String(cents/100);
 await choose('main','custom');assert(await min('main').evaluate(e=>e===document.activeElement));await min('main').fill(amount);await max('main').fill(amount);await checkMain(all.filter(p=>p.priceCents===cents));assert.equal(await main.locator('.kpm-tools').evaluate(e=>e.getBoundingClientRect().height),toolsHeight,'自定义输入不占用外部筛选行');assert(await max('main').evaluate(e=>e===document.activeElement),'输入更新列表不丢焦点');
 await max('main').fill(String(cents/100-1));assert.match(await price('main').locator('.kpm-price-error').innerText(),/最低价不能高于最高价/);await checkMain([]);
 await max('main').fill('');await checkMain(all.filter(p=>p.priceCents!==null&&p.priceCents>=cents));await min('main').fill('');await max('main').fill(amount);await checkMain(all.filter(p=>p.priceCents!==null&&p.priceCents<=cents));
 await min('main').fill('-1');assert.match(await price('main').locator('.kpm-price-error').innerText(),/不能为负数/);await min('main').fill(amount);
 const mainBefore=await model();await main.locator('[data-kpm-expand]').click();assert.deepEqual(await mode('zoom').locator('option').evaluateAll(ns=>ns.map(n=>n.value)),options);assert.equal(await mode('zoom').inputValue(),'custom');assert.equal(await min('zoom').inputValue(),amount);
 assert.deepEqual((await page.evaluate(()=>window.dashboardKeyProductZoomSnapshot())).rows.map(p=>p.spuId).sort(),mainBefore.visible.map(p=>p.spuId).sort());await choose('zoom','all');assert.equal((await page.evaluate(()=>window.dashboardKeyProductZoomSnapshot())).rows.length,all.length);await page.locator('.kpm-chart-zoom [data-kpm-expand]').click();assert.deepEqual(await model(),mainBefore,'放大局部价格不修改外层');
 await main.locator('[data-kpm-management-pick="grade-A"]').click();const drawer=page.locator('.kpm-management-drawer');await drawer.waitFor();assert.deepEqual(await mode('drawer').locator('option').evaluateAll(ns=>ns.map(n=>n.value)),options);assert.equal(await mode('drawer').inputValue(),'custom');assert.equal(await min('drawer').inputValue(),amount);
 const gradeRows=all.filter(p=>p.level==='A');const visibleIds=()=>drawer.locator('[data-kpm-list-spu]').evaluateAll(ns=>ns.map(n=>n.dataset.kpmListSpu));
 async function checkDrawer(expected){
  const pager=drawer.locator('.kpm-management-list-pager .list-pagination'),pages=Number(await pager.getAttribute('data-list-pages')),ids=[];
  assert.equal(Number(await pager.getAttribute('data-list-total')),expected.length);
  for(let number=1;number<=pages;number++){
   if(number>1)await pager.locator('[data-list-page="'+number+'"]:not(.list-page-arrow)').click();
   ids.push(...await visibleIds());
  }
  assert.deepEqual(ids.sort(),expected.map(p=>p.spuId).sort());
  assert.equal(await page.locator('.kpm-management-heading-count').innerText(),expected.length+'个');
  if(pages>1)await pager.locator('[data-list-page="1"]:not(.list-page-arrow)').click();
 }
 await checkDrawer(gradeRows.filter(p=>p.priceCents===cents));await choose('drawer','all');await checkDrawer(gradeRows);
 for(const [key,lower,upper] of bands){await choose('drawer',key);await checkDrawer(gradeRows.filter(p=>p.priceCents!==null&&p.priceCents>=lower&&p.priceCents<upper))}
 await choose('drawer','custom');await min('drawer').fill(amount);await max('drawer').fill(amount);await checkDrawer(gradeRows.filter(p=>p.priceCents===cents));
 await max('drawer').fill(String(cents/100-1));assert.match(await price('drawer').locator('.kpm-price-error').innerText(),/最低价不能高于最高价/);await checkDrawer([]);await max('drawer').fill(amount);
 await page.locator('.kpm-management-period-picker [data-drawer-time-mode="year"]').click();assert.equal(await min('drawer').inputValue(),amount);assert.equal(await mode('drawer').inputValue(),'custom');
 await drawer.locator('[data-kpm-list-detail]').first().click();await page.locator('.up-detail').waitFor();await page.locator('#close').click();await drawer.waitFor();assert.equal(await mode('drawer').inputValue(),'custom');assert.equal(await max('drawer').inputValue(),amount);assert(await page.locator('#drawer-tabs').isHidden());
 await price('drawer').locator('[data-kpm-price-trigger]').click();assert(await price('drawer').locator('[data-kpm-price-panel]').isVisible());
 await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/product-drawer-price-filter.png',import.meta.url))});
 await drawer.locator('[data-kpm-list-reset]').click();assert.equal(await mode('drawer').inputValue(),'all');assert.equal(await min('drawer').inputValue(),'');assert.equal(await max('drawer').inputValue(),'');
 await page.locator('#close').click();assert.deepEqual((await model()).filters,mainBefore.filters);assert.deepEqual((await model()).period,mainBefore.period);
 for(const width of [1920,1100,390]){await page.setViewportSize({width,height:1080});assert(await main.locator('.kpm-tools').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'自定义价格不撑破列表 '+width);await price('main').locator('[data-kpm-price-trigger]').click();const box=await price('main').locator('[data-kpm-price-panel]').boundingBox();assert(box.x>=0&&box.x+box.width<=width,'价格下拉在视口内 '+width);await max('main').click();assert(await max('main').evaluate(e=>e===document.activeElement),'输入框可点击 '+width);await page.keyboard.press('Escape');assert(await price('main').locator('[data-kpm-price-panel]').isHidden());assert.equal(await max('main').inputValue(),amount)}
 await page.setViewportSize({width:1920,height:1080});await price('main').locator('[data-kpm-price-trigger]').click();await main.locator('.matrixlist').screenshot({path:fileURLToPath(new URL('../../outputs/key-products-price-filter.png',import.meta.url))});
 await clearKeyProductFilters(page);await checkMain(all);assert.equal(await mode('main').inputValue(),'all');assert.equal(await min('main').inputValue(),'');assert.equal(await max('main').inputValue(),'');assert(await price('main').locator('.kpm-price-custom').isHidden());
 // 与品牌、类目、季品、分级条件叠加，不改变各字段语义。
 await main.locator('[data-kpm-filter="brand"]').selectOption([chosen.brand],{force:true});await choose('main','custom');await min('main').fill(amount);await max('main').fill(amount);await checkMain(all.filter(p=>p.brand===chosen.brand&&p.priceCents===cents));await clearKeyProductFilters(page);
}
