import assert from 'node:assert/strict';

// 覆盖用户确认的菜单结构、现有页面导航和无本地页面的置灰边界。
export async function systemMenuStructure(page){
 const expected=[
  ['业务配置',['规则配置','供应商导入','核心链接导入','产品分类']],
  ['目标管理',['生命周期目标','降本增效目标','供应商目标']],
  ['权限管理',['用户管理','角色管理','人员配置','白名单']],
  ['系统配置',['菜单管理','字典管理']],
  ['系统运维',['用户操作日志','登录日志','定时任务']]
 ];
 await page.locator('#lt-system-nav').click();
 assert.equal(new URL(page.url()).hash,'#system-business-rules','从前台点击系统管理默认进入规则配置');
 await page.locator('#business-rule-page').waitFor({state:'visible'});
 const menu=page.locator('#lt-system .lt-sidebar');
 assert.deepEqual(await menu.locator('summary').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent)),expected.map(([name])=>name));
 const groups=menu.locator('.lt-menu-group');
 for(let i=0;i<expected.length;i++)assert.deepEqual(await groups.nth(i).locator(':scope > a,:scope > .lt-menu-disabled').allTextContents(),expected[i][1]);
 assert.equal(await menu.locator('a[data-system-route]').count(),6);
 assert.equal(await menu.locator('[aria-disabled="true"]').count(),10);
 const disabled=menu.locator('.lt-menu-disabled');
 assert((await disabled.evaluateAll(nodes=>nodes.every(node=>!node.hasAttribute('href')&&!node.hasAttribute('data-system-route')))),'置灰项不登记假路由');
 const first=disabled.first();await first.scrollIntoViewIfNeeded();const box=await first.boundingBox(),before=page.url();
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);assert.equal(page.url(),before);assert(await page.locator('#business-rule-page').isVisible());
 assert.equal(await first.evaluate(node=>getComputedStyle(node).cursor),'not-allowed');
 const destinations=[['规则配置','#business-rule-page'],['供应商导入','#ssi-page'],['核心链接导入','#klc-page'],['生命周期目标','#lt-target-page'],['降本增效目标','#cec-page'],['供应商目标','#st-target-page']];
 for(const [label,pane] of destinations){
  await menu.getByRole('link',{name:label,exact:true}).click();await page.locator(pane).waitFor({state:'visible'});
  assert.equal(await menu.locator('[aria-current="page"]').innerText(),label);
 }
 await page.locator('#lt-system-nav').click();
 await page.locator('#business-rule-page').waitFor({state:'visible'});
 assert.equal(new URL(page.url()).hash,'#system-business-rules','在后台其他页面点击系统管理也进入规则配置');
 assert.equal(await menu.locator('[aria-current="page"]').innerText(),'规则配置');
 assert.equal(await page.locator('#business-rule-page .sm-page-title').innerText(),'规则配置');
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1080});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'菜单不能撑宽页面');
  assert.equal(await menu.locator('.lt-menu-disabled').count(),10);
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：五组16菜单顺序、六现用页跳转、十原有项置灰无跳转、规则配置更名及宽窄屏。');
}
// 实际滚轮只移动右侧；切页恢复顶部，退出后台恢复文档滚动。
export async function systemContentScroll(page){
 for(const width of [1920,1024]){
  await page.setViewportSize({width,height:600});await page.evaluate(()=>location.hash='#system-supplier-targets');await page.locator('#st-target-page').waitFor({state:'visible'});
  const content=page.locator('#sm-content'),sidebar=page.locator('#lt-system .lt-sidebar'),header=page.locator('.head.portal-header');
  await content.evaluate(e=>e.scrollTop=0);const before={menu:await sidebar.boundingBox(),head:await header.boundingBox(),menuScroll:await sidebar.evaluate(e=>e.scrollTop)};
  assert(await content.evaluate(e=>e.scrollHeight>e.clientHeight),'工作区具备滚动空间');const box=await content.boundingBox();await page.mouse.move(box.x+box.width-30,box.y+box.height/2);await page.mouse.wheel(0,500);await page.waitForFunction(()=>document.querySelector('#sm-content').scrollTop>0);
  assert.deepEqual(await sidebar.boundingBox(),before.menu);assert.deepEqual(await header.boundingBox(),before.head);assert.equal(await sidebar.evaluate(e=>e.scrollTop),before.menuScroll);assert.equal(await page.evaluate(()=>scrollY),0,'文档不随工作区滚动');
  await page.evaluate(()=>location.hash='#system-lifecycle-targets');await page.locator('#lt-target-page').waitFor({state:'visible'});assert.equal(await content.evaluate(e=>e.scrollTop),0,'切换菜单回右侧顶部');
 }
 await page.evaluate(()=>location.hash='#suppliers');await page.locator('#suppliers').waitFor({state:'visible'});assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden','前台恢复正常滚动');
 await page.setViewportSize({width:390,height:800});await page.evaluate(()=>location.hash='#system-supplier-targets');await page.locator('#st-target-page').waitFor({state:'visible'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'手机不撑宽页面');
 console.log('通过：右侧滚轮独立、菜单及顶部固定、切页回顶、退出后台与窄屏滚动。');
}
