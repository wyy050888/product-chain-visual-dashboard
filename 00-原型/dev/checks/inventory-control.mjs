import {businessRuleContext} from './business-rules-context.mjs';
import {verifyInventorySeasonFilter} from './inventory-season-filter.mjs';
import {verifyInventoryRefurb} from './inventory-refurb.mjs';
import {verifyInventoryGroupSort} from './inventory-group-sort.mjs';
import {verifyInventorySummaryHelp} from './inventory-summary-help.mjs';
import {verifyInventoryMetricPeriod} from './inventory-metric-period.mjs';
import {verifyInventoryGroups} from './inventory-groups.mjs';
import {verifyInventoryCards} from './inventory-stock-cards.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function inventoryControl(page){
 let mode='month';const context=businessRuleContext({window:{},periodFor:()=>({mode})});
 vm.runInContext(fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),context);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/inventory-period/02-rules.js',import.meta.url),'utf8'),context);
 for(const [period,green,yellow] of [['month',.85,.3],['quarter',2.5,.9],['year',10,3.6]]){
  mode=period;assert.equal(context.ipSignal('turn',green),'green');assert.equal(context.ipSignal('turn',green-.001),'yellow');assert.equal(context.ipSignal('turn',yellow),'yellow');assert.equal(context.ipSignal('turn',yellow-.001),'red');
 }
 // 卡片使用自身期间，不能被全局/部门页面的期间覆盖；边界按未舍入原值判定。
 mode='year';
 for(const [period,green,yellow] of [['month',.85,.3],['quarter',2.5,.9],['year',10,3.6]]){
  for(const [value,tone] of [[green,'green'],[green-.0001,'yellow'],[yellow,'yellow'],[yellow-.0001,'red'],[0,'red'],[null,'none'],[NaN,'none']])assert.equal(context.ipSignal('turn',value,period),tone,'周转率独立期间 '+period+' / '+value);
 }
 for(const [kind,value,tone] of [['delivery',98,'green'],['delivery',97.999,'yellow'],['delivery',97.5,'yellow'],['delivery',97.499,'red'],['turn',null,'none'],['delivery',NaN,'none']])assert.equal(context.ipSignal(kind,value),tone);
 const audit=()=>page.evaluate(()=>window.inventoryControlAudit());
 await page.locator('a[href="#inventory"]').click();
 assert.equal(await page.locator('#inventory h2').innerText(),'全品类库存管控');
 assert.equal(await page.locator('#inventory [data-time-scope] button').count(),0);
 assert.equal(await page.locator('#inventory [data-inv]').count(),0);
 assert.deepEqual(await page.locator('#inventory .ip-group-panel h3').allTextContents(),['类目库存','品牌库存']);
 const panels=page.locator('#inventory .ip-group-panel'),[left,right]=await panels.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().toJSON()));
 assert(right.x>left.x+left.width&&Math.abs(right.y-left.y)<1);
 const initial=await audit();await verifyInventoryCards(page);await verifyInventoryRefurb(page);
 const refurbOrders=initial.records.flatMap(row=>row.refurbOrders);
 assert(refurbOrders.some(row=>row.completedAt&&(Date.parse(row.completedAt)-Date.parse(row.arrivedAt))/86400000===30),'样例覆盖到厂后第30天完成');
 assert(refurbOrders.some(row=>row.requisitionId&&!row.completedAt),'样例覆盖未完成请购单');
 // 全局回看不得改写实时库存，本月统计也保持一致。
 await page.locator('#globaltime [data-time-mode="year"]').dispatchEvent('click');
 await page.locator('#globaltime [data-time-year]').selectOption('2025',{force:true});
 assert.deepEqual((await audit()).total,initial.total);assert.deepEqual((await audit()).period,initial.period);
 assert.equal(await page.locator('#inventory [data-time-scope] button').count(),0);
 await verifyInventoryGroups(page,initial);
 await verifyInventoryMetricPeriod(page);
 await verifyInventorySummaryHelp(page);
 await verifyInventoryGroupSort(page);
 await verifyInventorySeasonFilter(page);
 for(const width of [1366,1024,390]){
  await page.setViewportSize({width,height:1080});
  assert(await page.locator('#inventory').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}));
  for(const panel of await panels.all())assert(await panel.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}));
 }
 await page.setViewportSize({width:1920,height:1080});
}
