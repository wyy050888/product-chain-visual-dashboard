import assert from 'node:assert/strict';

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
 console.log('通过：寻源全部/自研/自选、数量、搜索交集及保留、区域独立、宽窄屏布局。');
}
