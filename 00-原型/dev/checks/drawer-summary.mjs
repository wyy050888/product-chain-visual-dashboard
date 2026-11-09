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
  assert.equal((await cost.locator('tfoot [data-cc-value="month-amount"]').innerText()).replaceAll(' ',''),money(expected.actual)+'/'+money(expected.target));
 }
 for(const mode of ['quarter','year','month']){await page.locator('#dialogsub [data-cc-mode="'+mode+'"]').click();await assertSummaryFirst(cost)}
 await page.locator('#drawer-tabs [data-drawer-tab="research"]').click();await assertSummaryFirst(cost);
 await cost.screenshot({path:fileURLToPath(new URL('../../outputs/drawer-summary-first.png',import.meta.url))});
 await page.locator('#close').click();assert.equal(await page.locator('#costtable tfoot').count(),0,'页面不新增合计');
 assert.equal(await page.locator('main .drawer-summary-first').count(),0);
 console.log('通过：降本9部门及月季年合计置首与金额守恒');
}
