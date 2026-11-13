import {openNewProductSpu} from './new-products-detail.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {verifyLifecycleFacts} from './lifecycle-facts.mjs';
import {verifyChannelContribution} from './detail-channel-contribution.mjs';

const platforms=['抖音','快手','视频号','天猫','京东','拼多多'];
const read=file=>fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');
export function verifyPlatformModels(){
 const context=vm.createContext({window:{}});
 vm.runInContext(read('src/data/filter-catalog.js')+'\n'+read('src/modules/sales-channels/01-model.js')+'\n'+read('src/modules/unified-product/05-operating-view.js'),context);
 assert.deepEqual(Array.from(context.window.FilterCatalog.platforms),platforms);
 assert.equal(context.window.FilterCatalog.salesChannels,context.window.FilterCatalog.platforms,'保留旧调用名但不保留第二套枚举');
 const rows=context.upOperatingChannelRows([{platform:'抖音',sales:7}], [{channel:'抖音',sales:999},{channel:'百度&CID',sales:999}]);
 assert.deepEqual(Array.from(rows,r=>r.channel),platforms);
 assert.equal(rows[0].sales,7,'平台事实优先，不拿内部销售组织替代');
 assert(rows.slice(1).every(row=>!Object.hasOwn(row,'sales')),'缺失平台保留缺失，不造0');
 const terms=read('src/modules/page-presentation/03-terminology.js');
 vm.runInContext(terms.slice(0,terms.indexOf('function formatDisplayedTerms')),context);
 assert.equal(context.presentationTermText('销售渠道 / 全渠道 / 分渠道 / 渠道供价 / 淘客渠道 / 上线日期'),'销售渠道 / 全平台 / 分平台 / 平台供价 / 淘客渠道 / 上市日期');
 // 旧组织与新平台可有相同序号，但不能因此继承旧任务或闭环状态。
 Object.assign(context,{periodFor:()=>({}),bounds:()=>({cutoff:'2026-10-24'})});
 vm.runInContext(read('src/modules/product-workspace/01.js').split('\n').filter(line=>/^function dp(SameSource|Closed|TaskFor)\(/.test(line)).join('\n'),context);
 const source={key:'channel:2026:all:0',kind:'channel',name:'抖音销售偏差'};
 const legacy={source:{...source,name:'抖音一区销售偏差'},state:'已验收',closedDate:'2026-10-20'};
 context.dpStore={tasks:[legacy]};
 assert.equal(context.dpClosed(source),undefined);
 legacy.state='待执行';assert.equal(context.dpTaskFor(source),undefined);
 const current={source:{...source},state:'待执行'};context.dpStore.tasks.push(current);
 assert.equal(context.dpTaskFor(source),current);
 current.state='已验收';current.closedDate='2026-10-20';assert.equal(context.dpClosed(source),current);
 assert.equal(legacy.source.key,source.key,'不迁移或改写历史键');
 verifyLifecycleFacts();
}

async function verifyVisibleTerms(page){
 await page.waitForFunction(()=>{
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode,parent=node.parentElement;
   if(parent?.closest('script,style,input,textarea,[contenteditable="true"],[data-preserve-terms]')||!parent?.checkVisibility())continue;
   if(node.nodeValue.replaceAll('销售渠道','').replaceAll('淘客渠道','').includes('渠道'))return false;
  }
  return true;
 });
}

export async function platformTerminology(page){
 verifyPlatformModels();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#new"]').click();
 const options=await page.locator('[data-nsp-filter="channel"] option').allTextContents();
 assert.deepEqual(options,['全部',...platforms]);
 assert((await page.locator('#newtable th').allTextContents()).some(text=>text.startsWith('销售渠道')),'字段名保留销售渠道');
 await verifyVisibleTerms(page);
 const launchHelp=page.getByRole('button',{name:'查看上市日期指标口径',exact:true});
 await launchHelp.scrollIntoViewIfNeeded();await launchHelp.hover();await launchHelp.click();await page.keyboard.press('Escape');
 const salesHelp=page.getByRole('button',{name:'查看销售渠道指标口径',exact:true});
 await salesHelp.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await salesHelp.hover();
 await page.waitForFunction(()=>!document.querySelector('#metric-tooltip').hidden);
 await page.waitForTimeout(300);
 assert(await page.locator('#metric-tooltip').isVisible(),'表格滚动后悬浮提示保持可见');
 assert.match(await page.locator('#metric-tooltip').innerText(),/^销售渠道：[\s\S]*已有销售记录的平台/);
 await page.keyboard.press('Escape');
 await openNewProductSpu(page.locator('#newtable [data-nsp-view]').first());
 const table=page.locator('.up-platform-performance table');
 assert.deepEqual((await table.locator('tbody tr td:first-child').allTextContents()).sort(),[...platforms].sort());
 assert.match(await table.locator('th').first().innerText(),/^平台/);
 await verifyChannelContribution(page);
 await page.locator('[data-up-channel-sort="channel"]').click();
 assert.deepEqual(await page.locator('[data-up-contribution-channel]').evaluateAll(es=>es.map(e=>e.dataset.upContributionChannel)),await table.locator('tbody tr td:first-child').allTextContents(),'排序后表图一致');
 await verifyVisibleTerms(page);
 await page.locator('[data-drawer-tab="quality"]').click();
 assert.deepEqual(await page.locator('[data-up-quality-platform]').evaluateAll(es=>es.map(e=>e.dataset.upQualityPlatform)),platforms);
 assert.equal(await page.locator('[data-up-quality-platform="all"]').count(),0);
 await page.locator('[data-up-quality-platform="京东"]').click();
 await verifyVisibleTerms(page);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#sales"]').click();
 const companyPlatforms=page.locator('[data-ms-section="-1"] [data-ms-breakdown-view="platform"]');
 assert.deepEqual(await companyPlatforms.locator('tbody th').allTextContents(),platforms);
 await verifyVisibleTerms(page);
 await page.goto(new URL('产品中心.html',page.url()).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const department=await page.evaluate(()=>departmentSnapshot());
 assert.deepEqual(department.channels.map(row=>row.name),platforms);
 for(const key of ['sku','sale','target','annual','ytd','gross'])assert(Math.abs(department.channels.reduce((sum,row)=>sum+row[key],0)-department.sales.reduce((sum,row)=>sum+row[key],0))<1e-8,'部门六平台与品链汇总守恒 '+key);
 assert((await page.locator('#riskrail>article h3').allTextContents()).some(text=>text.includes('平台销售偏差')));
 await verifyVisibleTerms(page);
}
