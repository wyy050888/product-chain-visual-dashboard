import assert from 'node:assert/strict';

export async function verifyShopLinkDetails(page,id){
 const root=page.locator('.sd-detail'),links=await page.evaluate(id=>window.pddShopLinksSnapshot(id).all,id);
 const headings=['商品链接',...['三级分类','主营链群'].flatMap(category=>['品质退款率','品质求助平台率','品质文本情感分'].map(name=>'近30天'+name+'（'+category+'）'))];
 assert.equal(await root.locator('.sd-pdd-links').count(),2);
 const group=root.locator('.sd-core-links');
 assert.equal(await group.locator(':scope>h3').innerText(),'拼多多核心链接考核');
 assert.deepEqual(await group.locator(':scope>.sd-pdd-links').evaluateAll(es=>es.map(e=>e.dataset.sdLinkTone)),['red','yellow']);
 const layout=await root.locator('.sd-pdd-links').evaluateAll(es=>es.map(e=>({position:getComputedStyle(e).position,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})));
 assert(layout.every(r=>r.position==='static'),'明细表须在详情正常文档流中');
 assert(layout[1].top>=layout[0].bottom,'红黄两表依次排列，不重叠');
 for(const tone of ['red','yellow']){
  const section=root.locator('[data-sd-link-tone="'+tone+'"]');
  const expected=links.filter(l=>tone==='red'?l.redCount>=3:l.redCount>0&&l.redCount<3);
  assert.deepEqual(await section.locator('th').allTextContents(),headings);
  assert.equal(await section.locator('h4 span').innerText(),expected.length+'条');
  assert.deepEqual(await section.locator('[data-rp-pdd-link]').evaluateAll(es=>es.map(e=>e.dataset.rpPddLink)),expected.map(l=>l.id));
  assert.equal(await section.locator('.risk-thumb').count(),expected.length);
  for(const [i,link] of expected.entries()){
   const cells=await section.locator('tbody tr').nth(i).locator('td').allTextContents();
   assert(cells[0].includes(link.name)&&cells[0].includes(link.id));
   assert.deepEqual(cells.slice(1),['thirdRank','mainRank'].flatMap(key=>link.metrics.map(m=>m[key])));
   const alerts=await section.locator('tbody tr').nth(i).locator('td').evaluateAll(es=>es.slice(1).map(e=>e.classList.contains('rp-pdd-value-alert')));
   assert.deepEqual(alerts,cells.slice(1).map(text=>text.startsWith('处于同行后')));
  }
 }
 assert.equal(await root.evaluate(e=>e.querySelector('[data-sd-violation-pager]').compareDocumentPosition(e.querySelector('.sd-pdd-links'))&Node.DOCUMENT_POSITION_FOLLOWING),4);
 await page.setViewportSize({width:390,height:900});
 assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
 for(const scroller of await root.locator('.sd-pdd-links .rp-pdd-link-scroll').all()){
  assert(await scroller.evaluate(e=>e.scrollWidth>e.clientWidth));
  await scroller.evaluate(e=>e.scrollLeft=e.scrollWidth);
  assert(await scroller.evaluate(e=>e.scrollLeft>0));
  await scroller.evaluate(e=>e.scrollLeft=0);
 }
 await page.setViewportSize({width:1920,height:1080});
}
