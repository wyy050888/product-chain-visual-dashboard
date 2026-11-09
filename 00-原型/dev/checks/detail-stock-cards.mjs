import assert from 'node:assert/strict';
export async function verifyProductStockCards(page){
 const root=page.locator('[data-up-panel="stock"]'),cards=root.locator('.stock-product-cards');
 assert.deepEqual(await cards.locator('h4').allTextContents(),['总库存','我司可售库存','工厂可售库存','在途库存','近15日均净销量','库存周转率','交付及时率','翻新闭环率']);
 assert.equal(await cards.locator('.stock-card-foot .metric-help,[data-stock-card="warehouse"] .stock-card-head>span .metric-help').count(),0);
 assert.equal(await cards.locator('[data-stock-card="warehouse"] .stock-card-head>span').innerText(),'货值');
 assert.equal(await cards.locator('.stock-card-head>span .metric-help,[data-stock-card="dailyNet15"] .metric-help,[data-stock-card="turn"] .metric-help').count(),0);
 assert.equal(await page.locator('#up-stock-skus [data-rp-sort="turn"]').innerText(),'库存周转率');
 const stock=await page.evaluate(()=>{const id=document.querySelector('.up-detail').dataset.upSpu;return window.dashboardKeyProductsSnapshot().rows.find(row=>row.spuId===id).stock});
 const rows=await page.locator('#up-stock-skus tbody tr').evaluateAll(es=>es.map(e=>{
  const row={code:e.dataset.skuCode};
  for(const key of ['totalUnits','goodsValueCents','totalCoverage15','dailyNet15','warehouseValueCents','transit']){
   const raw=e.querySelector('[data-stock-metric="'+key+'"]').dataset.stockRaw;row[key]=raw==='null'?null:Number(raw);
  }
  return row;
 }));
 for(const [key,field] of [['warehouse','warehouse'],['factory','factoryAvailable'],['transit','transit']]){
  assert.equal(Number(await cards.locator('[data-stock-card="'+key+'"] [data-stock-quantity="'+field+'"]').getAttribute('data-stock-raw')),stock[field]);
 }
 assert.equal(await cards.locator('[data-stock-card="sellable"]').count(),0,'产品库存指标移除可售库存卡片');
 const quantitySum=rows.reduce((sum,row)=>sum+row.totalUnits,0),valueSum=rows.reduce((sum,row)=>sum+row.goodsValueCents,0);
 assert.equal(quantitySum,stock.totalUnits);assert.equal(valueSum,stock.goodsValueCents);
 const keys=await page.locator('#up-stock-skus thead [data-rp-sort]').evaluateAll(es=>es.map(e=>e.dataset.rpSort));
 assert.deepEqual(keys.slice(0,5),['totalUnits','goodsValueCents','totalCoverage15','warehouse','warehouseValueCents']);
 assert.equal(await page.locator('#up-stock-skus th').count(),15);
 assert.equal(await page.locator('#up-stock-skus [data-rp-sort="sellableUnits"],#up-stock-skus [data-rp-sort="sellableValueCents"]').count(),0);
 assert.equal(await page.locator('#up-stock-skus [data-rp-sort="totalCoverage15"]').innerText(),'总可售天数');
 assert.equal(keys[keys.indexOf('warehouse')+1],'warehouseValueCents');
 assert.equal(keys[keys.indexOf('factoryAvailable')+1],'transit');
 assert.equal(await page.locator('#up-stock-skus [data-rp-sort="warehouseValueCents"]').innerText(),'货值（我司可售）');
 assert.equal(rows.reduce((n,r)=>n+r.warehouseValueCents,0),stock.warehouseValueCents);
 assert.equal(rows.reduce((n,r)=>n+r.transit,0),stock.transit);
 assert.equal(await page.locator('.stock-sku-warehouse').count(),0);
 const money=cents=>{const yuan=cents/100;return (Math.abs(yuan)>10000?yuan/10000:yuan).toFixed(1)+(Math.abs(yuan)>10000?'w':'元')};
 for(const row of rows){
  const cells=page.locator('#up-stock-skus tbody tr[data-sku-code="'+row.code+'"]');
  const text=key=>cells.locator('[data-stock-metric="'+key+'"]').innerText();
  assert.equal(await text('totalUnits'),row.totalUnits.toLocaleString('en-US')+'件');
  assert.equal(await text('goodsValueCents'),money(row.goodsValueCents));
  assert.equal(await text('warehouseValueCents'),money(row.warehouseValueCents));
  assert.equal(await text('transit'),row.transit.toLocaleString('en-US')+'件');
  const days=row.dailyNet15>0?row.totalUnits/row.dailyNet15:null;
  assert.equal(row.totalCoverage15,days,'总可售天数按SKU总库存和未取整净销量计算');
  assert.equal(await text('totalCoverage15'),days===null?'—':new Intl.NumberFormat('zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1}).format(days)+'天');
 }
 assert(rows.some(row=>row.totalCoverage15===null),'覆盖无净销量的SKU');
 for(const key of ['totalCoverage15','warehouseValueCents','transit']){
  const header=page.locator('#up-stock-skus [data-rp-sort="'+key+'"]');
  for(const direction of [-1,1]){
   await header.click();
   const codes=await page.locator('#up-stock-skus tbody tr').evaluateAll(es=>es.map(e=>e.dataset.skuCode));
   const expected=[...rows].sort((a,b)=>a[key]===null?b[key]===null?0:1:b[key]===null?-1:direction*(a[key]-b[key]));
   assert.deepEqual(codes,expected.map(row=>row.code));
  }
  await header.click();
 }
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 for(const [key,text] of [['total','未交订单'],['warehouse','京东仓库存'],['factoryAvailable','已翻新良品库存'],['transit','采购调拨在途库存']]){
  const help=cards.locator('[data-stock-rule="'+key+'"]').first();await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));await settle();await help.hover();await page.locator('#metric-tooltip').waitFor({state:'visible'});assert.match(await page.locator('#metric-tooltip').innerText(),new RegExp(text));await page.keyboard.press('Escape');
 }
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});await settle();
  const rects=await cards.locator('.up-stock-card').evaluateAll(es=>es.map(e=>({top:e.offsetTop,left:e.offsetLeft,width:e.offsetWidth,scroll:e.scrollWidth,client:e.clientWidth})));
  const expectedColumns=width>900?4:width>500?2:1;
  assert.equal(new Set(rects.map(r=>r.top)).size,8/expectedColumns,'八张卡按可用宽度换行 '+width);
  assert(rects.every(r=>r.scroll<=r.client+1),'卡片内容不溢出 '+width);
  assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'窄屏只在卡片/表格内部横滚 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：产品库存八项响应式布局、SKU总可售天数口径/缺值/排序、数量货值守恒及响应式');
}
