import assert from 'node:assert/strict';
export async function verifyInventoryGroups(page,initial){
 const categories=['个护类','环境类','清洁类','厨电类','健康类'];
 assert.deepEqual(initial.category.map(row=>row.name),categories);
 const panels=page.locator('#inventory .ip-group-panel');
 assert.deepEqual(await panels.nth(0).locator('tbody tr>td:first-child').allTextContents(),[...initial.category].sort((a,b)=>b.warehouse-a.warehouse).map(row=>row.name));
 assert.equal(await panels.nth(1).locator('tbody tr').count(),5);
 assert.deepEqual(await panels.nth(1).locator('tbody tr>td:first-child').allTextContents(),initial.brand.slice(0,5).sort((a,b)=>b.warehouse-a.warehouse).map(row=>row.name));
 assert(initial.brand.every((row,i)=>!i||initial.brand[i-1].warehouseValueCents>=row.warehouseValueCents));
 for(const groups of [initial.category,initial.brand]){
  for(const key of ['warehouse','warehouseValueCents','factory','factoryValueCents','staleUnits','staleValueCents','totalUnits','goodsValueCents','cost','avg','deliveryOn','deliveryDue'])assert(Math.abs(groups.reduce((n,row)=>n+row[key],0)-initial.stockTotal[key])<1e-5,'库存维度守恒 '+key);
  for(const row of groups){
   assert.equal(row.staleRatio,row.totalUnits?row.staleUnits/row.totalUnits*100:null);
   assert.equal(row.staleValueRatio,row.goodsValueCents?row.staleValueCents/row.goodsValueCents*100:null);
   assert.equal(row.delivery,row.deliveryDue?row.deliveryOn/row.deliveryDue*100:null);
   assert.equal(row.turn,row.avg?row.cost/row.avg:null);
  }
 }
 for(const row of initial.stockRecords){
  assert.equal(row.staleRatio,row.totalUnits?row.staleUnits/row.totalUnits*100:null,'SPU呆滞数量占比有实际分母');
  assert.equal(row.staleValueRatio,row.goodsValueCents?row.staleValueCents/row.goodsValueCents*100:null,'SPU呆滞金额占比有实际分母');
  assert.equal(row.delivery,row.deliveryDue?row.deliveryOn/row.deliveryDue*100:null);
 }
 const metrics=['warehouse','warehouseValueCents','factory','factoryValueCents','staleUnits','staleRatio','staleValueCents','staleValueRatio','turn','delivery','refurbDelay'];
 for(const panel of await panels.all()){
  assert.equal(await panel.locator('thead th').count(),13);
  assert.deepEqual(await panel.locator('tbody tr').first().locator('[data-ip-metric]').evaluateAll(es=>es.map(e=>e.dataset.ipMetric)),metrics);
  assert.equal(await panel.locator('thead [data-ip-rule]').count(),3);
  assert((await panel.locator('[data-ip-metric]').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign))).every(value=>value==='right'));
  assert.deepEqual(await panel.locator('thead [data-ip-rule]').evaluateAll(es=>es.map(e=>e.dataset.ipRule)),['warehouse','factory','staleUnits']);
  assert((await panel.locator('[data-ip-stock]').allTextContents()).every(text=>text==='查看'));
 }
 for(const [key,needle] of [['warehouse','京东仓'],['factory','工厂待检']]){
  const help=panels.first().locator('[data-ip-rule="'+key+'"]').first();await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await help.focus();await page.keyboard.press('Enter');await page.locator('#metric-tooltip').waitFor({state:'visible'});assert((await page.locator('#metric-tooltip').innerText()).includes(needle));await page.keyboard.press('Escape');
 }
 await panels.first().locator('[data-ip-stock="0"]').click();
 assert.equal(await page.locator('#dialogtitle').innerText(),'类目库存');
 assert.deepEqual(await page.locator('#drawer-tabs button').allTextContents(),['spu明细']);
 const categoryRecords=initial.stockRecords.filter(row=>row.category===categories[0]);
 assert.equal(await page.locator('.ip-stock-results tbody tr').count(),Math.min(20,categoryRecords.length));
 assert.equal(await page.locator('.ip-stock-results th').count(),13);
 assert.equal(await page.locator('.ip-stock-results [data-ip-rule]').count(),3);
 assert((await page.locator('.ip-stock-results [data-ip-metric]').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign))).every(value=>value==='right'));
 assert(await page.locator('.ip-stock-results tbody tr>td:first-child').first().evaluate(e=>e.getBoundingClientRect().width>=300),'桌面SPU身份列保留名称空间');
 // 类目入口自动填充；清除后解除入口范围，多选沿用全局 OR/AND 规则。
 const filter=label=>page.locator('.ip-stock-tools [data-pf-multi-label="'+label+'"]');
 assert.deepEqual(await filter('类目').locator('select').evaluate(e=>[...e.selectedOptions].map(o=>o.value)),[categories[0]]);
 assert.equal(await page.locator('.ip-stock-tools .pf-multi summary.unified-input-group').count(),2);
 await page.locator('[data-ip-clear="category"]').click();
 assert.equal(await filter('类目').locator('.pf-multi-value').innerText(),'全部');
 assert.equal(await page.locator('.ip-stock-results tbody tr').count(),20);
 assert.equal(Number((await page.locator('.ip-stock-results tfoot [data-ip-metric="warehouse"]').innerText()).replaceAll(',','')),initial.stockTotal.warehouse);
 assert((await page.locator('.ip-stock-results tbody tr').evaluateAll(es=>es.map(e=>e.dataset.ipRow))).some(id=>initial.stockRecords.find(r=>r.spuId===id).category!==categories[0]));
 await filter('类目').locator('summary').click();
 for(const value of [categories[1],categories[4]])await filter('类目').locator('[data-pf-multi-option][value="'+value+'"]').check();
 const union=initial.stockRecords.filter(r=>[categories[1],categories[4]].includes(r.category));
 assert.equal(Number((await page.locator('.ip-stock-results tfoot [data-ip-metric="warehouse"]').innerText()).replaceAll(',','')),union.reduce((n,r)=>n+r.warehouse,0));
 await filter('类目').locator('summary').click();await page.locator('[data-ip-reset]').click();
 await filter('类目').locator('summary').click();await filter('类目').locator('[data-pf-multi-option][value="'+categories[0]+'"]').check();await filter('类目').locator('summary').click();
 const first=page.locator('.ip-stock-results tbody tr').first(),spuId=await first.getAttribute('data-ip-row');
 const record=categoryRecords.find(row=>row.spuId===spuId);
 for(const key of metrics)assert.equal(await first.locator('[data-ip-metric="'+key+'"]').getAttribute('data-value'),String(record[key]??''),'SPU同源 '+key);
 // 搜索、排序和返回状态；查看更多只显示提示，不打开额外页面。
 await page.locator('[data-ip-query]').fill('不存在');assert.match(await page.locator('.ip-stock-results').innerText(),/没有符合筛选条件/);
 await page.locator('[data-ip-reset]').click();await page.locator('[data-ip-query]').fill(record.name);
 await page.locator('.ip-stock-results [data-ip-spu="'+spuId+'"]').click();
 await page.locator('.up-detail[data-up-tab="stock"]').waitFor();
 assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').innerText(),'产品库存');
 const more=page.locator('[data-up-panel="stock"] [data-stock-more]');assert.equal(await more.innerText(),'查看更多');
 const heading=await more.evaluate(e=>{const p=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return {gap:p.right-b.right,left:b.left,right:p.right}});assert(heading.gap<2);
 await more.evaluate(e=>{e.scrollIntoView({behavior:'instant',block:'center'});e.focus({preventScroll:true})});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await more.click();await page.locator('#metric-tooltip').waitFor({state:'visible'});assert.equal(await page.locator('#metric-tooltip').innerText(),'跳转spu库存详情页');assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'1');
 await page.keyboard.press('Escape');assert(await page.locator('.up-detail').isVisible());
 await page.locator('.drawer-back').click();assert.equal(await page.locator('[data-ip-query]').inputValue(),record.name);assert.equal(await page.locator('.ip-stock-results tbody tr').count(),1);
 await page.locator('#close').click();
 const brand=initial.brand[0];await panels.nth(1).locator('[data-ip-stock="'+brand.index+'"]').click();
 assert.deepEqual(await page.locator('#drawer-tabs button').allTextContents(),['全部品牌','spu明细']);
 assert.equal(await page.locator('[data-ip-brand]').inputValue(),String(brand.index));
 assert.equal(await page.locator('.ip-stock-results tbody tr').count(),Math.min(20,initial.stockRecords.filter(row=>row.brand===brand.index).length));
 await page.locator('[data-ip-clear="brand"]').click();assert.equal(await filter('品牌').locator('.pf-multi-value').innerText(),'全部');assert.equal(await page.locator('.ip-stock-results tbody tr').count(),20);
 await page.locator('#drawer-tabs [data-drawer-tab="brands"]').click();
 assert.equal(await page.locator('.ip-stock-results tbody tr').count(),Math.min(20,initial.brand.length));
 assert.equal(await page.locator('.ip-stock-results th').count(),13);
 const target=initial.brand.find(row=>row.count>0&&row.index!==brand.index);
 await page.locator('.ip-stock-results [data-ip-stock="'+target.index+'"]').click();
 assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').innerText(),'spu明细');
 assert.equal(await page.locator('[data-ip-brand]').inputValue(),String(target.index));
 await page.locator('[data-ip-reset]').click();
 await page.locator('.ip-stock-results [data-rp-sort="warehouse"]').click();
 const values=await page.locator('.ip-stock-results tbody [data-ip-metric="warehouse"]').evaluateAll(es=>es.map(e=>+e.dataset.value));assert(values.every((n,i)=>!i||values[i-1]>=n));
 assert.equal(values.length,20);
 assert.equal(await page.locator('.ip-stock-pages').locator('button').count()>0,true);
 for(const width of [1920,1366,390]){
  await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'抽屉只有表内横滚 '+width);
 }
 await page.locator('#close').click();await page.setViewportSize({width:1920,height:1080});
 console.log('通过：五类目、品牌货值TOP5、11项指标守恒/加权、问号、双Tab、搜索排序分页及SPU库存两层返回');
}
