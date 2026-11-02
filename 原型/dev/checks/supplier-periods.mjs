import assert from 'node:assert/strict';
import {verifySupplierJump} from './supplier-navigation.mjs';
import {verifyCategoryWarning} from './supplier-charts.mjs';
export async function verifySupplierPeriods(page,root,audit){
 const period=key=>root.locator(`[data-scp-period="${key}"]`),mode=(key,value)=>period(key).locator(`[data-scp-mode="${value}"]`).click();
 assert.deepEqual(await period('category').locator('[data-scp-mode]').allTextContents(),['季','年']);assert.deepEqual(await period('material').locator('[data-scp-mode]').allTextContents(),['季','年']);assert.equal(await period('resource').locator('[data-scp-mode],[data-scp-quarter]').count(),0);
 await mode('category','quarter');assert.deepEqual((await audit()).categoryPeriod,{year:2026,mode:'quarter',value:4});await verifyCategoryWarning(page,root,audit);
 await period('category').locator('[data-scp-quarter]').focus();await period('category').locator('[data-scp-quarter]').selectOption('1');assert(await period('category').locator('[data-scp-quarter]').evaluate(e=>e===document.activeElement),'选择季度后保留焦点');await verifyCategoryWarning(page,root,audit);
 assert.equal(await root.locator('.scp-category-table tbody tr').first().locator('td:nth-child(4) button').count(),0);
 await root.locator('[data-scp-all-categories]').click();const header=page.locator('#dialogsub [data-scp-period="category-list"]');assert.equal(await header.locator('[data-scp-quarter]').inputValue(),'1');assert(await page.locator('#drawer-tabs').isHidden());await header.locator('[data-scp-quarter]').selectOption('2');assert.deepEqual((await audit()).categoryPeriod,{year:2026,mode:'quarter',value:1},'抽屉季度独立');
 await verifySupplierJump(page,page.locator('.scp-category-list-table [data-scp-jump]').first(),'供应商管理-供应商资源池-全部');assert.equal(await header.locator('[data-scp-quarter]').inputValue(),'2');await page.locator('#close').click();
 await mode('category','year');assert.equal(await period('category').locator('[data-scp-quarter]').count(),0);await mode('category','quarter');assert.equal(await period('category').locator('[data-scp-quarter]').inputValue(),'1','季年切换记住季度');await mode('category','year');
 const config=await page.evaluate(()=>window.supplierTargetsAudit());
 await mode('material','quarter');assert.equal(await period('material').locator('[data-scp-quarter]').inputValue(),'4');
 for(const quarter of [4,1,2,3]){
  await period('material').locator('[data-scp-quarter]').selectOption(String(quarter));const a=await audit(),start=`2026-${String((quarter-1)*3+1).padStart(2,'0')}-01`,end=new Date(Date.UTC(2026,quarter*3,0)).toISOString().slice(0,10),cutoff=end<'2026-10-10'?end:'2026-10-10',active=new Set(a.companies.filter(s=>s.reserved<=cutoff&&(!s.disabled||s.disabled>cutoff)).map(s=>s.id));
  for(const row of a.materials){
   const targets=config.values.cooperation;assert.equal(row.stats.target,targets[quarter-1],'目标只取所选季度');
   for(const category of row.categories){assert.equal(category.stats.target,targets[quarter-1]);assert.equal(category.stats.admissionTarget,config.values.materialTargets[row.brand].categories[category.category].admitted[quarter-1]);}
   for(const material of ['电机','电池','电源线','线路板','塑料件','包装']){
    const dates=new Map();for(const cap of a.capabilities)if(cap.kind==='material'&&cap.material===material&&a.brands[row.brand].includes(cap.brand)&&active.has(cap.supplierId)&&cap.admitted&&cap.admitted<=cutoff&&(!dates.has(cap.supplierId)||cap.admitted<dates.get(cap.supplierId)))dates.set(cap.supplierId,cap.admitted);
    assert.equal(row.stats[material],[...dates.values()].filter(date=>date>=start).length,'季度核心件仅统计当季新增准入');
   }
   const dates=new Map();for(const cap of a.capabilities)if(cap.kind==='material'&&a.brands[row.brand].includes(cap.brand)&&active.has(cap.supplierId)&&cap.cooperation&&cap.cooperation<=cutoff&&(!dates.has(cap.supplierId)||cap.cooperation<dates.get(cap.supplierId)))dates.set(cap.supplierId,cap.cooperation);
   const actual=[...dates.values()].filter(date=>date>=start).length;assert.equal(row.stats.newCooperation,actual);assert.equal(row.stats.rate,row.stats.target?actual/row.stats.target*100:null,'季度实际达成使用同期分子分母');
  }
  const first=a.materials[0],brandRow=root.locator(`.scp-material-merged-table [data-scp-brand-row="${first.brand}"]`).first();assert.equal(await brandRow.locator('.scp-cooperation-target').innerText(),first.stats.target?String(first.stats.target):'—');
  assert.deepEqual(a.categoryPeriod,{year:2026,mode:'year',value:1},'两处期间互不影响');
 }
 await mode('material','year');const year=await audit();assert.equal(year.materials[0].stats.target,config.values.cooperation.every(Number.isInteger)?config.values.cooperation.reduce((a,b)=>a+b,0):null);await mode('material','quarter');assert.equal(await period('material').locator('[data-scp-quarter]').inputValue(),'3');
 assert.equal(await root.locator('.scp-material-merged-table .scp-admission-target button').count(),0,'目标数量不可点击');
 for(const width of [1366,390]){await page.setViewportSize({width,height:1080});await mode('category','quarter');assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'季年控件不撑宽 '+width);await root.locator('[data-scp-all-categories]').click();assert(await page.locator('#dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'季度抽屉头部不撑宽 '+width);await page.locator('#close').click();await mode('category','year')}
 await page.setViewportSize({width:1920,height:1080});await mode('material','year');console.log('通过：类目/物料季年切换、季度记忆、同期目标与达成率、类目抽屉独立期间与跳转提示');
}
