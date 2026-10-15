import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {verifyProductTodos} from './detail-todos.mjs';
import {verifyTodoDescription} from './todo-description.mjs';

export async function detailQualityTodos(page){
 verifyTodoDescription();
 // Independently verify weighted rates and partial week/month grouping.
 const sandbox={shiftDate:(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/05-quality-trend.js',import.meta.url),'utf8'),sandbox);
 const points=[{date:'2026-09-30',sales:100,returned:10,received:5},{date:'2026-10-01',sales:10,returned:5,received:2},{date:'2026-10-05',sales:0,returned:0,received:0}];
 const weeks=sandbox.upReturnBuckets(points,'week');assert.equal(weeks.length,2);assert.equal(weeks[0].returnRate,15/110*100);assert.equal(weeks[1].returnRate,null);assert.equal(sandbox.upReturnBuckets(points,'month').length,2);
 await page.locator('#riskrail [data-risk="0"]').click();
 await page.locator('#dialogsub [data-drawer-time-mode="month"]').click();
 await page.locator('#dialogsub [data-drawer-time-value]').selectOption('9');
 const detailRef=await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().getAttribute('data-qr-detail');
 await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
 await page.locator('[data-drawer-tab="quality"]').click();
 assert.equal(await page.locator('[data-up-return-series]').count(),3);
 assert.equal(await page.locator('.up-return-metrics [data-up-quality-metric]').count(),3);
 assert.deepEqual(await page.locator('.up-return-trend .up-trend-legend>span').allTextContents(),['总退','已收退','销量','总退目标','已收退目标']);
 assert.equal(await page.locator('.up-return-trend .metric-help').count(),0);
 assert.equal(await page.locator('[data-up-return-target][stroke-dasharray]').count(),2);
 const point=page.locator('[data-up-return-point]').first();await point.hover();
 assert.equal(await page.locator('#up-sales-tooltip').isVisible(),true);
 assert.deepEqual(await page.locator('.up-sales-tooltip-row>span').allTextContents(),['总退','已收退','销量','总退目标','已收退目标']);
 await page.mouse.move(0,0);
 assert.equal(await page.locator('.up-violation-stats [data-up-quality-metric]').count(),5);
 assert.equal(await page.locator('#up-quality-target').count(),0);
 assert.equal(await page.locator('#dialog .dialogfoot').isVisible(),false);
 const tops=await page.locator('.up-violation-stats .up-quality-metric').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert(tops.every(t=>t===tops[0]));
 const sum=()=>page.locator('[data-up-return-point]').evaluateAll(rows=>rows.reduce((n,e)=>n+Number(e.dataset.sales),0));
 const sales=await sum();
 for(const mode of ['week','month']){
  await page.locator('[data-up-return-period="'+mode+'"]').click();
  assert.equal(await page.locator('[data-up-return-point]').count(),24);
  assert((await sum())>=sales);
  await page.waitForFunction(()=>{const e=document.querySelector('[data-up-return-scroll]');return e.scrollWidth>e.clientWidth&&e.scrollLeft>0});
 }
 await page.locator('[data-up-return-period="day"]').click();assert.equal(await sum(),sales);
 await page.locator('[data-up-violation-type="罚款"]').click();
 assert.equal(await page.locator('[data-up-violation-type="罚款"]').getAttribute('aria-pressed'),'true');
 assert.doesNotMatch(await page.locator('#up-violation-table').innerText(),/红绿灯/);
 // The existing toolbar may render platform buttons over its source select.
 await page.locator('#up-platform').evaluate(e=>{e.value='京东';e.dispatchEvent(new Event('change',{bubbles:true}))});
 assert.equal(await page.locator('[data-up-violation-type="罚款"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-up-violation-platform]').getAttribute('data-up-violation-platform'),'京东');
 const actions=await page.locator('#up-violation-table tbody tr td:nth-child(7)').allTextContents();assert(actions.every(t=>t.includes('罚款')));if(!actions.length)assert.match(await page.locator('#up-violation-table').innerText(),/暂无违规条目/);
 const search=page.locator('[data-up-violation-search]');await search.fill('不存在的违规编号');assert.equal(await page.locator('#up-violation-table tbody tr').count(),0);await search.fill('');
 await page.locator('#up-platform').evaluate(e=>{e.value='all';e.dispatchEvent(new Event('change',{bubbles:true}))});
 assert.equal(await page.locator('.up-violation-tags').isVisible(),false);
 assert.equal(await page.locator('#up-violation-table').isVisible(),false);
 assert.equal(await page.locator('[data-up-violation-platform]').count(),0);
 assert.equal(await page.locator('.up-violation-stats [data-up-quality-metric]').count(),5);
 await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/detail-quality.png',import.meta.url))});
 await page.locator('[data-drawer-tab="stock"]').click();
 assert.equal(await page.locator('[data-up-panel="stock"] .up-stock-card').count(),5);
 assert.equal(await page.locator('#up-stock-skus tbody tr').count(),4);
 const tags=await page.locator('.up-stock-risk-tag').allTextContents();
 assert(tags.length<=2&&tags.every(t=>['缺货','调货','呆滞'].includes(t)));
 assert(!tags.includes('呆滞')||tags.length===1);
 assert.equal(await page.locator('.up-stock-donut svg').count(),1);
 assert.equal(await page.locator('.up-detail .metric-help').count(),0);
 await verifyProductTodos(page,detailRef);
}
