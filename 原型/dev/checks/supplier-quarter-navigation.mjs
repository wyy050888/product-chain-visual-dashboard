import assert from 'node:assert/strict';
import {verifySupplierJump} from './supplier-navigation.mjs';
import {verifyResourceReportedMetrics} from './supplier-resource-metrics.mjs';

export async function supplierQuarterNavigation(page){
 verifyResourceReportedMetrics();
 await page.clock.setFixedTime(new Date('2026-10-29T04:00:00Z'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#suppliers"]').click();
 const root=page.locator('.scp-resource-card'),year=root.locator('[data-scp-year]');
 const fields=[['newCooperation','合作日期']];
 for(const selected of ['2025','2026','2027']){
  await year.selectOption(selected);
  const facts=await page.evaluate(()=>supplierPlanningAudit()),quarters=facts.quarters;
  if(selected==='2025'){
   assert.equal(facts.annual.newCooperation,9);assert.equal(facts.annual.target,8);assert.equal(facts.annual.rate,112.5);
   assert.equal(await root.locator('[data-scp-annual-metric="rate"] .scp-rate').innerText(),'112.5%','年度超额达成不显示—或截断100%');
   assert(quarters.every(row=>row.rate===row.newCooperation/row.target*100),'历史季度样例与独立录入值一致');
  }
  if(selected==='2027')assert.equal(facts.annual.rate,null,'未来且无来源的数据仍留空');
  for(const quarter of quarters){
   const row=root.locator(`[data-scp-resource-quarter="${quarter.quarter}"]`);
   assert.equal(await row.locator('[data-scp-jump]').count(),quarter.range.future?0:1,'季度只保留合作入口，未来季度无入口');
   if(quarter.range.future)continue;
   for(const [index,[metric,dateLabel]] of fields.entries()){
    const button=row.locator('[data-scp-jump]');
    const destination=JSON.parse(await button.getAttribute('data-scp-jump'));
    assert.deepEqual(destination.filters,[['供应商类型','一级供应商'],['统计指标',{newReserved:'新增意向储备',newAdmitted:'新增准入',newCooperation:'新增合作'}[metric]],[dateLabel,quarter.range.start+' — '+quarter.range.cutoff]]);
    assert.equal(await button.getAttribute('title'),null);
    if(selected==='2026'&&quarter.quarter===4){
     await button.hover();assert(await page.locator('#metric-tooltip').isHidden());
     await verifySupplierJump(page,button,'供应商管理-供应商资源池-全部');
    }
   }
   assert.equal(await row.locator('.scp-readiness-standard button').count(),0,'目标不作为跳转入口');
  }
  assert.equal(await root.locator('.scp-resource-summary [data-scp-jump]').count(),0,'年度卡片仍保持静态');
 }
 await year.selectOption('2026');
 assert.equal(await root.locator('.scp-quarter-card').count(),4);
 assert.equal(await root.locator('table,[data-rp-sort]').count(),0,'卡片不保留表格或排序控件');
 for(const width of [1920,1280,1024,760,390]){
  await page.setViewportSize({width,height:1080});
  assert(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'卡片容器不横向溢出 '+width);
  if(width===1920){const tops=await root.locator('.scp-cooperation-cards>section').evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().top)));assert.equal(new Set(tops).size,1,'宽屏五卡同排')}
 }
 console.log('通过：季度合作点击、合作日期、年份切换、当前季度截止日、零值入口与未来季度禁用');
}
