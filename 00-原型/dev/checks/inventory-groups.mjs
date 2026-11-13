import assert from 'node:assert/strict';
export async function verifyInventoryGroups(page,initial){
 const categories=['个护类','环境类','清洁类','厨电类','健康类'];
 assert.deepEqual(initial.category.map(row=>row.name),categories);
 const panels=page.locator('#inventory .ip-group-panel');
 assert.deepEqual(await panels.nth(0).locator('tbody tr>td:first-child').allTextContents(),[...initial.category].sort((a,b)=>b.warehouse-a.warehouse).map(row=>row.name));
 assert.equal(await panels.nth(1).locator('tbody tr').count(),5);
 assert.deepEqual(await panels.nth(1).locator('tbody tr>td:first-child').allTextContents(),initial.brand.filter(row=>['苏泊尔','美的','创维','海尔','康佳'].includes(row.name)).sort((a,b)=>b.warehouse-a.warehouse).map(row=>row.name));
 assert(initial.brand.every((row,i)=>!i||initial.brand[i-1].warehouseValueCents>=row.warehouseValueCents));
 for(const groups of [initial.category,initial.brand]){
  for(const key of ['warehouse','warehouseValueCents','factory','factoryValueCents','staleUnits','staleValueCents','totalUnits','goodsValueCents','cost','avg','deliveryOn','deliveryDue'])assert(Math.abs(groups.reduce((n,row)=>n+row[key],0)-initial.stockTotal[key])<1e-5,'库存维度守恒 '+key);
  for(const row of groups){
   assert.equal(row.staleRatio,row.totalUnits?row.staleUnits/row.totalUnits*100:null);
   assert.equal(row.staleValueRatio,row.goodsValueCents?row.staleValueCents/row.goodsValueCents*100:null);
   assert.equal(row.delivery,row.deliveryDue?(row.deliveryOn+row.importedStock)/row.deliveryDue*100:null);
   assert.equal(row.turn,row.avg?row.cost/row.avg:null);
   assert.equal(row.totalCoverage15,row.dailyNet15>0?row.totalUnits/row.dailyNet15:null);
   assert.equal(row.coverage15,row.dailyNet15>0?row.warehouse/row.dailyNet15:null);
  }
 }
 for(const row of initial.stockRecords){
  assert.equal(row.staleRatio,row.totalUnits?row.staleUnits/row.totalUnits*100:null,'SPU呆滞数量占比有实际分母');
  assert.equal(row.staleValueRatio,row.goodsValueCents?row.staleValueCents/row.goodsValueCents*100:null,'SPU呆滞金额占比有实际分母');
  assert.equal(row.delivery,row.deliveryDue?(row.deliveryOn+row.importedStock)/row.deliveryDue*100:null);
 }
 const metrics=['totalUnits','goodsValueCents','warehouse','warehouseValueCents','factory','factoryValueCents','staleUnits','staleRatio','staleValueCents','staleValueRatio','turn','delivery','refurbRate'];
 for(const panel of await panels.all()){
  assert.equal(await panel.locator('thead th').count(),14);
  assert.deepEqual(await panel.locator('tbody tr').first().locator('[data-ip-metric]').evaluateAll(es=>es.map(e=>e.dataset.ipMetric)),metrics);
  assert.equal(await panel.locator('thead .metric-help,[data-ip-rule]').count(),0,'两表指标不提供问号提示');
  assert((await panel.locator('[data-ip-metric]').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign))).every(value=>value==='right'));
  assert.equal(await panel.locator('[data-ip-stock],[data-ip-spu]').count(),0);
  assert(!(await panel.locator('thead th').allTextContents()).includes('操作'));
  assert((await panel.locator('tbody tr').evaluateAll(es=>es.map(e=>e.cells.length))).every(n=>n===14));
 }
 await page.evaluate(()=>{const button=document.createElement('button');button.dataset.ipStock='0';button.dataset.ipDimension='category';document.querySelector('#inventory').append(button);button.click();button.remove()});
 assert.equal(await page.locator('.ip-stock-detail').count(),0,'旧入口不再打开抽屉');
 assert.equal(await page.locator('#dialog').isVisible(),false);
 for(const width of [1920,1366,390]){
  await page.setViewportSize({width,height:1080});
  for(const panel of await panels.all()){
   assert(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'仅表内横滚 '+width);
   assert.equal(await panel.locator('tbody tr').first().locator('td').last().getAttribute('data-ip-metric'),'refurbRate');
   assert.equal(await panel.locator('tbody tr').first().locator('td').last().evaluate(e=>getComputedStyle(e).position),'static','最后指标不沿用操作列固定样式');
  }
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：五类目、固定五品牌、13指标守恒/加权、无表头问号、移除查看/操作列/专属抽屉及窄屏');
}
