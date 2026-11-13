import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';

export async function metricRuleCards(page){
 await page.clock.setFixedTime(new Date('2026-11-07T10:30:00Z'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const tip=page.locator('#metric-tooltip');
 const cases=[
  ['matrix','#matrix.kpm-main>.sectionhead h2>.metric-help','规模等级与经营标签'],
  ['new','.nsp-pool-help .metric-help','新品判定与出池'],
  ['inventory','[data-ip-summary-help]','库存指标说明'],
  ['suppliers','[data-scp-resource-help]','核心战略合作供应商认定规则'],
  ['suppliers','[data-scp-category-help]','类目准入储备'],
  ['suppliers','[data-scp-material-help]','核心物料准入覆盖'],
  ['suppliers','[data-scp-sourcing-help]','产品寻源预警']
 ];
 const open=async selector=>{
  const help=page.locator(selector).first();await page.mouse.move(0,0);
  await help.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await help.hover();
  try{await tip.waitFor({state:'visible'})}catch(error){console.error('触发失败：',selector,page.viewportSize(),await help.boundingBox());throw error}
  return help;
 };
 // 直接与榜单“入榜条件”浮层比较字体和字色，避免两套样式各自漂移。
 await page.locator('a[href="#risk"]').click();await open('#riskrail .card-metric-help');
 const typography=await tip.evaluate(el=>{
  const body=getComputedStyle(el),title=getComputedStyle(el.querySelector('h4'));
  return {body:[body.fontFamily,body.fontSize,body.color],title:[title.fontFamily,title.fontSize,title.fontWeight,title.color]};
 });
 const noteStyle=await tip.locator('p').first().evaluate(el=>{
  const s=getComputedStyle(el);return [s.backgroundColor,s.padding,s.borderRadius,s.fontSize,s.color];
 });
 await page.keyboard.press('Escape');
 let commonStyle;
 for(const [index,[section,selector,title]] of cases.entries()){
  await page.locator('a[href="#'+section+'"]').click();
  const help=await open(selector);
  const compact=/scp-(resource|category|sourcing)-help/.test(selector);
  if(compact){
   assert.equal(await tip.locator('.scp-compact-help').count(),1);
   assert.equal(await tip.locator('.scp-compact-help li').count(),selector.includes('resource')?6:2);
   assert.equal(await tip.locator('h4,.metric-rule-badge,.metric-rule-note').count(),0,'短规则不重复区块标题或灰底说明');
   assert.equal(await tip.evaluate(el=>getComputedStyle(el).width),'340px');
   assert.equal(await help.getAttribute('aria-describedby'),'metric-tooltip');
   if(selector.includes('resource'))assert.deepEqual(await tip.locator('li>span').allTextContents(),['已合作满 1 年','≥ 1,000 万元','三星','≥ 97%','< 0.5%','具备研发协同与产能弹性']);
  }else{
  assert(await tip.evaluate(el=>el.classList.contains('metric-rule-card')));
  assert.equal(await tip.locator('.metric-rule-heading h4').innerText(),title);
  assert.equal(await help.getAttribute('aria-describedby'),'metric-tooltip');
  const style=await tip.evaluate(el=>{const s=getComputedStyle(el);return [s.width,s.padding,s.borderRadius,s.borderColor,s.boxShadow,s.fontSize]});
  commonStyle??=style;assert.deepEqual(style,commonStyle,'同类提示必须复用相同外框样式：'+title);
  assert.deepEqual(await tip.evaluate(el=>{
   const body=getComputedStyle(el),title=getComputedStyle(el.querySelector('h4'));
   return {body:[body.fontFamily,body.fontSize,body.color],title:[title.fontFamily,title.fontSize,title.fontWeight,title.color]};
  }),typography,'字体字号及字色必须与入榜条件一致：'+title);
  for(const note of await tip.locator('.metric-rule-note').all()){
   if(section==='new'){
    assert.deepEqual(await note.evaluate(el=>{
     const style=getComputedStyle(el),row=el.parentElement,heading=row.querySelector('h5');
     return [style.backgroundColor,style.padding,getComputedStyle(row).display,heading.getBoundingClientRect().right<el.getBoundingClientRect().left];
    }),['rgba(0, 0, 0, 0)','0px','grid',true],'新品提示使用无底色的标题与说明分列');
    continue;
   }
   assert.deepEqual(await note.evaluate(el=>{
    const s=getComputedStyle(el);return [s.backgroundColor,s.padding,s.borderRadius,s.fontSize,s.color];
   }),noteStyle,'解释说明统一使用灰底说明块：'+title);
  }
  if(section==='matrix')assert.equal(await tip.locator('.metric-rule-badge').innerText(),'所选期间');
  if(section==='new')assert.equal(await tip.locator('.metric-rule-list>li').count(),4);
  if(section==='inventory')assert.deepEqual(await tip.locator('.metric-rule-section>h5').allTextContents(),['库存周转率','交付及时率','翻新闭环率']);
  if(selector.includes('resource')){
   assert.equal(await tip.locator('.metric-rule-list>li').count(),6);
   assert.equal(await tip.locator('.metric-rule-note').count(),0,'认定规则只展示六项条件及阈值');
  }
  if(selector.includes('category')||selector.includes('sourcing')||selector.includes('material')){
   const note=await tip.locator('.metric-rule-note').first().boundingBox(),rules=await tip.locator('.metric-rule-list').boundingBox();
   assert(note.y+note.height<=rules.y,'统计说明应位于标题下方、具体条件之前');
  }
  if(selector.includes('category')){
   assert.equal(await help.getAttribute('data-metric-rule'),null,'专用提示无需文字占位字段');
   assert((await tip.innerText()).includes('年度新增准入'));
  }
  if(selector.includes('material')){
   const target=await page.evaluate(()=>supplierTargetsAudit().values.standards.materialAdmitted);
   assert((await tip.innerText()).includes('≥ '+target+'家'));
   assert.equal(await tip.locator('.metric-rule-note').count(),1);
   assert.deepEqual(await tip.locator('.metric-rule-line>h5').allTextContents(),['达标条件','格子含义']);
   assert((await tip.innerText()).length<150,'准入覆盖只保留必要说明');
  }
  }
  if(process.env.DASHBOARD_RULE_CARD_SHOTS)await tip.screenshot({path:path.join(os.tmpdir(),'metric-rule-'+section+'-'+index+'.png')});
  await page.keyboard.press('Escape');assert(await tip.isHidden());
  await help.focus();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});await open(selector);
   const bounds=await tip.boundingBox();assert(bounds.x>=7&&bounds.x+bounds.width<=width-7,'浮层不越界：'+title);
   assert(await tip.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'浮层不能横向滚动：'+title);
   await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:1920,height:1080});
 }
 await page.locator('a[href="#risk"]').click();await open('#riskrail .card-metric-help');
 assert(!(await tip.evaluate(el=>el.classList.contains('metric-rule-card'))),'普通提示不残留规则卡片样式');
 await page.keyboard.press('Escape');
}
