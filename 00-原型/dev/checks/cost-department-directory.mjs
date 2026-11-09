import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {modelClock} from './model-clock.mjs';

const read=path=>fs.readFileSync(new URL('../../src/modules/'+path,import.meta.url),'utf8');
function directoryModel(saved=null){
 const box={...modelClock('2026-10-29'),DATA_CUTOFF:'2026-10-29',localStorage:{getItem:()=>saved?JSON.stringify(saved):null},window:{}};
 vm.createContext(box);
 for(const name of ['00-categories','00-samples','00-monthly-reference','00-monthly-samples','00-department-directory'])vm.runInContext(read('cost-control/'+name+'.js'),box);
 const baseline=vm.runInContext('JSON.parse(JSON.stringify({items:ccItems,ledger:ccLedger}))',box);
 for(const name of ['00-metric-catalog','00-directory-migration','01-department-targets','01-model','02-import','02-annual-import','02-department-import','02-combined-import'])vm.runInContext(read('cost-config/'+name+'.js'),box);
 return {box,baseline,get:()=>JSON.parse(vm.runInContext('JSON.stringify({store:cecStore,items:ccItems,base:cecBase,ledger:ccLedger})',box))};
}
function totals(ledger,items,patches={}){
 const departments=new Map(items.map(item=>[item.id,item.department])),cells=new Map(ledger.map(row=>[row.itemId+'|'+row.month,row]));
 for(const key of Object.keys(patches))if(!cells.has(key)){const [itemId,month]=key.split('|');cells.set(key,{itemId,month,confirmations:[]})}
 const result={};
 for(const [key,row] of cells){
  const department=departments.get(row.itemId);if(!department)continue;
  const patch=patches[key],events=!row.actualMissing?row.confirmations.filter(event=>event.date<='2026-10-29'):[];
  const value=patch&&Object.hasOwn(patch,'actualCents')?patch.actualCents:events.length?events.reduce((sum,event)=>sum+event.cents,0):null;
  if(Number.isFinite(value)){const target=department+'|'+row.month;result[target]=(result[target]??0)+value}
 }
 return result;
}
export async function costDepartmentDirectory(page){
 const pristine=directoryModel(),clean=pristine.get();
 assert.equal(clean.items.length,32);assert.equal(new Set(clean.items.map(item=>item.id)).size,32);
 assert.deepEqual(clean.items.filter(item=>item.department==='research').map(item=>item.metric),['工艺降本','设计优化降本']);
 assert.deepEqual(clean.items.filter(item=>item.department==='risk').map(item=>item.metric),['工厂罚款（风控）','员工罚款','案件回款','投诉回款','节省开支','供应商议价（律所+知识产权机构）','案件节省支出','舞弊处罚/上缴资产']);
 assert(clean.items.filter(item=>item.department==='user').every(item=>item.category==='fine'));
 assert.equal(pristine.box.cecDepartmentByName('采购部（去计划）').id,'purchase');assert.equal(pristine.box.cecDepartmentByName('发货部(去仓储)').id,'shipping');
 assert.equal(pristine.box.cecDepartmentByName('采购部').name,'采购部');assert.equal(pristine.box.cecDepartmentByName('发货部').name,'发货部');
 assert.deepEqual(totals(pristine.baseline.ledger,pristine.baseline.items),totals(clean.ledger,clean.items),'更新演示目录不改变任何部门月度实际');
 const old={version:4,metrics:{},departmentTargets:clean.store.departmentTargets,months:{
  'risk-0|2026-10':{actualCents:0,note:'资产记录'},'risk-3|2026-10':{actualCents:7654,note:'审计记录'},
  'warehouse-2|2026-10':{actualCents:12345,note:'费用口径未明确'},'research-2|2026-10':{actualCents:23456,note:'旧模板已填金额'}
 }};
 const migrated=directoryModel(old),state=migrated.get();
 assert.deepEqual(state.store.departmentTargets,old.departmentTargets,'分类调整不修改部门目标');
 assert.deepEqual(totals(migrated.baseline.ledger,migrated.baseline.items,old.months),totals(state.ledger,state.items),'历史零值、同义合并、歧义项及误加细项的金额均守恒');
 assert.equal(state.store.months['risk-0|2026-10'].actualCents,7654);assert.match(state.store.months['risk-0|2026-10'].note,/资产记录；审计记录/);
 assert.equal(state.items.find(item=>item.id==='warehouse-2').category,null,'不擅自猜测费用减免属于运费还是仓储费');
 const reloaded=directoryModel(state.store).get();assert.deepEqual(reloaded.store,state.store);assert.deepEqual(totals(reloaded.ledger,reloaded.items),totals(state.ledger,state.items),'刷新不会二次合并或重复计数');
 const headers=['责任部门','降本分类','降本指标','年度',...Array.from({length:12},(_,i)=>(i+1)+'月'),'备注'];
 const row=(department,category,metric)=>[department,category,metric,'2026',...Array(9).fill(''),'123.45','','',''];
 const validate=rows=>JSON.parse(JSON.stringify(pristine.box.cecValidateImport([headers,...rows])));
 let result=validate([row('采购部','产品降本','产品降本'),row('仓储部','物流降本','运费谈价'),row('用户中心','罚款收入','质量问题千五罚款')]);
 assert.equal(result.errors.length,0);assert.deepEqual(result.entries.map(item=>item.name),['产品原材料降本','运费降本','质量问题千五罚款（用户中心）']);
 for(const rows of [[row('仓储部','物流降本','费用减免')],[row('品质中心','产品降本','商务谈判')],[row('用户中心','产品降本','质量问题千五罚款')],[row('采购部','产品降本','产品降本'),row('采购部','产品降本','产品原材料降本')]])assert(validate(rows).errors.length,'歧义分类、错误归类和同义重复必须拒绝');
 await page.evaluate(()=>location.hash='#system-cost-efficiency');await page.locator('#cec-page').waitFor({state:'visible'});
 const audit=await page.evaluate(()=>costControlAudit({year:2026,mode:'month',value:10}));
 assert.deepEqual(audit.items.map(item=>[item.department,item.category,item.metric]),clean.items.map(item=>[item.department,item.category,item.metric]));
 assert.deepEqual(audit.categories.map(item=>item.name),['产品降本','包装降本','物流降本','罚款收入','风控收入']);
 assert.equal(await page.locator('[data-cec-project]').count(),20,'明细表按20条分页');await page.locator('[data-cec-department=risk]').click();assert.equal(await page.locator('[data-cec-project]').count(),8);await page.locator('[data-cec-department=""]').click();
 await page.evaluate(()=>location.hash='#cost');await page.locator('#cost').waitFor({state:'visible'});await page.locator('[data-cc-view="category"]').click();
 assert.deepEqual(await page.locator('#costtable tbody .cc-row-name').allTextContents(),audit.categories.map(item=>item.name));
 await page.locator('[data-cc-category="fine"]').click();assert.match(await page.locator('.cc-department-table').innerText(),/质量问题平台罚款追回（用户中心）/);await page.locator('#close').click();
 await page.locator('[data-cc-view="department"]').click();const names=await page.locator('#costtable tbody .cc-row-name').allTextContents();assert(names.includes('采购部'));assert(names.includes('发货部'));assert.doesNotMatch(names.join(' '),/去计划|去仓储/);
 await page.evaluate(()=>location.hash='#system-cost-efficiency');
 console.log('通过：九部门32个标准细项、页面同源、旧名称导入、歧义及分类校验、历史金额/零值/备注/目标守恒和刷新幂等。');
}
