import assert from 'node:assert/strict';
import {verifyStockRankingModel,assertRankingOrder,warningTuple} from './stock-ranking-model.mjs';
function stagnantModel(){
 verifyStockRankingModel();
}
export async function stagnantPreview(page){
 await page.locator('#riskrail [data-rp-card-season="4"]').selectOption('all',{force:true});
 stagnantModel();const snapshot=await page.evaluate(()=>window.stagnantRankingSnapshot());console.log('呆滞SKU样例：'+snapshot.rows.length+'条');
 assert.match(snapshot.rule,/可售库存＞0件.*可售天数≥60天/);assert.doesNotMatch(snapshot.rule,/我司可售天数|45≤|＜60天|红黄规则|独立排序/);
 for(const row of snapshot.rows){assert(row.skuId&&row.skuCode);assert(row.sellableUnits>0&&row.dailyNet15>0&&row.sellableCoverage15>=60);assert.equal(row.sellableUnits,row.warehouse+row.transit+row.factoryAvailable);assert(Math.abs(row.sellableUnits/row.dailyNet15-row.sellableCoverage15)<1e-8);assert.equal(row.tone,'rp-quality-red');}
 assert(snapshot.rows.some(row=>row.coverage15<60),'可售天数达标且我司可售天数未达标的SKU也入榜');
 assertRankingOrder(snapshot.rows,warningTuple);
 const card=page.locator('#riskrail [data-rp-board="4"]');
 assert(snapshot.rows.length>=6,'默认呆滞榜应有足够的演示SKU');
assert.deepEqual(await card.locator('.rp-identity b').allTextContents(),snapshot.rows.slice(0,6).map(r=>r.name));assert.equal(await card.locator('.rp-identity small').count(),0,'SKU卡片不展示编码及季品行');
 const metrics=card.locator('.rp-stock-entry').first().locator('.rp-quality-mobile-label');
 assert.deepEqual(await metrics.allTextContents(),['库存','货值','最高库龄','责任渠道','可售库存','可售天数','近15日均净销量']);
 const helpRules=['呆滞库存','呆滞货值','呆滞最高库龄','用我司可售库存判定责任渠道，当出现产品呆滞预警时，判断当前我司可售天数最高的虚拟仓'];
 const tooltip=page.locator('#metric-tooltip');
 for(const [index,rule] of helpRules.entries()){
  const help=metrics.nth(index).locator('.metric-help');
  await help.scrollIntoViewIfNeeded();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await help.evaluate(element=>element.focus({preventScroll:true}));
  await page.keyboard.press('Enter');
  await tooltip.waitFor({state:'visible'});assert.equal(await tooltip.innerText(),rule);
  await page.keyboard.press('Escape');
 }
 await metrics.nth(3).locator('.metric-help').click();assert(await tooltip.isVisible());assert(await page.locator('#overlay').isHidden(),'点击问号不会打开详情');
 await page.keyboard.press('Escape');
 const expectedChannels=snapshot.rows.slice(0,6).map(row=>row.responsibleChannel??'—');
 assert(expectedChannels.some(channel=>channel!=='—'),'样例含可归责的渠道');
 const warehouses=['抖音仓','快手仓','视频号仓','一类仓','经销渠道虚拟仓'];
 assert(snapshot.rows.every(row=>row.responsibleChannel===null||warehouses.includes(row.responsibleChannel)),'归责仅使用虚拟仓枚举');
 const responsible=card.locator('[data-rp-field="responsibleChannel"]>strong');
 assert.deepEqual(await responsible.allTextContents(),expectedChannels);
 const fontSize=node=>getComputedStyle(node).fontSize;
 assert.equal(await responsible.first().evaluate(fontSize),await card.locator('[data-rp-field="sellableCoverage15"]>strong').first().evaluate(fontSize),'仓名与数字同字号');
 const cardDays=await card.locator('[data-rp-field="sellableCoverage15"]>strong').allTextContents();assert.equal(cardDays.length,6);
 for(const [index,value] of cardDays.entries())assert.equal(value,Number(snapshot.rows[index].sellableCoverage15).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'天','外侧天数读取同一SKU原值');
 await card.locator('[data-risk]').click();assert.equal(await page.locator('.rp-list-table th').nth(1).innerText(),'SKU信息');
 const shown=await page.locator('.rp-list-table .rp-sku-identity').evaluateAll(nodes=>nodes.map(node=>node.dataset.skuCode));assert.deepEqual(shown,snapshot.rows.slice(0,shown.length).map(row=>row.skuCode),'完整榜单与卡片统一排序');
 const first=snapshot.rows[0],daysColumn=await page.locator('.rp-list-table [data-rp-sort=sellableCoverage15]').evaluate(n=>n.closest('th').cellIndex);const coverage=page.locator('.rp-list-table tbody tr').first().locator('td').nth(daysColumn).locator('strong');assert((await coverage.getAttribute('class')).includes(first.tone));
 assert.deepEqual(await page.locator('.rp-list-table th .rp-stagnant-metric-help').evaluateAll(nodes=>nodes.map(node=>node.dataset.metricRule)),helpRules);
 assert.equal(await coverage.innerText(),cardDays[0],'外侧与抽屉可售天数一致');
 assert.equal(await page.locator('.rp-list-table .rp-identity small').first().innerText(),'SKU码：'+first.skuCode,'呆滞抽屉恢复编码，不附带季品');
 await page.getByRole('searchbox',{name:'SKU搜索'}).fill(first.skuCode);assert.equal(await page.locator('.rp-list-table tbody tr').count(),1);await page.locator('.rp-list-table tbody tr').getByRole('button',{name:'查看详情',exact:true}).click();assert(await page.locator('[data-up-panel=stock]').isVisible());
 const detailRow=page.locator('#up-stock-skus tr[data-sku-code="'+first.skuCode+'"]');assert.equal(await detailRow.count(),1);
 const detailFacts={warehouse:first.warehouse,coverage15:first.coverage15,sellableUnits:first.sellableUnits,sellableCoverage15:first.sellableCoverage15,netSales15:Math.round(first.dailyNet15*15)};
 for(const [key,value] of Object.entries(detailFacts))assert.equal(Number(await detailRow.locator('[data-stock-metric="'+key+'"]').getAttribute('data-stock-raw')),value,'榜单与SKU库存详情原值一致 '+key);
 await page.locator('#close').click();
}
