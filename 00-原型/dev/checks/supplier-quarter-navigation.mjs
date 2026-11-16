import assert from 'node:assert/strict';
import {verifyResourceReportedMetrics} from './supplier-resource-metrics.mjs';

export async function supplierQuarterNavigation(page){
 verifyResourceReportedMetrics();
 await page.clock.setFixedTime(new Date('2026-10-29T04:00:00Z'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#suppliers"]').click();
 const root=page.locator('.scp-resource-card'),year=root.locator('[data-scp-year]');
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
   assert.equal(await row.locator('button,a,[data-scp-jump],[data-jump-toast]').count(),0,'实际与目标均只读');
   const actual=row.locator('.scp-count');
   assert.equal(await actual.innerText(),quarter.range.future?'—':String(quarter.newCooperation));
   assert.equal(await row.locator('.scp-readiness-standard').innerText(),'/ '+(quarter.target??'—'));
   if(!quarter.range.future&&Number.isFinite(quarter.target)){
    const state=quarter.newCooperation<quarter.target?'is-short':'is-ready';
    assert(await row.locator('.scp-readiness').evaluate((node,state)=>node.classList.contains(state),state));
   }
   if(selected==='2026'&&quarter.quarter===4){
    await actual.click();
    assert(await page.locator('#toast').isHidden());
    assert(await page.locator('#overlay').isHidden());
   }
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
 console.log('通过：季度新增合作只读、实际与目标值、达标样式、年份切换及响应式布局');
}
