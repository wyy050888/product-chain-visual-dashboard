import assert from 'node:assert/strict';
import {verifyStockCoverage} from './stock-coverage.mjs';

export async function stockBatchSamples(page){
 verifyStockCoverage();
 await page.clock.setFixedTime(new Date('2026-10-27T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const data=await page.evaluate(()=>({inventory:inventoryControlAudit(),warning:stagnantRankingSnapshot().rows}));
 const samples={'SPU-SOURCE-026':'2026-03-18','SPU-SOURCE-019':'2026-05-12','SPU-SOURCE-027':'2026-04-06','SPU-SOURCE-017':'2026-06-09'};
 for(const [id,date]of Object.entries(samples)){
  const source=data.inventory.records.find(row=>row.spuId===id),stock=data.inventory.stockRecords.find(row=>row.spuId===id);
  assert.equal(source.staleOldestReceivedDate,date);assert.equal(source.staleBatchSampleSource,'冬季批次演示');
  assert(stock.staleOldestSellableUnits>0&&stock.staleOldestSellableUnits<=stock.staleUnits&&stock.staleOldestSellableUnits<=stock.warehouse);
  const days=(Date.parse('2026-10-27')-Date.parse(date))/86400000;assert.equal(stock.staleMaxAgeDays,days);
  const rows=data.warning.filter(row=>row.spuId===id);assert.equal(rows.length,3,'每款覆盖已入榜的三个SKU');assert(rows.every(row=>row.staleMaxAgeDays===days));
 }
 const rows=data.warning.filter(row=>row.attribute==='冬季品'),card=page.locator('#riskrail [data-rp-board="4"]');
 assert.deepEqual(await card.locator('[data-rp-card-season]').evaluate(node=>[...node.selectedOptions].map(option=>option.value)),['冬季品']);
 const values=await card.locator('[data-rp-field="age"]').evaluateAll(nodes=>nodes.map(node=>({main:node.querySelector('strong').textContent,aux:node.querySelector('small').textContent})));
 assert.equal(values.length,6);
 for(const [index,value]of values.entries()){assert.equal(value.main,rows[index].staleMaxAgeDays+'天');const units=Number(value.aux.replace(/[^\d]/g,''));assert(units>0&&units<=rows[index].staleUnits,'最老批次为该SKU呆滞数量子集')}
 await card.locator('[data-risk]').click();const ageColumn=await page.locator('.rp-list-table [data-rp-sort="age"]').evaluate(node=>node.closest('th').cellIndex);
 const listed=page.locator('.rp-list-table tbody tr');for(let i=0;i<6;i++){const cell=listed.nth(i).locator('td').nth(ageColumn);assert.equal(await cell.locator('strong').innerText(),values[i].main);assert.equal(await cell.locator('em').innerText(),values[i].aux,'卡片/完整榜单共用批次库存')}
 await page.locator('#close').click();console.log('通过：四款冬季SPU批次/12条预警SKU，日期计算、数量边界、卡片及完整榜单同源，原有批次及零库存保留');
}
