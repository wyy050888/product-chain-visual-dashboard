import assert from 'node:assert/strict';
const common=['#ai .gd-card','#sales .ms-summary-card','#new .nsp-layout','#projects .pp-layout','#matrix .matrixlayout','#inventorymetrics>:first-child','#cost .cc-card'];
async function ready(page){await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
async function styles(page){return page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{
 const node=document.querySelector(selector);if(!node)return [selector,null];const style=getComputedStyle(node);
 return [selector,Object.fromEntries(['fontSize','fontWeight','color','backgroundImage','backgroundColor','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','width'].filter(key=>key!=='width'||selector!=='#riskrail .riskcard').map(key=>[key,style[key]]))];
})),common)}
async function riskVisuals(page,card='#riskrail .qr-card'){return page.locator(card).evaluate(root=>{
 const targets={card:['',['border','borderRadius','padding','backgroundImage','backgroundSize','boxShadow']],head:['.rhead',['padding','margin','minHeight','backgroundColor']],title:['.rhead h3',['fontSize','fontWeight','lineHeight','color','letterSpacing']]};
 return Object.fromEntries(Object.entries(targets).map(([key,[selector,fields]])=>{const node=selector?root.querySelector(selector):root;if(!node)return [key,null];const style=getComputedStyle(node);return [key,Object.fromEntries(fields.map(field=>[field,style[field]]))]}));
})}
async function riskRowVisuals(board,wide=false){
 const targets=wide?{
  columns:['.rp-loss-columns',['backgroundColor','borderRadius','color','fontSize','fontWeight']],
  title:['.rp-entry .rp-identity b',['fontSize','fontWeight','lineHeight']]
 }:{
  card:['.rp-entry',['backgroundColor','border','borderRadius','paddingInline']],
  rank:['.rp-entry .rank',['fontSize','fontWeight','height']],
  name:['.rp-entry .rp-identity b',['fontSize','fontWeight','lineHeight']],
  photo:['.rp-entry .risk-thumb',['width','height','borderRadius']],
  label:['.rp-quality-mobile-label',['color','fontSize','fontWeight']],
  action:['.rp-detail-link',['color','fontSize']]
 };
 return board.evaluate((root,targets)=>Object.fromEntries(Object.entries(targets).map(([key,[selector,properties]])=>{
  const style=getComputedStyle(root.querySelector(selector));
  return [key,properties.map(property=>style[property])];
 })),targets);
}
async function facts(page){return page.evaluate(()=>({products:dashboardKeyProductsSnapshot().rows.map(r=>({id:r.spuId,chain:r.chain,sales:r.facts.gsvCents})),newProducts:dashboardNewProductsSnapshot().rows.map(r=>({id:r.spuId,chain:r.chain})),projects:projectPanoramaAudit().scope.map(r=>({id:r.id,chain:r.chain,productDepartment:[r.dept,...(r.departments||[]),...r.ledger.flatMap(r=>Array.isArray(r.department)?r.department:[r.department])].some(d=>['产品部','产品中心'].includes(d))})),inventory:inventoryControlAudit().records.map(r=>({id:r.spuId,chain:r.chain,amount:r.amountCents})),sales:dashboardSalesReviewSnapshot(),life:dashboardLifecycleSnapshot()}))}
async function costContent(page){
 const table=page.locator('#costtable');
 await page.locator('#cost [data-cc-view="category"]').click();
 const cards=await page.locator('#costcards').textContent(),categories=await table.textContent();
 await page.locator('#cost [data-cc-view="department"]').click();
 const departments=await table.textContent();
 await table.locator('[data-cc-department]:not([data-cc-department="product"])').first().click();
 const tabs=await page.locator('#drawer-tabs [data-drawer-tab]').allTextContents();
 const details=await page.locator('.cc-department-table').textContent();
 await page.locator('#close').click();
 return {cards,categories,departments,tabs,details};
}
export async function productCenter(page){
 const base=page.url(),baseline={},riskBaseline={},rowBaseline={};
 let original,costBaseline,wideRowBaseline;
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1080});await page.goto(new URL('index.html',base).href);await ready(page);baseline[width]=await styles(page);
  riskBaseline[width]=await riskVisuals(page);
  rowBaseline[width]=await riskRowVisuals(page.locator('#riskrail [data-rp-board="3"]'));
  if(width===1920)wideRowBaseline=await riskRowVisuals(page.locator('#riskrail [data-rp-board="2"]'),true);
  if(width===1920){original=await facts(page);costBaseline=await costContent(page)}
 }
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1080});await page.goto(new URL('产品中心.html',base).href);await ready(page);
  assert.deepEqual(await styles(page),baseline[width],width+'宽度下相同模块使用同一样式');
  assert.deepEqual(await page.locator('#pc-person option').allTextContents(),['总监','产品经理']);
  assert.equal(await page.locator('#department-view #dp-role,#department-view #dp-scope-chain').count(),0);
  const box=await page.locator('#pc-person').boundingBox();assert(box.y>=0&&box.y+box.height<=60&&box.x+box.width>width*.65&&box.x+box.width<=width,'人员切换位于右上角顶栏：'+JSON.stringify({width,box}));
  assert.equal(await page.locator('#department-view>.section').count(),10);
  assert.deepEqual(await page.locator('#riskrail>.rp-board-group .rp-group-title').allTextContents(),['上品计划预警','立项规划预警','品质风险榜']);
  assert.deepEqual(await page.locator('#rp-group-navigation [data-rp-group-jump]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpGroupJump)),['pc-launch','pc-initiation','0','6','8','1','2']);
  assert.deepEqual(await riskVisuals(page),riskBaseline[width],'品质榜复用总看板样式');
  const launchGroup=page.locator('.rp-board-group-launch');
  assert.equal(await launchGroup.locator(':scope > .pc-risk-filters').count(),1);
  assert.equal(await launchGroup.locator('.riskcard .pc-risk-filters').count(),0);
  for(const group of ['launch','initiation']){
   const bar=page.locator(`[data-pc-risk-filter="${group}"]`);
   assert.deepEqual(await bar.locator('[data-pc-risk-scope]').evaluateAll(nodes=>nodes.map(node=>node.dataset.pcRiskScope)),
    group==='initiation'?['projectType','category','brand']:['projectType','category']);
   assert.doesNotMatch(await bar.innerText(),/项目类型|链群/,'标签筛选栏仅显示选项');
  }
  for(const key of ['delayed','unsold','materials']){
   const board=page.locator(`#riskrail [data-rp-board="pc-${key}"]`);
   assert.deepEqual(await riskRowVisuals(board),rowBaseline[width],key+' 使用库存预警榜列表样式');
   const geometry=await board.locator('.rp-entry').first().evaluate(card=>{
    const action=card.querySelector('.rp-detail-link').getBoundingClientRect(),header=card.querySelector('header').getBoundingClientRect();
    const value=card.querySelector('.rp-metric-text').getBoundingClientRect(),label=card.querySelector('.rp-quality-mobile-label').getBoundingClientRect();
    return {actionGap:Math.abs(header.right-action.right),fieldOffset:Math.abs(label.left-value.left),labelAbove:label.bottom<=value.top+1};
   });
   assert(geometry.actionGap<=1&&geometry.fieldOffset<=1&&geometry.labelAbove,key+' 的行内操作靠右，指标标签和数值对齐');
  }
  const launch=await launchGroup.locator('.riskcard').evaluateAll(boards=>boards.map(board=>{
   const {top,x,width}=board.getBoundingClientRect(),preview=board.querySelector('.rp-items');
   const cardTops=[...preview.querySelectorAll('.rp-entry')].map(row=>row.getBoundingClientRect().top);
   const labelTop=preview.querySelector('.rp-quality-mobile-label').getBoundingClientRect().top;
   const overflows=preview.scrollWidth>preview.clientWidth+1||preview.scrollHeight>preview.clientHeight+1;
   return {top,x,width,cardTops,labelTop,overflows};
  }));
  if(width>1100)assert(launch.every((board,index)=>board.top===launch[0].top&&board.labelTop===launch[0].labelTop&&Math.abs(board.width-launch[0].width)<1&&(!index||board.x>launch[index-1].x)),'桌面三个榜等宽同排，首条指标对齐');
  assert(launch.every(board=>!board.overflows&&board.cardTops.every((top,index)=>!index||top>board.cardTops[index-1])),'Top 6 单列展开且无内部滚动');
  if(width===1920){
   const key='initiation';
   const board=page.locator(`#riskrail [data-rp-board="pc-${key}"]`);
   assert.deepEqual(await riskRowVisuals(board,true),wideRowBaseline,key+' 使用亏损榜表格样式');
  }
  const riskFields=page.locator('#riskrail .pc-risk-card .rp-entry .rp-metric-text');
  assert(await riskFields.count()>0);
  const fonts=await riskFields.evaluateAll(nodes=>[...new Set(nodes.map(node=>{
   const {fontSize,fontWeight,fontFamily}=getComputedStyle(node);
   return fontSize+'/'+fontWeight+'/'+(fontFamily===getComputedStyle(document.body).fontFamily);
  }))]);
  assert.deepEqual(fonts,['14px/400/true'],'风险榜普通字段使用表格正文字体');
  assert.equal(await page.locator('#ai [data-gd-department],#projects [data-pp-filter="department"]').count(),0);
  assert.equal(await page.locator('.pp-dept-options:visible,.pp-analysis-tabs:visible').count(),0);
  assert.equal(await page.locator('#department-view [id]').evaluateAll(nodes=>{const ids=nodes.map(n=>n.id);return ids.length-new Set(ids).size}),0);
  assert.ok(await page.locator('#pc-person').isVisible());
  assert.ok(await page.locator('.pc-navigation-toolbar .brc-entry').isVisible(),'复用配置入口');
  assert.ok(await page.locator('[data-pc-action="dashboard-fullscreen"]').isVisible(),'复用全屏入口');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'页面无横向溢出');
 }
 await page.setViewportSize({width:1920,height:1080});
 assert.deepEqual((await facts(page)).products,original.products);assert.deepEqual((await facts(page)).inventory,original.inventory);
 const riskNavigation=page.getByRole('navigation',{name:'风险榜快速定位'});
 await riskNavigation.getByRole('button',{name:'立项规划预警',exact:true}).click();
 assert.equal(await riskNavigation.locator('[aria-current="location"]').getAttribute('data-rp-group-jump'),'pc-initiation');
 await riskNavigation.getByRole('button',{name:'上品计划预警',exact:true}).click();
 await page.waitForFunction(()=>{
  const title=document.querySelector('#riskrail>.rp-board-group-launch .rp-group-title');
  const header=document.querySelector('#risk>.sectionhead');
  const gap=title.getBoundingClientRect().top-header.getBoundingClientRect().bottom;
  return gap>=0&&gap<=32;
 });
 assert.equal(await riskNavigation.locator('[aria-current="location"]').getAttribute('data-rp-group-jump'),'pc-launch');
 const business=await page.evaluate(()=>productCenterRiskAudit());
 assert(business.delayed.rows.length>6,'延期榜能演示首页 Top 6 和完整榜单的差异');
 assert.ok(business.delayed.rows.every(row=>row.delay>=90));
 assert.ok(business.delayed.rows.every((row,index,rows)=>!index||row.delay<=rows[index-1].delay));
 assert.ok(business.materials.rows.every(row=>row.daysUntil>=0&&row.daysUntil<=60));
 assert.ok(business.initiation.rows.every(row=>row.wait>=5));
 assert.deepEqual(business.initiation.rows.map(row=>row.source),['demand','demand','wps','demand','wps','demand','wps'],'立项预警按等待时间混排两个来源');
 for(const [key,data] of Object.entries(business))assert.equal(await page.locator(`#riskrail [data-rp-board="pc-${key}"] .rp-entry`).count(),Math.min(6,data.rows.length));
 const delayBoard=page.locator('[data-rp-board="pc-delayed"]');
 const delayedRows=delayBoard.locator('.rp-entry');
 const dateText=date=>date.slice(2).replaceAll('-','/');
 const today=await page.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()));
 for(const key of ['delayed','unsold','materials']){
  assert.equal(business[key].asOf,today);
  assert.equal(await page.locator(`[data-rp-board="pc-${key}"] .pc-risk-heading small`).innerText(),'截至 '+dateText(today));
 }
 const sample=business.delayed.rows[0];
 assert(sample,'原型提供延期样例');
 assert.deepEqual(await delayedRows.first().locator('.rp-quality-mobile-label').allTextContents(),['延期天数','延期上市日期','销售渠道','卡点任务']);
 assert.equal(await delayedRows.first().locator('.rp-identity-subtitle').textContent(),[sample.type,sample.category,sample.manager].join(' | '));
 assert.equal(await delayedRows.first().locator('[aria-label="延期上市日期"] .rp-metric-text').textContent(),dateText(sample.revised));
 const blocker=delayedRows.first().locator('.pc-risk-blockers');
 assert.equal(await blocker.textContent(),sample.blockers);
 assert.equal(await blocker.evaluate(node=>getComputedStyle(node).whiteSpace),'nowrap');
 const tooltip=page.locator('#metric-tooltip');
 assert(await blocker.evaluate(node=>node.scrollWidth<=node.clientWidth),'短任务完整显示');
 await blocker.hover();
 assert(await tooltip.isHidden(),'完整显示的任务无悬浮提示');
 const longBlocker=delayedRows.getByRole('button',{name:/2D外观设计/}).first();
 assert(await longBlocker.evaluate(node=>node.scrollWidth>node.clientWidth),'长任务被截断');
 await longBlocker.hover();
 assert.equal(await tooltip.locator('h4').innerText(),'卡点任务');
 assert.equal(await tooltip.locator('.metric-tooltip-text-body').textContent(),await longBlocker.textContent());
 await page.keyboard.press('Escape');
 assert(await tooltip.isHidden());
 assert.equal(await delayedRows.first().locator('.pp-delay-days').textContent(),sample.delay+'天');
 const filter=(key,value,group='launch')=>page.locator(`[data-pc-risk-filter="${group}"] [data-pc-risk-scope="${key}"] [data-pc-risk-option="${value}"]`);
 const type=filter('projectType',sample.projectType),chain=filter('category',sample.category);
 await type.click();await chain.click();
 assert.equal(await type.getAttribute('aria-pressed'),'true');
 assert.equal(await chain.getAttribute('aria-pressed'),'true');
 const launchRows=['delayed','unsold','materials'].flatMap(key=>business[key].rows);
 assert.equal(Number(await type.locator('.rp-season-count').innerText()),launchRows.filter(row=>row.projectType===sample.projectType&&row.category===sample.category).length);
 const matched=business.delayed.rows.filter(row=>row.projectType===sample.projectType&&row.category===sample.category);
 assert.deepEqual(await delayedRows.locator('.rp-identity b').allTextContents(),matched.slice(0,6).map(row=>row.name));
 const more=delayBoard.locator('[data-pc-risk-all="delayed"]');
 assert.match(await more.innerText(),new RegExp('查看全部 '+matched.length));
 await more.click();
 assert.deepEqual(await page.locator('#dialogbody .rp-list-table tbody .rp-identity b').allTextContents(),matched.slice(0,20).map(row=>row.name));
 assert.equal(await page.locator('#dialogbody .rp-list-table th').nth(1).textContent(),'延期上市日期');
 assert.equal(await page.locator('#dialogbody .pp-delay-days').first().textContent(),sample.delay+'天');
 const drawerBlocker=page.locator('#dialogbody .pc-risk-blockers').first();
 assert(await drawerBlocker.evaluate(node=>node.scrollWidth<=node.clientWidth),'抽屉内短任务完整显示');
 await drawerBlocker.focus();
 assert(await tooltip.isHidden(),'抽屉内完整显示的任务无悬浮提示');
 const rankingTabs=page.locator('#drawer-tabs [data-drawer-tab]');
 const rankingKeys=['ranking-pc-delayed','ranking-pc-unsold','ranking-pc-materials','ranking-pc-initiation','ranking-0','ranking-6','ranking-8','ranking-1','ranking-2'];
 const activeRanking=page.locator('#drawer-tabs [aria-selected="true"]');
 const rankingTab=key=>rankingTabs.and(page.locator(`[data-drawer-tab="ranking-${key}"]`));
 assert.deepEqual(await rankingTabs.evaluateAll(nodes=>nodes.map(node=>node.dataset.drawerTab)),rankingKeys);
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-pc-delayed');
 assert.equal(await page.locator('#dialogtitle').innerText(),'产品中心风险预警 · 完整榜单');
 assert.equal(await page.locator('#dialogbody > .note').count(),0);
 const search=page.locator('#dialogbody').getByRole('searchbox',{name:'搜索产品'});
 await search.fill(sample.name);
 await rankingTab(0).click();
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-0');
 assert(await page.locator('#qr-list-table').isVisible());
 await rankingTab('pc-materials').click();
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-pc-materials');
 assert.equal(await search.inputValue(),'');
 assert.deepEqual(await page.locator('#dialogbody .rp-list-table tbody .rp-identity b').allTextContents(),
  business.materials.rows.filter(row=>row.projectType===sample.projectType&&row.category===sample.category).slice(0,20).map(row=>row.name));
 await rankingTab('pc-delayed').click();
 assert.equal(await search.inputValue(),sample.name,'返回榜单保留搜索');
 assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'0');
 await page.locator('#close').click();
 await filter('category','all').click();await filter('projectType','all').click();
 const channels=['一类电商','兴趣电商','跨境电商','亚欧跨境','线上渠道','线下渠道'];
 assert(business.materials.rows.every(row=>row.channel.split('、').every(channel=>channels.includes(channel))));
 for(const key of ['unsold','materials']){
  const board=page.locator(`[data-rp-board="pc-${key}"]`),rows=business[key].rows,first=rows[0];
  const cards=board.locator('.rp-entry');
  const groupType=first.type??{'自研开发':'自研','自选开发':'自选','产品迭代':'迭代'}[first.projectType];
  assert.equal(await cards.first().locator('.rp-identity-subtitle').textContent(),[groupType,first.category,first.manager].join(' | '));
  assert.equal(await cards.locator('[aria-label="产品经理"]').count(),0);
  assert((await cards.locator(':not([aria-label="项目上市日期"],[aria-label="延期上市日期"]) > .rp-metric-text').allTextContents()).every(text=>text&&!/^(?:—|-+)$/.test(text)));
  if(key==='unsold'){
   await board.locator('h3 .card-metric-help').hover();
   assert.match(await page.locator('#metric-tooltip').innerText(),/库存相同时，项目上市日期从早到晚，无日期的排在最后/);
   assert.equal(await cards.locator('.pc-risk-values small').count(),0,'无附注字段没有空白行');
   const dates=cards.locator('[aria-label="项目上市日期"] .rp-metric-text');
   assert.deepEqual(await dates.allTextContents(),rows.slice(0,6).map(row=>row.actualProductionDate?.slice(2).replaceAll('-','/')??'—'));
   assert.deepEqual(await cards.locator('[aria-label="销售渠道"] .rp-metric-text').allTextContents(),rows.slice(0,6).map(row=>row.salesChannel));
   const help=cards.first().getByRole('button',{name:'查看项目上市日期指标口径'});
   await help.hover();
   assert.match(await page.locator('#metric-tooltip').innerText(),/取自 SPU 关联项目的实际量产日期/);
   await page.mouse.move(0,0);
  }else{
   assert.equal(await board.locator('h3').innerText(),'上市资料预警');
   assert.deepEqual(await cards.locator('[aria-label="延期上市日期"] .rp-metric-text').allTextContents(),rows.slice(0,6).map(row=>row.revised?dateText(row.revised):'--'));
   assert.deepEqual(await cards.locator('[aria-label="销售渠道"] .rp-metric-text').allTextContents(),rows.slice(0,6).map(row=>row.channel));
  }
  await filter('projectType',first.projectType).click();
  await filter('category',first.category).click();
  const matched=rows.filter(row=>row.projectType===first.projectType&&row.category===first.category);
  for(const linked of ['delayed','unsold','materials']){
   const linkedBoard=page.locator(`[data-rp-board="pc-${linked}"]`);
   const expected=business[linked].rows.filter(row=>row.projectType===first.projectType&&row.category===first.category);
   assert.deepEqual(await linkedBoard.locator('.rp-entry .rp-identity b').allTextContents(),expected.slice(0,6).map(row=>row.name));
   assert.equal(await linkedBoard.locator('[data-pc-risk-all]').textContent(),'查看全部 '+expected.length);
  }
  await board.locator('[data-pc-risk-all]').click();
  assert.deepEqual(await page.locator('#dialogbody .rp-list-table tbody .rp-identity b').allTextContents(),matched.slice(0,20).map(row=>row.name));
  await page.locator('#close').click();
  await filter('category','all').click();await filter('projectType','all').click();
 }
 await page.locator('[data-pc-risk-all="unsold"]').click();
 const unsoldHeaders=await page.locator('#dialogbody .rp-list-table th').allTextContents();
 assert(unsoldHeaders.includes('首批请购单号')&&unsoldHeaders.includes('销售渠道')&&!unsoldHeaders.includes('承接运营'));
 await page.locator('#dialogbody [data-pc-risk-action="requisition"]').first().click();
 assert.equal(await page.locator('#toast').textContent(),'跳转请购单详情页');await page.locator('#close').click();
 const initiation=page.locator('[data-rp-board="pc-initiation"]');
 const initiationHeaders=['产品信息','立项日期','目标上市日期','销售渠道','提需人','产品经理'];
 assert.deepEqual(await initiation.getByRole('columnheader').allTextContents(),initiationHeaders);
 const firstInitiation=initiation.locator('.rp-entry').first();
 assert.equal(await firstInitiation.locator('.pc-risk-initiation-delay').textContent(),`延期 ${business.initiation.rows[0].wait}天`);
 assert.equal(await firstInitiation.locator('[aria-label="目标上市日期"] .rp-metric-text').textContent(),'27/02/15');
 assert.equal(await firstInitiation.locator('[aria-label="提需人"] .rp-metric-text').textContent(),'周晓');
 assert.equal(await initiation.locator('.rp-identity-subtitle').first().textContent(),'自研 | 厨电 | 苏泊尔、海尔 | 来源：运营提需池');
 const initiationFilter=(key,value)=>filter(key,value,'initiation');
 const brandFilter=value=>initiationFilter('brand',value);
 const brandOptions=initiation.getByRole('group',{name:'品牌筛选'}).locator('[data-pc-risk-option]');
 const dashboardBrands=await page.evaluate(()=>window.FilterCatalog.dashboardBrands);
 assert.deepEqual(await brandOptions.evaluateAll(nodes=>nodes.map(node=>node.dataset.pcRiskOption)),['all',...dashboardBrands,'其他品牌']);
 await brandFilter('海尔').click();
 assert.deepEqual(await initiation.locator('.rp-entry .rp-identity b').allTextContents(),['大口径原汁机']);
 await brandFilter('苏泊尔').click();
 assert.deepEqual(await initiation.locator('.rp-entry .rp-identity b').allTextContents(),['大口径原汁机','苏泊尔2.5L玻璃方杯绞肉机','苏泊尔无线除螨仪']);
 await brandFilter('all').click();
 await initiationFilter('projectType','自选开发').click();
 await initiationFilter('category','个护&健康').click();
 assert.equal(await initiation.locator('.rp-entry').count(),0,'立项筛选按两维组合');
 assert.equal(await delayedRows.count(),6,'立项筛选与上品计划筛选独立');
 await initiationFilter('category','厨电').click();
 await initiationFilter('category','个护&健康').click();
 const initiationMatches=['苏泊尔2.5L玻璃方杯绞肉机','美的暖菜板','美的真蒸汽炸烤箱'];
 assert.deepEqual(await initiation.locator('.rp-entry .rp-identity b').allTextContents(),initiationMatches);
 assert.equal(await brandFilter('苏泊尔').locator('.rp-season-count').innerText(),'1');
 await brandFilter('苏泊尔').click();
 const selectedInitiationMatches=[initiationMatches[0]];
 assert.deepEqual(await initiation.locator('.rp-entry .rp-identity b').allTextContents(),selectedInitiationMatches);
 await initiation.locator('[data-pc-risk-all]').click();
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-pc-initiation');
 assert.equal(await page.locator('#dialogbody > .note').count(),0);
 assert.deepEqual(await page.locator('#dialogbody .rp-list-table tbody .rp-identity b').allTextContents(),selectedInitiationMatches);
 assert.deepEqual(await page.locator('#dialogbody .rp-list-table th').allTextContents(),[...initiationHeaders,'操作']);
 assert.equal(await page.locator('#dialogbody .pc-risk-initiation-delay').first().textContent(),`延期 ${business.initiation.rows.find(row=>row.name===initiationMatches[0]).wait}天`);
 assert.equal(await page.locator('#dialogbody .rp-list-table .rp-identity-subtitle').first().textContent(),'自选 | 厨电 | 苏泊尔 | 来源：立项云文档');
 await page.locator('#dialogbody [data-pc-risk-action="wps"]').first().click();
 assert.match(await page.locator('#toast').textContent(),/打开立项云文档在线地址：待定/);await page.locator('#close').click();
 await brandFilter('all').click();await initiationFilter('category','all').click();await initiationFilter('projectType','all').click();
 await page.locator('#riskrail [data-risk="0"]').click();
 assert.deepEqual(await rankingTabs.evaluateAll(nodes=>nodes.map(node=>node.dataset.drawerTab)),rankingKeys);
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-0');
 await rankingTab('pc-unsold').click();
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-pc-unsold');
 assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'0');
 await page.locator('#close').click();
 await page.locator('a[href="#dp-ai"]').click();
 assert.equal(await page.locator('#aigrid [data-gd-part]').count(),4);
 const reports=page.locator('[data-gd-part="execution"]');assert.equal(await reports.locator('h3').textContent(),'部门管理');
 await reports.click();
 const weeklyTable=page.locator('#ai').getByRole('table',{name:'部门周报下载表'});
 assert.deepEqual(await weeklyTable.getByRole('columnheader').allTextContents(),['统计周','产品中心']);
 const files=await weeklyTable.locator('[data-gd-weekly-file]').evaluateAll(nodes=>nodes.map(n=>n.dataset.gdWeeklyFile));
 assert.ok(files.length&&files.every(name=>name.startsWith('产品中心')),'仅展示产品中心周报');
 await page.setViewportSize({width:390,height:900});
 assert(await weeklyTable.locator('..').evaluate(scroll=>scroll.scrollWidth<=scroll.clientWidth),'两列周报表适应窄屏');
 const [download]=await Promise.all([page.waitForEvent('download'),weeklyTable.getByRole('button',{name:/下载周报/}).first().click()]);
 assert.equal(download.suggestedFilename(),files[0]);
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('a[href="#dp-management"]').click();
 const people=page.locator('#dp-management'),period=people.locator('.pc-data-context');
 const mode=key=>people.locator(`[data-pc-people-mode="${key}"]`),year=people.locator('[data-pc-people-year]'),value=people.locator('[data-pc-people-value]');
 assert.deepEqual(await people.locator('[data-pc-people-mode]').allTextContents(),['周','月','季','年']);
 assert.equal(await people.locator('input[type="date"]').count(),0);
 await year.selectOption('2026');await value.selectOption('10');
 assert.match(await period.textContent(),/26\/10\/01 至 26\/10\/31/);
 assert.match(await people.locator('.pc-data-total').first().textContent(),/范围汇总/);
 assert.ok((await people.locator('.pc-data-total').first().locator('td').allTextContents()).some(value=>/[1-9]/.test(value)),'月份展示实际项目指标');
 const monthTotals=await people.locator('.pc-data-total').allTextContents();
 await mode('week').click();await people.getByRole('button',{name:'选择人员指标所在周'}).click();
 const calendar=page.locator('#pc-people-week-popover'),day=calendar.locator('[data-range-date="2026-10-10"]:not(.outside)');
 if(!await day.count())await calendar.getByRole('button',{name:'上一月',exact:true}).click();
 await day.click();
 assert.match(await period.textContent(),/26\/10\/05 至 26\/10\/11/);
 const weekTotals=await people.locator('.pc-data-total').allTextContents();
 assert.notEqual(weekTotals[0],monthTotals[0],'周切换更新人员指标');
 assert.notEqual(weekTotals[1],monthTotals[1],'周切换更新链群经营指标');
 await mode('quarter').click();await value.selectOption('3');
 assert.match(await period.textContent(),/26\/07\/01 至 26\/09\/30/);
 await mode('year').click();await year.selectOption('2025');
 assert.match(await period.textContent(),/25\/01\/01 至 25\/12\/31/);
 assert.equal(await value.count(),0);
 await people.locator('#pc-people-search').fill('不存在的员工');assert.ok(await people.getByText('暂无匹配记录').isVisible());
 await people.locator('#pc-people-search').fill('');
 for(const [key,label] of [['planning','产品上市资料数量'],['system','产品档案更新完成率'],['operations','品牌方前后协同周例会次数']]){
  await people.locator('[data-pc-people-group="'+key+'"]').click();
  assert.ok(await people.getByText(label,{exact:false}).count());assert.ok(await people.locator('.pc-data-pending').count());
 }
 await people.locator('[data-pc-people-group="projects"]').click();
 await page.locator('#pc-plan-chain').selectOption('2');
 await page.locator('#pc-plan-brand').selectOption({index:0});
 assert.equal(await page.locator('#pc-plan-chain').inputValue(),'2');
 assert.equal(await page.locator('#pc-brand-plan .pc-brand-counts strong').count(),3);
 const planCounts=(await page.locator('#pc-brand-plan .pc-brand-counts strong').allTextContents()).map(Number);
 assert.equal(planCounts[0],planCounts[1]+planCounts[2],'品牌计划完成与未完成合计一致');
 await page.locator('#lt-chain-tabs [data-lt-chain="0"]').click();
 assert.equal(await page.locator('#pc-plan-chain').count(),0,'品牌计划跟随生命周期已选链群');
 await page.locator('#lt-chain-tabs [data-lt-chain="all"]').click();
 assert.deepEqual(await costContent(page),costBaseline,'总监视角的降本与总看板一致');
 await page.locator('#pc-person').selectOption('owner');await ready(page);
 const scoped=await facts(page),scope=await page.evaluate(()=>departmentSnapshot().scope);
 assert.equal(scope.chain,'2');
 for(const key of ['products','newProducts','projects','inventory'])assert.deepEqual(scoped[key],original[key].filter(row=>row.chain===2&&(key!=='projects'||row.productDepartment)),key+'保持原事实且只显示环境');
 assert.equal(scoped.sales.company.sale,original.sales.chains[2].sale);
 assert.equal(scoped.life.summary.actual,original.life.chains[2].actual);
 const audit=await page.evaluate(()=>globalDiagnosisAudit());
 for(const key of ['work','mismatch','tasks','focus'])assert.ok(audit[key].every(row=>(row.categories||[]).includes('环境')),'AI范围：'+key);
 assert.ok(audit.reports.every(row=>['产品中心','产品部'].includes(row.department)));
 assert.equal(await page.locator('#ai [data-gd-category],#ai [data-gd-department]').count(),0);
 assert.equal(await page.locator('#nsp-category-tabs:visible,#pp-category-tabs:visible,[data-kpm-scope-filter="category"]:visible').count(),0);
 assert.equal(await page.locator('#riskrail [data-pc-risk-scope="category"]').count(),0,'产品经理固定链群');
 const ownerRisk=await page.evaluate(()=>productCenterRiskAudit());
 for(const key of ['delayed','unsold','materials'])assert.ok(ownerRisk[key].rows.every(row=>row.category==='环境'));
 assert.equal(await page.locator('#pc-plan-chain').count(),0,'产品经理链群固定');
 assert.equal(await page.locator('#dp-management .pc-chain-metrics tbody:not(.pc-data-total) th').textContent(),'环境');
 assert.deepEqual(await costContent(page),costBaseline,'产品经理视角的降本与总看板一致');
 await page.locator('a[href="#dp-sales"]').click();assert.deepEqual(await page.locator('#sales [data-ms-section]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.msSection)),['-1','2']);
 const navigation=await page.evaluate(()=>({section:document.querySelector('#sales').getBoundingClientRect().top,bar:document.querySelector('.pc-navigation-toolbar').getBoundingClientRect().bottom}));
 assert(navigation.section>=navigation.bar,'模块标题不被固定导航遮挡');
 assert.ok(await page.locator('#sales [data-ms-section="2"] [data-ms-breakdown-view="platform"]').isVisible());
 await page.locator('a[href="#dp-ai"]').click();await page.locator('[data-gd-part="tasks"]').click();assert.equal(await page.locator('[data-gd-part="tasks"]').getAttribute('aria-pressed'),'true');
 await page.locator('#pc-person').selectOption('manager');assert.equal((await page.evaluate(()=>departmentSnapshot().scope)).chain,'all');
 await page.reload();await ready(page);assert.equal(await page.locator('#pc-person').inputValue(),'manager');
 await page.setViewportSize({width:1280,height:768});
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 const launchGroup=page.locator('.rp-board-group-launch');
 assert(await launchGroup.evaluate(group=>{
  const previews=[...group.querySelectorAll('.rp-items')];
  return previews.every(preview=>getComputedStyle(preview).overflow==='visible'&&preview.scrollHeight<=preview.clientHeight+1);
 }),'视口高度不限制榜单展开');
 const preview=launchGroup.getByRole('region',{name:'上市资料预警预览'});
 assert.equal(await preview.locator('.rp-entry').count(),6);
 assert((await preview.locator('.rp-entry').last().boundingBox()).y>768,'Top 6 随页面自然展开');
 console.log('产品中心：风险榜定位、Top 6 与全量、周报、人员指标、品牌计划、降本与窄屏通过');
}

