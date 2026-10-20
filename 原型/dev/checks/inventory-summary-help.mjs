import assert from 'node:assert/strict';
export async function verifyInventorySummaryHelp(page){
 const tooltip=page.locator('#metric-tooltip'),panels=page.locator('#inventory .ip-group-panel');
 assert.equal(await panels.locator('[data-ip-summary-help]').count(),2);
 const reveal=async help=>{await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await help.focus();await page.keyboard.press('Enter');await tooltip.waitFor({state:'visible'})};
 for(const panel of await panels.all()){
  const help=panel.locator('[data-ip-summary-help]');await reveal(help);
  assert.equal(await help.getAttribute('aria-describedby'),'metric-tooltip');
  assert.deepEqual(await tooltip.locator('h5').allTextContents(),['库存周转率','交付及时率','翻新延期天数']);
  assert.equal(await tooltip.locator('.ip-summary-rules').count(),3);
  const text=await tooltip.innerText();for(const value of ['0.85','0.3','2.5','0.9','10','3.6','98%','97.5%','-15天','-10天'])assert(text.includes(value),value);
  assert.equal(await tooltip.locator('.is-current>th').innerText(),'月度 / 近30天');
  assert(await tooltip.evaluate(e=>e.classList.contains('metric-tooltip-inventory-summary')&&!e.classList.contains('metric-tooltip-inventory')));
  await page.keyboard.press('Escape');assert(await tooltip.isHidden());assert.equal(await help.getAttribute('aria-describedby'),null);
 }
 await panels.first().locator('[data-ip-time-mode="quarter"]').click();await reveal(panels.first().locator('[data-ip-summary-help]'));assert.equal(await tooltip.locator('.is-current>th').innerText(),'季度');await page.keyboard.press('Escape');
 await reveal(panels.nth(1).locator('[data-ip-summary-help]'));assert.equal(await tooltip.locator('.is-current>th').innerText(),'月度 / 近30天');await page.keyboard.press('Escape');
 await panels.first().locator('[data-ip-time-mode="recent30"]').click();
 for(const viewport of [{width:1920,height:1080},{width:390,height:844},{width:1024,height:420}]){
  await page.setViewportSize(viewport);await reveal(panels.first().locator('[data-ip-summary-help]'));
  assert((await tooltip.locator('td').evaluateAll(es=>es.map(e=>e.scrollWidth<=e.clientWidth+1))).every(Boolean),'规则文字不溢出单元格');
  assert(await tooltip.evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth+1}),'规则卡不越界');await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});
 await reveal(panels.first().locator('[data-ip-rule="warehouse"]'));assert(!await tooltip.evaluate(e=>e.classList.contains('metric-tooltip-inventory-summary')));assert((await tooltip.innerText()).includes('聚量实体仓仓库库存'));await page.keyboard.press('Escape');
 console.log('通过：两个标题规则卡、同源三指标阈值、独立期间、键盘关闭及窄/短屏边界');
}
