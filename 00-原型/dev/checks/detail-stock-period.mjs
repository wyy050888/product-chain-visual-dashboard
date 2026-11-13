import assert from 'node:assert/strict';
import {verifyProductStockCards} from './detail-stock-cards.mjs';
import {verifyRefurbDistribution} from './inventory-refurb.mjs';

export async function detailStockPeriod(page){
 await page.clock.setFixedTime(new Date('2026-10-31T04:00:00Z'));await page.reload();
 await page.locator('#riskrail [data-qr-detail]').first().click();
 const root=page.locator('.up-detail:not(.sd-detail)'),stock=root.locator('[data-up-panel="stock"]'),time=root.locator('[data-up-stock-period]');
 const operatingDates=[await root.getAttribute('data-up-start'),await root.getAttribute('data-up-end')];
 const initialInventoryPeriod=await page.evaluate(()=>window.inventoryControlAudit().metricPeriod);
 await root.locator('[data-drawer-tab="stock"]').click();
 assert(await time.isVisible());assert(await root.locator('.up-detail-period').isHidden());
 assert.deepEqual(await time.locator('[data-ip-time-mode]').allTextContents(),['月','季','年']);
 assert.equal(await time.locator('[data-ip-time-mode="quarter"]').getAttribute('aria-pressed'),'true');
 assert.equal(await time.locator('[data-ip-time-year]').inputValue(),'2026');assert.equal(await time.locator('[data-ip-time-value]').inputValue(),'4');
 assert.equal(await time.locator('.ip-metric-scope').innerText(),'筛选影响：库存周转率、交付及时率、翻新闭环率');
 assert.equal(await time.locator('.follow-time').count(),0);
 await verifyProductStockCards(page);
 const read=()=>stock.locator('[data-stock-card]').evaluateAll(cards=>Object.fromEntries(cards.map(card=>[card.dataset.stockCard,[...card.querySelectorAll('[data-stock-raw]')].map(e=>e.dataset.stockRaw)])));
 const start=await read();let previous=null;
 async function verifyPeriod(period){
  const id=await root.getAttribute('data-up-spu');
  assert.deepEqual(await page.evaluate(()=>window.inventoryControlAudit().metricPeriod),initialInventoryPeriod,'库存详情不回写总览期间');
  const overviewTime=page.locator('#inventory [data-ip-period-host]');
  async function setOverview(value){
   await overviewTime.locator('[data-ip-time-mode="'+value.mode+'"]').evaluate(el=>el.click());
   await overviewTime.locator('[data-ip-time-year]').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('change',{bubbles:true}))},value.year);
   if(value.mode!=='year')await overviewTime.locator('[data-ip-time-value]').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('change',{bubbles:true}))},value.value);
  }
  await setOverview(period);
  const data=await page.evaluate(()=>window.inventoryControlAudit()),row=data.stockRecords.find(row=>row.spuId===id);
  assert(row,'总览可找到当前SPU');
  const facts={cost:row.cost,avg:row.avg,turn:row.turn,delivery:row.delivery,on:row.deliveryOn,due:row.deliveryDue,importedStock:row.importedStock,refurbRate:row.refurbRate,refurb:row.refurb,orders:row.refurbOrders,range:data.overview.range};
  await setOverview(initialInventoryPeriod);
  const rate=stock.locator('[data-stock-card="refurbRate"] .ip-refurb-rate');
  assert.equal(await rate.evaluate(el=>getComputedStyle(el).color),'rgb(22, 119, 255)');
  assert.equal(await rate.locator('.ip-refurb-arrow').innerText(),'›');
  await verifyRefurbDistribution(page,rate,facts.refurb);
  assert((await page.locator('#ip-refurb-distribution h4').innerText()).startsWith(await rate.getAttribute('data-ip-refurb-name')));
  const now=await read();
  for(const key of ['total','sellable','dailyNet15'])assert.deepEqual(now[key],start[key],'期间不改最新库存/近15日净销量 '+key);
  const numeric=v=>v[0]===''?null:Number(v[0]);
  assert.equal(numeric(now.turn),facts.turn);assert.equal(numeric(now.delivery),facts.delivery);assert.equal(numeric(now.refurbRate),facts.refurbRate);
  assert.equal(facts.turn,facts.avg>0?facts.cost/facts.avg:null);
  assert.equal(facts.delivery,facts.due>0?(facts.on+facts.importedStock)/facts.due*100:null);
  assert.equal(facts.refurbRate,facts.refurb.total&&!facts.refurb.unknown?facts.refurb.onTime/facts.refurb.total*100:null);
  for(const order of facts.orders)assert(order.orderedAt>=facts.range.start&&order.orderedAt<=facts.range.cutoff,'翻新按采购单下单日归期');
  const skuRates=await stock.locator('[data-stock-metric="turn"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.stockRaw));
  if(previous&&previous.period.mode!==period.mode)assert.notDeepEqual(skuRates,previous.skuRates,'SKU周转率随期间重算');
  previous={period,skuRates};
  assert.equal(await stock.locator('[data-rp-sort="delivery"],[data-rp-sort="refurbRate"]').count(),0,'SKU不增加交付/翻新列');
  assert.equal(await stock.locator('thead th').count(),10);
  assert.deepEqual([await root.getAttribute('data-up-start'),await root.getAttribute('data-up-end')],operatingDates,'不改经营/品质日期');
  assert.deepEqual(await page.evaluate(()=>window.inventoryControlAudit().metricPeriod),initialInventoryPeriod,'恢复库存总览期间');
 }
 await verifyPeriod({mode:'quarter',year:2026,value:4});
 await stock.locator('.ip-refurb-rate').focus();await page.locator('#ip-refurb-distribution').waitFor({state:'visible'});
 await time.locator('[data-ip-time-mode="month"]').click();await page.locator('#ip-refurb-distribution').waitFor({state:'hidden'});await time.locator('[data-ip-time-value]').selectOption('9');
 await verifyPeriod({mode:'month',year:2026,value:9});
 await stock.locator('[data-rp-sort="turn"]').click();
 await time.locator('[data-ip-time-mode="year"]').click();await verifyPeriod({mode:'year',year:2026,value:1});
 assert.equal(await stock.locator('th:has([data-rp-sort="turn"])').getAttribute('aria-sort'),'descending','日期切换保留SKU排序');
 await time.locator('[data-ip-time-year]').selectOption('2025');await verifyPeriod({mode:'year',year:2025,value:1});
 await root.locator('[data-drawer-tab="quality"]').click();assert(await time.isHidden());
 await root.locator('[data-drawer-tab="operating"]').click();assert(await time.isHidden());
 await root.locator('[data-drawer-tab="stock"]').click();assert.equal(await time.locator('[data-ip-time-year]').inputValue(),'2025');
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:1080});
  assert(await page.locator('#dialogbody').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'日期不撑破抽屉 '+width);
  assert(await time.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}),'日期位于可视范围 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 console.log('通过：产品库存独立月季年、三项SPU指标、SKU周转重算及无交付/翻新列、日期/排序隔离、历史和窄屏。');
}
