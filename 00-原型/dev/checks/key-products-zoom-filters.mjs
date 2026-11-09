import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import {verifyZoomCategoryClicks} from './key-products-zoom-category.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function verifyZoomFilters(page){
 const main=page.locator('#matrix'),zoom=main.locator('.kpm-chart-zoom'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot()),model=()=>page.evaluate(()=>window.dashboardKeyProductZoomSnapshot());
 const original=await snapshot(),originalPoints=await main.locator('#matrixchart circle').evaluateAll(ns=>ns.map(n=>n.dataset.kpmPoint));
 await main.locator('[data-kpm-expand]').click();const tools=zoom.locator('.kpm-zoom-filters'),control=key=>tools.locator('[data-kpm-zoom-filter="'+key+'"]'),reset=()=>tools.locator('[data-kpm-zoom-reset]').click();
 assert.deepEqual(await tools.locator('[data-kpm-zoom-filter]').evaluateAll(ns=>ns.map(n=>n.dataset.kpmZoomFilter)),['brand','price']);
 const assertFilterLayout=async()=>{
  const layout=await tools.evaluate(host=>{
   const tabs=host.querySelector('.kpm-zoom-scope-tabs').getBoundingClientRect(),fields=[...host.querySelectorAll(':scope>.pf-multi,:scope>.kpm-price-filter')].map(e=>e.getBoundingClientRect());
   return {tabsBottom:tabs.bottom,fields:fields.map(r=>({top:r.top,width:r.width})),first:host.firstElementChild.classList.contains('kpm-zoom-scope-tabs')};
  });
  assert(layout.first&&layout.fields.every(r=>r.top>=layout.tabsBottom+8),'标签在前，品牌与价格筛选在下方');
  if(page.viewportSize().width>600)assert(layout.fields.every(r=>Math.abs(r.width-260)<1),'桌面两项均为260px');
 };
 await assertFilterLayout();
 async function choosePrice(key){const host=tools.locator('[data-kpm-price-host=zoom]'),trigger=host.locator('[data-kpm-price-trigger]');if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();if(key==='custom')await host.locator('[data-kpm-price-min]').focus();else await host.locator('[data-kpm-price-preset="'+key+'"]').click()}
 const all=(await model()).rows;assert.equal(all.length,original.base.length);assert(all.some(r=>r.priceCents>0));
 await verifyZoomCategoryClicks(page,all);
 const check=async expected=>{const data=await model();assert.deepEqual(data.rows.map(r=>r.spuId).sort(),expected.map(r=>r.spuId).sort());assert.deepEqual(data.points.sort(),expected.filter(r=>{const p=original.rows.find(p=>p.spuId===r.spuId);return p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.profitRate)}).map(r=>r.spuId).sort());assert.deepEqual((await snapshot()).filters,original.filters,'放大筛选不回写外层')};
 const brand=all.find(r=>r.level).brand,brands=[...new Set(all.map(r=>r.brand))].slice(0,2);
 const menu=control('brand').locator('..');await menu.locator('[data-pf-multi-trigger]').click();await menu.locator('[data-pf-multi-option][value="'+brand+'"]').check();await check(all.filter(r=>r.brand===brand));await page.keyboard.press('Escape');assert(await zoom.isVisible());
 await control('brand').selectOption(brands,{force:true});await check(all.filter(r=>brands.includes(r.brand)));await reset();
 const chosen=all.find(r=>r.level);await tools.locator('[data-kpm-zoom-scope-filter="category"][data-kpm-scope-value="'+chosen.category+'"]').click();await tools.locator('[data-kpm-zoom-scope-filter="season"][data-kpm-scope-value="'+chosen.season+'"]').click();await check(all.filter(r=>r.category===chosen.category&&r.season===chosen.season));await reset();
 const presets=[['under100',0,10000],['100-200',10000,20000],['200-300',20000,30000],['300-500',30000,50000],['500-1000',50000,100000],['over1000',100000,Infinity]];
 for(const [key,min,max] of presets){await choosePrice(key);await check(all.filter(r=>r.priceCents!==null&&r.priceCents>=min&&r.priceCents<max))}
 await choosePrice('custom');const min=tools.locator('[data-kpm-zoom-min]'),max=tools.locator('[data-kpm-zoom-max]');assert(await min.evaluate(e=>e===document.activeElement));
 const price=chosen.priceCents/100;await min.fill(String(price));await max.fill(String(price));await check(all.filter(r=>r.priceCents===chosen.priceCents));
 await max.fill(String(price-1));assert.match(await tools.locator('.kpm-zoom-price-error').innerText(),/最低价不能高于最高价/);assert.equal((await model()).points.length,0);
 await max.fill('');await check(all.filter(r=>r.priceCents!==null&&r.priceCents>=chosen.priceCents));await min.fill('');await max.fill(String(price));await check(all.filter(r=>r.priceCents!==null&&r.priceCents<=chosen.priceCents));
 await min.fill('-1');assert.match(await tools.locator('.kpm-zoom-price-error').innerText(),/不能为负数/);await reset();await check(all);
 assert.equal(await tools.locator('button:not([data-pf-multi-trigger]):not([data-kpm-price-trigger]):not([data-kpm-price-preset]):not([data-kpm-zoom-scope-filter])').count(),1,'仅保留重置，无确认取消流程');
 await min.evaluate(e=>e.value='');await choosePrice('custom');await min.fill(String(price));await max.fill(String(price));
 await page.keyboard.press('Escape');assert(await zoom.isVisible(),'Esc只关闭价格下拉');
 const dot=zoom.locator('#matrixchart circle').first();await dot.hover();assert(await page.locator('#kpm-point-tooltip [data-kpm-metric="guidePrice"]').isVisible());await dot.click();await page.locator('.up-detail').waitFor();assert(await zoom.isHidden());await page.locator('#close').click();await zoom.waitFor({state:'visible'});await check(all.filter(r=>r.priceCents===chosen.priceCents));assert.equal(await min.inputValue(),String(price));
 await reset();await zoom.screenshot({path:fileURLToPath(new URL('../../outputs/matrix-zoom-filters.png',import.meta.url))});
 for(const width of [1100,390]){await page.setViewportSize({width,height:820});assert(await tools.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'筛选不溢出 '+width);await assertFilterLayout();const m=control('brand').locator('..');await m.locator('[data-pf-multi-trigger]').click();const bounds=await m.locator('.pf-multi-menu').boundingBox(),modal=await zoom.boundingBox();assert(bounds.x>=modal.x&&bounds.x+bounds.width<=modal.x+modal.width+1,'下拉菜单不被裁切');await page.keyboard.press('Escape');assert(await zoom.isVisible());await choosePrice('custom');const priceBox=await tools.locator('[data-kpm-price-panel]').boundingBox();assert(priceBox.x>=modal.x&&priceBox.x+priceBox.width<=modal.x+modal.width+1,'价格下拉在放大弹窗内');await min.click();assert(await min.evaluate(e=>e===document.activeElement));await page.keyboard.press('Escape');assert(await zoom.isVisible())}
 await zoom.locator('[data-kpm-expand]').click();assert.deepEqual(await snapshot(),original,'关闭后完整恢复外层状态');assert.deepEqual(await main.locator('#matrixchart circle').evaluateAll(ns=>ns.map(n=>n.dataset.kpmPoint)),originalPoints,'原图圆点还原');assert.equal(await page.locator('.kpm-zoom-filters').count(),0);
 await page.setViewportSize({width:1920,height:1080});
}

export async function matrixZoomFilters(page){await page.locator('a[href="#matrix"]').click();await clearKeyProductFilters(page);await verifyZoomFilters(page)}
