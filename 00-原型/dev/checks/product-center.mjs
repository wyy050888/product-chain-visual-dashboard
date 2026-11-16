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
 const base=page.url(),baseline={},riskBaseline={};let original,costBaseline;
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1080});await page.goto(new URL('index.html',base).href);await ready(page);baseline[width]=await styles(page);
  riskBaseline[width]=await riskVisuals(page);
  if(width===1920){original=await facts(page);costBaseline=await costContent(page)}
 }
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1080});await page.goto(new URL('产品中心.html',base).href);await ready(page);
  assert.deepEqual(await styles(page),baseline[width],width+'宽度下相同模块使用同一样式');
  assert.deepEqual(await page.locator('#pc-person option').allTextContents(),['总监','产品经理']);
  assert.equal(await page.locator('#department-view #dp-role,#department-view #dp-scope-chain').count(),0);
  const box=await page.locator('#pc-person').boundingBox();assert(box.y>=0&&box.y+box.height<=60&&box.x+box.width>width*.65&&box.x+box.width<=width,'人员切换位于右上角顶栏：'+JSON.stringify({width,box}));
  assert.equal(await page.locator('#department-view>.section').count(),10);
  assert.deepEqual(await page.locator('#riskrail>article h3').allTextContents(),['上品计划预警','立项规划预警','高危品质风险榜']);
  assert.equal(await page.locator('#riskrail .pc-risk-card .empty').count(),3);
  assert.equal(await page.locator('#riskrail [data-risk],#riskrail .rp-entry').count(),0);
  for(const board of await page.locator('#riskrail>.pc-risk-card').all()){
   const actual=await riskVisuals(page,'#riskrail>[data-rp-board="'+await board.getAttribute('data-rp-board')+'"]');
   for(const key of ['card','head','title'])assert.deepEqual(actual[key],riskBaseline[width][key],key+'沿用总看板样式');
  }
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
 await page.locator('a[href="#dp-ai"]').click();
 assert.equal(await page.locator('#aigrid [data-gd-part]').count(),4);
 const reports=page.locator('[data-gd-part="execution"]');assert.equal(await reports.locator('h3').textContent(),'部门管理');
 await reports.click();
 const files=await page.locator('#ai [data-gd-weekly-file]').evaluateAll(nodes=>nodes.map(n=>n.dataset.gdWeeklyFile));
 assert.ok(files.length&&files.every(name=>name.startsWith('产品中心')),'仅展示产品中心周报');
 const download=page.waitForEvent('download');await page.locator('#ai .pc-weekly-feature button').click();assert.equal((await download).suggestedFilename(),files[0]);
 await page.locator('a[href="#dp-management"]').click();
 const people=page.locator('#dp-management'),period=people.locator('.pc-data-context');
 await people.locator('#pc-people-date').fill('2026-10-10');
 await people.locator('[data-pc-people-mode="day"]').click();assert.match(await period.textContent(),/26\/10\/10 至 26\/10\/10/);
 await people.locator('[data-pc-people-mode="week"]').click();assert.match(await period.textContent(),/26\/10\/05 至 26\/10\/11/);
 await people.locator('[data-pc-people-mode="month"]').click();assert.match(await period.textContent(),/26\/10\/01 至 26\/10\//);
 assert.match(await people.locator('.pc-data-total').first().textContent(),/范围汇总/);
 assert.ok((await people.locator('.pc-data-total').first().locator('td').allTextContents()).some(value=>/[1-9]/.test(value)),'月份展示实际项目指标');
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
 assert.equal(await page.locator('#riskrail .pc-risk-card .empty').count(),3);
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
 console.log('产品中心：三个空榜、部门周报PDF、人员指标、品牌计划、降本范围与窄屏通过');
}

