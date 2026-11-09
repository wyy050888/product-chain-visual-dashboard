import assert from 'node:assert/strict';

const position=page=>page.evaluate(()=>({page:window.scrollY,parent:document.querySelector('#dialogbody').scrollTop}));
async function wheel(page,area,delta){
 const box=await area.boundingBox();assert(box,'滚动区域可见');
 await page.mouse.move(box.x+Math.min(box.width/2,100),box.y+Math.min(box.height/2,40));await page.mouse.wheel(0,delta);await page.waitForTimeout(180);
}
async function unchanged(page,before,label){assert.deepEqual(await position(page),before,label)}
export async function drawerScroll(page){
 await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
 const root=page.locator('#ai'),dialog=page.locator('.up-todo-dialog[open]');
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="core"]').click();
 // 明确选择有多条来源的长详情，不依赖当前第一条样例一定需要滚动。
 const taskId=await page.evaluate(()=>globalDiagnosisAudit().work.find(r=>r.id==='work-core-delivery').task.id);
 const trigger=root.locator('[data-gd-task="'+taskId+'"] [data-gd-action="task-detail"]');await trigger.scrollIntoViewIfNeeded();
 const original=await position(page),pageWidth=await page.locator('body').evaluate(el=>el.getBoundingClientRect().width);await trigger.click();
 const before=await position(page);assert(before.page>0,'在页面中段复现，不依赖页面顶端');
 assert.deepEqual(before,original,'打开抽屉不改变原页面位置');assert.equal(await page.locator('body').evaluate(el=>el.getBoundingClientRect().width),pageWidth,'锁定时保留滚动条槽位，背景不横跳');
 await wheel(page,dialog.locator(':scope>form>header'),640);await unchanged(page,before,'任务抽屉标题区域滚动不能带动背景页面');
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:918});const frozen=await position(page);
  for(const area of [dialog.locator('.up-todo-detail-heading'),dialog.locator('.up-todo-basic-section'),dialog.locator('.up-todo-dialog-body')]){await wheel(page,area,550);await unchanged(page,frozen,width+'px标题/基础信息区域隔离背景')}
  await dialog.locator('[data-todo-evidence]').click();await unchanged(page,frozen,'展开依据不移动背景');
  const body=dialog.locator('.up-todo-dialog-body');await body.evaluate(el=>{el.scrollTop=0});const top=await body.evaluate(el=>el.scrollTop);
  await wheel(page,body,420);assert(await body.evaluate(el=>el.scrollTop)>top,'抽屉正文仍可正常向下滚动');await unchanged(page,frozen,'正文滚动不移动背景');
  await body.evaluate(el=>{el.scrollTop=el.scrollHeight});await wheel(page,body,700);await unchanged(page,frozen,'正文底部继续滚动不穿透');
  await body.evaluate(el=>{el.scrollTop=0});await wheel(page,body,-700);await unchanged(page,frozen,'正文顶部反向滚动不穿透');
  await dialog.locator('[data-todo-close]').focus();await page.keyboard.press('PageDown');await page.keyboard.press('End');await page.waitForTimeout(160);await unchanged(page,frozen,'键盘翻页不移动背景');
  if(width>700){await page.mouse.move(8,200);await page.mouse.wheel(0,600);await page.waitForTimeout(160);await unchanged(page,frozen,'遮罩滚动不移动背景')}
  await dialog.locator('[data-todo-evidence]').click();
 }
 await page.setViewportSize({width:1920,height:918});const closing=await position(page);await dialog.locator('[data-todo-close]').click();await unchanged(page,closing,'关闭后保留原页面位置');
 await wheel(page,root,600);assert.notEqual((await position(page)).page,closing.page,'最后一层关闭后恢复页面滚动');
 await verifyDrawerScrollLayers(page);
 console.log('通过：任务抽屉标题/正文/基础信息/遮罩滚动、首尾边界、键盘翻页及关闭恢复，覆盖三种宽度');
}
async function verifyDrawerScrollLayers(page){
 await page.locator('#riskrail [data-risk="0"]').click();const listPosition=await position(page),parent=page.locator('#dialogbody');
 await wheel(page,page.locator('#dialog .dialoghead'),600);assert.equal((await position(page)).page,listPosition.page,'业务抽屉标题不移动页面');
 await page.locator('#dialogbody [data-qr-detail]').first().click();await page.locator('[data-up-ai-prompt]').click();
 const prompt=page.locator('#up-ai-prompt:modal'),frozen=await position(page);assert(await prompt.isVisible());
 await wheel(page,prompt.locator('header'),600);await unchanged(page,frozen,'上层弹窗标题滚动不移动父抽屉');
 const content=prompt.locator('pre');await content.evaluate(el=>{el.scrollTop=0});await wheel(page,content,300);assert(await content.evaluate(el=>el.scrollTop)>0,'上层弹窗原文可滚动');
 await content.evaluate(el=>{el.scrollTop=el.scrollHeight});await wheel(page,content,600);await unchanged(page,frozen,'上层弹窗底部不穿透父抽屉');
 await page.keyboard.press('Escape');assert(await prompt.isHidden());assert(await page.locator('#overlay').isVisible());await unchanged(page,frozen,'Escape只关闭上层，父层及页面保留位置');
 const before=await parent.evaluate(el=>{el.scrollTop=0;return el.scrollTop});await wheel(page,parent,320);assert(await parent.evaluate(el=>el.scrollTop)>before,'上层关闭后父抽屉可滚动');assert.equal((await position(page)).page,listPosition.page,'父抽屉恢复时页面仍锁定');
 await page.locator('#close').click();assert(await page.locator('#overlay').isVisible(),'返回榜单后还有父层');assert.equal((await position(page)).page,listPosition.page);assert.equal(await parent.evaluate(el=>el.scrollTop),listPosition.parent,'返回恢复榜单原位置');
 await page.locator('#close').click();assert(await page.locator('#overlay').isHidden());assert.equal((await position(page)).page,listPosition.page,'最终关闭回到原页面位置');
 console.log('通过：榜单/产品两层抽屉及上层原生弹窗、Escape关闭顺序、父层滚动恢复');
}
