import assert from 'node:assert/strict';

export async function returnPlatformSamples(page){
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const snapshot=()=>page.evaluate(()=>riskPlatformCardsSnapshot()),board=page.locator('#riskrail [data-rp-board="6"]');
 const validate=async()=>{
  const model=(await snapshot()).boards.find(row=>row.kind===6);assert.equal(model.records.length,6);
  for(const record of model.records)for(const fact of record.platforms){
   assert(fact.gsvCents>0&&fact.netSales>0,record.spuId+' '+fact.platform+'有销售样例');
   assert(Number.isFinite(fact.returnRate)&&Number.isFinite(fact.receivedRate)&&fact.returnRate>=0&&fact.receivedRate>=0&&fact.receivedRate<=fact.returnRate,record.spuId+' '+JSON.stringify(fact));
  }
  for(const card of await board.locator('.rp-platform-product').all())for(const row of await card.locator('[data-rp-platform-row]').all()){
   for(const key of ['return','received','gsv','netSales']){const cell=row.locator('[data-rp-field="'+key+'"]');assert.notEqual(await cell.getAttribute('data-value'),'');assert(Number(await cell.getAttribute('data-value'))>=0);assert.doesNotMatch(await cell.locator('strong').innerText(),/^[-—]+$/)}
  }
  return model;
 };
 const initial=await validate();assert.deepEqual(initial.displayPlatforms,['抖音','天猫']);
 await board.locator('[data-rp-platform-option="all"]').click();const all=await validate();assert.equal(all.displayPlatforms.length,6);assert.equal(await board.locator('[data-rp-platform-row]').count(),36);
 const products=await page.evaluate(()=>dashboardNewProductsSnapshot());
 for(const id of ['003','006','009','043']){
  const product=products.rows.find(row=>row.spuId==='SPU-SOURCE-'+id);assert(product);assert.equal(product.salesChannels.length,6);
  for(const facts of product.platformFacts){assert(facts.sales>0&&facts.returned>0&&facts.received>0);assert(facts.received<=facts.returned&&facts.returned<=facts.sales);assert.equal(facts.gmvCents-facts.refundCents,facts.gsvCents)}
  for(const key of ['sales','returned','received','gsvCents'])assert.equal(product.platformFacts.reduce((n,row)=>n+row[key],0),product.current[key],'平台汇总守恒 '+key);
 }
 assert(products.rows.some(row=>row.salesChannels.length===1),'其余新品仍保留单平台样例');
 const card=board.locator('.rp-platform-product').first();
 const row=card.locator('[data-rp-platform-row="天猫"]'),rate=await row.locator('[data-rp-field="return"] strong').innerText();await row.locator('[data-rp-platform-detail]').click();assert.equal(await page.locator('.up-return-metrics [data-up-quality-metric="returned"] strong').innerText(),rate,'平台卡片与详情一致');await page.locator('#close').click();
 await board.screenshot({path:'outputs/return-platform-samples-1920.png'});await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});assert.deepEqual((await validate()).records,initial.records,'刷新不随机变化');
 console.log('通过：退货六卡六平台数据齐全、原缺失平台有销售退货、件数/金额关系与平台汇总守恒、详情同源及刷新稳定。');
}
