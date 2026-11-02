import assert from 'node:assert/strict';
async function audit(page,label){
 const issues=await page.evaluate(()=>{
  const visible=node=>node.checkVisibility();
  const problems=[];
  for(const select of document.querySelectorAll('select:not([multiple])')){
   if(!visible(select))continue;const css=getComputedStyle(select);
   if(css.backgroundImage!=='none'&&css.appearance!=='none')problems.push('原生箭头与背景叠加：'+(select.id||select.getAttribute('aria-label')));
  }
  for(const trigger of document.querySelectorAll('.pf-attribute>summary,.pf-multi>summary,.pf-multi>[data-pf-multi-trigger],.nsp-launch-trigger,.pp-plan-trigger,.pp-stage-cascader>summary,.kpm-price-trigger,.klc-month-trigger,.ui-platform-trigger')){
   if(!visible(trigger))continue;
   const marks=[trigger,...trigger.querySelectorAll('i,span')].filter(node=>{
    const css=getComputedStyle(node);return visible(node)&&(css.backgroundImage.includes('svg')||/^[⌄▾▼∨]$/.test(node.textContent.trim()));
   });
   if(marks.length!==1)problems.push('箭头数量'+marks.length+'：'+trigger.textContent.trim());
   for(const mark of marks)if(mark.textContent.trim()&&getComputedStyle(mark).backgroundImage!=='none')problems.push('文字与图标叠加：'+trigger.textContent.trim());
   const css=getComputedStyle(trigger);if(trigger.tagName==='SUMMARY'&&css.listStyleType!=='none')problems.push('原生summary标记未隐藏');
  }
  return problems;
 });
 assert.deepEqual(issues,[],label);
}
export async function dropdownIcons(page){
 await audit(page,'首页全部已挂载下拉');
 for(const kind of [0,6,1,4,3,2]){
  await page.locator('#riskrail [data-risk="'+kind+'"]').first().click();await audit(page,'完整榜单'+kind);
  const type=page.locator('#dialogbody .pf-attribute');
  if(await type.count()){
   const trigger=type.locator('summary'),icon=trigger.locator('.ui-dropdown-icon');
   assert.equal(await icon.count(),1);assert.equal(await icon.textContent(),'');
   for(const width of [1920,390]){
    await page.setViewportSize({width,height:1080});await trigger.click();assert.equal(await type.getAttribute('open'),'');
    assert(await icon.evaluate(node=>getComputedStyle(node).backgroundImage.includes('7.5')),'展开为向上箭头');await audit(page,'类型展开'+kind+'/'+width);
    const box=await icon.boundingBox(),control=await trigger.boundingBox();assert.equal(box.width,12);assert.equal(box.height,12);assert(Math.abs(box.y+box.height/2-control.y-control.height/2)<1,'图标垂直居中');
    await page.keyboard.press('Escape');assert.equal(await type.getAttribute('open'),null);assert.equal(await page.locator('#overlay').evaluate(node=>node.hidden),false);
   }
  }
  await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 }
 await page.evaluate(()=>location.hash='#system-core-links');await page.locator('#klc-page').waitFor({state:'visible'});await audit(page,'核心链接月份');await page.evaluate(()=>location.hash='');
}
