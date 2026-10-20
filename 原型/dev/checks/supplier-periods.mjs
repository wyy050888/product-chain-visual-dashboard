import assert from 'node:assert/strict';
import {assertSupplierDateEntry} from './supplier-date-filters.mjs';
import {verifyCategoryWarning} from './supplier-charts.mjs';
export async function verifySupplierPeriods(page,root,audit){
 const period=key=>root.locator(`[data-scp-period="${key}"]`),mode=(key,value)=>period(key).locator(`[data-scp-mode="${value}"]`).click();
 assert.deepEqual(await period('category').locator('[data-scp-mode]').allTextContents(),['季','年']);assert.deepEqual(await period('material').locator('[data-scp-mode]').allTextContents(),['季','年']);assert.equal(await period('resource').locator('[data-scp-mode],[data-scp-quarter]').count(),0);
 await mode('category','quarter');assert.deepEqual((await audit()).categoryPeriod,{year:2026,mode:'quarter',value:4});await verifyCategoryWarning(page,root,audit);
 await period('category').locator('[data-scp-quarter]').focus();await period('category').locator('[data-scp-quarter]').selectOption('1');assert(await period('category').locator('[data-scp-quarter]').evaluate(e=>e===document.activeElement),'选择季度后保留焦点');await verifyCategoryWarning(page,root,audit);
 for(const metric of ['admitted','newAdmitted']){
  const entry=root.locator(`[data-scp-category-chart="个护类"] .${metric==='admitted'?'scp-quarter-actual:not(.scp-category-new)':'scp-category-new'}`),payload=JSON.parse(await entry.getAttribute('data-scp-members')),total=+(await entry.getAttribute('data-value'));assert.equal(payload.period.cutoff,'2026-03-31');await entry.click();await assertSupplierDateEntry(page,payload);assert.equal(+(await page.locator('.scp-member-pages .list-pagination').getAttribute('data-list-total')),total,'季度数量下钻与日期筛选一致');await page.locator('#close').click();
 }
 await root.locator('[data-scp-all-categories]').click();const header=page.locator('#dialogsub [data-scp-period="category-list"]');assert.equal(await header.locator('[data-scp-quarter]').inputValue(),'1');assert(await page.locator('#drawer-tabs').isHidden());await header.locator('[data-scp-quarter]').selectOption('2');assert.deepEqual((await audit()).categoryPeriod,{year:2026,mode:'quarter',value:1},'抽屉季度独立');
 const entry=page.locator('.scp-category-list-table tbody tr').nth(1).locator('[data-scp-members]').last(),payload=JSON.parse(await entry.getAttribute('data-scp-members'));assert.equal(payload.period.start,'2026-04-01');assert.equal(payload.period.cutoff,'2026-06-30');await entry.click();await assertSupplierDateEntry(page,payload);await page.locator('.drawer-back').click();assert.equal(await header.locator('[data-scp-quarter]').inputValue(),'2','返回保留抽屉季度');await page.locator('#close').click();
 await mode('category','year');assert.equal(await period('category').locator('[data-scp-quarter]').count(),0);await mode('category','quarter');assert.equal(await period('category').locator('[data-scp-quarter]').inputValue(),'1','季年切换记住季度');await mode('category','year');
 const config=await page.evaluate(()=>window.supplierTargetsAudit());
 await mode('material','quarter');assert.equal(await period('material').locator('[data-scp-quarter]').inputValue(),'4');
 for(const quarter of [4,1,2,3]){
  await period('material').locator('[data-scp-quarter]').selectOption(String(quarter));const a=await audit(),start=`2026-${String((quarter-1)*3+1).padStart(2,'0')}-01`,end=new Date(Date.UTC(2026,quarter*3,0)).toISOString().slice(0,10),cutoff=end<'2026-10-10'?end:'2026-10-10',active=new Set(a.companies.filter(s=>s.reserved<=cutoff&&(!s.disabled||s.disabled>cutoff)).map(s=>s.id));
  for(const row of a.materials){
   const targets=config.store.years[2026].materials[row.brand];assert.equal(row.stats.target,targets.quarters[quarter-1],'目标只取所选季度');
   for(const category of row.categories)assert.equal(category.stats.target,targets.categories[category.category][quarter-1]);
   const dates=new Map();for(const cap of a.capabilities)if(cap.kind==='material'&&cap.brand===row.brand&&active.has(cap.supplierId)&&cap.cooperation&&cap.cooperation<=cutoff&&(!dates.has(cap.supplierId)||cap.cooperation<dates.get(cap.supplierId)))dates.set(cap.supplierId,cap.cooperation);
   const actual=[...dates.values()].filter(date=>date>=start).length;assert.equal(row.stats.newCooperation,actual);assert.equal(row.stats.rate,row.stats.target?actual/row.stats.target*100:null,'季度实际达成使用同期分子分母');
  }
  const first=a.materials[0],brandRow=root.locator(`[data-scp-brand-row="${first.brand}"]`).first();assert.equal(await brandRow.locator('td').nth(7).innerText(),first.stats.target?String(first.stats.target):'—');
  assert.deepEqual(a.categoryPeriod,{year:2026,mode:'year',value:1},'两处期间互不影响');
 }
 await mode('material','year');const year=await audit();assert.equal(year.materials[0].stats.target,config.store.years[2026].materials[year.materials[0].brand].quarters.reduce((a,b)=>a+b,0));await mode('material','quarter');assert.equal(await period('material').locator('[data-scp-quarter]').inputValue(),'3');
 const count=root.locator('.scp-material-brand').first().locator('td').nth(6).locator('[data-scp-members]'),materialPayload=JSON.parse(await count.getAttribute('data-scp-members'));await count.click();await assertSupplierDateEntry(page,materialPayload);assert.equal(materialPayload.period.start,'2026-07-01');assert.equal(materialPayload.period.cutoff,'2026-09-30');await page.locator('#close').click();
 for(const width of [1366,390]){await page.setViewportSize({width,height:1080});await mode('category','quarter');assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'季年控件不撑宽 '+width);await root.locator('[data-scp-all-categories]').click();assert(await page.locator('#dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'季度抽屉头部不撑宽 '+width);await page.locator('#close').click();await mode('category','year')}
 await page.setViewportSize({width:1920,height:1080});await mode('material','year');console.log('通过：类目/物料季年切换、季度记忆、同期目标与达成率、抽屉独立期间及日期下钻');
}
