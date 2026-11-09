import assert from 'node:assert/strict';
import fs from 'node:fs';

// 删除旧实现后，保留入口必须实际打开现用详情；所有生成页面都验证共享初始化。
export async function legacyEntryCleanup(page){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 assert.equal(await page.locator('#inventory [data-stock]').count(),0);
 await page.locator('#newtable [data-nsp-view]').first().click();
 await page.locator('[data-drawer-tab="stock"]').click();
 assert(await page.locator('#up-stock-skus tbody tr').count()>0);
 assert.equal(await page.locator('#up-stock-skus th').count(),15);
 assert.equal(await page.locator('.inventory-products-detail,#up-target-form').count(),0);
 await page.locator('#close').click();
 await page.locator('#riskrail [data-risk="0"]').click();
 await page.locator('#qrb-list-config').click();
 assert.equal(await page.locator('#toast').innerText(),'跳转数智罗盘配置目标退货率');
 assert.equal(await page.locator('#up-target-form').count(),0);
 await page.locator('#close').click();
 await page.locator('#suppliergrid [data-project]').first().click();
 assert.equal(await page.locator('#toast').innerText(),'打开运营罗盘-供应商管理-引入全流程管理-项目详情页');
 assert(await page.locator('#overlay').isHidden(),'寻源项目仅提示跳转');
 assert.equal(await page.locator('.project-control-detail,.project-detail-v2,[data-gd-evidence]').count(),0);
 const projectUi=fs.readFileSync(new URL('../../src/modules/project-detail/02.js',import.meta.url),'utf8');
 const projectModel=fs.readFileSync(new URL('../../src/modules/project-detail/01.js',import.meta.url),'utf8');
 assert.doesNotMatch(projectUi,/openModal|project-control-detail|pc-dispatch/,'不保留项目详情抽屉界面');
 assert.doesNotMatch(projectModel,/function projectControl(?:Plan|Risk|Tasks|Assign)|function bindProjectDispatch|function renderProjectControlPanel/,'不保留抽屉专属表单和控制器');
 const manifest=JSON.parse(fs.readFileSync(new URL('../../manifest.json',import.meta.url),'utf8'));
 for(const entry of manifest.pages){
  await page.goto(new URL('../../'+entry.file,import.meta.url).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 }
 assert.deepEqual(errors,[]);
 console.log('通过：现用SPU库存可达、项目仅提示跳转、无旧详情、全部'+manifest.pages.length+'个页面共享初始化');
}
