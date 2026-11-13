import assert from 'node:assert/strict';
import {verifyAssessmentApprovalModel} from './new-assessment-approval-model.mjs';
const storageKey='dashboard.new-product-success-approvals.v1';
export async function newAssessmentApproval(page){
 verifyAssessmentApprovalModel();
 const audit=()=>page.evaluate(()=>dashboardNewProductAssessmentSnapshot());
 const state=()=>page.evaluate(()=>dashboardNewProductApprovalSnapshot());
 const open=()=>page.locator('#newtop [data-nsp-assessment-entry]').click();
 const quarter=q=>page.locator('[data-nsp-assess-matrix="'+q+'"][data-nsp-assess-chain="all"][data-nsp-assess-pool="all"]').first().click();
 const mode=key=>page.locator('[data-nsp-assess-kind="'+key+'"]').click();
 const action=(id,kind)=>page.locator('[data-nsp-approval="'+kind+'"][data-nsp-approval-spu="'+id+'"]');
 const showAction=async(id,kind)=>{
  const data=await audit(),size=10,pages=Math.max(1,Math.ceil(data.rows.length/size));
  for(let n=1;n<=pages;n++){
   if(n!==(await audit()).page)await page.locator('[data-nsp-assess-page="'+n+'"]').first().click();
   if(await action(id,kind).count()){await action(id,kind).click();return}
  }
  assert.fail('未找到产品特批操作：'+id+'/'+kind);
 };
 const reason=()=>page.locator('.nsp-approval-dialog [name=reason]');
 const confirm=()=>page.locator('.nsp-approval-dialog [type=submit]').click();
 const record=(data,id)=>data.rows.find(p=>p.spuId===id);
 try{
  await page.clock.setFixedTime(new Date('2026-10-27T04:00:00Z'));
  await page.evaluate(key=>localStorage.removeItem(key),storageKey);await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  const outerBefore=await page.evaluate(()=>dashboardNewProductsSnapshot());
  await open();await quarter(3);const before=await audit(),matrixBefore=before.matrix;
  await mode('year');const annualBefore=await audit();
  const candidate=before.rows.find(p=>!p.successAssessment.success&&!record(annualBefore,p.spuId)?.successAssessment.success&&matrixBefore.periods[3].members.some(m=>m.spuId===p.spuId&&!m.success));assert(candidate);
  const id=candidate.spuId;await mode('quarter');await quarter(3);
  await showAction(id,'approve');assert.match(await page.locator('.nsp-approval-dialog').innerText(),/特批成功[\s\S]*2026年Q3/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.nsp-approval-dialog').count(),0);assert.equal(await page.locator('.nsp-assessment').count(),1,'Escape只关闭确认框');assert.equal((await state()).records.length,0);
  await showAction(id,'approve');await confirm();assert.match(await page.locator('[data-nsp-approval-error]').innerText(),/特批原因/);
  await reason().fill('老板确认本期特批成功');
  await page.evaluate(key=>{window.nspTestSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw Error('测试存储失败');return window.nspTestSetItem.call(this,name,value)}},storageKey);
  await confirm();assert.match(await page.locator('[data-nsp-approval-error]').innerText(),/保存失败/);assert.equal((await state()).records.length,0,'失败不更改内存结果');
  await page.evaluate(()=>{Storage.prototype.setItem=window.nspTestSetItem;delete window.nspTestSetItem});
  await confirm();let data=await audit();assert.equal(await page.locator('.nsp-approval-dialog').count(),0);
  assert.equal(data.summary.total,before.summary.total);assert.equal(data.summary.success,before.summary.success+1);assert.equal(data.summary.key,'2026-Q3');
  assert.deepEqual(record(data,id).successAssessment.facts,candidate.successAssessment.facts,'GSV、利润率等实际值不变');
  assert.equal(record(data,id).successAssessment.approval.reason,'老板确认本期特批成功');
  assert(!data.matrix.periods[3].members.some(p=>p.spuId===id),'季度特批后Q4不重复纳入');
  await showAction(id,'revoke');await page.keyboard.press('Escape');assert.equal((await state()).records.length,1,'取消撤销保留特批');
  const mainAfter=await page.evaluate(()=>dashboardNewProductsSnapshot());assert.equal(mainAfter.success.total,outerBefore.success.total-1,'外侧本季分母同步退出');
  await mode('year');data=await audit();assert.equal(data.summary.success,annualBefore.summary.success,'季度特批不增加年度成功');assert(!record(data,id).successAssessment.success);
  await showAction(id,'approve');assert.match(await page.locator('.nsp-approval-dialog').innerText(),/2026年度/);await reason().fill('年度单独确认');await confirm();
  data=await audit();assert.equal(data.summary.success,annualBefore.summary.success+1);assert.equal((await state()).records.length,2);
  await page.locator('[data-nsp-assess-development="'+candidate.developmentType+'"]').click();data=await audit();assert(record(data,id).successAssessment.approval,'开发类型切换保留本期特批');
  await showAction(id,'revoke');await page.keyboard.press('Escape');
  const row=page.locator('[data-nsp-approval-spu="'+id+'"]').locator('xpath=ancestor::tr');
  assert.equal(await row.locator('.nsp-success-status').innerText(),'特批成功');
  await page.locator('[data-nsp-assess-development="all"]').click();await page.locator('#close').click();
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');assert.equal((await state()).records.length,2,'刷新保留两个独立记录');
  await open();await quarter(3);data=await audit();assert(record(data,id).successAssessment.approval);assert.equal(data.summary.success,before.summary.success+1);
  await mode('year');await showAction(id,'revoke');await confirm();data=await audit();assert.equal(data.summary.success,annualBefore.summary.success);assert.equal((await state()).records.length,1);
  await mode('quarter');await quarter(3);assert(record(await audit(),id).successAssessment.approval,'撤销年度不影响季度');
  await showAction(id,'revoke');await confirm();data=await audit();assert.equal(data.summary.success,before.summary.success);assert(data.matrix.periods[3].members.some(p=>p.spuId===id),'撤销季度恢复Q4名单');assert.equal((await state()).records.length,0);
  assert.deepEqual((await page.evaluate(()=>dashboardNewProductsSnapshot())).success,outerBefore.success,'外侧统计恢复');
  for(const width of [1920,390,320]){
   await page.setViewportSize({width,height:1000});await showAction(id,'approve');
   assert(await page.locator('.nsp-approval-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=8&&r.right<=innerWidth-8&&r.top>=8&&r.bottom<=innerHeight-8&&el.scrollWidth<=el.clientWidth+1}),'确认框不超出视口 '+width);
   await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('.nsp-approval-dialog')),'键盘焦点留在确认框');
   await page.keyboard.press('Escape');assert.equal(await page.locator('.nsp-assessment').count(),1);
  }
  console.log('通过：行内特批/撤销、季度年度隔离、矩阵/明细/外侧同步、实际值保留、取消与存储失败回滚、刷新及宽窄屏');
 }finally{
  await page.evaluate(key=>{if(window.nspTestSetItem){Storage.prototype.setItem=window.nspTestSetItem;delete window.nspTestSetItem}localStorage.removeItem(key)},storageKey);
  await page.setViewportSize({width:1920,height:1080});await page.reload({waitUntil:'domcontentloaded'});
 }
}
