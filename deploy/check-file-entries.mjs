import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const root=fileURLToPath(new URL('../',import.meta.url));
const {pages}=JSON.parse(fs.readFileSync(path.join(root,'00-原型/manifest.json'),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 for(const folder of ['00-原型','dist']){
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:15000});
  for(const entry of pages){
   await page.goto(pathToFileURL(path.join(root,folder,entry.file)).href);await ready();
   assert.equal(await page.locator('html').getAttribute('data-dashboard-view'),entry.view);
   assert.equal(await page.locator('#boot-title').textContent(),'正在加载'+(entry.view==='director'?'产品链看板':entry.title));
   assert.equal(await page.locator('#dashboard-boot').isVisible(),false,folder+'/'+entry.file+'直接打开可完成加载');
  }
  await page.goto(pathToFileURL(path.join(root,folder,'产品中心.html')).href);await ready();
  await page.reload();await ready();assert.equal(await page.locator('#department-view>.section').count(),9);
  // 启动兼容修复必须保留二层抽屉的背景快照和返回行为。
  await page.locator('#riskrail [data-risk="0"]').click();
  await page.locator('#dialogbody button').filter({hasText:'查看详情'}).first().click();
  assert.equal(await page.locator('.drawer-parent-layer').count(),1);
  await page.locator('.drawer-back').click();assert.equal(await page.locator('#qr-list-table').count(),1);
  assert.deepEqual(errors,[],folder+'无启动或交互脚本错误');
  await page.close();console.log('通过：'+folder+'六入口直接打开、加载文案、产品中心刷新和二层抽屉');
 }
}finally{await browser.close()}
