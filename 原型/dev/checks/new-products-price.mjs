import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {verifyNewProductOverview} from './new-products-overview.mjs';
export async function verifyNewProductPrices(page){
 const snapshot=()=>page.evaluate(()=>window.dashboardNewProductsSnapshot()),initial=await snapshot(),rows=initial.rows.filter(p=>p.inNewPool);
 const host=page.locator('[data-kpm-price-host=new]'),trigger=host.locator('[data-kpm-price-trigger]'),panel=host.locator('[data-kpm-price-panel]'),min=host.locator('[data-kpm-price-min]'),max=host.locator('[data-kpm-price-max]');
 const choose=async key=>{if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();await host.locator('[data-kpm-price-preset="'+key+'"]').click()};
 const check=async expected=>{const s=await snapshot();assert.deepEqual(s.visible.map(p=>p.spuId).sort(),expected.map(p=>p.spuId).sort());assert.equal(await page.locator('#newcount .list-pagination').getAttribute('data-list-current'),'1');await verifyNewProductOverview(page)};
 assert.match(await page.locator('.nsp-price-distribution h3').innerText(),/^新品价格带分布$/);
 const counts=await page.locator('[data-nsp-price] strong').allTextContents();
 for(const [key,lower,upper] of [['under100',0,10000],['100-300',10000,30000],['300-500',30000,50000],['500-1000',50000,100000],['over1000',100000,Infinity]]){
  const expected=rows.filter(p=>Number.isFinite(p.priceCents)&&p.priceCents>=lower&&p.priceCents<upper);
  await choose(key);await check(expected);assert.equal(await page.locator('[data-nsp-price="'+key+'"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(await page.locator('[data-nsp-price] strong').allTextContents(),counts,'切换价格时其他档位个数保持可见');
  await page.locator('[data-nsp-price="'+key+'"]').click();await check(rows);
  await page.locator('[data-nsp-price="'+key+'"]').click();await check(expected);assert.equal(await host.locator('[data-kpm-price-mode]').inputValue(),key,'分布点击同步下拉');
  await choose('all');
 }
 const chosen=rows.find(p=>p.priceCents>0),amount=String(chosen.priceCents/100),height=await page.locator('#new-linked-filter').evaluate(e=>e.clientHeight);
 await trigger.click();await min.fill(amount);await max.fill(amount);await check(rows.filter(p=>p.priceCents===chosen.priceCents));
 assert.equal(await page.locator('#new-linked-filter').evaluate(e=>e.clientHeight),height,'自定义区间不增加筛选行');assert(await max.evaluate(e=>e===document.activeElement));
 await max.fill(String(Number(amount)-1));await check([]);assert.match(await host.locator('.kpm-price-error').innerText(),/最低价不能高于最高价/);
 await max.fill('');await check(rows.filter(p=>Number.isFinite(p.priceCents)&&p.priceCents>=chosen.priceCents));
 await min.fill('');await max.fill(amount);await check(rows.filter(p=>Number.isFinite(p.priceCents)&&p.priceCents<=chosen.priceCents));
 await min.fill(amount);await page.keyboard.press('Escape');assert(await panel.isHidden());
 await page.locator('[data-nsp-filter="brand"]').selectOption(chosen.brand,{force:true});await check(rows.filter(p=>p.brand===chosen.brand&&p.priceCents===chosen.priceCents));
 await page.locator('[data-nsp-filter="brand"]').selectOption('all',{force:true});
 await page.locator('#newtable [data-nsp-view]').first().click();await page.locator('.up-detail').waitFor();await page.locator('#close').click();assert.equal((await snapshot()).filters.min,amount,'返回详情保留价格筛选');
 for(const mode of ['year','quarter']){await page.locator('#time-new [data-time-mode="'+mode+'"]').click();const s=await snapshot();await check(s.rows.filter(p=>p.inNewPool&&p.priceCents===chosen.priceCents));assert.equal(s.filters.price,'custom')}
 await choose('all');await page.locator('#time-new [data-time-value]').selectOption('3',{force:true});await choose('500-1000');const q3=await snapshot();await check(q3.rows.filter(p=>p.inNewPool&&p.priceCents>=50000&&p.priceCents<100000));
 await choose('all');await page.locator('#time-new [data-time-value]').selectOption('4',{force:true});await check(rows);
 for(const width of [1100,390]){await page.setViewportSize({width,height:1080});await trigger.click();const box=await panel.boundingBox();assert(box.x>=0&&box.x+box.width<=width,'价格菜单不超出屏幕');await min.click();await page.keyboard.press('Escape');assert(await panel.isHidden())}
 await page.setViewportSize({width:1920,height:1080});await choose('all');await trigger.click();await page.locator('#new').screenshot({path:fileURLToPath(new URL('../../outputs/new-products-price.png',import.meta.url))});await page.keyboard.press('Escape');
}
export async function newProductPrices(page){await page.locator('a[href="#new"]').click();await page.getByRole('button',{name:'清空上线日期',exact:true}).click();await verifyNewProductPrices(page)}
