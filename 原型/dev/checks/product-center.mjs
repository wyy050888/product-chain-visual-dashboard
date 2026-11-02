import assert from 'node:assert/strict';
const common=['#risk>.sectionhead','#riskrail .riskcard','#ai>.sectionhead','#ai .gd-card','#sales .ms-card','#new .nsp-layout','#projects .pp-layout','#matrix .matrixlayout','#inventorymetrics>:first-child'];
async function ready(page){await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
async function styles(page){return page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{
 const node=document.querySelector(selector);if(!node)return [selector,null];const style=getComputedStyle(node);
 return [selector,Object.fromEntries(['fontSize','fontWeight','color','backgroundImage','backgroundColor','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','width'].filter(key=>key!=='width'||selector!=='#riskrail .riskcard').map(key=>[key,style[key]]))];
})),common)}
async function riskVisuals(page,card='#riskrail .qr-card'){return page.locator(card).evaluate(root=>{
 const targets={card:['',['border','borderRadius','padding','backgroundImage','backgroundSize','boxShadow']],head:['.rhead',['padding','margin','minHeight','gap','backgroundColor']],title:['.rhead h3',['fontSize','fontWeight','lineHeight','color','letterSpacing']],entry:['.rp-entry',['paddingTop','paddingBottom','minHeight','borderBottomColor']],header:['.rp-entry-main>header',['gap','marginBottom','minHeight']],name:['.rp-identity b',['fontSize','fontWeight','lineHeight','color']],meta:['.rp-identity small',['fontSize','lineHeight','color']],thumbnail:['.risk-thumb',['width','height','borderRadius']]};
 return Object.fromEntries(Object.entries(targets).map(([key,[selector,fields]])=>{const node=selector?root.querySelector(selector):root;if(!node)return [key,null];const style=getComputedStyle(node);return [key,Object.fromEntries(fields.map(field=>[field,style[field]]))]}));
})}
async function facts(page){return page.evaluate(()=>({products:dashboardKeyProductsSnapshot().rows.map(r=>({id:r.spuId,chain:r.chain,sales:r.facts.gsvCents})),newProducts:dashboardNewProductsSnapshot().rows.map(r=>({id:r.spuId,chain:r.chain})),projects:projectPanoramaAudit().scope.map(r=>({id:r.id,chain:r.chain,productDepartment:[r.dept,...(r.departments||[]),...r.ledger.flatMap(r=>Array.isArray(r.department)?r.department:[r.department])].some(d=>['产品部','产品中心'].includes(d))})),inventory:inventoryControlAudit().records.map(r=>({id:r.spuId,chain:r.chain,amount:r.amountCents})),sales:dashboardSalesReviewSnapshot(),life:dashboardLifecycleSnapshot()}))}
export async function productCenter(page){
 const base=page.url(),baseline={},riskBaseline={};let original,riskRows;
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1080});await page.goto(new URL('index.html',base).href);await ready(page);baseline[width]=await styles(page);
  riskBaseline[width]=await riskVisuals(page);
  if(width===1920){original=await facts(page);riskRows=await page.evaluate(()=>productCenterRiskAudit())}
 }
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1080});await page.goto(new URL('产品中心.html',base).href);await ready(page);
  assert.deepEqual(await styles(page),baseline[width],width+'宽度下相同模块使用同一样式');
  assert.deepEqual(await page.locator('#pc-person option').allTextContents(),['总监','产品经理']);
  assert.equal(await page.locator('#department-view #dp-role,#department-view #dp-scope-chain').count(),0);
  const box=await page.locator('#pc-person').boundingBox();assert(box.y>=0&&box.y+box.height<=60&&box.x+box.width>width*.65&&box.x+box.width<=width,'人员切换位于右上角顶栏：'+JSON.stringify({width,box}));
  assert.equal(await page.locator('#department-view>.section').count(),9);
  assert.deepEqual(await page.locator('#riskrail>article h3').evaluateAll(nodes=>nodes.map(node=>node.textContent.replace(/^●\s*/,'').trim())),['上品计划预警','立项规划预警','项目延期红灯','品质风险榜','平台销售偏差','工作流程预警']);
  assert.equal(await page.locator('#riskrail>.pc-risk-card').count(),5,'专属五榜保留原业务');
  assert.equal(await page.locator('#riskrail>.riskcard').count(),6,'六榜共用卡片视觉层');
  assert.equal(await page.locator('#riskrail [data-risk]').count(),1,'仅品质榜使用总看板业务入口');
  for(const board of await page.locator('#riskrail>.pc-risk-card').all()){
   const actual=await riskVisuals(page,'#riskrail>[data-rp-board="'+await board.getAttribute('data-rp-board')+'"]');
   assert.deepEqual(actual.card,riskBaseline[width].card,'专属卡片边框、内边距和背景统一');
   assert.deepEqual(actual.head,riskBaseline[width].head,'标题区间距统一');
   assert.deepEqual(actual.title,riskBaseline[width].title,'标题字号、字重和颜色统一');
   if(await board.locator('.rp-entry').count())for(const key of ['entry','header','name','meta','thumbnail'])assert.deepEqual(actual[key],riskBaseline[width][key],key+'共用总看板样式');
  }
  assert.equal(await page.locator('#ai [data-gd-department],#projects [data-pp-filter="department"]').count(),0);
  assert.equal(await page.locator('.pp-dept-options:visible,.pp-analysis-tabs:visible').count(),0);
  assert.deepEqual(await page.evaluate(()=>productCenterRiskAudit()),riskRows,'五榜保留原事实，品质榜沿用总看板事实');
  assert.equal(await page.locator('#department-view [id]').evaluateAll(nodes=>{const ids=nodes.map(n=>n.id);return ids.length-new Set(ids).size}),0);
  assert.ok(await page.locator('#pc-person').isVisible());
  assert.ok(await page.locator('.pc-navigation-toolbar .brc-entry').isVisible(),'复用配置入口');
  assert.ok(await page.locator('[data-pc-action="dashboard-fullscreen"]').isVisible(),'复用全屏入口');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'页面无横向溢出');
 }
 await page.setViewportSize({width:1920,height:1080});
 assert.deepEqual((await facts(page)).products,original.products);assert.deepEqual((await facts(page)).inventory,original.inventory);
 await page.locator('a[href="#dp-risk"]').click();
 assert.equal(await page.locator('#riskrail [data-rp-platform-menu]').count(),1);
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
 for(const board of await page.evaluate(()=>productCenterRiskAudit()))assert.ok(board.rows.every(row=>row.category==='环境'),'六榜环境边界：'+board.kind);
 await page.locator('a[href="#dp-risk"]').click();
 for(const platform of ['快手','天猫','拼多多']){
  await page.locator('#riskrail [data-rp-platform-menu="0"] [data-rp-platform-option="'+platform+'"]').click();
  for(const board of await page.evaluate(()=>productCenterRiskAudit()))assert.ok(board.rows.every(row=>row.category==='环境'),'切换品质平台后仍限定环境：'+board.kind);
 }
 for(const kind of [0]){
  await page.locator('#riskrail [data-risk="'+kind+'"]').click();
  assert.equal(await page.locator('#dialogbody [data-rp-filter="chain"]').count(),0,'完整榜单不提供类目切换');
  await page.locator('[data-rp-reset]').click();
  assert.deepEqual(await page.locator('#drawer-tabs [data-drawer-tab]').allTextContents(),['品质风险榜'],'不引入其他公司榜');
  if(kind!==1){const table=page.locator('.rp-list-table table'),headers=await table.locator('th').allTextContents(),index=headers.indexOf('链群');if(index>=0){const values=await table.locator('tbody tr').evaluateAll((rows,i)=>rows.filter(r=>r.cells.length>1).map(r=>r.cells[i].textContent.trim()),index);assert.ok(values.every(value=>value==='环境'))}}
  await page.locator('#close').click();
 }
 for(const index of [0,1,2,4,5]){
  await page.locator('#riskrail [data-dp-risk-all="'+index+'"]').click();
  assert.ok(await page.locator('#dp-risk-search').isVisible(),'保留原榜单搜索');
  const before=await page.locator('#dp-risk-list').textContent();
  const categories=await page.locator('#dp-risk-list tbody tr').evaluateAll(rows=>rows.filter(row=>row.cells.length>1).map(row=>row.cells[1].textContent));
  assert.ok(categories.every(category=>category.includes('环境')),'原榜单详情仍限定环境：'+index);
  await page.locator('#dp-risk-search').fill('不存在的风险对象');
  assert.equal(await page.locator('#dp-risk-list [data-dp-risk]').count(),0);
  await page.locator('#dp-risk-search').fill('');assert.equal(await page.locator('#dp-risk-list').textContent(),before);
  await page.locator('#dp-risk-level').selectOption('高危');await page.locator('#dp-risk-sort').selectOption('date');
  await page.locator('#close').click();
 }
 await page.locator('a[href="#dp-sales"]').click();assert.ok(await page.locator('#sales .ms-card').first().isVisible());
 const navigation=await page.evaluate(()=>({section:document.querySelector('#sales').getBoundingClientRect().top,bar:document.querySelector('.pc-navigation-toolbar').getBoundingClientRect().bottom}));
 assert(navigation.section>=navigation.bar,'模块标题不被固定导航遮挡');
 await page.locator('#sales [data-si-mode="platform"]').first().click();assert.equal(await page.locator('#sales [data-si-card] [aria-selected="true"]').getAttribute('data-si-mode'),'platform');
 await page.locator('a[href="#dp-ai"]').click();await page.locator('[data-gd-part="closure"]').click();assert.ok(await page.locator('[data-gd-status="all"]').isVisible());
 await page.locator('#pc-person').selectOption('manager');assert.equal((await page.evaluate(()=>departmentSnapshot().scope)).chain,'all');
 await page.reload();await ready(page);assert.equal(await page.locator('#pc-person').inputValue(),'manager');
 console.log('产品中心：六榜视觉统一、原五榜业务保留、固定产品中心/环境、详情筛选与窄屏检查通过');
}

