import assert from 'node:assert/strict';

export async function salesCards(page){
 await page.locator('a[href="#sales"]').click();
 const cards=page.locator('#salescards .ms-card'),company=cards.first();
 assert.equal(await cards.count(),5);
 for(const card of await cards.all()){assert.equal(await card.locator('[data-si-mode="brand"]').innerText(),'分品牌Top6');assert.equal(await card.locator('.ms-breakdown-row').count(),6)}
 for(const [mode,value] of [['month','10'],['month','9'],['quarter','3'],['year',null]]){
  await page.locator('#time-sales [data-time-mode="'+mode+'"]').click();
  if(value)await page.locator('#time-sales [data-time-value]').selectOption(value);
  const facts=await page.evaluate(()=>({snapshot:window.dashboardSalesReviewSnapshot(),series:window.dashboardSalesTrendSnapshot(-1)}));
  const days=await page.evaluate(()=>window.dashboardSalesTrendSnapshot(-1,true));
  const firstMonth=mode==='year'?1:mode==='quarter'?(Number(value)-1)*3+1:Number(value),start=facts.snapshot.period.year+'-'+String(firstMonth).padStart(2,'0')+'-01';
  assert(Math.abs(days.filter(r=>r.date>=start).reduce((n,r)=>n+r.value,0)-facts.snapshot.company.sale)<.001,'历史趋势中所选期间的GSV仍须等于卡片');
  assert(facts.series.every(r=>r.date<='2026-10-10'));
  assert.equal(await company.locator('.ms-trend').getAttribute('data-granularity'),{quarter:'周',year:'月'}[mode]||'日');
  if(mode==='quarter'){assert.equal(facts.series.length,24);assert.equal(facts.series[0].date,'2026-04-20');assert.equal(facts.series.at(-1).date,'2026-09-28')}
  if(mode==='year'){assert.equal(facts.series.length,24);assert.equal(facts.series[0].date,'2024-11-01');assert.equal(facts.series.at(-1).end,'2026-10-10')}
  for(const index of [-1,0,1,2,3]){
   const data=await page.evaluate(i=>({buckets:window.dashboardSalesTrendSnapshot(i),days:window.dashboardSalesTrendSnapshot(i,true)}),index);
   assert.equal(data.buckets.reduce((n,b)=>n+(Date.parse(b.end)-Date.parse(b.date))/86400000+1,0),data.days.length,'聚合不漏天、不重复');
   for(const bucket of data.buckets){
    const days=data.days.filter(r=>r.date>=bucket.date&&r.date<=bucket.end),sale=days.reduce((n,r)=>n+r.value,0),gross=days.reduce((n,r)=>n+r.gross,0);
    assert(Math.abs(bucket.value-sale)<1e-8);assert(Math.abs(bucket.gross-gross)<1e-8);assert(Math.abs(bucket.margin-gross/sale*100)<1e-8,'利润率按汇总利润/GSV计算');
   }
  }

  const {company:total,chains,brands,platforms}=facts.snapshot;
  for(const row of [total,...chains,...brands,...platforms])for(const key of ['sale','target','actualMargin','targetMargin','gap','marginGap','scaleRate','scaleDeviation','feeRate','expense','netSales','salesUnits','sku'])assert(Number.isFinite(row[key]),row.name+' 缺少样例 '+key);
  for(const group of [chains,brands,platforms])for(const key of ['sale','target','gross','targetGross','expense','netSales','salesUnits','sku'])assert(Math.abs(group.reduce((n,r)=>n+r[key],0)-total[key])<.001,'样例汇总不一致 '+key);
  for(const row of [total,...chains,...brands,...platforms]){
   assert(Number.isInteger(row.salesUnits)&&row.salesUnits>=row.netSales,'销量为整数且不得小于去退后销量');
   assert(row.gsvRate<=100&&row.scaleRate<=100,'达成不得超过100%');
   assert(Math.abs(row.gsvDeviation-(row.gsvRate-facts.snapshot.progress))<1e-9);
   assert(Math.abs(row.scaleDeviation-(row.scaleRate-facts.snapshot.progress))<1e-9);
  }
  if(mode==='month'&&value==='10'){
   assert(Math.abs(facts.snapshot.progress-10/31*100)<1e-9);
   assert(total.sale<total.target*.5,'月初样例不得提前计入整月实际');
   const environment=chains.find(r=>r.name==='环境链'),card=cards.filter({has:page.locator('h3',{hasText:'环境链'})});
   assert(environment.gsvDeviation< -10&&environment.scaleDeviation< -10,'环境链样例应达到红色预警阈值');
   assert.equal(await card.locator(':scope > .ms-goal-line .ms-inline-deviation .red').innerText(),environment.gsvDeviation.toFixed(1)+'%');
   assert.equal(await card.locator(':scope > .ms-attainment-highlight .ms-inline-deviation .red').innerText(),environment.scaleDeviation.toFixed(1)+'%');
   const colors=await card.locator(':scope > .ms-attainment-highlight .red').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).color));
   assert(colors.every(c=>c==='rgb(220, 75, 96)'),'红色偏差及达成值使用现有红色');
  }
  assert(platforms.every(r=>r.sale>0&&r.target>0));assert(brands.every(r=>r.sale>0&&r.target>0));

  const deviations=await company.locator(':scope > .ms-goal-line .ms-inline-deviation, :scope > .ms-attainment-highlight .ms-inline-deviation').allTextContents();
  const signed=n=>(n>0?'+':'')+n.toFixed(1)+'%';
  assert.deepEqual(deviations,['偏差 '+signed(total.gsvDeviation),'偏差 '+signed(total.scaleDeviation)]);
  assert.equal(await company.locator('.ms-primary .ms-metric').count(),2);
  assert.match(await company.locator('.ms-primary').innerText(),/差额/);
 }
 await page.locator('#time-sales [data-time-mode="quarter"]').click();
 await page.locator('#time-sales [data-time-value]').selectOption('3');
 const facts=await page.evaluate(()=>window.dashboardSalesReviewSnapshot());
 assert.equal(facts.company.gap,1346);
 assert.match(await company.locator('.ms-primary-delta').first().innerText(),/1346/);
 assert.deepEqual(await company.locator('.ms-breakdown-head>span').allTextContents(),['品牌','GSV','利润率','规模达成率']);
 assert.deepEqual(await company.locator('.ms-breakdown-row>b').allTextContents(),facts.brands.slice(0,6).map(r=>r.name));
 assert.deepEqual((await company.locator('.ms-mini-deltas').first().locator(':scope > span').allTextContents()).map(t=>t.split(' ')[0]),['差额','差额','偏差']);
 const trend=company.locator('.ms-trend'),tip=trend.locator('[role=tooltip]');
 await trend.hover({position:{x:15,y:20}});assert(await tip.isVisible());assert.match(await tip.innerText(),/2026-07-\d{2}.*|GSV/s);
 await trend.focus();await page.keyboard.press('End');assert.match(await tip.innerText(),/2026-09-30/);
 await page.keyboard.press('Home');assert.match(await tip.innerText(),/2026-04-20 — 2026-04-26（周）/);
 await page.keyboard.press('Escape');assert(!(await tip.isVisible()));
 await cards.nth(1).locator('[data-si-mode="platform"]').click();
 for(const card of await cards.all()){
  assert.equal(await card.locator('[data-si-mode="platform"]').innerText(),'分渠道');
  assert.equal(await card.locator('[data-si-mode="platform"]').getAttribute('aria-selected'),'true');
  assert.equal(await card.locator('.ms-breakdown-head>span').first().innerText(),'渠道');
  assert.equal(await card.locator('[data-si-detail]').getAttribute('data-si-view'),'channel');
 }
 assert.deepEqual(await company.locator('.ms-breakdown-row>b').allTextContents(),facts.platforms.map(r=>r.name));
 await page.locator('#time-sales [data-time-value]').selectOption('2');
 assert.equal(await cards.locator('[data-si-mode="platform"][aria-selected="true"]').count(),5,'日期重绘后保持联动维度');
 await page.locator('#time-sales [data-time-value]').selectOption('3');
 await cards.last().locator('[data-si-mode="platform"]').focus();
 await page.keyboard.press('ArrowLeft');
 assert.equal(await cards.locator('[data-si-mode="brand"][aria-selected="true"]').count(),5,'键盘切回品牌同步五张卡片');
 for(const card of await cards.all())assert.equal(await card.locator('.ms-breakdown-row').count(),6);
 await page.setViewportSize({width:390,height:844});
 assert(await company.evaluate(e=>e.scrollWidth<=e.clientWidth+2),'窄屏卡片不能横向溢出');
 await page.setViewportSize({width:1920,height:1080});
 await company.locator('[data-sales]').click();
 assert.equal(await page.locator('#ms-drawer-table tbody tr').count(),10,'完整明细保留所有品牌');
 assert.deepEqual(await page.locator('#ms-drawer-table th').allTextContents(),['品牌','SKU总数','GSV','去退后销量','利润率','Q3目标GSV','GSV差额','利润率差额','GSV偏差','规模偏差']);
 assert(!/--/.test(await page.locator('#ms-drawer-table').innerText()),'品牌明细必须补齐样例');
 await page.locator('[data-ms-view="platform"]').click();
 assert.equal(await page.locator('#ms-drawer-table tbody tr').count(),9);
 assert(!/--/.test(await page.locator('#ms-drawer-table').innerText()),'平台明细必须补齐样例');
 await page.locator('[data-ms-year]').selectOption('2025');
 assert(!/--/.test(await page.locator('#ms-drawer-table').innerText()),'切换年份后样例完整');
 await page.locator('#close').click();
}

