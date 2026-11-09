import assert from 'node:assert/strict';
import {verifyShopLinkDetails} from './shop-link-details.mjs';

export async function productPddLinks(page){
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const data=await page.evaluate(()=>({links:coreLinkConfigSnapshot('2026-10-28').links,spus:referenceSampleAudit().spus}));
 const abnormal=data.links.filter(link=>link.spuId&&['red','yellow'].includes(link.assessment));
 assert(abnormal.length>0);
 const spuId=abnormal[0].spuId,expected=abnormal.filter(link=>link.spuId===spuId);
 const open=async id=>{
  await page.evaluate(id=>{const button=document.createElement('button');button.dataset.upProduct=id;document.body.append(button);button.click();button.remove()},id);
  await page.locator('.up-detail').waitFor();await page.locator('[data-drawer-tab="quality"]').click();
 };
 await open(spuId);
 const section=page.locator('.up-pdd-violations');
 assert.equal(await section.locator(':scope>h3').innerText(),'拼多多核心链接违规');
 const key=link=>link.shopId+'|'+link.id;
 const ids=()=>section.locator('[data-rp-pdd-link]').evaluateAll(ns=>ns.map(n=>n.dataset.upPddShop+'|'+n.dataset.rpPddLink));
 assert.deepEqual((await ids()).sort(),expected.map(key).sort(),'只显示本产品关联的异常链接');
 assert(await section.evaluate(e=>!!(e.previousElementSibling.querySelector('#up-violation-table')&&e.compareDocumentPosition(e.previousElementSibling)&Node.DOCUMENT_POSITION_PRECEDING)));
 for(const tone of ['red','yellow']){
  const rows=expected.filter(link=>link.assessment===tone),group=section.locator('[data-up-pdd-tone="'+tone+'"]');
  assert.equal(await group.count(),rows.length?1:0);
  if(!rows.length)continue;
  assert((await group.locator('th').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).whiteSpace))).every(value=>value==='normal'),'六项长表头自动换行');
  assert.equal(await group.locator('th').count(),8);assert.equal(await group.locator('th').first().innerText(),'所属店铺');
  assert.equal(await group.locator('h4 span').innerText(),rows.length+'条');
  for(const [index,link] of rows.entries()){
   const cells=await group.locator('tbody tr').nth(index).locator('td').allTextContents();
   assert(cells[0].includes(link.shopId));assert(cells[1].includes(link.id));
   assert.deepEqual(cells.slice(2),['thirdRank','mainRank'].flatMap(key=>link.metrics.map(metric=>metric[key])));
  }
 }
 for(const platform of ['抖音','拼多多']){
  await page.locator('[data-up-quality-platform="'+platform+'"]').click();
  assert.deepEqual((await ids()).sort(),expected.map(key).sort(),'独立拼多多考核不受退货平台切换影响');
 }
 await page.locator('[data-up-violation-quality]').uncheck();assert.equal((await ids()).length,expected.length);
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'抽屉不横向溢出');
  for(const scroll of await section.locator('.rp-pdd-link-scroll').all()){
   assert(await scroll.evaluate(e=>e.scrollWidth>e.clientWidth));await scroll.evaluate(e=>e.scrollLeft=e.scrollWidth);assert(await scroll.evaluate(e=>e.scrollLeft>0));
  }
 }
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('.up-detail-period [data-drawer-time-mode="month"]').click();
 await page.locator('.up-detail-period [data-drawer-time-value]').selectOption('9');assert.equal(await section.count(),0,'月份无核心链接时不展示');
 await page.locator('.up-detail-period [data-drawer-time-value]').selectOption('10');assert.equal((await ids()).length,expected.length);
 await section.locator('.rp-pdd-link-scroll').evaluateAll(ns=>ns.forEach(n=>n.scrollLeft=0));await section.scrollIntoViewIfNeeded();await section.screenshot({path:'outputs/product-pdd-links-1920.png'});
 await page.locator('#close').click();
 const noLinks=data.spus.find(product=>!abnormal.some(link=>link.spuId===product.spuId));assert(noLinks);
 await open(noLinks.spuId);assert.equal(await section.count(),0,'无异常产品隐藏整个模块');
 await page.locator('#close').click();
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.riskitem='1,6';document.body.append(b);b.click();b.remove()});
 await page.locator('.sd-detail [data-drawer-tab="violations"]').click();await verifyShopLinkDetails(page,6);await page.locator('#close').click();
 console.log('通过：产品SPU精确关联、红黄分组与店铺考核同源、平台隔离、月份切换、无异常隐藏及宽窄屏横滚。');
}
