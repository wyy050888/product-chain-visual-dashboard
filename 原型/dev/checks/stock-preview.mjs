import assert from 'node:assert/strict';

// 库存风险已统一SKU；不再运行旧SPU分摊、旧列集和旧冻结卡片的断言。
export async function stockPreview(page){
 const expected={3:['sellable','sellableCoverage15','total','totalCoverage15','dailyNet15'],4:['staleUnits','staleValue','age','warehouse','coverage15','dailyNet15']};
 for(const width of [1920,1100,390]){
  await page.setViewportSize({width,height:1080});
  assert.equal(await page.locator('.rp-stock-card .rp-quality-metric').evaluateAll(nodes=>nodes.filter(node=>node.scrollWidth>node.clientWidth+1).length),0,'库存卡片指标不能溢出');
 }
 await page.setViewportSize({width:1920,height:1080});
 for(const kind of [3,4]){
  const card=page.locator('.rp-stock-card').filter({has:page.locator('[data-risk="'+kind+'"]')}),first=card.locator('.rp-stock-entry').first(),count=await card.locator('.rp-stock-entry').count();
  assert(count<=6);
  if(count)assert.deepEqual(await first.locator('[data-rp-field]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpField)),expected[kind]);
  await card.locator('[data-risk]').click();const table=page.locator('.rp-stock-table');await table.waitFor();
  assert.equal(await table.locator('.rp-list-risks,[data-rp-trend],.rp-mini-trend').count(),0,'没有旧分组与趋势列');
  if(count){
   for(const key of expected[kind]){
    const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(node=>node.closest('th').cellIndex);
    assert.equal(await first.locator('[data-rp-field="'+key+'"] strong').innerText(),await table.locator('tbody tr').first().locator('td').nth(index).locator('strong').innerText(),'卡片及完整榜单同SKU同值');
   }
   assert(await table.locator('.rp-sku-identity[data-sku-code]').count()>0);
   assert.equal(await table.locator('[data-stock]').count(),0,'不恢复旧品类库存明细入口');
  }
  await page.locator('#close').click();
 }
 console.log('通过：SKU缺货/呆滞现用字段、卡片与完整榜单一致、无旧分组入口及窄屏边界');
}
