import assert from 'node:assert/strict';

export async function reportTabs(page){
 const root=page.locator('#ai'),body=page.locator('#dialogbody'),nav=page.locator('#drawer-tabs');
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="quality"]').click();
 const initial=await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().reports));
 const stored=await page.evaluate(()=>localStorage.getItem('product-risk-todos-v1'));
 for(const type of ['日报','周报','月报']){
  await page.setViewportSize({width:1920,height:1000});
  await root.locator('[data-gd-report-type="'+type+'"]').click();
  await root.locator('[data-report-row]').first().locator('td:last-child button').click();
  const dialog=page.locator('.gd-report-dialog'),report=dialog.locator('[data-gd-report-pane="report"]'),sources=dialog.locator('[data-gd-report-pane="sources"]');
  const reportTab=nav.locator('[data-drawer-tab="report"]'),sourceTab=nav.locator('[data-drawer-tab="sources"]');
  assert.deepEqual(await nav.locator('[data-drawer-tab]').allTextContents(),['报告','来源依据']);
  assert.equal(await page.locator('[data-gd-rubric],.gd-applied-rubric').count(),0,'不再提供评分标准');
  assert.equal(await reportTab.getAttribute('aria-selected'),'true','每份报告默认报告Tab');
  assert(await report.isVisible());assert(await sources.isHidden());
  assert.equal(await report.locator('.gd-report-score-banner').count(),0);
  const reportText=await report.textContent(),sourceText=await sources.textContent(),title=await page.locator('#dialogtitle').innerText();
  await sourceTab.click();assert(await report.isHidden());assert(await sources.isVisible());
  assert.equal(await sources.textContent(),sourceText,'来源原文原样保留');assert.equal(await page.locator('#dialogtitle').innerText(),title);
  await sourceTab.focus();await page.keyboard.press('Home');assert(await report.isVisible());
  await page.keyboard.press('End');assert(await sources.isVisible(),'公共标签键盘可切换');
  if(type==='日报'){
   await sources.locator('td:last-child').first().evaluate(el=>{const p=document.createElement('p');p.dataset.reportLongFixture='';p.textContent='长报告回归：产品名称、工作进展、风险和后续安排。'.repeat(1200);el.append(p)});
   for(const width of [1920,390]){
    await page.setViewportSize({width,height:900});
    const top=await nav.evaluate(e=>e.getBoundingClientRect().top),scroll=await page.evaluate(()=>scrollY);
    await body.evaluate(e=>e.scrollTop=e.scrollHeight);
    assert(Math.abs(await nav.evaluate(e=>e.getBoundingClientRect().top)-top)<1,'长报告滚动时标签固定');
    assert.equal(await page.evaluate(()=>scrollY),scroll,'正文滚动不带动底层');
    const tabBox=await sourceTab.boundingBox();assert(tabBox.x>=0&&tabBox.x+tabBox.width<=width+1,'窄屏标签可见');
    await reportTab.click();assert.equal(await body.evaluate(e=>e.scrollTop),0,'切换回报告回到顶部');
    assert.equal(await report.textContent(),reportText);await sourceTab.click();
   }
   await sources.locator('[data-report-long-fixture]').evaluate(e=>e.remove());
   await page.setViewportSize({width:1920,height:1000});await reportTab.click();

  }
  await reportTab.click();assert.equal(await report.textContent(),reportText);
  await page.locator('#close').click();
 }
 await root.locator('[data-gd-tab="missing"]').click();
 assert.deepEqual(await root.locator('.missing th').allTextContents(),['人员 / 部门','报告类型','工作日期','应交时间','是否已补交']);
 assert.equal(await root.locator('.missing [data-gd-action],.missing .gd-unsubmitted').count(),0);
 for(const row of await root.locator('.missing tbody tr[data-report-row]').all())assert.equal(await row.locator('td').count(),5);
 assert.notEqual(await root.locator('.missing th:last-child').evaluate(el=>getComputedStyle(el).position),'sticky');
 assert.equal(await page.evaluate(()=>JSON.stringify(globalDiagnosisAudit().reports)),initial,'切换标签不改问题和原文');
 assert.equal(await page.evaluate(()=>localStorage.getItem('product-risk-todos-v1')),stored);
 console.log('通过：日周月报两Tab、默认报告、全文/诊断保持、键盘/长文滚动/窄屏及未提交台账隔离。');
}
