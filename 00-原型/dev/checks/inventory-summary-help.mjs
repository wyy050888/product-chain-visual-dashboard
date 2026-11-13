import assert from 'node:assert/strict';
export async function verifyInventorySummaryHelp(page){
 const tooltip=page.locator('#metric-tooltip'),panels=page.locator('#inventory .ip-group-panel');
 const help=page.locator('#inventory>.sectionhead>.titlegroup>[data-ip-summary-help]');
 assert.equal(await page.locator('#inventory [data-ip-summary-help]').count(),1);assert.equal(await help.count(),1);
 assert.equal(await panels.locator('.ip-group-heading .metric-help').count(),0,'两张表的标题不再重复提示');
 assert(await help.evaluate(e=>e.previousElementSibling?.matches('h2')&&e.nextElementSibling?.classList.contains('ip-season-filter')),'统一提示紧随模块标题，位于季品筛选前');
 const reveal=async help=>{await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await help.focus();await page.keyboard.press('Enter');await tooltip.waitFor({state:'visible'})};
 {
  await reveal(help);
  assert.equal(await help.getAttribute('aria-describedby'),'metric-tooltip');
  assert.deepEqual(await tooltip.locator('h5').allTextContents(),['库存周转率','交付及时率','翻新闭环率']);
  assert.equal(await tooltip.locator('.metric-rule-band-table').count(),2);
  const text=await tooltip.innerText();for(const value of ['0.85','0.3','2.5','0.9','10','3.6','98%','97.5%','30天','总采购单量'])assert(text.includes(value),value);
  assert.equal(await tooltip.locator('.is-current>td:first-child').innerText(),'季度');
  assert(await tooltip.evaluate(e=>e.classList.contains('metric-tooltip-inventory-summary')&&!e.classList.contains('metric-tooltip-inventory')));
  await page.keyboard.press('Escape');assert(await tooltip.isHidden());assert.equal(await help.getAttribute('aria-describedby'),null);
 }
 await page.locator('#inventory>.sectionhead [data-ip-time-mode="month"]').click();await reveal(help);assert.equal(await tooltip.locator('.is-current>td:first-child').innerText(),'月度');await page.keyboard.press('Escape');
 assert.equal(await page.locator('#inventory [data-ip-summary-help]').count(),1,'期间重绘不重复创建提示');
 await page.locator('#inventory>.sectionhead [data-ip-time-mode="month"]').click();
 for(const viewport of [{width:1920,height:1080},{width:390,height:844},{width:1024,height:420}]){
  await page.setViewportSize(viewport);await reveal(help);
  assert((await tooltip.locator('td').evaluateAll(es=>es.map(e=>e.scrollWidth<=e.clientWidth+1))).every(Boolean),'规则文字不溢出单元格');
  assert(await tooltip.evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth+1}),'规则卡不越界');await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});
 await reveal(page.locator('#inventory [data-stock-card="warehouse"] [data-stock-rule="warehouse"]'));assert(!await tooltip.evaluate(e=>e.classList.contains('metric-tooltip-inventory-summary')));assert((await tooltip.innerText()).includes('聚量实体仓仓库库存'));await page.keyboard.press('Escape');
 console.log('通过：模块标题合并规则卡、两项同源阈值与闭环口径、统一期间、键盘关闭及窄/短屏边界');
}
