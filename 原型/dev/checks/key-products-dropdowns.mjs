import assert from 'node:assert/strict';
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
export async function verifyKeyProductDropdowns(page){
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const reset=()=>root.locator('[data-kpm-reset]').click(),menus=root.locator('.kpm-tools .pf-multi');
 const menu=key=>root.locator('.pf-multi:has([data-kpm-filter="'+key+'"])');
 await menus.first().evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await settle(page);
 const base=(await snapshot()).rows;
 // 从可见复选框操作，覆盖“全部”互斥、并集与取消最后一项。
 for(const key of ['brand','category','season']){
  const host=menu(key),boxes=host.locator('input[data-pf-multi-option]');
  await host.locator('summary').click();await boxes.nth(1).check();await boxes.nth(2).check();
  const values=await boxes.evaluateAll(es=>es.filter(e=>e.checked).map(e=>e.value));
  assert.equal(values.length,2);assert(!values.includes('all'));
  assert.deepEqual((await snapshot()).visible.map(p=>p.spuId).sort(),base.filter(p=>values.includes(p[key])).map(p=>p.spuId).sort());
  assert.equal(await host.getAttribute('open'),'','重绘后保留多选展开 '+key+JSON.stringify(await host.evaluate(e=>({top:e.getBoundingClientRect().top,scroll:scrollY}))));
  assert.equal(await host.locator('.pf-multi-value').getAttribute('title'),values.join('、'));
  await boxes.nth(1).uncheck();await boxes.nth(2).uncheck();
  assert.equal((await snapshot()).filters[key],'all');assert(await boxes.first().isChecked(),'取消最后一项恢复全部');
  await boxes.nth(1).check();await boxes.first().check();
  assert.equal(await boxes.evaluateAll(es=>es.filter(e=>e.checked).length),1,'全部与具体选项互斥');
  await page.keyboard.press('Escape');assert.equal(await host.getAttribute('open'),null);
  assert(await host.locator('summary').evaluate(e=>e===document.activeElement),'Escape回到触发器');
  await reset();
 }
 const picked={};
 for(const key of ['brand','category','season']){
  const host=menu(key);await host.locator('summary').click();
  const box=host.locator('input').nth(1);picked[key]=await box.inputValue();await box.check();
  assert.equal(await menus.locator('summary').evaluateAll(es=>es.filter(e=>e.parentElement.open).length),1,'同时仅展开一个菜单');
 }
 assert.deepEqual((await snapshot()).visible.map(p=>p.spuId).sort(),base.filter(p=>Object.entries(picked).every(([k,v])=>p[k]===v)).map(p=>p.spuId).sort(),'跨字段交集');
 await reset();assert.equal(await root.locator('.pf-multi[open]').count(),0);
 for(const host of await menus.all()){assert.equal(await host.locator('.pf-multi-value').innerText(),'全部');assert(await host.locator('input').first().isChecked())}
 const brand=menu('brand');await brand.locator('summary').focus();await page.keyboard.press('Enter');
 assert.equal(await brand.getAttribute('open'),'');await brand.locator('input').nth(1).focus();await page.keyboard.press('Space');
 assert.notEqual((await snapshot()).filters.brand,'all','键盘空格可切换选项');
 await brand.locator('input').last().focus();await page.keyboard.press('Tab');assert.equal(await brand.getAttribute('open'),null,'Tab离开后关闭');
 await brand.locator('summary').click();await root.locator('.kpm-chart-head h3').click();assert.equal(await brand.getAttribute('open'),null,'点击外部关闭');await reset();
 // 桌面、窄屏及短屏：不放大复选框、不产生横向滚动，菜单始终位于视口。
 for(const width of [1920,1440,1280,1100,768,390,320]){
  await page.setViewportSize({width,height:700});
  for(const host of await menus.all()){
   await host.locator('summary').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await host.locator('summary').click();await settle(page);
   const geometry=await host.locator('.pf-multi-menu').evaluate(e=>{const b=e.getBoundingClientRect(),c=e.querySelector('input').getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,overflow:e.scrollWidth-e.clientWidth,box:[c.width,c.height]}});
   assert.deepEqual(geometry.box,[14,14],'复选框固定14px '+width);assert(geometry.overflow<=1,'菜单无横向滚动 '+width);
   assert(geometry.left>=7&&geometry.right<=width-7&&geometry.top>=7&&geometry.bottom<=693,'菜单完整位于视口 '+width+JSON.stringify(geometry));
   await page.keyboard.press('Escape');
  }
 }
 await brand.locator('summary').evaluate(e=>{const r=e.getBoundingClientRect();window.scrollBy(0,r.top-(innerHeight-60))});
 await brand.locator('summary').click();await settle(page);assert.equal(await brand.getAttribute('data-kpm-drop-direction'),'up','接近屏幕底部向上展开');
 const panel=await brand.locator('.pf-multi-menu').boundingBox(),anchor=await brand.boundingBox();assert(panel.y+panel.height<anchor.y,'菜单位于触发器上方');
 await page.keyboard.press('Escape');await page.setViewportSize({width:1920,height:1080});
 // 原生日期下拉：年份切换同步重建月份，季度/年与统计范围一致。
 await root.locator('[data-time-mode="month"]').click();
 await root.locator('[data-time-year]').selectOption('2025');assert.equal(await root.locator('[data-time-value] option').count(),12);
 await root.locator('[data-time-value]').selectOption('12');assert.equal((await snapshot()).range.start,'2025-12-01');
 await root.locator('[data-time-year]').selectOption('2026');assert.equal(await root.locator('[data-time-value] option').count(),10);assert.equal((await snapshot()).range.end,'2026-10-10');
 await root.locator('[data-time-mode="quarter"]').click();await root.locator('[data-time-value]').selectOption('2');
 assert.deepEqual((({start,end})=>({start,end}))((await snapshot()).range),{start:'2026-04-01',end:'2026-06-30'});
 await root.locator('[data-time-mode="year"]').click();await root.locator('[data-time-year]').selectOption('2025');assert.equal((await snapshot()).range.end,'2025-12-31');
 await root.locator('[data-time-mode="recent30"]').click();await reset();
 // 历史变动下拉的全部选项，包括无记录路径，均对照真实历史数据。
 const current=(await snapshot()).visible[0],rows=await page.evaluate(id=>window.dashboardKeyProductGradeHistory(id),current.spuId);
 await root.locator('#matrixtable [data-kpm-history]').first().click();const history=page.locator('.kpm-grade-history'),select=history.locator('[data-kpm-history-filter]');
 for(const value of await select.locator('option').evaluateAll(es=>es.map(e=>e.value))){
  await select.selectOption(value);
  const expected=rows.filter(r=>value==='all'||(value==='changed'?['up','down'].includes(r.change):value.includes('-')?[r.previous.level,r.current.level].join('-')===value:r.change===value));
  assert.equal(await history.locator('tbody tr').count(),expected.length,'历史筛选 '+value);
  assert.equal(await history.locator('.kpm-history-compare').isVisible(),!!expected.length,'空筛选隐藏旧对照 '+value);
 }
 await select.selectOption('all');assert.equal(await history.locator('tbody tr').count(),rows.length);await page.locator('#close').click();await reset();
 console.log('通过：关键产品全部筛选、日期、历史下拉与7档宽度/短屏/键盘回归');
}
