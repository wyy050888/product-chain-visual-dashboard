import assert from 'node:assert/strict';
export async function verifyInventoryMetricPeriod(page){
 const category=page.locator('#inventory .ip-group-panel[data-ip-dimension="category"]'),brand=page.locator('#inventory .ip-group-panel[data-ip-dimension="brand"]');
 const get=()=>page.evaluate(()=>window.inventoryControlAudit());
 const initial=await get(),stable=['warehouse','warehouseValueCents','factory','factoryValueCents','totalUnits','goodsValueCents','staleUnits','staleValueCents','staleRatio','staleValueRatio'];
 const stockView=data=>data.stockRecords.map(row=>Object.fromEntries(['spuId',...stable].map(key=>[key,row[key]])));
 const rates=data=>data.stockRecords.map(row=>[row.turn,row.delivery,row.refurbDelay]);
 assert.deepEqual(await category.locator('[data-ip-time-mode]').allTextContents(),['近30天','月','季','年']);
 for(const panel of [category,brand]){
  const labels=await panel.locator('thead th').allTextContents();
  assert.equal(labels[2],'货值（我司可售）');assert.equal(labels[4],'货值（工厂总库存）');assert.equal(labels[7],'呆滞库存金额');
  assert.equal(labels.indexOf('库存周转率'),labels.indexOf('交付及时率')-1);
  assert.equal(await panel.locator('[data-ip-rule="warehouseValue"],[data-ip-rule="factoryValue"]').count(),0);
  assert.equal(await panel.locator('.ip-signal small').count(),0);
  assert((await panel.locator('[data-ip-metric$="Cents"]').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign))).every(value=>value==='right'));
 }
 assert.equal(await page.locator('#inventorymetrics [data-stock-rule="value"]').count(),0);
 const money=page.locator('#inventorymetrics .stock-sellable-value');assert(await money.evaluate(e=>Math.abs(e.getBoundingClientRect().right-e.querySelector('strong').getBoundingClientRect().right)<1));
 const help=category.locator('.ip-metric-period>.metric-help');await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await help.focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#metric-tooltip').innerText(),'时间筛选影响指标：库存周转率、交付及时率、翻新延期天数');await page.keyboard.press('Escape');
 for(const mode of ['month','quarter','year']){
  await category.locator('[data-ip-time-mode="'+mode+'"]').click();const data=await get();
  assert((await category.locator('[data-ip-signal="turn"]').allTextContents()).every(text=>text.trim().endsWith('次')&&!text.includes('/')),'周转率只显示次数 '+mode);
  assert.equal(data.metricPeriods.category.mode,mode);assert.equal(data.metricPeriods.brand.mode,'recent30');assert.deepEqual(stockView(data),stockView(initial),'日期不改写库存快照');
  assert.deepEqual(data.balance,initial.balance);assert.deepEqual(data.brand,initial.brand,'品牌时间独立');assert.notDeepEqual(rates(data),rates(initial),'期间三指标实际重算 '+mode);
  for(const row of data.stockRecords){assert(row.deliveryOn<=row.deliveryDue);assert.equal(row.delivery,row.deliveryDue?row.deliveryOn/row.deliveryDue*100:null);if(row.refurbReported){const start=mode==='month'?'2026-10-01':mode==='quarter'?'2026-10-01':'2026-01-01';assert(row.refurbReported>=start&&row.refurbReported<='2026-10-10')}}
 }
 await category.locator('[data-ip-time-year]').selectOption('2025');const past=await get();assert.deepEqual(stockView(past),stockView(initial));assert.notDeepEqual(rates(past),rates(initial));
 await category.locator('[data-ip-stock="0"]').click();
 assert.equal(await page.locator('#dialogsub [data-ip-time-year]').inputValue(),'2025');
 assert.equal(await page.locator('.ip-stock-detail .ip-stock-list-context,.ip-stock-detail .ip-stock-snapshot,.ip-stock-detail [data-ip-time-mode]').count(),0,'正文移除重复名称/说明及控件');
 assert(await page.locator('#dialogsub .ip-metric-period').evaluate(e=>{const b=e.getBoundingClientRect(),h=e.closest('.dialoghead').getBoundingClientRect();return b.top>=h.top&&b.bottom<=h.bottom&&b.left>h.left+h.width/2}),'时间控件在标题栏右上角');
 assert.equal(await page.locator('#dialogsub [data-ip-time-mode="year"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.ip-stock-results [data-ip-rule="warehouseValue"],.ip-stock-results [data-ip-rule="factoryValue"]').count(),0);
 await page.locator('#dialogsub [data-ip-time-mode="quarter"]').click();assert((await page.locator('.ip-stock-results [data-ip-signal="turn"]').allTextContents()).every(text=>text.trim().endsWith('次')&&!text.includes('/')),'抽屉周转率同样不带时间');assert.equal((await get()).metricPeriods.category.mode,'year','抽屉修改不回写父表');
 const query=page.locator('.ip-stock-detail [data-ip-query]');const name=await page.locator('.ip-stock-results tbody tr .ip-stock-product strong').first().innerText();await query.fill(name);
 const selectedSpu=await page.locator('.ip-stock-results [data-ip-spu]').first().getAttribute('data-ip-spu');
 await page.locator('.ip-stock-results [data-ip-spu]').first().click();await page.locator('.up-detail[data-up-tab="stock"]').waitFor();assert.equal(await page.locator('[data-up-panel="stock"] [data-stock-card="turn"] h4').innerText(),'近30日库存周转率');assert.equal(Number(await page.locator('[data-up-panel="stock"] [data-stock-card="turn"] strong').getAttribute('data-stock-raw')),initial.stockRecords.find(row=>row.spuId===selectedSpu).turn,'近30日周转与统一产品库存同源');await page.locator('.drawer-back').click();
 assert.equal(await page.locator('#dialogsub [data-ip-time-mode="quarter"]').getAttribute('aria-pressed'),'true');assert.equal(await query.inputValue(),name);await page.locator('#dialogsub [data-ip-time-mode="year"]').click();assert.equal(await page.locator('#dialogsub [data-ip-time-mode="year"]').getAttribute('aria-pressed'),'true','返回后标题控件事件仍有效');await page.locator('#close').click();
 await brand.locator('[data-ip-time-mode="month"]').click();assert.equal((await get()).metricPeriods.category.year,2025);assert.equal((await get()).metricPeriods.brand.mode,'month');
 await brand.locator('[data-ip-stock]').first().click();assert.deepEqual(await page.locator('#drawer-tabs button').allTextContents(),['全部品牌','spu明细']);assert.equal(await page.locator('#dialogsub [data-ip-time-mode="month"]').getAttribute('aria-pressed'),'true');
 await page.locator('#drawer-tabs [data-drawer-tab="brands"]').click();assert.equal(await page.locator('#dialogsub [data-ip-time-mode="month"]').getAttribute('aria-pressed'),'true','品牌Tab共用标题栏期间');
 for(const width of [1920,1024,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialog .dialoghead').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'标题栏不横向溢出 '+width)}
 await page.locator('#close').click();
 for(const width of [1440,1024,390]){await page.setViewportSize({width,height:1080});for(const panel of [category,brand])assert(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'控件不撑宽表格 '+width)}
 await page.setViewportSize({width:1920,height:1080});for(const panel of [category,brand])await panel.locator('[data-ip-time-mode="recent30"]').click();
 console.log('通过：货值名称/无提示/右对齐、三项指标日期重算、快照隔离、两表独立、抽屉继承返回');
}
