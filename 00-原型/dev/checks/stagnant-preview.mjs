import assert from 'node:assert/strict';
import {verifyStockRankingModel,assertRankingOrder,warningTuple} from './stock-ranking-model.mjs';
function stagnantModel(){
 verifyStockRankingModel();
}
export async function stagnantPreview(page){
 await page.locator('#riskrail [data-rp-card-season="4"]').selectOption('all',{force:true});
 stagnantModel();const snapshot=await page.evaluate(()=>window.stagnantRankingSnapshot());console.log('呆滞SKU样例：'+snapshot.rows.length+'条');
 assert.match(snapshot.rule,/我司可售天数≥60天/);assert.doesNotMatch(snapshot.rule,/45≤|＜60天|红黄规则|独立排序/);
 for(const row of snapshot.rows){assert(row.skuId&&row.skuCode);assert(row.warehouse>0&&row.dailyNet15>0&&row.coverage15>=60);assert(Math.abs(row.warehouse/row.dailyNet15-row.coverage15)<1e-8);assert.equal(row.tone,'rp-quality-red');}
 assertRankingOrder(snapshot.rows,warningTuple);
 const card=page.locator('#riskrail [data-rp-board="4"]');
 assert(snapshot.rows.length>=6,'默认呆滞榜应有足够的演示SKU');
assert.deepEqual(await card.locator('.rp-identity b').allTextContents(),snapshot.rows.slice(0,6).map(r=>r.name));assert.equal(await card.locator('.rp-identity small').count(),0,'SKU卡片不展示编码及季品行');
 assert.deepEqual(await card.locator('.rp-stock-columns span').allTextContents(),['呆滞库存','呆滞货值','呆滞最高库龄','我司可售库存','我司可售天数','近15日均净销量']);
 const cardDays=await card.locator('[data-rp-field="coverage15"]>strong').allTextContents();assert.equal(cardDays.length,6);
 for(const [index,value] of cardDays.entries())assert.equal(value,Number(snapshot.rows[index].coverage15).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'天','外侧天数读取同一SKU原值');
 await card.locator('[data-risk]').click();assert.equal(await page.locator('.rp-list-table th').nth(1).innerText(),'SKU信息');
 const shown=await page.locator('.rp-list-table .rp-sku-identity').evaluateAll(nodes=>nodes.map(node=>node.dataset.skuCode));assert.deepEqual(shown,snapshot.rows.slice(0,shown.length).map(row=>row.skuCode),'完整榜单与卡片统一排序');
 const first=snapshot.rows[0],daysColumn=await page.locator('.rp-list-table [data-rp-sort=coverage15]').evaluate(n=>n.closest('th').cellIndex);const coverage=page.locator('.rp-list-table tbody tr').first().locator('td').nth(daysColumn).locator('strong');assert((await coverage.getAttribute('class')).includes(first.tone));
 assert.equal(await coverage.innerText(),cardDays[0],'外侧与抽屉我司可售天数一致');
 assert.equal(await page.locator('.rp-list-table .rp-identity small').first().innerText(),'SKU码：'+first.skuCode,'呆滞抽屉恢复编码，不附带季品');
 await page.getByRole('searchbox',{name:'SKU搜索'}).fill(first.skuCode);assert.equal(await page.locator('.rp-list-table tbody tr').count(),1);await page.locator('.rp-list-table tbody tr').getByRole('button',{name:'查看详情',exact:true}).click();assert(await page.locator('[data-up-panel=stock]').isVisible());
 const detailRow=page.locator('#up-stock-skus tr[data-sku-code="'+first.skuCode+'"]');assert.equal(await detailRow.count(),1);
 for(const key of ['warehouse','dailyNet15','coverage15'])assert.equal(Number(await detailRow.locator('[data-stock-metric="'+key+'"]').getAttribute('data-stock-raw')),first[key],'榜单与SKU库存详情原值一致 '+key);
 await page.locator('#close').click();
}
