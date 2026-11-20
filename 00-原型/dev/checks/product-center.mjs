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
  assert.equal(await page.locator('#department-view>.section').count(),11);
  assert.deepEqual(await page.locator('#riskrail>.rp-board-group .rp-group-title-text').allTextContents(),['上品计划预警','立项规划预警','品质风险榜']);
  assert.deepEqual(await page.locator('#rp-group-navigation [data-rp-group-jump]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpGroupJump)),['pc-launch','pc-initiation','0','6','8','1','2']);
  assert.deepEqual(await riskVisuals(page),riskBaseline[width],'品质榜复用总看板样式');
  const launchGroup=page.locator('.rp-board-group-launch');
  assert(await launchGroup.locator('.rp-group-heading .rp-group-caption').isVisible());
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
 const initiationCutoff=page.locator('#rp-group-initiation .rp-group-caption');
 assert(await initiationCutoff.isVisible());
 assert.equal(await initiationCutoff.innerText(),'截至 '+dateText(business.initiation.asOf));
 const launchCutoff=page.locator('#rp-group-launch .rp-group-caption');
 assert.equal(await launchCutoff.innerText(),'截至 '+dateText(today));
 for(const key of ['delayed','unsold','materials']){
  assert.equal(business[key].asOf,today);
  assert.equal(await page.locator(`[data-rp-board="pc-${key}"] .rhead .period-range`).count(),0);
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
 const scheduleHeadings=['产品名称','计划上市日期','延期上市日期','延期天数','销售渠道','产品经理','卡点任务','操作'];
 assert.deepEqual(await page.locator('#dialogbody .rp-list-table th').allTextContents(),scheduleHeadings);
 assert.deepEqual((await page.locator('#dialogbody .rp-list-table tbody tr').first().locator('td').allTextContents()).slice(1,4),
  [dateText(sample.planned),dateText(sample.revised),sample.delay+'天']);
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
 const verifyDrawerFilters=async(key,labels)=>{
  const toolbar=page.locator('#dialogbody .rp-list-tools');
  assert(await search.isVisible());
  assert.match(await search.getAttribute('placeholder'),/产品经理$/);
  assert.deepEqual(await toolbar.locator('summary').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label'))),labels.map(label=>label+'多选'));
  for(const label of labels)assert(await toolbar.locator(`summary[aria-label="${label}多选"]`).isVisible());
  assert(await toolbar.locator('summary').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().width>=175)),'桌面筛选框已加宽');
  const group=key==='initiation'?'initiation':'launch';
  for(const field of key==='initiation'?['projectType','category','brand']:['projectType','category']){
   const preview=page.locator(`[data-pc-risk-filter="${group}"] [data-pc-risk-scope="${field}"] [data-pc-risk-option]`);
   const options=toolbar.locator(`select[data-rp-filter="${field}"] option`);
   assert.deepEqual(await options.evaluateAll(nodes=>nodes.map(node=>node.value)),await preview.evaluateAll(nodes=>nodes.map(node=>node.dataset.pcRiskOption)));
  }
 };
 const verifyManagerSearch=async rows=>{
  const manager=rows.find(row=>row.manager&&row.manager!=='—').manager;
  await search.fill(manager);
  const names=await page.locator('#dialogbody .pc-risk-list tbody .rp-identity b').allTextContents();
  assert.deepEqual(names,rows.filter(row=>row.manager?.includes(manager)).slice(0,20).map(row=>row.name));
  await search.fill('');
 };
 await verifyDrawerFilters('delayed',['项目类型','链群','销售渠道']);
 await verifyManagerSearch(matched);
 const firstRankingTab=await rankingTab('pc-delayed').elementHandle();
 await search.fill(sample.name);
 await rankingTab(0).click();
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-0');
 assert(await page.locator('#qr-list-table').isVisible());
 assert(await firstRankingTab.evaluate(node=>node.isConnected),'切换榜单保留标签节点');
 await rankingTab(0).press('ArrowLeft');
 await rankingTab('pc-initiation').press('ArrowLeft');
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-pc-materials');
 assert(await rankingTab('pc-materials').evaluate(node=>node===document.activeElement),'键盘切换后焦点跟随当前标签');
 assert.equal(await search.inputValue(),'');
 assert.deepEqual(await page.locator('#dialogbody .rp-list-table tbody .rp-identity b').allTextContents(),
  business.materials.rows.filter(row=>row.projectType===sample.projectType&&row.category===sample.category).slice(0,20).map(row=>row.name));
 await rankingTab('pc-delayed').click();
 assert.equal(await search.inputValue(),sample.name,'返回榜单保留搜索');
 assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'0');
 await page.getByRole('button',{name:'重置筛选',exact:true}).click();
 assert.equal(await search.inputValue(),'');
 const longTask=business.delayed.rows.find(row=>row.blockers.includes('2D外观设计'));
 await search.fill(longTask.blockers.split('、').at(-1));
 const taskRow=page.locator('#dialogbody .pc-risk-list tbody tr').filter({hasText:longTask.name});
 assert.equal(await taskRow.getByRole('button',{name:'查看详情',exact:true}).count(),1);
 assert(await taskRow.locator('.pc-risk-blockers').evaluate(node=>node.scrollWidth<=node.clientWidth),'卡点任务使用实际列宽');
 await page.locator('#close').click();
 assert.equal(await type.getAttribute('aria-pressed'),'true','抽屉重置不修改首页筛选');
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
  if(key==='materials'){
   await verifyDrawerFilters(key,['项目类型','链群','销售渠道']);
   await verifyManagerSearch(matched);
   assert.deepEqual(await page.locator('#dialogbody .rp-list-table th').allTextContents(),[...scheduleHeadings.slice(0,-2),'当前任务','操作']);
   assert.equal(await search.getAttribute('placeholder'),'产品名称 / 当前任务 / 产品经理');
   const dates=await page.locator('#dialogbody .rp-list-table tbody tr').evaluateAll(rows=>
    rows.map(row=>Array.from(row.cells).slice(1,4).map(cell=>cell.textContent)));
   assert.deepEqual(dates,matched.slice(0,20).map(row=>[
    dateText(row.planned),row.revised?dateText(row.revised):'—',row.delay>0?row.delay+' 天':'—'
   ]));
   const tasks=page.locator('#dialogbody .rp-list-table tbody td:nth-last-child(2)');
   assert.deepEqual(await tasks.allTextContents(),matched.slice(0,20).map(row=>row.currentTask||'—'));
   const task=matched.find(row=>row.currentTask).currentTask.split('、')[0];
   await search.fill(task);
   assert.deepEqual(await page.locator('#dialogbody .rp-list-table tbody .rp-identity b').allTextContents(),matched.filter(row=>row.currentTask.includes(task)).slice(0,20).map(row=>row.name));
  }
  await page.locator('#close').click();
  await filter('category','all').click();await filter('projectType','all').click();
 }
 await page.locator('[data-pc-risk-all="unsold"]').click();
 await verifyDrawerFilters('unsold',['项目类型','链群','销售渠道','首批单状态']);
 await verifyManagerSearch(business.unsold.rows);
 const unsoldHeaders=await page.locator('#dialogbody .rp-list-table th').allTextContents();
 assert(unsoldHeaders.includes('首批请购单号')&&unsoldHeaders.includes('销售渠道')&&!unsoldHeaders.includes('承接运营'));
 const statusTags=page.locator('#dialogbody .nsp-requisition-status');
 assert.deepEqual(await statusTags.allTextContents(),business.unsold.rows.map(row=>row.firstRequisitionStatus));
 const tagStyle=await statusTags.evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>{
  const {display,borderRadius,backgroundColor}=getComputedStyle(node);
  return [node.dataset.status,[display,borderRadius,backgroundColor]];
 })));
 assert.deepEqual(tagStyle['交付完成'],['inline-flex','999px','rgb(232, 255, 251)']);
 assert.deepEqual(tagStyle['交付中'],['inline-flex','999px','rgb(255, 243, 232)']);
 await page.locator('#dialogbody summary[aria-label="首批单状态多选"]').click();
 await page.locator('#dialogbody .pf-multi[open]').getByRole('checkbox',{name:'交付中',exact:true}).check();
 const partialOrders=business.unsold.rows.filter(row=>row.firstRequisitionStatus==='交付中');
 assert.deepEqual(await page.locator('#dialogbody .rp-list-table tbody .rp-identity b').allTextContents(),partialOrders.map(row=>row.name));
 await search.fill(partialOrders[0].requisitionNo);
 await page.locator('#dialogbody').getByRole('button',{name:'查看请购单',exact:true}).click();
 assert.equal(await page.locator('#toast').textContent(),'跳转请购单详情页');await page.locator('#close').click();
 const initiation=page.locator('[data-rp-board="pc-initiation"]');
 const initiationHeaders=['产品信息','立项日期','目标上市日期','销售渠道','提需人','产品经理'];
 assert.deepEqual(await initiation.getByRole('columnheader').allTextContents(),initiationHeaders);
 const initiationManagers=['刘萱','张晓阳','刘萱','潘东跃','刘萱','刘萱','刘萱'];
 assert.deepEqual(business.initiation.rows.map(row=>row.manager),initiationManagers);
 assert.deepEqual(await initiation.locator('[aria-label="产品经理"] .rp-metric-text').allTextContents(),initiationManagers.slice(0,6));
 const managerHelp=panel=>panel.getByRole('columnheader',{name:/^产品经理/}).getByRole('button',{name:'产品经理说明'});
 const managerHelpText='如需修改，请前往【产品研发-项目管理-模板管理-配置产品链人员】配置链群相关的产品经理';
 await managerHelp(initiation).hover();
 assert.equal(await page.locator('#metric-tooltip').innerText(),managerHelpText);
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
 await verifyDrawerFilters('initiation',['项目类型','链群','品牌','销售渠道','来源']);
 await verifyManagerSearch(business.initiation.rows.filter(row=>selectedInitiationMatches.includes(row.name)));
 assert.equal(await activeRanking.getAttribute('data-drawer-tab'),'ranking-pc-initiation');
 assert.equal(await page.locator('#dialogbody > .note').count(),0);
 assert.deepEqual(await page.locator('#dialogbody .rp-list-table tbody .rp-identity b').allTextContents(),selectedInitiationMatches);
 assert.deepEqual((await page.locator('#dialogbody .rp-list-table th').allTextContents()).map(label=>label.trim()),[...initiationHeaders,'操作']);
 await managerHelp(page.locator('#dialogbody .rp-list-table')).hover();
 assert.equal(await page.locator('#metric-tooltip').innerText(),managerHelpText);
 await page.locator('#dialogbody input[type="search"]').hover();
 await page.locator('#metric-tooltip').waitFor({state:'hidden'});
 assert.equal(await page.locator('#dialogbody .pc-risk-initiation-delay').first().textContent(),`延期 ${business.initiation.rows.find(row=>row.name===initiationMatches[0]).wait}天`);
 assert.equal(await page.locator('#dialogbody .rp-list-table .rp-identity-subtitle').first().textContent(),'自选 | 厨电 | 苏泊尔 | 来源：立项云文档');
 await page.locator('#dialogbody').getByRole('button',{name:'查看立项云文档',exact:true}).click();
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
 const reports=page.locator('[data-gd-part="execution"]');assert.equal(await reports.locator('h3').textContent(),'部门诊断');
 await reports.click();
 const weeklyTable=page.locator('#ai').getByRole('table',{name:'部门周报下载表'});
 assert.deepEqual(await weeklyTable.getByRole('columnheader').allTextContents(),['统计周','产品中心']);
 const week42=weeklyTable.locator('tbody tr').filter({hasText:'26年第42周（10/12-10/18）'});
 assert.equal(await week42.getByRole('cell').textContent(),'未生成');
 assert.equal(await week42.getByRole('button').count(),0);
 assert.equal(await reports.locator('.gd-card-number').textContent(),'1','未生成的周不计入已生成周报数');
 const weeklyPager=page.locator('#gd-weekly-pager');
 const weeklySize=weeklyPager.getByRole('combobox',{name:'每页条数'});
 assert.equal(await weeklySize.inputValue(),'10');
 assert.deepEqual(await weeklySize.locator('option').allTextContents(),['10条/页','20条/页','50条/页']);
 await weeklyPager.getByRole('button',{name:'下一页'}).click();
 assert.equal(await weeklyTable.locator('tbody .muted').count(),await weeklyTable.getByRole('rowheader').count());
 await weeklyPager.getByRole('button',{name:'上一页'}).click();
 const weeklyJump=weeklyPager.getByRole('spinbutton',{name:'跳转页码'});
 await weeklyJump.fill('2');await weeklyJump.press('Enter');
 assert.equal(await weeklyPager.locator('[aria-current="page"]').textContent(),'2');
 await weeklySize.selectOption('20');
 assert.equal(await weeklyPager.locator('[aria-current="page"]').textContent(),'1');
 const weeklyTotal=Number(await weeklyPager.getByRole('navigation').getAttribute('data-list-total'));
 assert.equal(await weeklyTable.getByRole('rowheader').count(),Math.min(20,weeklyTotal));
 await weeklySize.selectOption('10');
 const files=await weeklyTable.locator('[data-gd-weekly-file]').evaluateAll(nodes=>nodes.map(n=>n.dataset.gdWeeklyFile));
 assert.ok(files.length&&files.every(name=>name.startsWith('产品中心')),'仅展示产品中心周报');
 await page.setViewportSize({width:390,height:900});
 assert(await weeklyTable.locator('..').evaluate(scroll=>scroll.scrollWidth<=scroll.clientWidth),'两列周报表适应窄屏');
 const [download]=await Promise.all([page.waitForEvent('download'),weeklyTable.getByRole('button',{name:/下载周报/}).first().click()]);
 assert.equal(download.suggestedFilename(),files[0]);
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('a[href="#dp-management"]').click();
 const people=page.locator('#dp-management');
 const ratings=people.getByRole('tabpanel',{name:'人员评分'});
 const ratingsPager=ratings.getByRole('navigation',{name:'列表分页'});
 const ratingSummary=ratings.getByRole('group',{name:'人员评分概览'});
 assert.deepEqual(await ratingSummary.getByRole('heading').allTextContents(),['本周评分','日报提交','周工作偏差']);
 const cards=ratingSummary.locator('.gd-card'),dailyCard=cards.nth(1);
 const cardNumbers=ratingSummary.locator('.gd-card-number');
 assert.deepEqual(await cardNumbers.allTextContents(),['81.2分','已交 60 应交 63','8']);
 assert.deepEqual(await dailyCard.locator('.pc-daily-report-label').allTextContents(),['已交','应交']);
 const numberPositions=await cardNumbers.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top));
 assert(Math.max(...numberPositions)-Math.min(...numberPositions)<=1,'评分卡片主数值垂直对齐');
 assert.deepEqual(await dailyCard.locator('.gd-card-stats span').allTextContents(),['未交3','未按时交3']);
 assert.equal(await dailyCard.getAttribute('title'),'用于演示，数值为虚构');
 assert.deepEqual(await cards.first().locator('.gd-card-stats b').allTextContents(),['9 / 9 人','1 人','1 人','7 人']);
 assert.deepEqual(await cards.last().locator('.gd-card-stats span').allTextContents(),['工作遗漏1','协同卡点7','缺少方案0','资源错配0']);
 assert.equal(await ratingsPager.getAttribute('data-list-total'),'9');
 assert.equal(await ratingsPager.getByRole('combobox',{name:'每页条数'}).inputValue(),'10');
 assert(await ratings.locator('.pc-data-scroll').evaluate(node=>node.scrollHeight===node.clientHeight&&node.clientHeight>460));
 assert.equal(await people.getByRole('tab',{name:'人员评分'}).getAttribute('aria-selected'),'true');
 assert.equal(await people.getByRole('tab',{name:'人员评分'}).locator('.ai-logo--icon').count(),1);
 assert.deepEqual(await ratings.getByRole('columnheader').allTextContents(),['姓名/岗位','人员评分','周重点工作','下周计划','周工作偏差','操作']);
 const ratingValues=(await ratings.locator('[data-pc-score-value]').allTextContents()).map(Number);
 assert.deepEqual(ratingValues,[...ratingValues].sort((first,second)=>first-second));
 assert.equal(ratingValues[0],55.6);
 const ratingPreview=ratings.locator('[data-gd-preview-label="周重点工作"]:visible').first();
 await ratingPreview.waitFor({state:'visible'});
 const previewBody=ratings.locator('#'+await ratingPreview.getAttribute('aria-controls'));
 assert(await previewBody.evaluate(node=>node.scrollHeight>node.clientHeight&&
   node.clientHeight===5*parseFloat(getComputedStyle(node).lineHeight)),'人员评分长文默认只展示五行');
 await ratingPreview.click();
 assert.equal(await ratingPreview.innerText(),'收起');
 assert(await previewBody.evaluate(node=>node.scrollHeight<=node.clientHeight),'展开后展示完整工作记录');
 await ratingPreview.click();
 assert.equal(await ratingPreview.innerText(),'展开');
 assert(await previewBody.evaluate(node=>node.scrollHeight>node.clientHeight),'收起后恢复五行预览');
 for(const [name,value,tone] of [['梁勋进','87.9','green'],['潘东跃','61.7','orange'],['李亦姮','55.6','red']]){
  const score=ratings.getByRole('row').filter({has:page.getByRole('cell',{name:new RegExp(name)})}).locator('[data-pc-score-value]');
  assert.equal(await score.textContent(),value);
  assert.equal(await score.getAttribute('class'),tone);
 }
 const lead=ratings.getByRole('row').filter({hasText:'梁勋进'}).first();
 assert(await lead.locator('[data-gd-preview-label="周工作偏差"]').isHidden(),'短内容不显示展开按钮');
 assert.equal(await lead.locator('td:first-child small').textContent(),'产品总监');
 assert.match(await lead.locator('td:nth-child(5)').textContent(),/10\/24/);
 assert.deepEqual(await lead.locator('.pc-weekly-deviation>strong').allTextContents(),['【工作遗漏】']);
 const blocking=ratings.getByRole('row').filter({hasText:'潘东跃'}).locator('td:nth-child(5)');
 assert.deepEqual(await blocking.locator('.pc-weekly-deviation>strong').allTextContents(),['【协同卡点】']);
 assert.equal(await blocking.locator('li').count(),2);
 await lead.getByRole('button',{name:'查看得分明细'}).click();
 assert.equal(await page.locator('#dialogtitle').textContent(),'梁勋进 · 得分明细');
 const scoreDetail=page.locator('#dialogbody .pc-score-detail');
 const scoreTable=scoreDetail.locator('table');
 assert.equal(await scoreTable.locator('tbody tr:visible').count(),5);
 const recordButton=scoreDetail.getByRole('button',{name:'查看记录'}).nth(1);
 const recordRow=scoreTable.locator('#'+await recordButton.getAttribute('aria-controls'));
 const columnWidths=()=>scoreTable.getByRole('columnheader').evaluateAll(cells=>cells.map(cell=>cell.offsetWidth));
 const originalWidths=await columnWidths();
 await recordButton.click();
 assert.equal(await recordRow.isVisible(),true);
 assert.equal(await recordRow.locator('li').count(),3);
 assert.equal(await recordRow.evaluate(row=>row.offsetWidth),await scoreTable.evaluate(table=>table.offsetWidth));
 assert.deepEqual(await columnWidths(),originalWidths);
 const collapse=scoreDetail.getByRole('button',{name:'收起记录'});
 assert.equal(await collapse.getAttribute('aria-expanded'),'true');
 await collapse.press('Enter');
 assert.equal(await recordRow.isVisible(),false);
 assert.equal(await scoreDetail.getByRole('button',{name:'下载周报'}).count(),0);
 await page.locator('#close').click();
 const ratingsWeek=people.getByRole('button',{name:'选择人员评分所在周'});
 assert.match(await ratingsWeek.textContent(),/26\/10\/19 — 26\/10\/25/);
 await ratingsWeek.click();
 const ratingsCalendar=page.locator('#pc-rating-week-popover');
 await ratingsCalendar.locator('[data-range-date="2026-10-12"]').click();
 assert.equal(await ratings.locator('[data-pc-score-value]').count(),0,'无个人周报的周不生成分数');
 assert.deepEqual(await cardNumbers.allTextContents(),['—','已交 — 应交 —','—']);
 assert.deepEqual(await dailyCard.locator('.gd-card-stats span').allTextContents(),['未交—','未按时交—']);
 await ratingsWeek.click();
 await ratingsCalendar.locator('[data-week-day="2026-10-21"]').click();
 assert.equal(await ratings.locator('[data-pc-score-value]').count(),9);
 assert.deepEqual(await cardNumbers.allTextContents(),['81.2分','已交 60 应交 63','8']);
 const metricsTab=people.getByRole('tab',{name:'关键指标大盘'});
 const edit=people.getByRole('button',{name:'配置人员',exact:true});
 assert.equal(await edit.count(),0);
 await metricsTab.click();
 assert.equal(await edit.count(),0);
 const metrics=people.getByRole('tabpanel',{name:'关键指标大盘'});
 assert.equal(await metrics.getByRole('searchbox').count(),0);
 const rangeSummary=metrics.getByText(/^\d{2}\/\d{2}\/\d{2} 至 \d{2}\/\d{2}\/\d{2} · \d+ 人$/);
 assert.equal(await rangeSummary.count(),0);
 const metricTabs=metrics.getByRole('tablist',{name:'人员指标分组'});
 const metricTab=name=>metricTabs.getByRole('tab',{name,exact:true});
 const projectTab=metricTab('项目管理'),planningTab=metricTab('竞品分析及产品企划');
 const projectGroup=metrics.getByRole('tabpanel',{name:'项目管理',exact:true});
 const projectTable=projectGroup.getByRole('table',{name:'项目管理指标'});
 const chainBodies=projectTable.locator('[data-pc-project-chain]'),metricsRows=chainBodies.locator('tr');
 const projectSummary=projectTable.locator('tbody.pc-data-total tr');
 const summaryLabels=()=>projectSummary.locator(':scope > :nth-child(-n+2)').allTextContents();
 const checkPersonnelTotals=async()=>{
  for(const key of ['started','launched','lights','newLights','closedLights']){
   const selector=`[data-pc-project-metric="${key}"]`,amounts=text=>text.split(' / ').map(Number);
   const details=(await metricsRows.locator(selector).allTextContents()).filter(text=>text!=='—').map(amounts);
   const total=amounts(await projectSummary.locator(selector).textContent());
   assert.deepEqual(total,total.map((_,index)=>details.reduce((sum,row)=>sum+row[index],0)),key+'按人员明细汇总');
  }
 };
 assert.equal(await projectGroup.getByRole('navigation',{name:'列表分页'}).getAttribute('data-list-total'),'4');
 assert.deepEqual((await projectTable.getByRole('columnheader').allTextContents()).slice(0,2),['人员','链群']);
 assert.deepEqual(await summaryLabels(),['汇总','全部']);
 await checkPersonnelTotals();
 const gsvTotals=[original.sales.company.sale,original.sales.company.target].map(amount=>amount.toFixed(1)+'w');
 assert.deepEqual(await projectSummary.locator('.ms-gsv-pair strong').allTextContents(),gsvTotals);
 assert.deepEqual(await metricTabs.getByRole('tab').allTextContents(),['项目管理','竞品分析及产品企划','产品档案管理','产品运营']);
 assert.equal(await projectTab.getAttribute('aria-selected'),'true');
 assert.equal(await metrics.getByRole('table').count(),1,'同一时间只展示当前页签的表格');
 const preparedTables=await metrics.locator('.pc-people-content table').elementHandles();
 assert.equal(preparedTables.length,4,'打开关键指标大盘时一次准备四张表');
 assert.equal(await metrics.locator('thead th small').count(),0,'指标副标题统一收进问号');
 for(const [index,name] of [[1,'竞品分析及产品企划'],[2,'产品档案管理'],[3,'产品运营'],[0,'项目管理']]){
  await metricTab(name).click();
  assert(await metrics.getByRole('table').evaluate((table,prepared)=>table===prepared,preparedTables[index]),name+'切换时复用表格');
 }
 await projectTab.press('ArrowRight');
 assert.equal(await planningTab.getAttribute('aria-selected'),'true');
 const planning=metrics.getByRole('tabpanel',{name:'竞品分析及产品企划',exact:true});
 const planningTotals=planning.locator('tbody.pc-data-total tr');
 const planningValues=async column=>(await planning.locator(`[data-pc-metric-chain="环境"] tr>td:nth-of-type(${column-2})`).allTextContents()).map(Number);
 const marketSort=planning.locator('[data-rp-sort="market"]'),definitionSort=planning.locator('[data-rp-sort="definition"]');
 assert.equal(await metrics.getByText('示例数据',{exact:true}).count(),0);
 assert.equal(await planning.locator('thead [data-rp-sort]').count(),10);
 const planningHelp=planning.locator('thead .metric-help');
 const timelinessHelp=planning.getByRole('button',{name:'上市资料提供及时率说明',exact:true});
 assert.equal(await planningHelp.count(),8);
 assert.deepEqual(await planningHelp.evaluateAll(icons=>icons.map(icon=>icon.dataset.metricRule)),[
  ...Array(5).fill('从产品中心知识库识别提取'),
  '上市前 60 至 30 天已提供资料的产品数 ÷ 上市产品数',
  ...Array(2).fill('从产品中心知识库识别提取')
 ]);
 await timelinessHelp.focus();
 assert.equal(await page.locator('#metric-tooltip').innerText(),'上市前 60 至 30 天已提供资料的产品数 ÷ 上市产品数');
 await page.keyboard.press('Escape');
 assert.equal(await marketSort.locator('..').getAttribute('aria-sort'),'descending');
 assert.deepEqual(await planningValues(3),[8,5,3,2]);
 assert.equal(await planning.locator('.pc-data-pending').count(),0);
 const planningSummary=await planningTotals.locator(':scope > *').allTextContents();
 assert.deepEqual(planningSummary.slice(0,3),['汇总','全部','35']);
 assert.equal(planningSummary[7],'76.9%','汇总及时率按样例人员的上市产品数加权');
 await definitionSort.click();
 assert.deepEqual(await planningValues(4),[5,3,2,1]);
 await definitionSort.press('Enter');
 assert.equal(await definitionSort.locator('..').getAttribute('aria-sort'),'ascending');
 assert.deepEqual(await planningValues(4),[1,2,3,5]);
 assert.deepEqual(await planningTotals.locator(':scope > *').allTextContents(),planningSummary);
 await metricTab('产品档案管理').click();
 const archiveGroup=metrics.getByRole('tabpanel',{name:'产品档案管理',exact:true});
 const archiveSort=archiveGroup.locator('[data-rp-sort="archive"]');
 const archiveRates=()=>archiveGroup.locator('[data-pc-metric-chain="环境"] tr>td:first-of-type').allTextContents();
 assert.equal(await archiveSort.locator('..').getAttribute('aria-sort'),'descending');
 assert.deepEqual(await archiveRates(),['100.0%','75.0%','71.4%','66.7%']);
 const archiveTotal=archiveGroup.locator('tbody.pc-data-total tr > *');
 assert.deepEqual(await archiveTotal.allTextContents(),['汇总','全部','84.4%','81.8%']);
 assert.equal(await archiveGroup.locator('.pc-data-pending').count(),0);
 await archiveSort.press('Enter');
 assert.equal((await archiveRates())[0],'66.7%');
 assert.deepEqual(await archiveTotal.allTextContents(),['汇总','全部','84.4%','81.8%']);
 await archiveSort.click();
 await planningTab.click();
 assert.deepEqual(await planningValues(4),[1,2,3,5],'切回同一页签后保留组内排序');
 await marketSort.click();
 await projectTab.click();
 assert.deepEqual(await chainBodies.locator('[scope="rowgroup"]').allTextContents(),['环境','清洁','厨电','个护&健康']);
 const managerNames=()=>metricsRows.locator('th[scope="row"]').allTextContents();
 const expectedManagers=['张泽昆','刘萱','张晓阳','姚栋','潘东跃','刘萱','孟森祥','刘萱','姚栋','孟森祥','侯佳莉','姚栋','刘萱'];
 assert.deepEqual(await managerNames(),expectedManagers);
 for(const [key,total] of Object.entries({started:'2 / 12 / 0',launched:'5 / 11 / 0',lights:'28 / 3',newLights:'7 / 0',closedLights:'0 / 0'})){
  assert.equal(await projectSummary.locator(`[data-pc-project-metric="${key}"]`).textContent(),total);
 }
 assert.equal(await projectTable.locator('[data-pc-project-chain="厨电"] .pc-project-success').textContent(),'25.0%');
 assert.equal(await projectSummary.locator('.pc-project-success').textContent(),'20.0%');
 const deliveryRate=chain=>chainBodies.and(projectTable.locator(`[data-pc-project-chain="${chain}"]`)).locator('.pc-project-delivery').textContent();
 assert.deepEqual(await Promise.all(['环境','清洁','厨电','个护&健康'].map(deliveryRate)),['—','66.7%','—','50.0%']);
 assert.equal(await projectSummary.locator('.pc-project-delivery').textContent(),'60.0%','按及时项目数和应上市项目数汇总，缺少任务的链群显示空值');
 const environmentRisk=projectTable.locator('[data-pc-project-chain="环境"] tr').filter({has:page.getByRole('rowheader',{name:'姚栋',exact:true})});
 assert.equal(await environmentRisk.locator('[data-pc-project-metric="newLights"]').textContent(),'7 / 0');
 assert.equal(await metricsRows.getByRole('button').count(),0,'人员单元格只显示姓名');
 const projectRowHeights=()=>metricsRows.evaluateAll(rows=>rows.map(row=>row.offsetHeight));
 const managerWidth=()=>projectTable.locator('thead th').first().evaluate(node=>node.offsetWidth);
 const originalManagerWidth=await managerWidth();
 for(const tabName of ['竞品分析及产品企划','产品档案管理','产品运营']){
  await metricTab(tabName).click();
  assert.equal(await edit.count(),0);
  const panel=metrics.getByRole('tabpanel',{name:tabName,exact:true});
  const groups=panel.locator('[data-pc-metric-chain]');
  assert.deepEqual(await panel.locator('.pc-data-total tr>:nth-child(-n+2)').allTextContents(),['汇总','全部']);
  assert.equal(await panel.locator('.pc-data-pending').count(),0);
  assert.equal(await panel.getByText('示例数据',{exact:true}).count(),0);
  if(tabName==='产品运营'){
   assert.deepEqual(await panel.locator('.pc-data-total tr>td').allTextContents(),['全部','15','14','20','20']);
   assert.equal(await panel.locator('thead [data-rp-sort]').count(),6);
   const meetingSort=panel.locator('[data-rp-sort="successMeeting"]');
   const meetingValues=()=>panel.locator('[data-pc-metric-chain="环境"] tr>td:first-of-type').allTextContents();
   const originalOrder=await meetingValues();
   assert.equal(await meetingSort.locator('..').getAttribute('aria-sort'),'none');
   await meetingSort.click();
   assert.deepEqual(await meetingValues(),['3','3','2','1']);
   await meetingSort.press('Enter');
   assert.deepEqual(await meetingValues(),['1','2','3','3']);
   await meetingSort.click();
   assert.deepEqual(await meetingValues(),originalOrder);
  }
  for(const name of ['环境','清洁']){
   const chain=groups.and(panel.locator(`[data-pc-metric-chain="${name}"]`));
   assert.equal(await chain.getByRole('rowheader',{name:'刘萱',exact:true}).count(),1,'跨链群人员在各组各展示一行');
   const chainCell=chain.locator('th[scope="rowgroup"]');
   assert.equal(await chainCell.getAttribute('rowspan'),name==='环境'?'4':'3');
   assert.equal(await chainCell.evaluate(cell=>getComputedStyle(cell).backgroundColor),'rgb(255, 255, 255)');
   assert.equal(await chainCell.evaluate(cell=>getComputedStyle(cell).boxShadow.match(/inset/g)?.length),2);
   assert.equal(await chain.locator('th[scope="row"]').first().evaluate(cell=>getComputedStyle(cell).backgroundColor),'rgb(255, 255, 255)');
  }
  assert(await groups.evaluateAll(bodies=>bodies.every(body=>{
   const [first]=body.rows,metricCount=body.closest('table').tHead.rows[0].cells.length-2;
   return first.querySelector('th[scope="rowgroup"]').rowSpan===body.rows.length
    &&[...body.rows].every(row=>row.querySelectorAll('td').length===metricCount);
  })),'只合并链群列，人员指标逐行显示');
  const pager=panel.getByRole('navigation',{name:'列表分页'});
  await pager.getByRole('button',{name:'第2页'}).click();
  assert.deepEqual(await groups.locator('th[scope="rowgroup"]').evaluateAll(cells=>cells.map(cell=>cell.rowSpan)),[1,2]);
  await pager.getByRole('button',{name:'第1页'}).click();
 }
 await metricTab('产品档案管理').click();
 assert.deepEqual(await archiveTotal.allTextContents(),['汇总','全部','84.4%','81.8%']);
 await projectTab.click();
 assert.equal(await metricsRows.getByRole('rowheader',{name:'刘萱',exact:true}).count(),4,'同一人员可负责多个链群');
 await checkPersonnelTotals();
 assert.equal(new Set(await projectRowHeights()).size,1,'人员分行后行高统一');
 assert.equal(await managerWidth(),originalManagerWidth,'人员分行不撑宽人员列');
 const cleaningRows=projectTable.locator('[data-pc-project-chain="清洁"]');
 assert.deepEqual(await cleaningRows.locator('th[scope="row"]').allTextContents(),['潘东跃','刘萱','孟森祥']);
 const merged=await chainBodies.evaluateAll(groups=>groups.map(group=>({
  cells:[...group.querySelectorAll('[rowspan]')].map(cell=>cell.rowSpan),rows:group.rows.length,
 })));
 assert(merged.every(({cells,rows})=>cells.length===9&&cells.every(span=>span===rows)),'九个链群字段跨本组所有人员合并');
 assert.equal(await metricsRows.getByRole('button').count(),0,'人员标签全部直接展示');
 const legacyManagerKey='dashboard.product-center.project-managers.v1';
 const legacyManagers=JSON.stringify({环境:['李亦姮']});
 await page.evaluate(([key,value])=>localStorage.setItem(key,value),[legacyManagerKey,legacyManagers]);
 await page.reload();await ready(page);
 await page.locator('a[href="#dp-management"]').click();
 await people.getByRole('tab',{name:'关键指标大盘'}).click();
 assert.deepEqual(await managerNames(),expectedManagers,'旧的本地配置不影响样例名单');
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyManagerKey),legacyManagers,'大盘不写入旧配置');
 assert(await metrics.locator('.pc-data-scroll').evaluateAll(nodes=>nodes.every(node=>node.scrollHeight===node.clientHeight)));
 assert.equal(await metricsRows.count(),expectedManagers.length);
 const mode=key=>people.locator(`[data-pc-people-mode="${key}"]`),year=people.locator('[data-pc-people-year]'),value=people.locator('[data-pc-people-value]');
 assert.deepEqual(await people.locator('[data-pc-people-mode]').allTextContents(),['周','月','季','年']);
 assert.equal(await people.locator('input[type="date"]').count(),0);
 await year.selectOption('2026');await value.selectOption('10');
 assert.equal(await mode('month').getAttribute('aria-pressed'),'true');
 assert.equal(await year.inputValue(),'2026');
 assert.equal(await value.inputValue(),'10');
 const gradeHelp=projectTable.getByRole('button',{name:'SABC数量说明'});
 const riskLabels=['项目红/黄灯数','新增红/黄灯风险数','闭环红/黄灯风险数'];
 const riskHelp=label=>projectTable.getByRole('button',{name:label+'说明'});
 const checkRiskTips=async(end,dates)=>{
  assert.equal(await riskHelp(riskLabels[0]).getAttribute('data-metric-rule'),`统计截至${end} 23:59:59的红灯项目；黄灯、绿灯项目同理。`);
  assert.equal(await riskHelp(riskLabels[1]).getAttribute('data-metric-rule'),`统计${dates}新增的红灯/黄灯风险数。`);
  assert.equal(await riskHelp(riskLabels[2]).getAttribute('data-metric-rule'),`统计${dates}闭环的红灯/黄灯风险数。`);
 };
 assert.deepEqual((await projectTable.locator('thead th').allTextContents()).slice(5,9).map(label=>label.trim()),['产品下市数',...riskLabels]);
 assert.equal(await projectTable.locator('thead th:nth-child(n+6):nth-child(-n+9) small').count(),0);
 const salesHeaders=projectTable.locator('.pc-project-sales-head');
 const projectCounts=()=>metricsRows.locator('[data-pc-project-metric]').allTextContents();
 const salesCells=()=>metricsRows.locator('.ms-gsv-cell,.ms-margin-cell,.ms-scale-cell').allTextContents();
 assert.deepEqual(await salesHeaders.allTextContents(),['10月实际 / 目标GSV','10月实际 / 目标利润率','规模达成']);
 const orderedColumns=(await projectTable.getByRole('columnheader').allTextContents()).slice(9,13);
 assert.deepEqual([orderedColumns[0],orderedColumns[1],orderedColumns[3]],['Q4新品成功率','Q4 新品上线及时率','10月实际 / 目标GSV']);
 assert.match(orderedColumns[2],/^SABC数量/);
 assert(await projectTable.getByRole('columnheader',{name:'Q4新品成功率'}).isVisible());
 assert.equal(await gradeHelp.getAttribute('data-metric-rule'),'统计日期：26/10/01-26/10/31');
 await checkRiskTips('10/31','26/10/01-26/10/31');
 await checkPersonnelTotals();
 const sampleManager=chainBodies.locator('tr').filter({has:page.getByRole('rowheader',{name:'张晓阳',exact:true})});
 assert.equal(await sampleManager.locator('[data-pc-project-metric="launched"]').textContent(),'0 / 1 / 0','A944 上市数按产品样例归入张晓阳');
 await riskHelp(riskLabels[2]).hover();assert.match(await page.locator('#metric-tooltip').innerText(),/26\/10\/01-26\/10\/31闭环/);
 await page.keyboard.press('Escape');
 const monthTotals=await projectCounts(),monthSales=await salesCells();
 assert(monthTotals.flat().some(value=>/[1-9]/.test(value)),'月份展示实际项目指标');
 const metricsWeek=people.getByRole('button',{name:'选择人员指标所在周'});
 await mode('week').click();await metricsWeek.click();
 const calendar=page.locator('#pc-people-week-popover'),day=calendar.locator('[data-week-day="2026-10-10"]:not(.is-muted)');
 if(!await day.count())await calendar.getByRole('button',{name:'上一月',exact:true}).click();
 const week=day.locator('..');
 const background=await week.evaluate(row=>getComputedStyle(row).backgroundColor);
 await day.hover();
 assert.equal(await week.locator(':scope > span').count(),7);
 assert.equal(await week.evaluate(row=>row.offsetWidth),await week.locator('..').evaluate(grid=>grid.clientWidth),'整行覆盖七列的点击区域');
 assert.notEqual(await week.evaluate(row=>getComputedStyle(row).backgroundColor),background,'悬浮任意日期高亮整行');
 assert.equal(await week.getAttribute('aria-selected'),'false','悬浮预览不提交');
 await day.click();
 assert.match(await metricsWeek.textContent(),/26\/10\/05 — 26\/10\/11/);
 assert.notDeepEqual(await projectCounts(),monthTotals,'周切换更新链群项目统计');
 assert.deepEqual(await salesCells(),monthSales,'同月选周仍用整月销售目标和金额');
 assert.equal(await gradeHelp.getAttribute('data-metric-rule'),'统计日期：26/09/12-26/10/11');
 await checkRiskTips('10/11','26/10/05-26/10/11');
 await metricsWeek.click();await calendar.locator('[data-week-day="2026-10-29"]:not(.is-muted)').click();
 assert.equal(await salesHeaders.first().innerText(),'11月实际 / 目标GSV','跨月周按周末所在月');
 assert.equal(await gradeHelp.getAttribute('data-metric-rule'),'统计日期：26/10/03-26/11/01');
 await gradeHelp.focus();assert.match(await page.locator('#metric-tooltip').innerText(),/统计日期：26\/10\/03-26\/11\/01/);
 await page.keyboard.press('Escape');
 await mode('quarter').click();await value.selectOption('3');
 assert.equal(await mode('quarter').getAttribute('aria-pressed'),'true');
 assert.equal(await year.inputValue(),'2026');
 assert.equal(await value.inputValue(),'3');
 assert.equal(await salesHeaders.first().innerText(),'Q3实际 / 目标GSV');
 assert.equal(await gradeHelp.getAttribute('data-metric-rule'),'统计日期：26/07/01-26/09/30');
 await checkRiskTips('09/30','26/07/01-26/09/30');
 await mode('year').click();await year.selectOption('2025');
 assert.equal(await mode('year').getAttribute('aria-pressed'),'true');
 assert.equal(await year.inputValue(),'2025');
 assert.equal(await value.count(),0);
 assert.equal(await salesHeaders.first().innerText(),'25年实际 / 目标GSV');
 assert.equal(await gradeHelp.getAttribute('data-metric-rule'),'统计日期：25/01/01-25/12/31');
 await checkRiskTips('12/31','25/01/01-25/12/31');
 for(const [name,label] of [['竞品分析及产品企划','产品上市资料数量'],['产品档案管理','产品档案更新完成率'],['产品运营','品牌方前后协同周例会次数']]){
  await metricTab(name).click();
  const group=metrics.getByRole('tabpanel',{name,exact:true});
  assert.equal(await edit.count(),0);
  assert.equal(await group.getByRole('columnheader',{name:new RegExp(label)}).count(),1);
  assert.ok(await group.locator('.pc-data-pending').count());
 }
 await metricTab('产品运营').press('Home');
 assert.equal(await projectTab.getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('#pc-brand-plan').count(),0);
 await page.locator('[data-pc-life-brands]').click();
 assert.equal(await page.locator('[data-pc-life-brands]').innerText(),'收起品牌');
 await page.locator('#lt-chain-tabs [data-lt-chain="0"]').click();
 assert.deepEqual(await page.locator('[data-pc-life-brand-row]').evaluateAll(rows=>[...new Set(rows.map(row=>row.dataset.chain))]),['0'],'品牌计划跟随生命周期已选链群');
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
 assert.deepEqual(await page.locator('[data-pc-life-brand-row]').evaluateAll(rows=>[...new Set(rows.map(row=>row.dataset.chain))]),['2'],'产品经理仅能展开固定链群的品牌');
 assert.deepEqual(await chainBodies.locator('[scope="rowgroup"]').allTextContents(),['环境']);
 assert.deepEqual(await chainBodies.locator('th[scope="row"]').allTextContents(),expectedManagers.slice(0,4));
 assert.deepEqual(await summaryLabels(),['汇总','环境']);
 assert.deepEqual(await projectSummary.locator('.ms-gsv-cell').allTextContents(),await metricsRows.locator('.ms-gsv-cell').allTextContents());
 assert.equal(await edit.count(),0);
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

