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
  const alignmentChecks=[
   ['.ui-icon-label,.risk-date-trigger,.nsp-filter-toggle',':scope > :is(.ui-dropdown-icon,.ui-chevron-right,svg)',':scope > span:not([aria-hidden])'],
   ['.ui-platform-trigger',':scope > .ui-dropdown-icon',':scope > .ui-platform-value'],
   ['.gd-ledger-status-trigger',':scope > .ui-dropdown-icon',':scope > [data-ledger-status-label]'],
   ['.pp-analysis-value',':scope > .ui-chevron-right',':scope > strong'],
   ['.ip-refurb-rate,.ip-stockout-entry,.lt-menu-group > summary',':scope > :is(.ui-chevron-right,.ui-dropdown-icon)']
  ];
  for(const [selector,iconSelector,labelSelector] of alignmentChecks){
   for(const control of document.querySelectorAll(selector)){
    const icon=control.querySelector(iconSelector);
    if(!icon||!visible(icon)||getComputedStyle(icon).visibility==='hidden')continue;
    const text=labelSelector?control.querySelector(labelSelector):control;
    if(!text)continue;
    const a=icon.getBoundingClientRect(),b=text.getBoundingClientRect();
    if(Math.abs((a.top+a.height/2)-(b.top+b.height/2))>1)problems.push('图标与文字中心错位：'+control.textContent.trim());
   }
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
 for(const [kind,key] of [[1,'sd'],[0,'up']]){
  await page.locator(`#riskrail .rp-entry[data-rp-kind="${kind}"] .rp-detail-link`).first().click();
  const toggle=page.locator(`[data-${key}-ai-toggle]`),icon=toggle.locator('.ui-dropdown-icon');
  for(const width of [1920,390]){
   await page.setViewportSize({width,height:1080});
   for(const [label,expanded] of [['收起',true],['展开',false]]){
    assert.equal(await toggle.innerText(),label);
    assert.equal(await toggle.getAttribute('aria-expanded'),String(expanded));
    assert.equal(await icon.count(),1);
    assert.equal(await icon.evaluate(node=>getComputedStyle(node).maskImage.includes('m3 7.5')),expanded);
    await audit(page,`AI诊断${kind} ${label} ${width}`);
    await toggle.click();
   }
  }
  await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
 }
 await page.locator('a[href="#new"]').click();
 const platform=page.locator('#new .ui-platform-trigger');
 await platform.click();
 const platformIcon=platform.locator('.ui-dropdown-icon');
 assert(await platformIcon.evaluate(node=>getComputedStyle(node).backgroundImage.includes('m3 7.5')&&new DOMMatrix(getComputedStyle(node).transform).a===1),'平台下拉展开时箭头只反向一次');
 await audit(page,'新品筛选与日期');await page.keyboard.press('Escape');
 await page.locator('#ai [data-gd-part="tasks"]').click();
 await page.locator('#ai [data-gd-task-create]').click();
 const status=page.locator('.gd-task-create-drawer .gd-ledger-status-trigger');
 await status.click();await audit(page,'任务状态下拉');
 await page.keyboard.press('Escape');await page.locator('.gd-task-create-drawer [data-gd-entry-close]').first().click();
 await page.evaluate(()=>location.hash='#system-business-rules');
 await page.locator('[data-brc-new-tab="success"]').click();
 const rulePicker=page.locator('[data-brcs-record]');
 assert(await rulePicker.evaluate(node=>{const css=getComputedStyle(node);return css.backgroundImage.includes('svg')&&['center','50%'].includes(css.backgroundPositionY)}));
 await audit(page,'成功规则与系统菜单');
 await page.evaluate(()=>location.hash='#system-core-links');await page.locator('#klc-page').waitFor({state:'visible'});await audit(page,'核心链接月份');await page.evaluate(()=>location.hash='');
}
