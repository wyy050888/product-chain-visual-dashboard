import assert from 'node:assert/strict';
export async function verifyGradeTrend(page){
 const root=page.locator('.up-detail'),panel=root.locator('[data-up-panel="operating"]'),grade=panel.locator('.up-grade-trend');
 const upper=root.locator('.up-detail-period');
 const original=await root.evaluate(e=>({id:e.dataset.upSpu,start:e.dataset.upStart,end:e.dataset.upEnd}));
 const platform=root.locator('#up-platform');await platform.selectOption('all',{force:true});
 assert.equal(await grade.count(),1);
 assert(await grade.evaluate(e=>e.previousElementSibling.classList.contains('up-channel-section')),'趋势在渠道数据下方');
 const snapshot=mode=>page.evaluate(({id,mode})=>window.dashboardProductGradeTrend(id,mode,document.querySelector('.up-detail').dataset.upEnd),{id:original.id,mode});
 for(const [mode,max] of [['month',12],['quarter',8],['year',3]]){
  await upper.locator('[data-drawer-time-mode="'+mode+'"]').click();assert.equal(await upper.locator('[data-drawer-time-mode="'+mode+'"]').getAttribute('aria-pressed'),'true');
  assert.equal(await grade.locator('.period-picker,.up-grade-period').count(),0,'图内不重复展示时间控件');
  assert.equal(await upper.count(),1,'详情统一使用右上角时间控件');
  const data=await snapshot(mode);assert.equal(data.length,max,'固定近12月/8季/3年窗口');
  assert.equal(await grade.locator('[data-up-grade-tick]').count(),max);
  assert.equal(await grade.locator('.up-grade-tools>span').count(),0,'移除全渠道日期摘要');
  const distance=(a,b)=>(+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5,7)-+a.slice(5,7));
  assert.equal(distance(data[0].periodStart,data.at(-1).periodStart),(max-1)*(mode==='year'?12:mode==='quarter'?3:1));
  const end=await root.getAttribute('data-up-end');assert(data.every(r=>r.periodEnd<=end));
  const dots=await grade.locator('[data-up-grade-dot]').evaluateAll(es=>es.map(e=>({level:e.dataset.upGradeDot,value:+e.dataset.gradeGsvCents,y:+e.getAttribute('cy')})));
  const valid=data.filter(r=>Number.isFinite(r.periodGsvCents));
  assert.equal(dots.length,valid.length);assert.deepEqual(await grade.locator('[data-up-grade-label]').allTextContents(),valid.map(r=>r.level||'—'),'仅有效数据绘点和实际等级');
  const low=Math.min(0,...valid.map(r=>r.periodGsvCents)),high=Math.max(1,...valid.map(r=>r.periodGsvCents));
  for(const [i,dot] of dots.entries())assert(Math.abs(dot.y-(174-(valid[i].periodGsvCents-low)/(high-low)*146))<1e-8,'点高按自然期间GSV');
  if(valid.length>1)assert.match(await grade.locator('[data-up-grade-line]').getAttribute('d'),/C/,'平滑曲线替代等级阶梯');
  for(const row of valid){
   const monthly=await page.evaluate(({id,end,start})=>window.dashboardProductGradeTrend(id,'month',end).filter(r=>r.periodStart>=start),{id:original.id,end:row.periodEnd,start:row.periodStart});
   assert.equal(row.periodGsvCents,monthly.reduce((sum,r)=>sum+r.periodGsvCents,0),'月季年金额与自然月汇总一致');
   if(row.periodGsvCents){const weighted=monthly.reduce((sum,r)=>sum+r.periodGsvCents*(r.periodProfitRate||0),0)/row.periodGsvCents;assert(Math.abs(row.periodProfitRate-weighted)<1e-8,'利润率按GSV加权')}
  }
  const emptyIndex=data.findIndex(r=>r.periodGsvCents===null);
  if(emptyIndex>=0){
   const empty=grade.locator('[data-up-grade-point]').nth(emptyIndex);
   assert.equal(data[emptyIndex].level,null);assert.equal(data[emptyIndex].periodProfitRate,null);
   assert.deepEqual(JSON.parse(await empty.getAttribute('data-series-values')).map(r=>r.value),['—','—'],'上市前不补0值');
   assert(await grade.locator('[data-up-grade-area]').evaluate(e=>{const start=+e.getAttribute('d').match(/^M([\d.]+)/)[1];return start>64}),'面积不填充到上市前空档');
  }
  const point=grade.locator('[data-up-grade-point]').last();await point.scrollIntoViewIfNeeded();
  // 滚动会关闭浮层，待布局完成后再验证键盘聚焦提示。
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await point.focus();await page.locator('#up-sales-tooltip').waitFor({state:'visible'});
  assert.deepEqual(await page.locator('.up-sales-tooltip-row>span').allTextContents(),['GSV','利润率']);
  assert.match(await page.locator('.up-sales-tooltip-date').innerText(),new RegExp(data.at(-1).periodStart.slice(2).replaceAll('-','/')));
  const fields=await point.getAttribute('data-series-values');assert.deepEqual(await page.locator('.up-sales-tooltip-row>b').allTextContents(),JSON.parse(fields).map(r=>r.value));
  await page.keyboard.press('Escape');assert(await page.locator('#up-sales-tooltip').isHidden());
 }
 // 统一控件控制趋势窗口；日范围映射到截止日所在月。
 await upper.locator('[data-drawer-time-day]').click();assert.equal(await grade.getAttribute('data-grade-mode'),'month');
 const end=await root.getAttribute('data-up-end'),dailyRows=await snapshot('month');
 assert.equal(dailyRows.at(-1).periodStart,end.slice(0,7)+'-01');assert.equal(dailyRows.at(-1).periodEnd,end);
 await upper.locator('[data-drawer-time-mode="month"]').click();await upper.locator('[data-drawer-time-value]').selectOption('9');
 assert.equal((await snapshot('month')).at(-1).periodStart,'2026-09-01');
 await upper.locator('[data-drawer-time-mode="quarter"]').click();await upper.locator('[data-drawer-time-value]').selectOption('2');
 assert.equal(await upper.locator('[data-drawer-time-value]').inputValue(),'2');assert.equal(await root.getAttribute('data-up-start'),'2026-04-01');
 assert.equal(await grade.getAttribute('data-grade-mode'),'quarter');assert.equal((await snapshot('quarter')).at(-1).periodStart,'2026-04-01');
 await upper.locator('[data-drawer-time-year]').selectOption('2025');assert.equal((await snapshot('quarter')).at(-1).periodStart,'2025-04-01');
 await upper.locator('[data-drawer-time-year]').selectOption('2026');await upper.locator('[data-drawer-time-mode="month"]').click();
 await upper.locator('[data-drawer-time-value]').selectOption(String(+original.end.slice(5,7)));
 const before=await snapshot('month');
 for(const value of ['抖音','天猫']){await platform.selectOption(value,{force:true});assert.equal(await grade.count(),0,'非全平台不展示趋势');assert.equal(await root.locator('[data-up-product-grade]').count(),1,'单平台仍保留全渠道等级标签')}
 await platform.selectOption('all',{force:true});assert.equal(await grade.count(),1);assert.deepEqual(await snapshot('month'),before);
 const badge=root.locator('.up-product-heading [data-up-product-grade]'),level=await badge.innerText();
 assert.equal(level,before.at(-1)?.level||'未分级');
 const colors={S:['rgb(234, 247, 242)','rgb(37, 156, 125)'],A:['rgb(255, 245, 228)','rgb(203, 141, 37)'],B:['rgb(238, 241, 255)','rgb(108, 126, 207)'],C:['rgb(255, 240, 242)','rgb(218, 107, 123)']};
 if(colors[level])assert.deepEqual(await badge.evaluate(e=>[getComputedStyle(e).backgroundColor,getComputedStyle(e).color]),colors[level],'头部标签复用SABC配色');
 await page.locator('[data-drawer-tab="quality"]').click();await page.locator('[data-drawer-tab="operating"]').click();assert.equal(await grade.getAttribute('data-grade-mode'),'month');
 assert.equal(await grade.locator('svg').evaluate(e=>e.getBoundingClientRect().height),220,'趋势高度压缩为220px');
 assert.equal(await root.getAttribute('data-up-start'),original.start);assert.equal(await root.getAttribute('data-up-end'),original.end);
}
