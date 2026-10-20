import assert from 'node:assert/strict';
export async function verifyProductStockCards(page){
 const root=page.locator('[data-up-panel="stock"]'),cards=root.locator('.stock-product-cards');
 assert.deepEqual(await cards.locator('h4').allTextContents(),['总库存','可售库存','我司可售库存','工厂可售库存','在途库存','近15日均净销量','近30日库存周转率']);
 assert.equal(await cards.locator('.stock-card-foot .metric-help,[data-stock-card="warehouse"] .stock-card-head>span .metric-help').count(),0);
 assert.equal(await cards.locator('[data-stock-card="warehouse"] .stock-card-head>span').innerText(),'货值');
 assert.equal(await cards.locator('.stock-card-head>span .metric-help,[data-stock-card="dailyNet15"] .metric-help,[data-stock-card="turn"] .metric-help').count(),0);
 assert.equal(await page.locator('#up-stock-skus [data-rp-sort="turn"]').innerText(),'近30日库存周转率');
 const stock=await page.evaluate(()=>{const id=document.querySelector('.up-detail').dataset.upSpu;return window.dashboardKeyProductsSnapshot().rows.find(row=>row.spuId===id).stock});
 const rows=await page.locator('#up-stock-skus tbody tr').evaluateAll(es=>es.map(e=>({code:e.dataset.skuCode,sellableUnits:+e.querySelector('[data-stock-metric="sellableUnits"]').dataset.stockRaw,sellableValueCents:+e.querySelector('[data-stock-metric="sellableValueCents"]').dataset.stockRaw,warehouseValueCents:+e.querySelector('[data-stock-metric="warehouseValueCents"]').dataset.stockRaw,transit:+e.querySelector('[data-stock-metric="transit"]').dataset.stockRaw})));
 for(const [key,field] of [['sellable','sellableUnits'],['warehouse','warehouse'],['factory','factoryAvailable'],['transit','transit']]){
  assert.equal(Number(await cards.locator('[data-stock-card="'+key+'"] [data-stock-quantity="'+field+'"]').getAttribute('data-stock-raw')),stock[field]);
 }
 assert.equal(Number(await cards.locator('[data-stock-value="sellableValueCents"]').getAttribute('data-stock-raw')),stock.sellableValueCents);
 assert.equal(await cards.locator('[data-stock-card="sellable"] .stock-card-head>span').innerText(),'货值');
 assert.equal(await cards.locator('[data-stock-card="sellable"] .stock-card-pair>strong').count(),2);
 assert.equal(await cards.locator('[data-stock-card="sellable"] .stock-card-foot').count(),0);
 const quantitySum=rows.reduce((sum,row)=>sum+row.sellableUnits,0),valueSum=rows.reduce((sum,row)=>sum+row.sellableValueCents,0);
 assert.equal(quantitySum,stock.sellableUnits);assert.equal(valueSum,stock.sellableValueCents);
 const keys=await page.locator('#up-stock-skus thead [data-rp-sort]').evaluateAll(es=>es.map(e=>e.dataset.rpSort));
 assert.deepEqual(keys.slice(0,5),['totalUnits','goodsValueCents','sellableUnits','sellableValueCents','warehouse']);
 assert.equal(await page.locator('#up-stock-skus th').count(),16);
 assert.equal(keys[keys.indexOf('warehouse')+1],'warehouseValueCents');
 assert.equal(keys[keys.indexOf('factoryAvailable')+1],'transit');
 assert.equal(await page.locator('#up-stock-skus [data-rp-sort="warehouseValueCents"]').innerText(),'货值（我司可售）');
 assert.equal(rows.reduce((n,r)=>n+r.warehouseValueCents,0),stock.warehouseValueCents);
 assert.equal(rows.reduce((n,r)=>n+r.transit,0),stock.transit);
 assert.equal(await page.locator('.stock-sku-warehouse').count(),0);
 const money=cents=>{const yuan=cents/100;return (Math.abs(yuan)>10000?yuan/10000:yuan).toFixed(1)+(Math.abs(yuan)>10000?'w':'元')};
 for(const row of rows){const cells=await page.locator('#up-stock-skus tbody tr[data-sku-code="'+row.code+'"]').locator('td').allTextContents();assert.equal(cells[4],row.sellableUnits.toLocaleString('en-US'));assert.equal(cells[5],money(row.sellableValueCents));assert.equal(cells[7],money(row.warehouseValueCents));assert.equal(cells[13],row.transit.toLocaleString('en-US'))}
 for(const key of ['sellableUnits','sellableValueCents','warehouseValueCents','transit']){
  const header=page.locator('#up-stock-skus [data-rp-sort="'+key+'"]');await header.click();
  const codes=await page.locator('#up-stock-skus tbody tr').evaluateAll(es=>es.map(e=>e.dataset.skuCode));
  assert.deepEqual(codes,[...rows].sort((a,b)=>b[key]-a[key]).map(row=>row.code));
  await header.click();await header.click();
 }
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 for(const [key,text] of [['total','未交订单'],['warehouse','京东仓库存'],['factoryAvailable','已翻新良品库存'],['sellable','在途库存'],['transit','采购调拨在途库存']]){
  const help=cards.locator('[data-stock-rule="'+key+'"]').first();await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));await settle();await help.hover();await page.locator('#metric-tooltip').waitFor({state:'visible'});assert.match(await page.locator('#metric-tooltip').innerText(),new RegExp(text));await page.keyboard.press('Escape');
 }
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});await settle();
  const rects=await cards.locator('.up-stock-card').evaluateAll(es=>es.map(e=>({top:e.offsetTop,left:e.offsetLeft,width:e.offsetWidth,scroll:e.scrollWidth,client:e.clientWidth})));
  assert.equal(new Set(rects.map(r=>r.top)).size,1,'七卡始终同一排 '+width);
  assert(rects[4].width<rects[3].width&&rects[5].width<rects[3].width&&rects[6].width<rects[3].width,'后三卡适当压缩 '+width);
  assert(rects.every(r=>r.scroll<=r.client+1),'卡片内容不溢出 '+width);
  assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'窄屏只在卡片/表格内部横滚 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：产品库存七项同排、在途数量/货值拆列守恒与排序、后三卡压缩及响应式');
}
