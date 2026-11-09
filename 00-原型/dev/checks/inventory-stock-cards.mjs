import {businessRuleContext} from './business-rules-context.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
export async function verifyInventoryCards(page){
 // 已提供的底层货值优先采用；不同组成的财务单价可以不同。
 const ctx=businessRuleContext({splitTarget:()=>[0,0,0,0],upIdentity:()=>({sourceRow:1}),upSummary:()=>({sales:100,returned:10}),shiftDate:()=> '2026-09-26',pfIdentity:()=>({attribute:'冬季品'}),fmt:String,upMoney:String,window:{}});
 vm.runInContext(readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(readFileSync(new URL('../../src/modules/unified-product/03-stock-balances.js',import.meta.url),'utf8'),ctx);
 const source={factoryAvailable:3,transit:2,purchaseOpen:5,warehouseValueCents:1100,factoryAvailableValueCents:900,transitValueCents:800,factoryInspection:1,factoryDefective:2,factoryUnrefurbished:4};
 const fact=ctx.upStockBalanceFacts({inventoryBalance:source},{warehouse:10,factory:10,undelivered:7,financePriceCents:100});
 assert.equal(fact.sellableUnits,15);assert.equal(fact.sellableValueCents,2800);assert.equal(fact.warehouseValueCents,1100);
 assert.equal(ctx.upStockBalanceFacts({inventoryBalance:{...source,sellableValueCents:0}},{warehouse:10,factory:10,undelivered:7,financePriceCents:100}).sellableValueCents,0,'真实零货值不被默认值覆盖');
 const allocation=readFileSync(new URL('../../src/modules/sales-target/01.js',import.meta.url),'utf8').split('\n').find(line=>line.startsWith('function splitTarget('));
 ctx.targetSum=values=>values.reduce((a,b)=>a+b,0);vm.runInContext(allocation,ctx);
 vm.runInContext(readFileSync(new URL('../../src/modules/ui-controls/00-stock-quantity.js',import.meta.url),'utf8'),ctx);
 assert.equal(ctx.stockQuantity(0),'0件');assert.equal(ctx.stockQuantity(null),'—');assert.equal(ctx.stockQuantity(NaN),'—');
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
 assert.deepEqual(await cards.locator('h4').allTextContents(),['总库存','我司可售库存','工厂可售库存','在途库存','库存周转率','交付及时率','翻新闭环率']);
 assert.equal(b.sellableUnits,b.warehouse+b.factoryAvailable+b.transit);
 assert.equal(b.totalUnits,b.sellableUnits+b.factoryInspection+b.factoryDefective+b.factoryUnrefurbished+b.purchaseOpen,'完整库存组成互斥且守恒');
 assert.equal(b.seasons.reduce((n,r)=>n+r.units,0),b.sellableUnits);assert.equal(b.seasons.reduce((n,r)=>n+r.valueCents,0),b.sellableValueCents);
 assert.equal(data.overview.staleUnits,data.stockTotal.staleUnits);
 assert.equal(data.overview.staleValueCents,data.stockTotal.staleValueCents);
 assert.equal(data.overview.seasons.reduce((n,r)=>n+r.units,0),data.overview.staleUnits);
 assert.equal(data.overview.seasons.reduce((n,r)=>n+r.valueCents,0),data.overview.staleValueCents);
 assert.equal(data.overview.turn,data.stockTotal.turn,'总览与分类表共用所选期间成本及平均库存');
 assert.equal(Number(await cards.locator('[data-stock-turn]').getAttribute('data-stock-turn')),data.overview.turn);
 assert.equal(await cards.locator('[data-stock-card="stale"]').count(),0,'移除顶部呆滞库存卡，数据保留在分布与趋势中');
 assert.equal(Number(await cards.locator('[data-stock-delivery]').getAttribute('data-stock-delivery')),data.stockTotal.delivery,'交付卡与类目品牌表共用期间分子分母');
 const all=await page.evaluate(()=>dashboardKeyProductsSnapshot().rows);
 for(const key of ['totalUnits','warehouse','goodsValueCents','warehouseValueCents','sellableUnits','sellableValueCents','transit','factory','factoryAvailable'])assert.equal(b[key],all.reduce((n,r)=>n+(r.stock?.[key]||0),0),'主表与库存卡同源 '+key);
 const shown=key=>cards.locator('[data-stock-quantity="'+key+'"]').innerText();
 for(const key of ['totalUnits','warehouse','factoryAvailable','transit'])assert.equal(await shown(key),b[key].toLocaleString('en-US')+'件');
 assert.equal(await cards.locator('[data-stock-card="warehouse"] .stock-summary-label').innerText(),'货值');
 assert.equal(await cards.locator('.stock-card-foot .metric-help,[data-stock-card="warehouse"] .stock-card-head>span .metric-help').count(),0,'红框指标不再提供问号');
 assert.equal(await cards.locator('[data-stock-card="sellable"]').count(),0,'移除概览可售库存卡，底层模型保留');
 assert((await cards.locator('[data-stock-rule]').evaluateAll(es=>es.map(e=>e.dataset.metricRule))).every(text=>!text.includes('。')&&!text.includes('工厂各状态互斥')));
 for(const key of ['goodsValueCents','warehouseValueCents','factoryAvailableValueCents','transitValueCents'])assert.equal(Number(await cards.locator('[data-stock-value="'+key+'"]').getAttribute('data-stock-raw')),b[key],'卡片货值同源 '+key);
 assert.equal(await cards.locator('[data-stock-card="transit"] .stock-summary-label').innerText(),'货值');
 assert.equal(await cards.locator('[data-stock-card="transit"] .stock-card-head>span .metric-help').count(),0);
 const tip=page.locator('#metric-tooltip'),settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const distribution=root.locator('.ip-stale-distribution');
 assert.equal(await cards.locator('[data-stock-card="staleDistribution"]').count(),0,'旧小卡已拆为两个完整图表');
 await distribution.locator('[data-ip-stale-metric="units"]').click();
 for(const row of data.overview.seasons)assert.equal(await distribution.locator('[data-stock-stale-season="'+row.label+'"]').innerText(),row.units.toLocaleString('en-US')+'件');
 await distribution.locator('[data-ip-stale-metric="valueCents"]').click();
 for(const [key,text] of [['total','未交订单'],['warehouse','聚量实体仓仓库库存＋京东仓库存'],['factoryAvailable','已翻新良品库存'],['transit','采购调拨在途库存']]){
  const help=cards.locator('[data-stock-rule="'+key+'"]').first();await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await settle();await help.focus();await page.keyboard.press('Enter');await tip.waitFor({state:'visible'});assert.match(await tip.innerText(),new RegExp(text));await page.keyboard.press('Escape');
 }
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});assert(await cards.locator('..').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1}),'卡片区完整适配窗口 '+width);
  const positions=await cards.locator(':scope > *').evaluateAll(es=>es.map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})));
  const columns=width>1100?3:width>600?2:1;assert.equal(new Set(positions.map(r=>Math.round(r.top))).size,6/columns,'桌面三列两行，窄屏按两列/单列换行 '+width);
  for(let i=0;i<6;i+=columns)assert(positions.slice(i,i+columns).every(r=>Math.abs(r.top-positions[i].top)<1&&Math.abs(r.bottom-positions[i].bottom)<1),'同排卡片等高 '+width);
  assert.equal(await cards.locator('.stock-season-aside').count(),0,'两卡不再使用标题旁微型图例');
  assert.equal(await cards.locator('[data-stock-card="turn"] .stock-card-foot,[data-stock-card="refurb"] .stock-card-foot').count(),0,'移除指定两卡底部内容');
  for(const card of await cards.locator('.stock-balance-card').all()){
   assert(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'卡片内容不溢出 '+width);
   assert(await card.evaluate(e=>e.getBoundingClientRect().height<=112),'卡片高度随精简内容收紧 '+width);
   assert(await card.evaluate(e=>{const foot=e.querySelector('.stock-card-foot'),value=e.querySelector('.primary');return !foot||foot.getBoundingClientRect().top-value.getBoundingClientRect().bottom<=8}),'底行贴近主值、不留自动撑开空白 '+width);
  }
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：库存七卡保留原六网格位置、周转与交付独立、组成/货值守恒、独立呆滞分布图、问号口径、响应式布局');
}
