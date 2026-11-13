import assert from 'node:assert/strict';
import {managementScoreBatch} from './management-score-batch.mjs';

export async function productStartup(page){
 managementScoreBatch();
 await page.addInitScript(()=>{
  const counts={inventory:0,cost:0};window.__productStartup=counts;
  const collect=records=>{for(const record of records){if(!record.addedNodes.length)continue;const key=({inventorymetrics:'inventory',costcards:'cost'})[record.target.id];if(key)counts[key]++}};
  const observer=new MutationObserver(collect);observer.observe(document,{childList:true,subtree:true});
  window.addEventListener('dashboard:ready',()=>{collect(observer.takeRecords());observer.disconnect()},{once:true});
 });
 const base=page.url(),ready=async()=>{
  await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
 };
 for(const hash of ['', '#dp-inventory']){
  await page.goto(new URL('产品中心.html'+hash,base).href);await ready();
  assert.deepEqual(await page.evaluate(()=>window.__productStartup),{inventory:1,cost:0},'初次只挂载一套产品中心模块');
  assert.equal(await page.locator('#department-view>.section').count(),9);
  assert.equal(await page.locator('#inventory-stale-analysis svg').count(),1);
  assert((await page.evaluate(()=>riskBoardAppearanceSnapshot())).sampleVersion,'风险出现台账仍初始化，供AI诊断读取');
  assert.equal(await page.locator('#costcards .cc-card,#suppliers .scp-workspace').count(),0,'不初始化隐藏的采购/降本工作区');
  await page.reload();await ready();assert.deepEqual(await page.evaluate(()=>window.__productStartup),{inventory:1,cost:0},'刷新也不能先渲染总看板');
 }
 await page.locator('#pc-person').selectOption('owner');await ready();
 assert.equal((await page.evaluate(()=>departmentSnapshot().scope)).chain,'2');
 await page.locator('.pc-navigation-toolbar a[href="#dp-sales"]').click();
 await page.waitForFunction(()=>document.querySelector('.pc-navigation-toolbar [aria-current=location]')?.hash==='#dp-sales');
 const current=await page.locator('#sales').evaluate(node=>({top:node.getBoundingClientRect().top,bottom:document.querySelector('.pc-navigation-toolbar').getBoundingClientRect().bottom}));
 assert(current.top>=current.bottom-1&&current.top<=current.bottom+60,'导航及时定位且不遮挡标题');
 // 后台返回总看板时补齐之前省略的模块；恢复总监再进入后台，保证人员范围一致。
 await page.locator('#pc-person').selectOption('manager');await ready();
 await page.evaluate(()=>{location.hash='#system-business-rules'});await page.locator('#lt-system').waitFor({state:'visible'});
 await page.evaluate(()=>{location.hash='#dashboard'});await page.locator('#department-view').waitFor({state:'hidden'});
 assert(await page.locator('#costcards .cc-card').count()>0);assert(await page.locator('#suppliers .scp-workspace').count()>0);
 assert.equal(await page.locator('#riskrail .pc-risk-card').count(),0);
 await page.goto(new URL('产品中心.html#system-business-rules',base).href);await ready();
 await page.evaluate(()=>{location.hash=''});await page.locator('#pc-person').waitFor({state:'visible'});
 assert.equal(await page.locator('#department-view>.section').count(),9,'后台返回产品中心保持完整模块');
 console.log('产品中心：首次/刷新仅挂载一次、九模块完整、人员切换/导航、后台与总看板返回通过');
}
