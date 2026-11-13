import {openNewProductSpu} from './new-products-detail.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function newAssessmentSort(page){
 // 跨年季度、空值与同值保持原顺序，避免按标签或格式化金额排序。
 const box=vm.createContext({uiPeriodValidDate:v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')});
 for(const file of ['risk-presentation/03-sort.js','new-products/03-assessment-sort.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),box);
 const sample=(id,actualLaunch,gsvCents)=>({id,actualLaunch,successAssessment:{facts:{gsvCents}}});
 const fixtures=[sample('missing','',null),sample('a','2026-10-01',101),sample('b','2027-01-01',100),sample('tie','2026-12-30',101)];
 assert.deepEqual(Array.from(box.nspAssessmentSortRows(fixtures,{key:'quarter',direction:'asc'}),r=>r.id),['a','tie','b','missing']);
 assert.deepEqual(Array.from(box.nspAssessmentSortRows(fixtures,{key:'gsv',direction:'desc'}),r=>r.id),['a','tie','b','missing']);
 assert.deepEqual(Array.from(box.nspAssessmentSortRows(fixtures,{key:'gsv',direction:'asc'}),r=>r.id),['b','a','tie','missing']);
 await page.clock.setFixedTime(new Date('2026-11-15T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const outer=await page.evaluate(()=>{const d=dashboardNewProductsSnapshot();return {period:d.period,filters:d.filters}});
 await page.locator('#newtop [data-nsp-assessment-entry]').click();
 const host=page.locator('[data-nsp-assessment-table]'),audit=()=>page.evaluate(()=>{const d=dashboardNewProductAssessmentSnapshot();return {sort:d.sort,page:d.page,result:d.result,rows:d.rows.map(p=>({spuId:p.spuId,actualLaunch:p.actualLaunch,successAssessment:{success:p.successAssessment.success,facts:p.successAssessment.facts}}))}});
 const button=key=>host.locator('[data-nsp-assess-sort="'+key+'"]');
 const resultTab=key=>page.locator('#dialog [data-nsp-assess-result="'+key+'"],#drawer-tabs [data-drawer-tab="'+key+'"]').first();
 const yearNode=await page.locator('[data-nsp-assess-year]').elementHandle(),tableNode=await host.locator('table').elementHandle(),sortNode=await button('gsv').elementHandle();
 await host.locator('[data-ui-column-handle="0"]').focus();await page.keyboard.press('ArrowRight');
 const colgroup=await host.locator('colgroup').elementHandle(),columnWidth=await host.locator('colgroup col').first().getAttribute('style');
 const expected=data=>{
  const value=p=>data.sort.key==='quarter'?Number(p.actualLaunch.slice(0,4))*4+Math.ceil(Number(p.actualLaunch.slice(5,7))/3):data.sort.key==='launch'?Date.parse(p.actualLaunch):p.successAssessment.facts[{gsv:'gsvCents',profit:'profitRate',returns:'returnRate'}[data.sort.key]];
  return data.rows.filter(p=>data.result==='all'||p.successAssessment.success===(data.result==='success')).map((row,index)=>({row,index,value:value(row)})).sort((a,b)=>Number.isFinite(a.value)!==Number.isFinite(b.value)?Number.isFinite(a.value)?-1:1:!Number.isFinite(a.value)?a.index-b.index:(data.sort.direction==='asc'?a.value-b.value:b.value-a.value)||a.index-b.index).map(r=>r.row.spuId);
 };
 const verify=async(reuse=true)=>{
  if(reuse){assert(await yearNode.evaluate(node=>node.isConnected),'季度/年度切换保留年份组件');assert(await tableNode.evaluate(node=>node.isConnected),'排序和期间切换保留表格');assert(await sortNode.evaluate(node=>node.isConnected),'排序按钮不重建');assert(await colgroup.evaluate(node=>node.isConnected),'保留用户列宽节点');assert.equal(await host.locator('colgroup col').first().getAttribute('style'),columnWidth,'数据更新保留用户列宽')}
  const data=await audit(),ids=expected(data),visible=await host.locator('[data-nsp-assess-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.nspAssessProduct));
  assert.deepEqual(visible,ids.slice((data.page-1)*10,data.page*10),'按所选期间原始指标先排序后分页');
  if(visible.length)assert.equal(await button(data.sort.key).locator('..').getAttribute('aria-sort'),data.sort.direction==='asc'?'ascending':'descending');
  return data;
 };
 assert.deepEqual((await audit()).sort,{key:'gsv',direction:'desc'});await verify();
 assert.equal(await host.locator('[data-nsp-assess-sort]').count(),5);
 assert.equal(await button('gsv').locator('..').locator('.metric-help').count(),0,'考核GSV表头移除问号及悬浮说明');
 await page.locator('[data-nsp-assess-page="2"]').first().click();assert.equal((await verify()).page,2);
 await button('gsv').click();assert.equal((await verify()).page,1,'改变排序回到第一页');
 for(const key of ['quarter','profit','returns','launch','gsv']){
  if((await audit()).sort.key!==key)await button(key).click();
  await verify();await button(key).focus();await page.keyboard.press('Enter');await verify();
 }
 await button('profit').click();const retained=(await verify()).sort;
 await page.locator('[data-nsp-assess-result="failure"]').click();assert.deepEqual((await verify()).sort,retained);
 await page.locator('[data-nsp-assess-matrix="3"][data-nsp-assess-chain="all"][data-nsp-assess-pool="all"]').first().click();assert.deepEqual((await verify()).sort,retained);
 await page.locator('[data-nsp-assess-result="all"]').click();await verify();
 const before=await host.locator('[data-nsp-assess-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.nspAssessProduct));
 await openNewProductSpu(host.locator('[data-nsp-assess-product]').first());await page.locator('.up-detail').waitFor();await page.locator('#close').click();await page.locator('.nsp-assessment').waitFor();
 assert.deepEqual((await verify()).sort,retained);assert.deepEqual(await host.locator('[data-nsp-assess-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.nspAssessProduct)),before,'详情返回保留顺序');
 await page.locator('[data-nsp-assess-kind="year"]').click();assert.deepEqual((await verify()).sort,retained);
 for(const width of [1920,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#dialogbody').evaluate(node=>node.scrollWidth<=node.clientWidth+2),'只允许表格内部横滚');await button('gsv').click();await verify()}
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 const after=await page.evaluate(()=>dashboardNewProductsSnapshot());assert.deepEqual(after.filters,outer.filters);assert.deepEqual(after.period,outer.period);
 await page.locator('#newtop [data-nsp-assessment-entry]').click();assert.deepEqual((await verify(false)).sort,{key:'gsv',direction:'desc'},'重新打开默认GSV降序');await Promise.all([yearNode,tableNode,sortNode,colgroup].map(handle=>handle.dispose()));
 console.log('通过：考核五列升降序、全量排序后分页、期间/Tab/详情返回保留排序、重开默认GSV、空值/同值/跨年和宽窄屏。');
}
