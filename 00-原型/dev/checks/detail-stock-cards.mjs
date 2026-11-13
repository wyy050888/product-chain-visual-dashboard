import assert from 'node:assert/strict';
export async function verifyProductStockCards(page){
 const root=page.locator('[data-up-panel="stock"]'),cards=root.locator('.stock-product-cards');
 assert.deepEqual(await cards.locator('h4').allTextContents(),['总库存','可售库存','近15日均净销量','库存周转率','交付及时率','翻新闭环率']);
 const sellable=cards.locator('[data-stock-card="sellable"]');
 assert.equal(await cards.locator('.stock-card-foot .metric-help').count(),0);
 assert.equal(await sellable.locator('.stock-card-head>span').innerText(),'货值');
 assert.equal(await sellable.locator('.stock-card-foot>span').innerText(),'可售天数');
 assert.equal(await cards.locator('.stock-card-head>span .metric-help,[data-stock-card="dailyNet15"] .metric-help,[data-stock-card="turn"] .metric-help').count(),0);
 assert.equal(await page.locator('#up-stock-skus [data-rp-sort="turn"]').innerText(),'库存周转率');
 const stock=await page.evaluate(()=>{const id=document.querySelector('.up-detail').dataset.upSpu;return window.dashboardKeyProductsSnapshot().rows.find(row=>row.spuId===id).stock});
 const rows=await page.locator('#up-stock-skus tbody tr').evaluateAll(es=>es.map(e=>{
  const row={code:e.dataset.skuCode};
  for(const key of ['totalUnits','totalCoverage15','sellableUnits','sellableCoverage15','warehouse','coverage15','netSales15','turn']){
   const raw=e.querySelector('[data-stock-metric="'+key+'"]').dataset.stockRaw;row[key]=raw==='null'?null:Number(raw);
  }
  return row;
 }));
 const sellableUnits=stock.warehouse+stock.factoryAvailable+stock.transit;
 assert.equal(Number(await sellable.locator('[data-stock-quantity="sellableUnits"]').getAttribute('data-stock-raw')),sellableUnits);
 assert.equal(Number(await sellable.locator('[data-stock-value="sellableValueCents"]').getAttribute('data-stock-raw')),stock.sellableValueCents);
 const sellableDays=stock.dailyNet15>0?new Intl.NumberFormat('zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1}).format(sellableUnits/stock.dailyNet15)+'天':'—';
 assert.equal(await sellable.locator('.stock-card-foot strong').innerText(),sellableDays);
 const sum=key=>rows.reduce((total,row)=>total+row[key],0);
 assert.equal(sum('totalUnits'),stock.totalUnits);
 assert.equal(sum('sellableUnits'),sellableUnits);
 assert.equal(sum('warehouse'),stock.warehouse);
 assert.equal(sum('netSales15'),Math.round(stock.dailyNet15*15),'SKU近15日净销量合计与产品一致');
 assert.deepEqual(await page.locator('#up-stock-skus thead th').allTextContents(),['SKU名称','SKU码','总库存','总可售天数','可售库存','可售天数','我司可售库存','我司可售天数','近15日净销量','库存周转率']);
 assert.equal(await page.locator('.stock-sku-warehouse').count(),0);
 const daysText=new Intl.NumberFormat('zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1});
 for(const row of rows){
  const cells=page.locator('#up-stock-skus tbody tr[data-sku-code="'+row.code+'"]');
  const text=key=>cells.locator('[data-stock-metric="'+key+'"]').innerText();
  for(const key of ['totalUnits','sellableUnits','warehouse','netSales15'])assert.equal(await text(key),row[key].toLocaleString('en-US')+'件');
  for(const [key,units] of [['totalCoverage15',row.totalUnits],['sellableCoverage15',row.sellableUnits],['coverage15',row.warehouse]]){
   const days=row.netSales15>0?units/(row.netSales15/15):null;
   assert.equal(row[key],days,'可售天数使用对应库存和未取整的日均净销量');
   assert.equal(await text(key),days===null?'—':daysText.format(days)+'天');
  }
 }
 assert(rows.some(row=>row.totalCoverage15===null),'覆盖无净销量的SKU');
 for(const key of ['totalCoverage15','sellableUnits','sellableCoverage15','netSales15']){
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
 for(const [key,text] of [['total','未交订单'],['sellable','我司可售库存＋工厂可售库存＋在途库存']]){
  const help=cards.locator('[data-stock-rule="'+key+'"]').first();await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));await settle();await help.hover();await page.locator('#metric-tooltip').waitFor({state:'visible'});assert.match(await page.locator('#metric-tooltip').innerText(),new RegExp(text));await page.keyboard.press('Escape');
 }
 for(const width of [1920,1440,1024,768,390]){
  await page.setViewportSize({width,height:1080});await settle();
  const rects=await cards.locator('.up-stock-card').evaluateAll(es=>es.map(e=>({top:e.offsetTop,left:e.offsetLeft,width:e.offsetWidth,scroll:e.scrollWidth,client:e.clientWidth})));
  const rowSizes=Map.groupBy(rects,row=>row.top);
  assert.deepEqual([...rowSizes.values()].map(row=>row.length),width>900?[2,4]:width>500?[2,2,2]:[1,1,1,1,1,1],'库存余额与其他指标按可用宽度换行 '+width);
  assert(rects.every(r=>r.scroll<=r.client+1),'卡片内容不溢出 '+width);
  assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'窄屏只在卡片/表格内部横滚 '+width);
  if(width===1920)assert(await page.locator('#up-stock-skus').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'宽屏下10列表格完整显示');
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：可售库存、货值及天数组合卡、SKU明细和响应式布局');
}
