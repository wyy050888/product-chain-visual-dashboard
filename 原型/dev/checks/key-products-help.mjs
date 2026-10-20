import assert from 'node:assert/strict';
export async function verifyGradeHelp(page){
 const root=page.locator('#matrix'),help=root.locator('.sectionhead h2>.metric-help'),tip=page.locator('#metric-tooltip');
 const open=async()=>{await help.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await help.focus();await page.keyboard.press('Enter');await tip.waitFor({state:'visible'})};
 await open();
 assert(await tip.evaluate(e=>e.classList.contains('metric-tooltip-kpm-grade')));
 assert.equal(await tip.locator('h4').innerText(),'SABC分级标准');
 assert.deepEqual(await tip.locator('th').allTextContents(),['等级','GSV（万元）','利润率']);
 const rules=(await page.evaluate(()=>dashboardKeyProductsSnapshot())).gradeRules;
 const range=(a,b,suffix='')=>[a===undefined?'':'＞'+a+suffix,b===undefined?'':'＜'+b+suffix].filter(Boolean).join(' 且 ');
 assert.deepEqual(await tip.locator('tbody tr').evaluateAll(es=>es.map(e=>[...e.cells].map(c=>c.textContent))),Object.entries(rules).map(([g,r])=>[g,range(r.salesAbove,r.salesBelow),range(r.profitAbove,r.profitBelow,'%')]));
 assert.doesNotMatch(await help.getAttribute('data-metric-rule'),/ABCD|上架超过120天/);
 assert.match(await tip.innerText(),/待分级/);assert.match(await tip.innerText(),/同时满足/);
 assert.equal(new Set(await tip.locator('.kpm-rule-grade').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor))).size,4,'四级颜色与主图一致');
 await page.keyboard.press('Escape');assert(await tip.isHidden());
 await help.hover();await tip.waitFor({state:'visible'});assert.equal(await tip.locator('tbody tr').count(),4,'悬浮展示完整规则表');await page.mouse.move(0,0);await tip.waitFor({state:'hidden'});
 for(const [width,height] of [[1920,1080],[1440,1080],[390,844],[320,400]]){
  await page.setViewportSize({width,height});await open();
  const b=await tip.boundingBox();assert(b.x>=8&&b.x+b.width<=width-7&&b.y>=8&&b.y+b.height<=height-7,'浮层保持视口内 '+width+'/'+height);
  assert(await tip.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'规则表无横向溢出');
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});
 await root.locator('[data-kpm-scope="interest"]').click();await open();assert.match(await tip.locator('.kpm-rule-context').innerText(),/兴趣电商/);await page.keyboard.press('Escape');
 await root.locator('[data-time-mode="month"]').click();await root.locator('[data-time-value]').selectOption('9');await open();assert.match(await tip.locator('.kpm-rule-context').innerText(),/26\/09\/01 — 26\/09\/30/);
 await root.locator('.kpm-chart-head h3').click();assert(await tip.isHidden(),'点击外部关闭');
 const other=page.locator('#riskrail .card-metric-help').first();await other.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await other.focus();await tip.waitFor({state:'visible'});assert.equal(await tip.evaluate(e=>e.classList.contains('metric-tooltip-kpm-grade')),false,'共享其他提示不残留分级卡样式');await page.keyboard.press('Escape');
 await root.locator('[data-kpm-scope="all"]').click();await root.locator('[data-time-mode="recent30"]').click();
 console.log('通过：SABC规则说明卡、实际阈值、范围/期间、颜色、键盘与短屏边界');
}
