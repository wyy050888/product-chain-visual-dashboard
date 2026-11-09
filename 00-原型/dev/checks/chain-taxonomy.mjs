import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {verifySupplierCategoryTargets} from './supplier-category-isolation.mjs';
const read=file=>fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');
const names=['环境','清洁','厨电','个护&健康'];
const plain=value=>JSON.parse(JSON.stringify(value));

function verifyMigration(){
 const source=read('src/data/filter-catalog.js')+'\n'+read('src/modules/lifecycle-targets/00-samples.js')+'\n'+read('src/modules/lifecycle-targets/01-model.js')+'\n'+read('src/modules/lifecycle-targets/01-transactions.js');
 const old=Array.from({length:5},(_,c)=>Array.from({length:9},(_,p)=>Array.from({length:4},(_,q)=>1+(c*11+p*7+q)%31)));
 old[2][0][0]=0;old[3][0][0]=8;
 let persisted=JSON.stringify({version:2,years:{2026:{values:old,revision:7}}});
 const context=vm.createContext({window:{},crypto:{randomUUID},dashboardToday:()=> '2026-10-26',localStorage:{getItem:()=>persisted,setItem:(_,value)=>{persisted=value}}});
 vm.runInContext(source,context);
 assert.deepEqual(plain(vm.runInContext('ltCategories',context)),names);
 assert.equal(vm.runInContext('ltYearValues(2026).length',context),4);
 const amount=(v,m)=>Math.floor(v/3)+((m-1)%3<v%3?1:0);
 for(let month=1;month<=12;month++){
  const q=Math.floor((month-1)/3),expected=old.reduce((sum,c)=>sum+amount(c[0][q],month),0);
  assert.equal(context.ltTargetFor(0,[0,1,2,3],{year:2026,mode:'month',value:month}).value,expected,'旧季度拆月保持原金额');
 }
 assert.equal(context.ltTargetFor(0,[3],{year:2026,mode:'quarter',value:1}).state,'partial','合并不掩盖旧未配置项');
 const before=plain(vm.runInContext('ltYearValues(2026)',context));
 assert(context.ltSetTarget(2026,3,0,0,27).ok);
 assert.equal(JSON.parse(persisted).version,3);
 assert.equal(context.ltTargetFor(0,[3],{year:2026,mode:'month',value:1}).value,9);
 assert.deepEqual(plain(vm.runInContext('ltYearValues(2026).slice(0,3)',context)),before.slice(0,3));
 const reloaded=vm.createContext({window:{},dashboardToday:()=> '2026-10-26',localStorage:{getItem:()=>persisted}});vm.runInContext(source,reloaded);
 assert.equal(reloaded.ltTargetFor(0,[3],{year:2026,mode:'quarter',value:1}).value,27);
 assert.equal(reloaded.ltTargetFor(0,[3],{year:2026,mode:'quarter',value:1}).state,'complete');
 assert.equal(vm.runInContext('filterCatalog.normalizeChain("constructor")',reloaded),null,'未知值不被对象原型误判为链群');
 verifySupplierCategoryTargets();
}

export async function chainTaxonomy(page){
 verifyMigration();
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 assert.deepEqual(await page.evaluate(()=>FilterCatalog.chains),names);
 const stock=await page.evaluate(()=>inventoryControlAudit());
 assert.deepEqual(stock.category.map(row=>row.name),['个护类','环境类','清洁类','厨电类','健康类']);
 for(const key of ['totalUnits','goodsValueCents','warehouse','warehouseValueCents','staleUnits','staleValueCents'])assert.equal(stock.category.reduce((sum,row)=>sum+row[key],0),stock.stockTotal[key],key+'库存五类汇总守恒');
 const suppliers=await page.evaluate(()=>supplierPlanningAudit());
 assert.equal(new Set(suppliers.categories.map(c=>c.id)).size,suppliers.categories.length,'供应商细分分类身份保留');
 const procurementNames=['个护类','环境类','清洁类','厨电类','健康类'];
 assert(suppliers.categories.every(c=>procurementNames.includes(c.category)));
 for(const brand of suppliers.materials){
  assert.deepEqual(brand.categories.map(c=>c.category),procurementNames);
  const range=brand.stats.range||suppliers.annual.range;
  for(const selected of brand.categories){
   const members=new Set(suppliers.capabilities.filter(row=>row.kind==='material'&&row.category===selected.category&&suppliers.brands[brand.brand].includes(row.brand)&&row.admitted&&row.admitted<=range.cutoff).filter(row=>{const s=suppliers.companies.find(c=>c.id===row.supplierId);return s.reserved<=range.cutoff&&(!s.disabled||s.disabled>range.cutoff)}).map(row=>row.supplierId));
   assert.equal(selected.stats.admitted,members.size,'采购五类按供应商ID去重');
  }
 }
 await page.locator('a[href="#new"]').click();
 assert.deepEqual(await page.locator('#nsp-category-tabs [data-nsp-category]').evaluateAll(buttons=>buttons.map(b=>b.dataset.nspCategory)),['all',...names]);
 await page.locator('[data-nsp-category="个护&健康"]').click();
 assert((await page.evaluate(()=>dashboardNewProductsSnapshot())).visible.every(p=>p.category==='个护&健康'));
 await page.locator('[data-nsp-category="all"]').click();
 await page.locator('a[href="#projects"]').click();
 assert.deepEqual(await page.locator('[data-pp-category-tab]').evaluateAll(buttons=>buttons.map(b=>b.dataset.ppCategoryTab)),['all',...names]);
 await page.locator('#riskrail [data-risk="0"]').click();
 assert.deepEqual(await page.locator('[data-rp-filter="chain"]').evaluate(select=>[...select.options].slice(1).map(o=>o.value)),names);
 await page.locator('#dialogbody .pf-multi[data-pf-multi-label="链群"] summary').click();
 await page.locator('#dialogbody .pf-multi[data-pf-multi-label="链群"] input[value="个护&健康"]').check();
 assert.equal(await page.locator('#dialogbody .pf-multi[data-pf-multi-label="链群"] .pf-multi-value').innerText(),'个护&健康');
 await page.keyboard.press('Escape');await page.locator('#close').click();
 const ai=page.locator('#ai');
 for(const part of ['coordination','resource','closure']){
  await ai.locator('[data-gd-part="'+part+'"]').click();
  const tabs=await ai.locator('[data-gd-tab]').evaluateAll(buttons=>buttons.map(b=>b.dataset.gdTab));
  for(const tab of tabs){
   await ai.locator('[data-gd-tab="'+tab+'"]').click();
   assert.deepEqual(await ai.locator('[data-gd-category]').evaluateAll(buttons=>buttons.map(b=>b.dataset.gdCategory)),['all',...names]);
   await ai.locator('[data-gd-category="个护&健康"]').click();
   assert((await page.evaluate(()=>globalDiagnosisAudit())).visible.every(row=>row.categories.includes('个护&健康')));
   await ai.locator('[data-gd-category="all"]').click();
  }
 }
 await page.locator('#lt-open-targets').evaluate(e=>e.click());assert.deepEqual(await page.locator('#lt-categories button').allTextContents(),names);
 const saved=await page.evaluate(()=>localStorage.getItem('lifecycle-quarter-targets-v1'));
 try{
  await page.locator('[data-lt-category="3"]').click();await page.locator('[data-lt-number="0:3"]').fill('33');
  const audit=await page.evaluate(()=>lifecycleTargetsAudit());assert.equal(audit.saved.years[2026].values[3][0][3],33);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
  assert.equal((await page.evaluate(()=>lifecycleTargetsAudit())).saved.years[2026].values[3][0][3],33);
 }finally{await page.evaluate(saved=>saved===null?localStorage.removeItem('lifecycle-quarter-targets-v1'):localStorage.setItem('lifecycle-quarter-targets-v1',saved),saved)}
 await page.goto(page.url().split('#')[0]);await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1080});
  assert(await page.locator('#ai').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'AI链群筛选不撑宽 '+width);
  assert(await page.locator('#new').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'新品链群筛选不撑宽 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});
 await page.goto(new URL('../../产品中心.html',import.meta.url).href);
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await page.locator('#pc-person').selectOption('owner');
 const department=await page.evaluate(()=>({products:dashboardNewProductsSnapshot().rows,projects:projectPanoramaAudit().scope,work:globalDiagnosisAudit().work}));
 assert(department.products.length&&department.products.every(row=>row.category==='环境'));
 assert(department.projects.every(row=>row.category==='环境'));
 assert(department.work.every(row=>row.categories.includes('环境')));
 await page.goto(new URL('../../数智罗盘/目标管理/目标管理.html',import.meta.url).href);
 await page.waitForFunction(()=>window.GoalPrototype?.targetStore&&document.querySelector('#overviewTable tbody tr'),null,{timeout:60000});
 assert.deepEqual(await page.evaluate(()=>GoalPrototype.config.options.链群),names);
 assert((await page.evaluate(()=>GoalPrototype.fixtures.products.map(p=>p.category))).every(name=>names.includes(name)));
 await page.locator('[data-root-tab="wholeCategory"]').click();
 assert((await page.locator('#overviewTable th').allTextContents()).includes('链群'));
 console.log('通过：全局四链群、旧目标迁移及月份守恒、独立汇总目标、采购五类隔离及供应商去重、新品/项目/风险筛选、目标持久化和宽窄屏');
}
