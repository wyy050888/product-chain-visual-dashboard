import assert from 'node:assert/strict';

export async function verifyFocusHeading(page,groups){
 const root=page.locator('#ai'),labels={product:'产品',project:'项目','':'未关联'};
 for(const group of groups){
  const topic=group.topics[0];
  await root.locator('[data-gd-id="'+group.id+'"][data-gd-topic="'+topic.name+'"]').click();
  const detail=page.locator('.gd-focus-dialog');
  assert.equal(await page.locator('#dialogtitle').innerText(),'工作聚焦 - '+group.object.name);
  assert.equal(await page.locator('#dialogsub .gd-business-type').innerText(),labels[group.object.type]);
  assert.equal(await detail.locator('.gd-detail-head').count(),0,'正文不再重复显示业务对象标题');
  assert.equal(await detail.locator(':scope > section').first().locator('h5').innerText(),'当前聚焦事项');
  assert.equal(await detail.locator('.gd-focus-topic strong').innerText(),topic.name);
  assert(Number(await detail.locator('.gd-focus-topic strong').evaluate(e=>getComputedStyle(e).fontWeight))>=600,'聚焦事项内容保留加粗');
  const labelStyle=locator=>locator.evaluate(e=>{const s=getComputedStyle(e);return {size:s.fontSize,weight:s.fontWeight,color:s.color}});
  assert.deepEqual(await labelStyle(detail.locator('.gd-focus-topic h5')),await labelStyle(detail.locator('.gd-detail-roster h5')),'当前聚焦事项字段名与其他字段样式一致');
  assert.equal(await detail.locator('.gd-detail-people>span').count(),topic.people.length);
  assert.equal(await detail.locator('[data-analysis-source]').count(),topic.sources.length,'人员与来源仍对应当前事项');
  for(const width of [1920,390]){
   await page.setViewportSize({width,height:900});
   const g=await page.locator('#dialog .dialoghead').evaluate(el=>{const title=el.querySelector('#dialogtitle').getBoundingClientRect(),close=el.querySelector('#close').getBoundingClientRect(),tag=el.querySelector('.gd-business-type').getBoundingClientRect();return {titleRight:title.right,closeLeft:close.left,tagRight:tag.right,tagLeft:tag.left,scroll:el.scrollWidth,client:el.clientWidth}});
   assert(g.scroll<=g.client+2,'标题不撑开抽屉');assert(g.titleRight<=g.closeLeft+1,'标题不覆盖关闭按钮');assert(g.tagRight<=width&&g.tagLeft>=0,'业务对象标签在可视范围内');
  }
  await page.locator('#close').click();await page.setViewportSize({width:1920,height:1080});
 }
}
