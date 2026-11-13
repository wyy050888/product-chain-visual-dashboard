import assert from 'node:assert/strict';
import {verifyStockRankingModel,assertRankingOrder,shortageTuple} from './stock-ranking-model.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
function skuOperatingModel(){
 const totals={sales:155,returned:34,gsvCents:345678,profitCents:10000},ctx=vm.createContext({boundedCache:()=>new Map(),targetSum:rows=>rows.reduce((sum,value)=>sum+value,0),upIdentity:p=>p,upFactsKey:(p,platform,start,end)=>p.spuId+'|'+start+'|'+end,upSummary:(_p,start)=>start==='zero'?{sales:0,returned:0,gsvCents:0,profitCents:0}:totals,stockQuantity:String,upMoney:String});
 const split=fs.readFileSync(new URL('../../src/modules/sales-target/01.js',import.meta.url),'utf8').match(/^function splitTarget.*$/m)[0];vm.runInContext(split,ctx);
 for(const file of ['06-stock-model.js','06-sku-operating-samples.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/'+file,import.meta.url),'utf8'),ctx);
 const product={spuId:'spu',spuCode:'SPU',name:'样例产品'},rows=ctx.upSkuOperatingRows(product,'2026-09-25','2026-10-24');
 for(const key of ['sales','returned','gsvCents','profitCents'])assert.equal(rows.reduce((sum,row)=>sum+row[key],0),totals[key],'SKU合计与SPU一致 '+key);
 assert(rows.some(row=>row.profitRate>0)&&rows.some(row=>row.profitRate<0),'SKU利润样例覆盖盈利和亏损');
 for(const row of rows)assert.equal(row.profitRate,row.gsvCents>0?row.profitCents/row.gsvCents*100:null);
 assert.equal(rows.reduce((sum,row)=>sum+row.netSales,0),121);assert(rows.every(row=>row.sales-row.returned===row.netSales&&Number.isInteger(row.gsvCents)));
 assert(ctx.upSkuOperatingRows(product,'zero','zero').every(row=>row.gsvCents===0&&row.netSales===0),'零值及不同期间不串用缓存');
}
function skuInventoryValues(){
 const ctx=vm.createContext({targetSum:rows=>rows.reduce((sum,value)=>sum+value,0),upSummary:()=>({sales:150,returned:0}),shiftDate:v=>v,upIdentity:p=>p,pfIdentity:()=>({attribute:'冬季品'}),filterCatalog:{seasons:['冬季品']},stockQuantity:String,upMoney:String,fmt:String});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/sales-target/01.js',import.meta.url),'utf8').match(/^function splitTarget.*$/m)[0],ctx);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/06-stock-model.js',import.meta.url),'utf8'),ctx);
 const stock={warehouse:10,factory:10,undelivered:7,transit:2,factoryAvailable:3,warehouseValueCents:1100,factoryAvailableValueCents:900,transitValueCents:800,sellableUnits:15,sellableValueCents:2800,goodsValueCents:7777};
 const model=patch=>ctx.upStockModel({product:{spuCode:'demo'},stock:{...stock,...patch}},{end:'2026-10-26'});
 const rows=model().rows;
 for(const row of rows)assert.equal(row.sellableCoverage15,row.dailyNet15>0?(row.warehouse+row.transit+row.factoryAvailable)/row.dailyNet15:null,'SKU天数使用本SKU组成及净销量');
 assert(rows.some(row=>row.dailyNet15>0&&row.sellableCoverage15!==stock.sellableUnits/10),'SKU不继承SPU可售天数');
 for(const key of ['warehouseValueCents','factoryAvailableValueCents','transitValueCents','sellableValueCents','goodsValueCents'])assert.equal(rows.reduce((sum,r)=>sum+r[key],0),stock[key],'SKU分配守恒 '+key);
 for(const row of rows)assert.equal(row.sellableValueCents,row.warehouseValueCents+row.factoryAvailableValueCents+row.transitValueCents,'可售货值等于对应SKU组成货值');
 assert(model({factoryAvailableValueCents:undefined,transitValueCents:undefined}).rows.every(row=>row.factoryAvailableValueCents===null&&row.transitValueCents===null),'缺失的SKU组成金额不继承SPU金额、不补0');
 assert.equal(model({sellableValueCents:0}).rows.reduce((sum,r)=>sum+r.sellableValueCents,0),0,'独立提供的零货值仍保留');
}
export function shortageModel(){
 skuOperatingModel();
 skuInventoryValues();
 verifyStockRankingModel();
}
export async function shortagePreview(page){
 await page.locator('#riskrail [data-rp-card-season="3"]').selectOption('all',{force:true});
 shortageModel();
 const snapshot=await page.evaluate(()=>window.shortageRankingSnapshot());assert(snapshot.rows.length>=6);
 assert.match(snapshot.rule,/非清仓品、非下架品/);assert.match(snapshot.rule,/可售天数≤15天/);assert.match(snapshot.rule,/总可售天数≤45天/);assert.doesNotMatch(snapshot.rule,/独立排序|30天|红黄规则/);
 const seen=new Set();for(const row of snapshot.rows){assert(row.skuId&&row.skuCode&&!seen.has(row.skuId));seen.add(row.skuId);assert(row.dailyNet15>0&&(row.sellableCoverage15<=15||row.totalCoverage15<=45));assert(Math.abs((row.warehouse+row.transit+row.factoryAvailable)/row.dailyNet15-row.sellableCoverage15)<1e-8);assert.equal(row.shortageType,row.sellableCoverage15<=15?1:2);assert.equal(row.tone,row.shortageType===1?'rp-quality-red':'rp-quality-yellow');assert(!row.clearance&&!['下架','清仓','清仓品'].includes(row.state));}
 assertRankingOrder(snapshot.rows,shortageTuple);
 const card=page.locator('#riskrail [data-rp-board="3"]');assert.deepEqual(await card.locator('.rp-identity b').allTextContents(),snapshot.rows.slice(0,6).map(r=>r.name));
 assert.deepEqual(await card.locator('.rp-stock-columns span').allTextContents(),['可售库存','可售天数','总库存','总可售天数','近15日均净销量']);
 const first=card.locator('.rp-stock-entry').first();assert.deepEqual(await first.locator('[data-rp-field]').evaluateAll(es=>es.map(e=>e.dataset.rpField)),['sellable','sellableCoverage15','total','totalCoverage15','dailyNet15']);
 for(const key of ['sellable','total'])assert.match(await first.locator('[data-rp-field='+key+'] small').innerText(),/^货值 /);
 for(const key of ['sellableCoverage15','totalCoverage15','dailyNet15'])assert.equal((await first.locator('[data-rp-field='+key+'] small').innerText()).trim(),'');
 assert.equal(await card.locator('[data-rp-field=sellableCoverage15] .number-signal,[data-rp-field=totalCoverage15] .number-signal').count(),0,'外侧两项天数只显示文字，不套数值标签');
 for(const key of ['sellableCoverage15','totalCoverage15'])assert((await first.locator('[data-rp-field='+key+'] strong').getAttribute('class')).includes(snapshot.rows[0].tone),'保留天数原风险文字色');
 assert.equal(await card.locator('.rp-identity small').count(),0,'SKU卡片不展示编码及季品行');
 assert.equal(await card.locator('.rp-shortage-tag').count(),0,'外侧不展示缺货条件标签');
 const help=page.locator('#riskrail [data-rp-board="0"] .card-metric-help');await help.hover();assert.doesNotMatch(await page.locator('#metric-tooltip').innerText(),/相关链接按平台、链接ID去重/);await page.mouse.move(0,0);
 await card.locator('[data-risk]').click();assert.equal(await page.locator('.rp-list-table th').nth(1).innerText(),'SKU信息');
 const headers=await page.locator('.rp-list-table th').allTextContents();assert.deepEqual(headers.map(text=>text.trim()),['序号','SKU信息','可售库存','可售天数','我司可售库存','工厂可售库存','在途库存','总库存','总可售天数','近15日均净销量','GSV','销量','利润率','属性','操作']);
 for(const key of ['sellable','warehouse','factoryAvailable','transit','total']){
  const index=await page.locator('.rp-list-table [data-rp-sort='+key+']').evaluate(node=>node.closest('th').cellIndex),cell=page.locator('.rp-list-table tbody tr').first().locator('td').nth(index);
  assert.match(await cell.locator('strong').innerText(),/件$/);assert.match(await cell.innerText(),/货值 /);
 }
 assert.equal(await page.locator('.rp-list-table th:has([data-rp-sort=netSales]) .net-sales-help').count(),1);assert.equal(await page.locator('.rp-list-table th:has([data-rp-sort=margin]) .metric-help').count(),0);
 for(const key of ['gsv','netSales']){const index=await page.locator('.rp-list-table [data-rp-sort='+key+']').evaluate(node=>node.closest('th').cellIndex);assert.notEqual(await page.locator('.rp-list-table tbody tr').first().locator('td').nth(index).locator('strong').innerText(),'—','SKU经营样例已接入 '+key);}
 for(const key of ['gsv','netSales','margin']){
  const index=await page.locator('.rp-list-table [data-rp-sort='+key+']').evaluate(node=>node.closest('th').cellIndex),cell=page.locator('.rp-list-table tbody tr').first().locator('td').nth(index);
  assert.match(await cell.locator('em').innerText(),/^环比 /);assert(await cell.evaluate(e=>e.querySelector('em').getBoundingClientRect().top>=e.querySelector('strong').getBoundingClientRect().bottom),'经营指标上值下环比 '+key);
 }
 const code=snapshot.rows[0].skuCode;await page.getByRole('searchbox',{name:'SKU搜索'}).fill(code);const rows=page.locator('.rp-list-table tbody tr');assert.equal(await rows.count(),1);assert.equal(await rows.first().locator('.rp-sku-identity').getAttribute('data-sku-code'),code);assert.equal(await rows.first().locator('.rp-identity small').innerText(),'SKU码：'+code,'抽屉恢复SKU码，不附带季品');
 await rows.first().getByRole('button',{name:'查看详情',exact:true}).click();assert(await page.locator('[data-up-panel="stock"]').isVisible(),'SKU仍关联正确产品库存详情');
 await page.locator('#close').click();
}
