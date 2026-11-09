import assert from 'node:assert/strict';

export async function todoRowHeight(page){
 await page.emulateMedia({reducedMotion:'reduce'});
 const root=page.locator('#ai'),tip=page.locator('#ui-cell-tooltip');
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1000});
  await page.reload();
  for(const part of ['coordination','closure']){
   console.log('检查任务行高：'+width+' / '+part);
   await root.locator('[data-gd-part="'+part+'"]').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   await root.locator('[data-gd-part="'+part+'"]').click();
   const table=root.locator('.gd-action-table'),rows=table.locator('tbody tr[data-gd-task]');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert(await rows.count()>0);
   const heights=await rows.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
   assert(heights.every(h=>h>=80&&h<=92),part+' '+width+'留白后行高范围，实际：'+heights);
   assert.equal(await rows.first().locator('td').first().evaluate(e=>getComputedStyle(e).paddingTop),'12px');
   const alignment=await rows.first().locator('td[data-label="计划完成日期"],td[data-label="实际完成日期"],td[data-label="状态"],td[data-label="操作"]').evaluateAll(es=>es.map(e=>getComputedStyle(e).verticalAlign));
   assert.deepEqual(alignment,['middle','middle','middle','middle']);
   assert.equal(await rows.first().locator('.gd-problem').evaluate(e=>getComputedStyle(e).fontSize),'13px','不缩小正文');
   assert.equal(await rows.first().locator('td:last-child').evaluate(e=>getComputedStyle(e).position),'sticky');
   assert.equal(await rows.first().locator('.gd-task-preview').count(),4);
   assert(await table.locator('[data-gd-cell-more]:visible').count()>0,'长内容显示展开');
   assert(await rows.first().locator('[data-label="业务对象"] [data-gd-cell-more]').isHidden(),'完整对象名不显示展开');
   const index=await table.locator('tbody td').evaluateAll(es=>es.findIndex(td=>{const e=td.querySelector('.gd-task-preview');return e&&e.scrollHeight>e.clientHeight+1}));
   const cell=table.locator('tbody td').nth(index),button=cell.locator('[data-gd-cell-more]'),preview=cell.locator('.gd-task-preview'),full=await preview.innerText();
   assert.equal(await button.getAttribute('aria-expanded'),'false');assert.equal(await button.innerText(),'展开');
   assert.equal(await button.getAttribute('aria-controls'),await preview.getAttribute('id'));
   const buttonBox=await button.boundingBox(),previewBox=await preview.boundingBox();
   assert(buttonBox.x>=previewBox.x-1&&buttonBox.x+buttonBox.width<=previewBox.x+previewBox.width+1,'展开按钮保持在内容列内');
   await button.click();assert.equal(await button.innerText(),'收起');assert.equal(await button.getAttribute('aria-expanded'),'true');
   assert.equal(await preview.innerText(),full,'展开保持完整正文');
   assert(await preview.evaluate(e=>e.clientHeight>=e.scrollHeight-1),'全文原位可见');
   assert(await cell.locator('.gd-task-cell').evaluate(e=>e.getBoundingClientRect().height>66));
   assert.equal(await table.locator('.gd-task-cell.is-expanded').count(),1,'仅展开所点单元格');
   assert(await tip.isHidden(),'展开不叠加旧悬浮提示');
   await button.click();assert.equal(await button.innerText(),'展开');
   assert((await cell.locator('xpath=..').boundingBox()).height<=92,'收起恢复行高');
   assert.equal(await preview.innerText(),full);
  }
 }
 await page.setViewportSize({width:1920,height:1000});
 await root.locator('[data-gd-part="coordination"]').click();
 const table=root.locator('.gd-action-table');
 const clippedIndex=await table.locator('tbody td').evaluateAll(es=>es.findIndex(td=>{const e=td.querySelector('.gd-task-preview');return e&&e.scrollHeight>e.clientHeight+1}));
 assert(clippedIndex>=0,'长内容确实截断');
 const cell=table.locator('tbody td').nth(clippedIndex),full=await cell.locator('[data-ui-cell-content]').innerText();
 await cell.evaluate(e=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY-180,behavior:'instant'}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.mouse.move(0,0);await cell.hover({position:{x:20,y:15}});await page.waitForTimeout(250);
 assert(await tip.isHidden(),'任务全文改为原位展开，不再弹悬浮层');
 const more=cell.locator('[data-gd-cell-more]');
 assert(await more.isVisible());
 await page.emulateMedia({reducedMotion:'no-preference'});
 const sampleMotion=()=>more.evaluate(button=>{
  const cell=button.closest('.gd-task-cell');button.click();
  const animation=cell.getAnimations()[0];if(!animation)return null;
  animation.pause();animation.currentTime=0;const start=cell.getBoundingClientRect().height;
  animation.currentTime=100;const middle=cell.getBoundingClientRect().height;
  const frames=animation.effect.getKeyframes(),end=parseFloat(frames.at(-1).height),duration=animation.effect.getTiming().duration;
  animation.finish();return {start,middle,end,duration};
 });
 const expand=await sampleMotion();assert(expand&&expand.duration>=200,'有实际高度过渡动画');
 assert(expand.start<expand.middle&&expand.middle<expand.end,'展开逐步撑高，不是瞬时替换');
 await page.waitForFunction(()=>!document.querySelector('.gd-task-cell.is-transitioning'));
 assert.equal(await more.innerText(),'收起');assert.equal(await cell.locator('.gd-task-preview').innerText(),full);
 assert(await tip.isHidden());
 await page.setViewportSize({width:1280,height:1000});
 assert.equal(await more.getAttribute('aria-expanded'),'true','改变列宽保持展开');
 assert(await cell.locator('.gd-task-preview').evaluate(e=>e.scrollHeight<=e.clientHeight+1));
 await page.setViewportSize({width:1920,height:1000});
 const collapse=await sampleMotion();assert(collapse&&collapse.start>collapse.middle&&collapse.middle>collapse.end,'收起逐步恢复高度');
 await page.waitForFunction(()=>!document.querySelector('.gd-task-cell.is-transitioning'));
 assert.equal(await more.innerText(),'展开');assert.equal(await more.getAttribute('aria-expanded'),'false');
 await page.emulateMedia({reducedMotion:'reduce'});
 await more.focus();await page.keyboard.press('Enter');assert.equal(await more.getAttribute('aria-expanded'),'true','键盘Enter展开');
 assert.equal(await cell.locator('.gd-task-cell').evaluate(e=>e.getAnimations().length),0,'减少动态效果设置不播放动画');
 await page.keyboard.press('Space');assert.equal(await more.getAttribute('aria-expanded'),'false','键盘Space收起');await more.evaluate(e=>e.blur());
 await more.click();await root.locator('[data-gd-part="closure"]').click();await root.locator('[data-gd-part="coordination"]').click();
 assert.equal(await root.locator('.gd-task-cell.is-expanded').count(),0,'表格重绘恢复收起，不保存到任务数据');
 await table.locator('[data-label="优先级"]').first().hover();
 await page.waitForTimeout(250);assert(await tip.isHidden(),'完整展示内容不弹提示');
 await table.locator('[data-gd-action]').first().click();
 const dialog=page.locator('.up-todo-dialog[open]');
 assert(await dialog.isVisible());assert.equal(await dialog.locator('.gd-task-preview').count(),0,'详情不截断');
 await dialog.locator('[data-todo-close]').click();
 console.log('通过：两张任务表三种宽度默认80–92px、原位展开/收起及真实高度动画、键盘/减少动态效果/宽度变化、全文保持、无重复浮层与详情入口。');
}
