import assert from 'node:assert/strict';
export async function detailPeriod(page){
 const close=()=>page.locator('#close').click(),bar=page.locator('.up-detail-tabs'),period=page.locator('.up-detail-period');
 async function checkPosition(){
  assert.equal(await page.locator('.dialoghead .period-picker').count(),0,'详情头部不再显示日期');
  assert.equal(await page.locator('#dialogsub').innerText(),'','不残留旧入口的重复日期摘要');
  assert.equal(await bar.count(),1);assert.equal(await bar.locator('.drawer-tabs').count(),1);assert.equal(await period.locator('.period-picker').count(),1);
  const a=await bar.boundingBox(),b=await period.boundingBox(),nav=await bar.locator('.drawer-tabs').boundingBox();
  assert(Math.abs(a.x+a.width-b.x-b.width)<=2,'日期靠标签栏右侧');assert(nav.x+nav.width<=b.x+1,'桌面标签和日期不重叠');
 }
 async function checkDetail(shop=false){
  const root=page.locator(shop?'.sd-detail':'.up-detail:not(.sd-detail)'),tab=key=>root.locator('[data-drawer-tab="'+key+'"]');
  await root.waitFor();await tab('operating').click();await checkPosition();
  await period.locator('[data-drawer-time-mode="month"]').click();await period.locator('[data-drawer-time-value]').selectOption('9');
  const start=shop?'data-start':'data-up-start',end=shop?'data-end':'data-up-end';
  assert.equal(await root.getAttribute(start),'2026-09-01');
  await tab(shop?'violations':'quality').click();assert(await period.isVisible());assert.equal(await period.locator('[data-drawer-time-value]').inputValue(),'9');
  await period.locator('[data-drawer-time-day]').click();
  assert.match(await period.locator('.risk-date-trigger').evaluate(e=>getComputedStyle(e).display),/^(inline-)?flex$/,'日期按钮保留单行边框样式');
  assert.equal(await period.locator('.risk-date-trigger').evaluate(e=>getComputedStyle(e).height),'34px');
  await period.locator('.risk-date-trigger').click();await page.locator('#up-date-popover').waitFor();
  for(let n=0;n<24&&!await page.locator('#up-date-popover [data-range-month="1"]').isDisabled();n++)await page.locator('#up-date-popover [data-range-month="1"]').click();
  const tomorrow=await page.evaluate(()=>{const d=new Date(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)});
  const nextDay=page.locator('#up-date-popover [data-range-date="'+tomorrow+'"]:not(.outside)');if(await nextDay.count())assert(await nextDay.isDisabled(),'日期上限随当天更新，明天仍不可选');
  const selectedRange=[await root.getAttribute(start),await root.getAttribute(end)];
  assert.equal(await tab('handling').count(),0,'风险待办页签已移除');
  if(!shop){await tab('stock').click();assert(await period.isHidden())}
  else{await tab('operating').click();assert(await period.isVisible())}
  assert.equal(await page.locator('#up-date-popover').count(),0,'切换页签清理日历浮层');
  await tab('operating').click();assert(await period.isVisible());assert.deepEqual([await root.getAttribute(start),await root.getAttribute(end)],selectedRange);
  await page.setViewportSize({width:390,height:900});await tab('operating').click();
  assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'窄屏不撑破正文');
  const mobile=await period.boundingBox(),body=await page.locator('#dialogbody').boundingBox();assert(mobile.x>=body.x&&mobile.x+mobile.width<=body.x+body.width+1);
  await page.setViewportSize({width:1920,height:1080});
 }
 // 首页单独打开，与完整榜单二级打开使用同一标签栏。
 await page.locator('#riskrail [data-qr-detail]').first().click();await checkDetail();await close();
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.riskitem='1,4';document.body.append(b);b.click();b.remove()});await checkDetail(true);await close();
 for(const kind of [0,1]){
  await page.locator('#riskrail [data-risk="'+kind+'"]').click();
  await page.locator('#dialogsub [data-drawer-time-mode="month"]').click();await page.locator('#dialogsub [data-drawer-time-value]').selectOption('9');
  const parent=await page.locator('#dialogbody').getAttribute('data-ranking-period');
  await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();await checkDetail(kind===1);
  await period.locator('[data-drawer-time-mode="month"]').click();await period.locator('[data-drawer-time-value]').selectOption('10');
  await page.locator('.drawer-back').click();assert.equal(await page.locator('.up-detail-period').count(),0,'父榜单没有详情控件残留');
  assert.equal(await page.locator('#dialogbody').getAttribute('data-ranking-period'),parent);assert.equal(await page.locator('#dialogsub [data-drawer-time-value]').inputValue(),'9');
  assert(await page.locator('.dialoghead .period-picker').isVisible(),'返回后榜单日期仍在原头部');await close();
 }
}
