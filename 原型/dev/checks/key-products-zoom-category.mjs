import assert from 'node:assert/strict';
export async function verifyZoomCategoryClicks(page,all){
 const zoom=page.locator('.kpm-chart-zoom'),model=()=>page.evaluate(()=>window.dashboardKeyProductZoomSnapshot()),menu=zoom.locator('.pf-multi:has([data-kpm-zoom-filter="category"])'),trigger=menu.locator('[data-pf-multi-trigger]');
 assert.equal(await zoom.locator('details.pf-multi').count(),0,'放大图不嵌套原生折叠菜单');
 let crashed=false;const crash=()=>{crashed=true};page.on('crash',crash);
 await menu.evaluate(e=>{e.testOpenCount=0;e.testOpenObserver=new MutationObserver(rs=>e.testOpenCount+=rs.length);e.testOpenObserver.observe(e,{attributes:true,attributeFilter:['open']})});
 try{
  const values=await menu.locator('[data-pf-multi-option]:not([value="all"])').evaluateAll(ns=>ns.map(n=>n.value));
  for(let i=0;i<12;i++){
   await trigger.click();assert.equal(await trigger.getAttribute('aria-expanded'),'true');
   const value=values[i%values.length];await menu.locator('[data-pf-multi-option][value="'+value+'"]').check();
   assert.deepEqual((await model()).rows.map(p=>p.spuId).sort(),all.filter(p=>p.category===value).map(p=>p.spuId).sort(),'实际点击类目更新图表');
   const second=values[(i+1)%values.length];await menu.locator('[data-pf-multi-option][value="'+second+'"]').check();
   assert.deepEqual((await model()).rows.map(p=>p.spuId).sort(),all.filter(p=>[value,second].includes(p.category)).map(p=>p.spuId).sort(),'连续多选取并集');
   await menu.locator('[data-pf-multi-option][value="all"]').check();assert.equal((await model()).rows.length,all.length);
   if(i%2===0)await page.keyboard.press('Escape');else await zoom.locator('.kpm-chart-head h3').click();
   assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert(await menu.locator('.pf-multi-menu').isHidden());
   assert(await zoom.evaluate(e=>e.open&&e.matches(':modal')));assert.equal(crashed,false);assert.equal(await menu.evaluate(e=>e.testOpenCount),(i+1)*2,'每轮只展开/收起各一次，无重复开合');
  }
  await trigger.focus();await page.keyboard.press('Enter');assert.equal(await trigger.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert(await trigger.evaluate(e=>e===document.activeElement));
  // 验证点击菜单不会触发下一帧持续开合。
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(crashed,false);
 }finally{await menu.evaluate(e=>e.testOpenObserver?.disconnect());page.off('crash',crash)}
}
