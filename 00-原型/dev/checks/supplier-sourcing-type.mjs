import assert from 'node:assert/strict';

async function checkChainFilters(page){
 const root=page.locator('#suppliergrid'),project=root.locator('.scp-project-card'),category=root.locator('.scp-category-card');
 const projectChain=project.getByRole('combobox',{name:'链群'}),categoryChain=category.getByRole('combobox',{name:'链群'});
 const projects=()=>project.locator('.scp-project-link').evaluateAll(rows=>rows.map(row=>row.dataset.project));
 const categories=()=>category.locator('[data-scp-leaf]').evaluateAll(rows=>rows.map(row=>row.dataset.scpLeaf));
 const chainNames=['清洁','厨电','环境','个护&健康'],choices=['全部','环境','清洁','厨电','个护&健康'];
 const facts=await page.evaluate(()=>({projects:referenceSampleAudit().projects,categories:supplierPlanningAudit().categories}));
 const projectFacts=new Map(facts.projects.map(row=>[String(row.id),row]));
 const categoryFacts=new Map(facts.categories.map(row=>[row.id,row]));
 const allProjects=await projects(),allCategories=await categories();
 const leads=new Map(await project.locator('.scp-project-link').evaluateAll(links=>links.map(link=>[
  link.dataset.project,link.closest('tr').querySelector('.scp-procurement-lead').textContent.trim()
 ])));
 for(const select of [projectChain,categoryChain]){
  assert.equal(await select.getAttribute('multiple'),null);
  assert.equal(await select.inputValue(),'all');
  assert.deepEqual(await select.locator('option').allTextContents(),choices);
 }
 for(const chain of choices.slice(1)){
  await projectChain.selectOption(chain);
  assert.deepEqual(await projects(),allProjects.filter(id=>chainNames[projectFacts.get(id).chain]===chain));
  assert.deepEqual(await categories(),allCategories);
 }
 await projectChain.selectOption('all');
 for(const chain of choices.slice(1)){
  const names=chain==='个护&健康'?['个护类','健康类']:[chain+'类'];
  await categoryChain.selectOption(chain);
  assert.deepEqual(await categories(),allCategories.filter(id=>names.includes(categoryFacts.get(id).category)));
  assert.deepEqual(await projects(),allProjects);
 }
 const projectRow=projectFacts.get(allProjects[0]),projectSearch=project.getByRole('searchbox',{name:'搜索项目名称/采购链主',exact:true});
 assert.equal(await projectSearch.getAttribute('placeholder'),'搜索项目名称/采购链主');
 const chain=chainNames[projectRow.chain];
 await projectChain.selectOption(chain);
 await projectSearch.fill(projectRow.name);
 assert((await projects()).includes(String(projectRow.id)));
 await projectChain.selectOption(chainNames.find(name=>name!==chain));
 assert.equal(await projectSearch.inputValue(),projectRow.name);
 assert(!(await projects()).includes(String(projectRow.id)));
 const lead=allProjects.map(id=>leads.get(id)).find(name=>name&&name!=='—');
 assert(lead,'样例包含采购链主');
 const leadMatches=allProjects.filter(id=>[leads.get(id),projectFacts.get(id).name,projectFacts.get(id).model].some(value=>String(value??'').includes(lead)));
 assert(leadMatches.length>0&&leadMatches.length<allProjects.length);
 await projectChain.selectOption('all');
 await projectSearch.fill(' '+lead+' ');
 assert.deepEqual(await projects(),leadMatches);
 const leadChain=chainNames[projectFacts.get(leadMatches[0]).chain];
 await projectChain.selectOption(leadChain);
 assert.deepEqual(await projects(),leadMatches.filter(id=>chainNames[projectFacts.get(id).chain]===leadChain));
 const categorySearch=category.getByRole('searchbox');
 await categorySearch.fill('健康类');
 const health=allCategories.filter(id=>categoryFacts.get(id).category==='健康类');
 assert(health.length>0);
 assert.deepEqual(await categories(),health);
 await categoryChain.selectOption('环境');
 assert.deepEqual(await categories(),[]);
 assert.equal(await categorySearch.inputValue(),'健康类');
 await projectSearch.fill('');await projectChain.selectOption('all');
 await categorySearch.fill('');await categoryChain.selectOption('all');
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1080});
  for(const card of [project,category]){
   const tools=card.locator('.scp-card-search');
   assert(await tools.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   if(width===1920){
    const select=await card.locator('.scp-chain-filter').boundingBox(),search=await card.getByRole('searchbox').boundingBox();
    assert(select.x+select.width<search.x&&Math.abs(select.y-search.y)<4);
   }
  }
 }
 await page.setViewportSize({width:1920,height:1080});
}

export async function supplierSourcingType(page){
 await page.evaluate(()=>location.hash='#suppliers');
 const card=page.locator('.scp-project-card'),query=()=>card.locator('[data-scp-query="project"]'),type=value=>card.locator('[data-scp-project-type="'+value+'"]');
 await card.waitFor({state:'visible'});
 const rowIds=()=>card.locator('.scp-project-link').evaluateAll(nodes=>nodes.map(n=>n.dataset.project));
 const projects=await page.evaluate(()=>supplierPlanningAudit().projects),byId=new Map(projects.map(p=>[String(p.id),p]));
 const original=await rowIds(),other=await page.locator('.scp-category-card').innerText();
 assert.equal(await type('all').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await card.locator('.scp-project-types button').allTextContents(),['全部','自研','自选']);
 for(const value of ['自研','自选']){
  await type(value).click();
  const ids=await rowIds();assert(ids.length>0);
  assert.deepEqual(ids,original.filter(id=>byId.get(id).type.startsWith(value)));
  assert.equal((await card.locator('.scp-pane-total').innerText()).trim(),ids.length+'项');
  assert.equal(await page.locator('.scp-category-card').innerText(),other,'类型只影响寻源');
 }
 await query().fill('不存在的项目-筛选验证');assert.equal((await rowIds()).length,0);
 await type('自研').click();assert.equal(await query().inputValue(),'不存在的项目-筛选验证');assert.equal((await rowIds()).length,0);
 await query().fill('');await type('all').click();assert.deepEqual(await rowIds(),original);
 await card.locator('.scp-project-link').first().click();
 assert.equal(await page.locator('#toast').innerText(),'打开运营罗盘-供应商管理-引入全流程管理-项目详情页');
 assert.deepEqual(await rowIds(),original,'点击提示保留寻源列表');
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:1080});
  const controls=await card.locator('.scp-project-tools').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth}));
  assert(controls.scroll<=controls.width+1,'工具栏不溢出 '+width);
  const tabs=await card.locator('.scp-project-types').boundingBox(),input=await query().boundingBox();
  assert(input.y>=tabs.y-1);if(width===1920){assert(input.x>tabs.x+tabs.width,'搜索框位于切换右侧');const tools=await card.locator('.scp-project-tools').boundingBox();assert(Math.abs(input.x+input.width-tools.x-tools.width)<2,'搜索框铺满剩余宽度')}
 }
 await page.setViewportSize({width:1920,height:1080});
 await checkChainFilters(page);
 await page.goto(new URL('产品中心.html#dp-suppliers',page.url()).href);
 await page.locator('.pc-navigation-toolbar').waitFor({state:'visible'});
 assert.equal(await page.locator('#department-view #suppliers, #dp-suppliers, .pc-navigation-toolbar a[href="#dp-suppliers"]').count(),0);
 await page.locator('#chain-menu-trigger').click();
 await page.locator('#chain-menu').getByRole('menuitem',{name:'总看板',exact:true}).click();
 await page.locator('#suppliers .scp-project-card').waitFor({state:'visible'});
 console.log('通过：总看板采购筛选与布局、产品中心旧地址回访及返回总看板。');
}
