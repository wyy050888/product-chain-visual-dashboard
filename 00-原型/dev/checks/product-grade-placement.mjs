import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export async function productGradePlacement(page){
 const card=page.locator('#riskrail [data-rp-board="0"]');
 await card.locator('[data-rp-platform-option=all]').click();
 const snapshot=await page.evaluate(()=>window.qualityViolationRankingSnapshot());
 assert.equal(snapshot.platform,'all');assert.equal(new Set(snapshot.records.map(row=>row.spuId+'|'+row.platform)).size,snapshot.rows.length,'每个SPU×平台只出现一行');assert.equal(new Set(snapshot.rows).size,snapshot.rows.length);
 assert(new Set(snapshot.records.map(row=>row.spuId)).size<snapshot.rows.length,'同SPU跨平台独立保留');
 const counts=await card.locator('[data-rp-platform-option]').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.rpPlatformOption,count:Number(n.querySelector('b').textContent)})));
 assert.equal(counts.find(r=>r.key==='all').count,counts.filter(r=>r.key!=='all').reduce((n,r)=>n+r.count,0));
 assert.equal(counts.find(r=>r.key==='all').count,snapshot.rows.length);
 assert.equal(await card.locator('.rp-entry .rp-platform-mark').count(),6);
 await card.locator('[data-risk]').click();assert.equal(await page.locator('#qr-list-platform').inputValue(),'all');
 const audit=async kind=>{
  const host=page.locator('.rp-list-table');assert.equal(await host.locator('th').filter({hasText:/^产品(?:分级|等级)$/}).count(),0);
  const identities=await host.locator('.rp-identity').evaluateAll(nodes=>nodes.map(node=>{const name=node.querySelector('b'),label=name.querySelector(':scope>span:first-child')||name,small=node.querySelector('small');return {nameSize:getComputedStyle(label).fontSize,nameWeight:getComputedStyle(label).fontWeight,code:small?.textContent||'',codeSize:small&&getComputedStyle(small).fontSize,line:small&&getComputedStyle(small).lineHeight,gap:small&&getComputedStyle(small).marginTop,sku:node.dataset.skuCode}}));
  for(const identity of identities){assert.equal(identity.nameSize,'13px');assert.equal(identity.nameWeight,'500');assert.equal(identity.codeSize,'12px');assert.equal(identity.line,'18px');assert.equal(identity.gap,'4px');assert(identity.code.startsWith(kind===1?'ID：':[3,4].includes(kind)?'SKU码：':'SPU码：'),'各榜单编码按记录粒度展示');assert.doesNotMatch(identity.code,/夏季品|冬季品|四季品/);if(identity.sku)assert.equal(identity.code,'SKU码：'+identity.sku);}
  const geometry=await host.evaluate(e=>({head:e.querySelectorAll('th').length,sizes:[...e.querySelectorAll('tbody tr')].map(r=>r.cells.length)}));
  assert(geometry.sizes.every(n=>n===geometry.head));
  if(![1,3,4].includes(kind)){
   const rows=await host.locator('.rp-identity').evaluateAll(nodes=>nodes.map(n=>{const title=n.querySelector('b'),grade=title.querySelector('[data-rp-grade]'),icon=title.querySelector('.rp-platform-mark');return {grade:!!grade,afterIcon:!icon||!!(icon.compareDocumentPosition(grade)&Node.DOCUMENT_POSITION_FOLLOWING),last:title.lastElementChild===grade}}));
   assert(rows.every(r=>r.grade&&r.afterIcon&&r.last),'名称→渠道→分级的顺序完整');
  }
 };
 await audit(0);
 const grade=page.locator('[data-rp-filter=grade]');await grade.selectOption(['S'],{force:true});
 assert((await page.locator('.rp-list-table [data-rp-grade]').evaluateAll(ns=>ns.map(n=>n.dataset.rpGrade))).every(value=>value==='S'));
 await grade.selectOption(['all'],{force:true});
 await page.locator('#qr-list-platform').selectOption('京东',{force:true});
 assert((await page.locator('.rp-list-table .rp-platform-mark').evaluateAll(ns=>ns.map(n=>n.alt))).every(p=>p==='京东'));
 await page.locator('#qr-list-platform').selectOption('all',{force:true});
 const platform=await page.locator('.rp-list-table .rp-platform-mark').first().getAttribute('alt');
 await page.locator('.rp-list-table [data-qr-detail]').first().click();assert.equal(await page.locator('#up-platform').inputValue(),platform,'全平台列表详情继承该行平台');
 await page.locator('#close').click();assert.equal(await page.locator('#qr-list-platform').inputValue(),'all');
 for(const kind of [6,1,4,3,2]){await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();await audit(kind)}
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 for(const width of [1920,1024,390]){await page.setViewportSize({width,height:1080});const clipped=await page.locator('.rp-list-table .rp-platform-name').evaluateAll(nodes=>nodes.some(n=>{const g=n.querySelector('[data-rp-grade]'),i=n.querySelector('img');return g.getBoundingClientRect().right>n.getBoundingClientRect().right+1||i.getBoundingClientRect().right>g.getBoundingClientRect().left}));assert(!clipped,'平台和分级标签完整显示 '+width)}
 await page.setViewportSize({width:1920,height:1080});await page.locator('#dialogbody').screenshot({path:fileURLToPath(new URL('../../outputs/violation-platform-grade.png',import.meta.url))});await page.locator('#close').click();
 for(const [anchor,selector,badge] of [['new','#newtable','.nsp-grade'],['matrix','#matrixtable','.kpm-grade']]){
  await page.locator('a[href="#'+anchor+'"]').click();const table=page.locator(selector);
  assert.equal(await table.locator('th').filter({hasText:/^产品(?:分级|等级)$/}).count(),0);
  assert.equal(await table.locator('.product-name-line '+badge).count(),anchor==='new'?0:await table.locator('tbody tr').count());
  const aligned=await table.evaluate(t=>[...t.querySelectorAll('tbody tr')].every(r=>r.cells.length===t.querySelectorAll('th').length));assert(aligned);
 }
 // 其余旧表通过公共渲染入口迁移，原始输入与渠道图标保持。
 const source=fs.readFileSync(new URL('../../src/modules/core/01.js',import.meta.url),'utf8');
 const renderer=source.slice(source.indexOf('function tableInlineProductGrade'),source.indexOf('function titleProduct'));
 const legacy=await page.evaluate(code=>{const render=new Function('esc',code+';return table')(value=>String(value));const headers=['产品','产品分级','GSV'],rows=[['<div class="prodname"><div><strong>产品<img class="rp-platform-mark" alt="抖音"></strong><small>SPU1</small></div></div>','A','100w']];const host=document.createElement('div');host.innerHTML=render(headers,rows);const icon=host.querySelector('img'),badge=host.querySelector('[data-product-grade]');return {heads:[...host.querySelectorAll('th')].map(n=>n.textContent),ordered:!!(icon.compareDocumentPosition(badge)&Node.DOCUMENT_POSITION_FOLLOWING),badge:badge.textContent,original:rows[0][1],columns:headers.length}},renderer);
 assert.deepEqual(legacy,{heads:['产品','GSV'],ordered:true,badge:'A',original:'A',columns:3});
 console.log('通过：SPU×平台独立入榜、名称后平台/分级顺序、筛选与详情平台继承、全局分级列迁移');
}
