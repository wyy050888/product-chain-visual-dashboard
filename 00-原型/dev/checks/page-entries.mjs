import assert from 'node:assert/strict';

const entries=[
 ['index.html','director',0],['产品中心.html','product',1],['项目部.html','project',2],
 ['品质中心.html','quality',3],['研发中心.html','research',4],['采购部.html','procurement',5]
];
async function ready(page){
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function verify(page,view,menu){
 assert.equal(await page.locator('html').getAttribute('data-dashboard-view'),view);
 assert.equal(await page.locator('#chain-menu button[aria-current="page"]').innerText(),['总看板','产品中心','项目部','品质中心','研发中心','采购部'][menu]);
 const selector=view==='director'?'#risk':view==='procurement'?'#purchasing-view':view==='quality'?'#quality-department':'#department-view';
 assert.ok(await page.locator(selector).isVisible(),view+'应直接显示对应工作区');
 if(['product','project','research'].includes(view))assert.equal(await page.locator('#department-view').getAttribute('data-department'),view);
 if(view==='quality')assert.match(await page.locator(selector).innerText(),/页面待设计/);
}
export async function pageEntries(page){
 const base=page.url();
 for(const [file,view,menu] of entries){
  await page.goto(new URL(file,base).href);await ready(page);await verify(page,view,menu);
  assert.equal(new URL(page.url()).hash,'','独立入口无需总看板锚点');
  await page.reload();await ready(page);await verify(page,view,menu);
 }
 // 菜单实际切换HTML文件，浏览器返回仍恢复原部门。
 await page.goto(new URL('产品中心.html#dp-inventory',base).href);await ready(page);await verify(page,'product',1);
 await page.locator('#chain-menu-trigger').click();await page.locator('#chain-menu button').nth(5).click();await ready(page);
 await verify(page,'procurement',5);
 assert.equal(decodeURIComponent(new URL(page.url()).pathname).split('/').at(-1),'采购部.html');
 await page.goBack();await ready(page);await verify(page,'product',1);
 // 后台配置退出后回到当前入口；窄屏保留独立页面和菜单。
 await page.goto(new URL('品质中心.html#system-business-rules',base).href);await ready(page);
 assert.ok(await page.locator('#lt-system').isVisible());
 await page.evaluate(()=>{location.hash=''});await page.locator('#quality-department').waitFor({state:'visible'});
 await verify(page,'quality',3);
 await page.setViewportSize({width:390,height:844});
 await page.goto(new URL('产品中心.html',base).href);await ready(page);await verify(page,'product',1);
 await page.locator('#chain-menu-trigger').click();assert.ok(await page.locator('#chain-menu').isVisible());
 await page.setViewportSize({width:1920,height:1080});
}
