import assert from 'node:assert/strict';
export async function verifyInventoryMetricPeriod(page){
 const category=page.locator('#inventory .ip-group-panel[data-ip-dimension="category"]'),brand=page.locator('#inventory .ip-group-panel[data-ip-dimension="brand"]');
 const time=page.locator('#inventory>.sectionhead [data-ip-period-host]');
 const get=()=>page.evaluate(()=>window.inventoryControlAudit());
 const initial=await get(),stable=['warehouse','warehouseValueCents','factory','factoryValueCents','totalUnits','goodsValueCents','staleUnits','staleValueCents','staleRatio','staleValueRatio'];
 const stockView=data=>data.stockRecords.map(row=>Object.fromEntries(['spuId',...stable].map(key=>[key,row[key]])));
 const rates=data=>data.stockRecords.map(row=>[row.turn,row.delivery,row.refurbRate]);
 assert.equal(await time.count(),1,'右上角仅一份时间控件');
 assert.equal(await page.locator('#inventorytable [data-ip-time-mode]').count(),0,'两表不再单独放时间控件');
 assert(await time.evaluate(e=>{const r=e.getBoundingClientRect(),head=e.closest('.sectionhead').getBoundingClientRect();return r.left>head.left+head.width/2&&r.top>=head.top&&r.bottom<=head.bottom}),'桌面控件位于模块右上角');
 assert.deepEqual(await time.locator('[data-ip-time-mode]').allTextContents(),['月','季','年']);
 assert.equal(initial.metricPeriod.mode,'quarter','默认当季');
 assert.equal(initial.metricPeriod.year,+initial.snapshot.slice(0,4));assert.equal(initial.metricPeriod.value,Math.ceil(+initial.snapshot.slice(5,7)/3));
 assert.equal(await time.locator('.follow-time').count(),0);
 for(const panel of [category,brand]){
  const labels=await panel.locator('thead th').allTextContents();
  assert.equal(labels[2],'货值（总库存）');assert.equal(labels[4],'货值（我司可售）');assert.equal(labels[6],'货值（工厂总库存）');assert.equal(labels[9],'呆滞金额');assert(!labels.includes('总可售天数')&&!labels.includes('我司可售天数'));
  assert.equal(labels.indexOf('库存周转率'),labels.indexOf('交付及时率')-1);
  assert.equal(await panel.locator('[data-ip-rule="warehouseValue"],[data-ip-rule="factoryValue"]').count(),0);
  assert.equal(await panel.locator('.ip-signal small').count(),0);
  assert((await panel.locator('[data-ip-metric$="Cents"]').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign))).every(value=>value==='right'));
 }
 assert.equal(await page.locator('#inventorymetrics [data-stock-rule="value"]').count(),0);
 const money=page.locator('#inventorymetrics [data-stock-card="warehouse"] .stock-summary-worth');assert(await money.evaluate(e=>{const labelNode=e.closest('.stock-summary-card').querySelector('.stock-card-head .stock-summary-label'),label=labelNode.getBoundingClientRect(),value=e.querySelector('strong').getBoundingClientRect(),quantity=e.parentElement.querySelector('.primary').getBoundingClientRect();return label.bottom<=value.top+1&&Math.abs(label.left+parseFloat(getComputedStyle(labelNode).paddingLeft)-value.left)<=1.1&&quantity.right<=e.getBoundingClientRect().left+1}),'数量与货值分列，货值标签位于金额上方');
 assert.equal(await time.locator('.ip-metric-scope').innerText(),'筛选影响：库存周转率、交付及时率、翻新闭环率','说明日期实际影响范围');
 assert.equal(await time.locator('.metric-help').count(),0,'移除时间筛选说明浮窗入口');
 for(const mode of ['month','quarter','year']){
  await time.locator('[data-ip-time-mode="'+mode+'"]').click();const data=await get();
  assert((await category.locator('[data-ip-signal="turn"]').allTextContents()).every(text=>text.trim().endsWith('次')&&!text.includes('/')),'周转率只显示次数 '+mode);
  assert.equal(data.metricPeriod.mode,mode);assert.deepEqual(stockView(data),stockView(initial),'日期不改写库存快照');
  assert.deepEqual(data.balance,initial.balance);assert.deepEqual(data.overview.unrefurbished,initial.overview.unrefurbished,'未翻新数保持原库存指标，不改为期间未完成请购单');if(data.overview.range.start!==initial.overview.range.start){assert.notDeepEqual(data.brand.map(row=>row.turn),initial.brand.map(row=>row.turn),'品牌表同步重算');assert.notDeepEqual(rates(data),rates(initial),'期间三指标实际重算 '+mode)}
  assert.equal(data.overview.turn,data.stockTotal.turn);assert.equal(data.overview.delivery,data.stockTotal.delivery);
  assert.deepEqual(data.overview.refurb,data.stockTotal.refurb,'卡片与两表共用闭环及分布');
  assert.equal(Number(await page.locator('#inventorymetrics [data-stock-turn]').getAttribute('data-stock-turn')),data.stockTotal.turn);
  const [green,yellow]={month:[.85,.3],quarter:[2.5,.9],year:[10,3.6]}[mode],rawTurn=data.stockTotal.turn;
  const tone=!Number.isFinite(rawTurn)?'muted':rawTurn>=green?'green':rawTurn>=yellow?'yellow':'red';
  const turnCard=page.locator('#inventorymetrics [data-stock-turn]');
  assert(await turnCard.evaluate((el,expected)=>el.classList.contains(expected),tone),'周转率卡片按当前期间阈值判色 '+mode);
  if(tone!=='muted')assert(await turnCard.evaluate((el,tone)=>{const probe=document.createElement('span');probe.style.color='var(--'+(tone==='yellow'?'orange':tone)+')';el.append(probe);const expected=getComputedStyle(probe).color;probe.remove();return getComputedStyle(el).color===expected},tone),'周转率卡片使用当前主题灯色 '+mode);

  assert.equal(Number(await page.locator('#inventorymetrics [data-stock-refurb-rate]').getAttribute('data-stock-refurb-rate')),data.stockTotal.refurbRate);
  assert.deepEqual(JSON.parse(await page.locator('#inventorymetrics [data-ip-refurb-summary]').getAttribute('data-ip-refurb-summary')),data.overview.refurb,'点击分布与切换后期间模型一致');
  for(const groups of [data.category,data.brand]){
   assert(Math.abs(groups.reduce((n,row)=>n+row.cost,0)-data.stockTotal.cost)<1e-5);
   assert.equal(groups.reduce((n,row)=>n+row.deliveryDue,0),data.stockTotal.deliveryDue);
   assert.equal(groups.reduce((n,row)=>n+row.refurb.total,0),data.stockTotal.refurb.total);
  }
  assert.equal(await page.locator('#inventorymetrics [data-stock-card="turn"] .stock-card-foot').count(),0,'周转率卡不重复展示期间日期');
  assert((await time.locator('.ip-metric-range').innerText()).includes(data.overview.range.start.slice(2).replaceAll('-','/')),'统一时间控件显示所选期间');
  for(const row of data.stockRecords){assert(row.deliveryOn<=row.deliveryDue);assert.equal(row.delivery,row.deliveryDue?row.deliveryOn/row.deliveryDue*100:null);for(const order of row.refurbOrders){assert(order.completedAt>=data.overview.range.start&&order.completedAt<=data.overview.range.cutoff,'按翻新交付完成日期归期');assert.equal(order.spuId,String(row.spuId))}}
 }
 await time.locator('[data-ip-time-year]').selectOption('2025');const past=await get();assert.deepEqual(stockView(past),stockView(initial),'日期筛选不改最新库存');assert.equal(past.snapshot,initial.snapshot);assert.notDeepEqual(rates(past),rates(initial));
 for(const width of [1440,1024,390]){await page.setViewportSize({width,height:1080});for(const panel of [category,brand])assert(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'控件不撑宽表格 '+width);assert(await time.evaluate(e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&r.left>=0&&r.right<=innerWidth}),'统一控件适配窄屏 '+width)}
 await page.setViewportSize({width:1920,height:1080});await time.locator('[data-ip-time-mode="'+initial.metricPeriod.mode+'"]').click();await time.locator('[data-ip-time-year]').selectOption(String(initial.metricPeriod.year));await time.locator('[data-ip-time-value]').selectOption(String(initial.metricPeriod.value));
 console.log('通过：货值名称/无提示/右对齐、三项指标日期重算、快照隔离、卡片两表统一期间');
}
