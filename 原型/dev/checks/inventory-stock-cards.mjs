import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
export async function verifyInventoryCards(page){
 // 已提供的底层货值优先采用；不同组成的财务单价可以不同。
 const ctx=vm.createContext({splitTarget:()=>[0,0,0,0],upIdentity:()=>({sourceRow:1}),upSummary:()=>({sales:100,returned:10}),shiftDate:()=> '2026-09-26',pfIdentity:()=>({attribute:'冬季品'}),fmt:String,upMoney:String,window:{}});
 vm.runInContext(readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(readFileSync(new URL('../../src/modules/unified-product/03-stock-balances.js',import.meta.url),'utf8'),ctx);
 const source={factoryAvailable:3,transit:2,purchaseOpen:5,warehouseValueCents:1100,factoryAvailableValueCents:900,transitValueCents:800,factoryInspection:1,factoryDefective:2,factoryUnrefurbished:4};
 const fact=ctx.upStockBalanceFacts({inventoryBalance:source},{warehouse:10,factory:10,undelivered:7,financePriceCents:100});
 assert.equal(fact.sellableUnits,15);assert.equal(fact.sellableValueCents,2800);assert.equal(fact.warehouseValueCents,1100);
 assert.equal(ctx.upStockBalanceFacts({inventoryBalance:{...source,sellableValueCents:0}},{warehouse:10,factory:10,undelivered:7,financePriceCents:100}).sellableValueCents,0,'真实零货值不被默认值覆盖');
 const allocation=readFileSync(new URL('../../src/modules/sales-target/01.js',import.meta.url),'utf8').split('\n').find(line=>line.startsWith('function splitTarget('));
 ctx.targetSum=values=>values.reduce((a,b)=>a+b,0);vm.runInContext(allocation,ctx);
 vm.runInContext(readFileSync(new URL('../../src/modules/unified-product/06-stock-model.js',import.meta.url),'utf8'),ctx);
 const sku=ctx.upStockModel({product:{spuCode:'demo'},stockEnd:'2026-10-10',stock:{warehouse:10,factory:10,undelivered:7,goodsValueCents:7777,warehouseValueCents:1100,factoryAvailable:3,sellableUnits:15,sellableValueCents:2800}},{end:'2026-10-10'});
 assert.equal(sku.rows.reduce((n,r)=>n+r.goodsValueCents,0),7777,'SKU保留底层总货值');
 assert.equal(sku.rows.reduce((n,r)=>n+r.warehouseValueCents,0),1100,'SKU保留底层我司可售货值');
 assert.equal(sku.rows.reduce((n,r)=>n+r.factoryAvailable,0),3,'SKU工厂可售与卡片一致');
 assert.equal(sku.rows.reduce((n,r)=>n+r.sellableUnits,0),15,'SKU可售库存与SPU一致');
 assert.equal(sku.rows.reduce((n,r)=>n+r.sellableValueCents,0),2800,'SKU可售货值保留底层值');
 assert.equal(sku.transit,2,'SKU在途汇总保留推导值');
 assert(sku.rows.every(r=>r.sellableUnits===r.warehouse+r.factoryAvailable+r.transit),'SKU可售组成不含工厂非良品及未交订单');


 const root=page.locator('#inventory'),cards=root.locator('.stock-overview-cards'),data=await page.evaluate(()=>inventoryControlAudit()),b=data.balance;
 assert.deepEqual(await cards.locator('h4').allTextContents(),['总库存','可售库存','我司可售库存','工厂可售库存','在途库存']);
 assert.equal(b.sellableUnits,b.warehouse+b.factoryAvailable+b.transit);
 assert.equal(b.totalUnits,b.sellableUnits+b.factoryInspection+b.factoryDefective+b.factoryUnrefurbished+b.purchaseOpen,'完整库存组成互斥且守恒');
 assert.equal(b.seasons.reduce((n,r)=>n+r.units,0),b.sellableUnits);assert.equal(b.seasons.reduce((n,r)=>n+r.valueCents,0),b.sellableValueCents);
 const all=await page.evaluate(()=>dashboardKeyProductsSnapshot().rows);
 for(const key of ['totalUnits','warehouse','goodsValueCents','warehouseValueCents','sellableUnits','sellableValueCents','transit','factory','factoryAvailable'])assert.equal(b[key],all.reduce((n,r)=>n+(r.stock?.[key]||0),0),'主表与库存卡同源 '+key);
 const shown=key=>cards.locator('[data-stock-quantity="'+key+'"]').innerText();
 for(const key of ['totalUnits','sellableUnits','warehouse','factoryAvailable','transit'])assert.equal(await shown(key),b[key].toLocaleString('en-US'));
 assert.equal(await cards.locator('[data-stock-card="warehouse"] .stock-card-head>span').innerText(),'货值');
 assert.equal(await cards.locator('.stock-card-foot .metric-help,[data-stock-card="warehouse"] .stock-card-head>span .metric-help').count(),0,'红框指标不再提供问号');
 assert.equal(Number(await cards.locator('[data-stock-value="sellableValueCents"]').getAttribute('data-stock-raw')),b.sellableValueCents);
 assert.equal(await cards.locator('[data-stock-card="sellable"] .stock-card-foot>span').innerText(),'货值');
 assert((await cards.locator('[data-stock-rule]').evaluateAll(es=>es.map(e=>e.dataset.metricRule))).every(text=>!text.includes('。')&&!text.includes('工厂各状态互斥')));
 for(const key of ['goodsValueCents','warehouseValueCents','factoryAvailableValueCents','transitValueCents'])assert.equal(Number(await cards.locator('[data-stock-value="'+key+'"]').getAttribute('data-stock-raw')),b[key],'卡片货值同源 '+key);
 assert.equal(await cards.locator('[data-stock-card="transit"] .stock-card-head>span').innerText(),'货值');
 assert.equal(await cards.locator('[data-stock-card="transit"] .stock-card-head>span .metric-help').count(),0);
 const tip=page.locator('#metric-tooltip'),settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 for(const segment of await cards.locator('.stock-season-segment').all()){
  const label=await segment.getAttribute('data-stock-season'),row=b.seasons.find(r=>r.label===label);
  assert.equal(Number(await segment.getAttribute('data-stock-units')),row.units);assert.equal(Number(await segment.getAttribute('data-stock-value')),row.valueCents);
  assert(Math.abs(Number(await segment.getAttribute('data-stock-share'))-row.units/b.sellableUnits*100)<1e-8);
  if(!row.units)continue;
  await segment.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await settle();await segment.focus();await tip.waitFor({state:'visible'});
  assert.match(await tip.innerText(),/可售库存：/);assert.match(await tip.innerText(),/可售货值：/);await page.keyboard.press('Escape');
 }
 for(const [key,text] of [['total','未交订单'],['sellable','工厂可售库存'],['warehouse','聚量实体仓仓库库存＋京东仓库存'],['factoryAvailable','已翻新良品库存'],['transit','采购调拨在途库存']]){
  const help=cards.locator('[data-stock-rule="'+key+'"]').first();await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await settle();await help.focus();await page.keyboard.press('Enter');await tip.waitFor({state:'visible'});assert.match(await tip.innerText(),new RegExp(text));await page.keyboard.press('Escape');
 }
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});assert(await cards.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'卡片不横向溢出 '+width);
  assert(await cards.locator('[data-stock-card="sellable"]').evaluate(e=>e.querySelector('.stock-season-aside').getBoundingClientRect().left>=e.querySelector('[data-stock-quantity]').getBoundingClientRect().right),'占比位于数量右侧 '+width);
  for(const card of await cards.locator('.stock-balance-card').all())assert(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'卡片内容不溢出 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：库存五卡、组成/货值守恒、季品占比与提示、问号口径、响应式布局');
}
