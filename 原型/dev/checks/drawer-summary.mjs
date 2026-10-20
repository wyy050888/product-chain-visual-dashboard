import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
async function assertSummaryFirst(table){
 await table.locator('tfoot.drawer-summary-first').waitFor();
 const layout=await table.evaluate(node=>{
  const foot=node.tFoot,body=node.tBodies[0],head=node.tHead,box=el=>el.getBoundingClientRect();
  return {sections:[...node.children].map(el=>el.tagName),display:getComputedStyle(foot).display,label:foot.rows[0].cells[0].textContent.trim(),
   top:box(foot).top,headBottom:box(head).bottom,bottom:box(foot).bottom,detailTop:box(body.rows[0]).top,count:node.querySelectorAll('tfoot').length};
 });
 assert.equal(layout.count,1);assert.equal(layout.display,'table-row-group');assert.match(layout.label,/合计|总计/);
 assert(layout.sections.indexOf('THEAD')<layout.sections.indexOf('TFOOT')&&layout.sections.indexOf('TFOOT')<layout.sections.indexOf('TBODY'));
 assert(Math.abs(layout.top-layout.headBottom)<2,'合计紧贴表头下方');assert(layout.bottom<=layout.detailTop+2,'合计在首条明细之前');
}
export async function drawerSummary(page){
 await page.locator('a[href="#cost"]').click();const audit=await page.evaluate(()=>window.costControlAudit());
 await page.locator('#cost [data-cc-department="research"]').click();const cost=page.locator('.cc-department-table table');
 for(const department of audit.departments){
  await page.locator('#drawer-tabs [data-drawer-tab="'+department.id+'"]').click();await assertSummaryFirst(cost);
  assert.deepEqual(await cost.locator('tbody td:first-child').allTextContents(),department.metrics,'合计不挤入指标明细');
  const expected=audit.rows.find(row=>row.id===department.id).values.month,money=value=>Number.isFinite(value)?(value/1000000).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})+'w':'--';
  assert.equal((await cost.locator('tfoot [data-cc-value="month-amount"]').innerText()).replaceAll(' ',''),money(expected.target)+'/'+money(expected.actual));
 }
 for(const mode of ['quarter','year','month']){await page.locator('#dialogsub [data-cc-mode="'+mode+'"]').click();await assertSummaryFirst(cost)}
 await page.locator('#drawer-tabs [data-drawer-tab="research"]').click();await assertSummaryFirst(cost);
 await cost.screenshot({path:fileURLToPath(new URL('../../outputs/drawer-summary-first.png',import.meta.url))});
 await page.locator('#close').click();assert.equal(await page.locator('#costtable tfoot').count(),0,'页面不新增合计');
 await page.locator('a[href="#inventory"]').click();
 const panels=page.locator('#inventory .ip-group-panel');await panels.first().locator('[data-ip-stock]').first().click();const stock=page.locator('.ip-stock-results table');
 await assertSummaryFirst(stock);await page.locator('[data-ip-clear="category"]').click();await assertSummaryFirst(stock);
 const total=await stock.locator('tfoot').innerText(),pager=page.locator('.ip-stock-pages .list-pagination');
 const totalRecords=Number(await pager.getAttribute('data-list-total'));assert(totalRecords>20);
 assert.equal(await stock.locator('tbody tr').count(),20,'合计不占明细分页名额');
 await page.locator('.ip-stock-pages [data-list-page="2"]').first().click();await assertSummaryFirst(stock);assert.equal(await stock.locator('tfoot').innerText(),total,'翻页合计不变');
 await stock.locator('[data-rp-sort="warehouse"]').click();await assertSummaryFirst(stock);assert.equal(await stock.locator('tfoot').innerText(),total,'排序合计不变');
 await page.locator('[data-ip-query]').fill('不存在的库存产品');await assertSummaryFirst(stock);assert.equal(await stock.locator('tbody tr[data-ip-row]').count(),0);assert.equal(await pager.getAttribute('data-list-total'),'0');
 await page.locator('[data-ip-reset]').click();await assertSummaryFirst(stock);await page.locator('#close').click();
 await panels.nth(1).locator('[data-ip-stock]').first().click();await assertSummaryFirst(stock);
 await page.locator('#drawer-tabs [data-drawer-tab="brands"]').click();await assertSummaryFirst(stock);
 await page.locator('#drawer-tabs [data-drawer-tab="spus"]').click();await assertSummaryFirst(stock);
 for(const width of [1920,390]){await page.setViewportSize({width,height:1080});await assertSummaryFirst(stock);assert(await page.locator('#dialogbody').evaluate(node=>node.scrollWidth<=node.clientWidth+1))}
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();assert.equal(await page.locator('main .drawer-summary-first').count(),0);
 console.log('通过：降本9部门及月季年、库存两层合计置首，排序/分页/空结果/窄屏与金额守恒');
}
