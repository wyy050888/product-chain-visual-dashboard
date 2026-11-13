import assert from 'node:assert/strict';

// 用真实布局次数约束初始化，避免依赖机器速度；业务控件必须在预算内完整挂载。
export async function startupLayout(page){
 const client=await page.context().newCDPSession(page);
 try{
  await client.send('Performance.enable');
  const before=Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
  const after=Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const count=after.LayoutCount-before.LayoutCount;
  assert(count>=0&&count<=18,'启动布局应合并执行，实际次数：'+count);
  const controls=await page.locator('select').evaluateAll(selects=>selects.filter(select=>{
   const options=[...select.options];
   return !select.hidden&&!select.multiple&&getComputedStyle(select).display!=='none'&&options.some(o=>/^\d{4}\s*年?$/.test(o.textContent.trim()))&&options.every(o=>/^(\d{4}\s*年?|全部(年份|年度)?|请选择(年份|年度)?|—)$/.test(o.textContent.trim()));
  }).map(select=>({label:select.id||select.getAttribute('aria-label'),mounted:!!select.uiYearControl?.button.isConnected})));
  assert(controls.length>0);assert.deepEqual(controls.filter(control=>!control.mounted),[],'年份控件不能通过延后挂载规避预算');
  assert.equal(await page.locator('[data-ip-stale-trend-plot]>svg').count(),1,'库存图表已完成挂载');
  assert.equal(await page.locator('#rp-group-navigation [aria-current=location]').count(),1,'风险导航已定位');
  console.log('完整启动布局次数：'+count+'；年份、库存图表和风险导航已挂载');
 }finally{await client.detach()}
}
