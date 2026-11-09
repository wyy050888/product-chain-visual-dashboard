import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function verifyManagementPeriod(page){
 const main=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot()),drawer=page.locator('.kpm-management-drawer');
 const control=page.locator('.kpm-management-period-picker'),period=async()=>JSON.parse(await drawer.getAttribute('data-kpm-period')),range=async()=>JSON.parse(await drawer.getAttribute('data-kpm-range'));
 const original=await snapshot();
 await main.locator('[data-kpm-management-pick="grade-A"]').click();await drawer.waitFor();
 const cutoff=original.range.end,year=cutoff.slice(0,4),month=+cutoff.slice(5,7),starts={recent30:original.range.start,month:cutoff.slice(0,7)+'-01',quarter:year+'-'+String(Math.floor((month-1)/3)*3+1).padStart(2,'0')+'-01',year:year+'-01-01'},amounts={};
 for(const mode of ['recent30','month','quarter','year']){
  await control.locator('[data-drawer-time-mode="'+mode+'"]').click();assert.equal((await period()).mode,mode);assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollTop),0,'切换期间回到明细顶部');assert.deepEqual(await range(),{start:starts[mode],end:cutoff});
  assert.equal(await control.locator('[aria-pressed="true"]').count(),1);assert.equal(await page.locator('#drawer-tabs button').count(),0);
  amounts[mode]=await drawer.locator('tbody tr').first().innerText();
  assert.deepEqual((await snapshot()).period,original.period,'明细切换不改外层期间');
 }
 assert.notEqual(amounts.recent30,amounts.year,'年度经营数据真实重算');
 await control.locator('[data-drawer-time-mode="month"]').click();await control.locator('[data-drawer-time-value]').selectOption('9');assert.deepEqual(await range(),{start:'2026-09-01',end:'2026-09-30'});
 const septemberRows=await drawer.locator('[data-kpm-list-spu]').evaluateAll(ns=>ns.map(n=>n.dataset.kpmListSpu)),septemberContent=await drawer.locator('tbody').innerText();
 await control.locator('[data-drawer-time-year]').selectOption('2025');assert.equal((await range()).end,'2025-09-30');
 await control.locator('[data-drawer-time-mode="recent30"]').click();assert.deepEqual(await range(),original.range);
 await control.locator('[data-drawer-time-mode="year"]').click();
 await drawer.locator('[data-kpm-list-detail]').first().click();await page.locator('.up-detail').waitFor();assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),starts.year);
 await page.locator('#close').click();await drawer.waitFor();assert.equal((await period()).mode,'year');assert.equal(await page.locator('.kpm-management-heading').count(),1);assert(await page.locator('#drawer-tabs').isHidden());
 for(const width of [1920,1100,390]){
  await page.setViewportSize({width,height:1080});const heading=page.locator('#dialog .dialoghead');assert(await heading.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'标题时间不溢出 '+width);
  if(width===1920)await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/product-management-drawer-header.png',import.meta.url))});
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();assert.deepEqual((await snapshot()).period,original.period);
 // 与外层相同月份的结果一致，而非只切换时间文案。
 await main.locator('[data-time-mode="month"]').click();await main.locator('[data-time-value]').selectOption('9');await main.locator('[data-kpm-management-pick="grade-A"]').click();await drawer.waitFor();
 assert.deepEqual(await drawer.locator('[data-kpm-list-spu]').evaluateAll(ns=>ns.map(n=>n.dataset.kpmListSpu)),septemberRows);assert.equal(await drawer.locator('tbody').innerText(),septemberContent);
 await page.locator('#close').click();await main.locator('[data-time-mode="recent30"]').click();await main.locator('[data-kpm-management-pick="up"]').click();await drawer.waitFor();
 await control.locator('[data-drawer-time-mode="month"]').click();await control.locator('[data-drawer-time-value]').selectOption('9');
 assert.equal(await page.locator('[data-kpm-period=current] time').innerText(),'26/09/01 — 26/09/30');
 await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/product-management-changes-header.png',import.meta.url))});
 await page.locator('#close').click();assert.deepEqual((await snapshot()).period,original.period);
}
