import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import {verifyManagementPeriod} from './product-management-period.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function productManagement(page){
 const root=page.locator('#matrix'),model=()=>page.evaluate(()=>window.dashboardKeyProductManagementSnapshot()),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const drawer=page.locator('#dialogbody .kpm-management-drawer'),close=()=>page.locator('#close').click();
 await page.locator('a[href="#matrix"]').click();await clearKeyProductFilters(page);
 assert.equal(await root.locator('[data-kpm-management-tab]').count(),0);assert.equal(await root.locator('.kpm-management-section:visible').count(),2);
 const all=await snapshot(),unchanged=async()=>assert.deepEqual((await snapshot()).visible.map(p=>p.spuId),all.visible.map(p=>p.spuId),'主表不受经营明细点击影响');
 assert.equal(await root.locator('.kpm-management-summary,.kpm-cycle-focus,.kpm-management-filter').count(),0);
 const shots={changes:'desktop',structure:'structure'};
 for(const tab of ['changes','structure']){
  const data=await model();
  for(const group of (tab==='changes'?data.groups:data.structureGroups)){
   const button=root.locator('[data-kpm-management-scope="'+tab+'"][data-kpm-management-pick="'+group.key+'"]');
   if(!group.ids.length){assert(await button.isDisabled());continue}
   await button.click();await drawer.waitFor();await unchanged();
   assert.equal(await page.locator('#dialog .kpm-management-heading .metric-help,#dialog .kpm-management-drawer .metric-help').count(),0,'经营抽屉不自动添加通用口径问号');
   assert(await page.locator('#drawer-tabs').isHidden(),'经营明细无页签');assert.equal(await page.locator('#drawer-tabs button').count(),0);assert.equal(await drawer.locator('.kpm-management-list-head,.kpm-management-periods').count(),0,'标题和状态不在正文重复');assert.deepEqual(await page.locator('.kpm-management-period-picker [data-drawer-time-mode]').allTextContents(),['近30天','月','季','年']);
   assert.equal(await page.locator('#dialogsub [data-kpm-period]').count(),tab==='cycles'?1:2);
   if(tab==='changes'){assert.match(await page.locator('#dialogsub [data-kpm-period=current]').innerText(),/^本期/);assert.match(await page.locator('#dialogsub [data-kpm-period=previous]').innerText(),/^上期/);assert.doesNotMatch(await drawer.locator('thead').innerText(),/考核/)}

   assert.match(await page.locator('.kpm-management-heading-count').innerText(),new RegExp(group.ids.length+'个'));
   const rowIds=await drawer.locator('[data-kpm-list-spu]').evaluateAll(ns=>ns.map(n=>n.dataset.kpmListSpu));assert(rowIds.length>0);assert(rowIds.every(id=>group.ids.includes(id)));if(group.ids.length<=20)assert.deepEqual([...rowIds].sort(),[...group.ids].sort(),'明细与点击集合一致');
   const product=all.rows.find(p=>p.spuId===rowIds[0]);await drawer.locator('[data-kpm-list-search]').fill(product.spuCode);
   assert.equal(await drawer.locator('[data-kpm-list-spu]').count(),1);assert.equal(await drawer.locator('[data-kpm-list-spu]').getAttribute('data-kpm-list-spu'),product.spuId);
   await drawer.locator('[data-kpm-list-search]').fill('不存在的产品');assert.match(await drawer.locator('.kpm-management-list-table').innerText(),/暂无/);
   await drawer.locator('[data-kpm-list-reset]').click();
   if(tab==='changes'&&group.key==='down'){
    await drawer.locator('[data-kpm-list-search]').fill(product.spuCode);await drawer.locator('[data-kpm-list-detail]').click();await page.locator('.up-detail').waitFor();await close();await drawer.waitFor();assert(await page.locator('#drawer-tabs').isHidden(),'嵌套返回仍无页签');assert.equal(await page.locator('.kpm-management-heading').count(),1);assert.equal(await page.locator('#dialog .kpm-management-heading .metric-help').count(),0,'返回后不补回问号');assert.equal(await drawer.locator('[data-kpm-list-search]').inputValue(),product.spuCode);await drawer.locator('[data-kpm-list-reset]').click();
    await drawer.screenshot({path:fileURLToPath(new URL('../../outputs/product-management-drilldown.png',import.meta.url))});
   }
   await close();await unchanged();
  }
  await root.locator('.kpm-sidebar').screenshot({path:fileURLToPath(new URL('../../outputs/product-management-'+shots[tab]+'.png',import.meta.url))});
 }
 
 for(const mode of ['quarter','year','recent30']){
  await root.locator('[data-time-mode="'+mode+'"]').click();const observed=await snapshot(),structure=(await model()).structure;
  assert.equal(structure.reduce((n,g)=>n+g.count,0),observed.visible.length);
  assert.equal(structure.reduce((n,g)=>n+g.profit,0),observed.visible.reduce((n,p)=>n+p.facts.profitCents,0));
  assert(Math.abs(structure.reduce((n,g)=>n+(g.share||0),0)-100)<1e-8);
 }
 const before=await snapshot();await root.locator('[data-kpm-management-pick="grade-A"]').click();await drawer.waitFor();
 assert((await drawer.locator('[data-kpm-list-spu]').evaluateAll(ns=>ns.map(n=>n.dataset.kpmListSpu))).every(id=>before.rows.find(p=>p.spuId===id).level==='A'));
 await drawer.locator('[data-kpm-list-grade]').selectOption('S');assert.match(await drawer.locator('.kpm-management-list-table').innerText(),/暂无/);await drawer.locator('[data-kpm-list-reset]').click();
 await drawer.locator('[data-kpm-list-sort="gsv"]').click();const sortedIds=await drawer.locator('[data-kpm-list-spu]').evaluateAll(ns=>ns.map(n=>n.dataset.kpmListSpu));const values=sortedIds.map(id=>before.rows.find(p=>p.spuId===id).facts.gsvCents);assert(values.every((n,i)=>i===0||n>=values[i-1]),'结构明细GSV升序排序');await close();await unchanged();
 
 for(const width of [1440,1100,390]){await page.setViewportSize({width,height:1080});assert(await root.locator('.kpm-management').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'面板不溢出 '+width)}
 await page.setViewportSize({width:1920,height:1080});await verifyManagementPeriod(page);
 // 五个产品榜单增加同口径分级；店铺榜不增加。
 await page.locator('a[href="#risk"]').click();await page.locator('#riskrail [data-risk="0"]').click();
 for(const kind of [0,2,3,4,6]){
  await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();
  const control=page.locator('[data-rp-filter="grade"]');assert.equal(await control.count(),1);
  assert.deepEqual(await control.locator('option').evaluateAll(ns=>ns.map(n=>n.value)),['all','S','A','B','C','unrated']);
  assert.equal(await page.locator('.rp-list-table th').filter({hasText:'产品分级'}).count(),0);
  const original=await page.evaluate(()=>window.dashboardRankingGradeSnapshot());if(!original.rows.length){assert.equal(await page.locator('.rp-list-table [data-rp-grade]').count(),0);continue;}for(const row of original.rows)assert.equal(row.grade,all.rows.find(p=>p.spuId===row.spuId)?.level||'unrated','榜单与公司整体产品分级一致');
  const grades=[...new Set(original.rows.map(p=>p.grade))];
  const menu=control.locator('..');await menu.locator('summary').click();await menu.locator('[data-pf-multi-option][value="'+grades[0]+'"]').check();assert((await page.evaluate(()=>window.dashboardRankingGradeSnapshot())).rows.every(r=>r.grade===grades[0]));await page.keyboard.press('Escape');await control.selectOption(['all'],{force:true});
  for(const grade of grades){await control.selectOption([grade],{force:true});const filtered=await page.evaluate(()=>window.dashboardRankingGradeSnapshot());assert(filtered.rows.every(p=>p.grade===grade));assert.equal(filtered.rows.length,original.rows.filter(p=>p.grade===grade).length);assert((await page.locator('.rp-list-table [data-rp-grade]').evaluateAll(ns=>ns.map(n=>n.dataset.rpGrade))).every(g=>g===grade))}
  await control.selectOption(['all'],{force:true});
  if(grades.length>1){await control.selectOption(grades.slice(0,2),{force:true});const multi=await page.evaluate(()=>window.dashboardRankingGradeSnapshot());assert.equal(multi.rows.length,original.rows.filter(p=>grades.slice(0,2).includes(p.grade)).length)}
  await page.locator('[data-rp-reset]').click();assert.deepEqual((await page.evaluate(()=>window.dashboardRankingGradeSnapshot())).filters.grade,'all');
  if(kind===0)await page.locator('#dialogbody').screenshot({path:fileURLToPath(new URL('../../outputs/ranking-product-grade.png',import.meta.url))});
  const counts=await page.locator('.rp-list-table').evaluate(e=>({head:e.querySelectorAll('th').length,rows:[...e.querySelectorAll('tbody tr')].map(r=>r.cells.length)}));assert(counts.rows.every(n=>n===counts.head));
 }
 await page.locator('[data-drawer-tab="ranking-1"]').click();assert.equal(await page.locator('[data-rp-filter="grade"]').count(),0);
 await page.locator('#close').click();
}
