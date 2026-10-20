import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export async function lifecycleProjectLinks(page){
 const ctx=vm.createContext({pfIncludes:(values,value)=>!values.length||values.includes(value)});vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/01-model.js',import.meta.url),'utf8'),ctx);
 const state={brand:[],light:[],stage:[],department:[],owner:'',query:'',plan:null,started:null,actual:{mode:'range',start:'2026-10-01',end:'2026-10-10'},link:null,sort:{key:'actual',direction:'asc'}};
 const rows=[{id:1,actual:'2026-10-01',plan:'2026-09-01'},{id:2,actual:null,plan:'2026-10-02'},{id:3,actual:'2026-09-30',plan:'2026-10-03'},{id:4,actual:'2026-10-11',plan:'2026-10-04'}];
 assert.deepEqual(ctx.ppFiltered(rows,state).map(p=>p.id),[1],'实际上线筛选不采用计划上线日期，也不包含区间外日期');
 await page.locator('a[href="#lifecycle"]').click();
 assert.deepEqual(await page.locator('#lifecards .lifecard h3').allTextContents(),['自研上品计划','自选商品计划','自研立项规划','自选立项规划','产品迭代规划','品质整改规划','研发创新规划','产品下市规划']);
 const plans=[['自研开发','actual'],['自选开发','actual'],['自研开发','started'],['自选开发','started'],['产品迭代','started'],['品质整改','started'],['研发创新','started']];
 const audit=()=>page.evaluate(()=>projectPanoramaAudit());
 const verify=async(stage,scope,categories=[])=>{
  const [type,key]=plans[stage],period=await page.evaluate(()=>dashboardPeriodSnapshot().modules.lifecycle),data=await audit();
  assert.deepEqual(data.state.type,[type]);assert.deepEqual(data.state.category,categories);assert.deepEqual(data.state.projectState,[]);
  assert.deepEqual(data.state[key],{mode:'range',year:period.year,start:scope==='year'?period.year+'-01-01':period.start,end:period.cutoff});
  assert.equal(data.state.plan,null);assert.equal(data.state[key==='actual'?'started':'actual'],null);
  assert.deepEqual(data.state.light,[]);assert.deepEqual(data.state.riskLight,[]);assert.equal(data.state.query,'');assert.equal(data.state.page,1);
  const range=data.state[key],expected=data.scope.filter(p=>p[key]&&p[key]>=range.start&&p[key]<=range.end).map(p=>p.id).sort((a,b)=>a-b);
  assert.deepEqual(data.filtered.map(p=>p.id).sort((a,b)=>a-b),expected);
  assert.deepEqual(await page.locator('#pp-filter-type').evaluate(e=>Array.from(e.selectedOptions,o=>o.value)),[type]);
  const text=await page.locator(`[aria-controls="pp-${key}-panel"]`).innerText();assert(text.includes(range.start.slice(2).replaceAll('-','/')));assert(text.includes(range.end.slice(2).replaceAll('-','/')));
  assert(await page.locator('#overlay').isHidden());
 };
 for(let stage=0;stage<7;stage++){
  await page.locator('#lifecards .lifecard').nth(stage).click();
  for(const scope of ['period','year']){await page.locator(`#lifetable [data-life-summary] [data-life-completed="${scope}"]`).click();await verify(stage,scope);}
 }
 // 清除上一次查询，分类行自动带入对应类目；个护与健康按两个类目并集。
 await page.locator('[data-pp-search]').fill('不存在的项目');
 await page.locator('#lifecards .lifecard').nth(2).click();
 const categories=[['清洁类'],['厨电类'],['环境类'],['个护类','健康类']];
 for(let i=0;i<4;i++){await page.locator(`#lifetable tbody tr:not([data-life-summary]) [data-life-completed="period"]`).nth(i).click();await verify(2,'period',categories[i]);}
 await page.locator('#time-lifecycle [data-time-mode="quarter"]').click();await page.locator('#time-lifecycle [data-time-value]').selectOption('3');
 await page.locator('#lifetable [data-life-summary] [data-life-completed="period"]').click();await verify(2,'period');assert.equal((await audit()).state.started.start,'2026-07-01');
 await page.locator('#lifetable [data-life-summary] [data-life-completed="year"]').click();await verify(2,'year');assert.equal((await audit()).state.started.end,'2026-09-30');
 await page.locator('#lifecards .lifecard').first().click();await page.locator('#lifetable [data-life-summary] [data-life-completed="period"]').click();await verify(0,'period');
 await page.evaluate(()=>window.scrollTo({top:document.querySelector('#projects').offsetTop-80,behavior:'instant'}));
 await page.locator('[aria-controls="pp-actual-panel"]').click();await page.locator('#pp-actual-panel [data-pp-plan-mode="month"]').click();await page.locator('#pp-actual-panel [data-pp-plan-value="9"]').click();assert.deepEqual((await audit()).state.actual,{mode:'month',year:2026,value:9});
 await page.locator('[data-pp-plan-clear="actual"]').click();assert.equal((await audit()).state.actual,null);
 await page.locator('[data-pp-reset]').click();assert.equal((await audit()).state.actual,null);assert.deepEqual((await audit()).state.projectState,['进行中']);
 await page.locator('#lifecards .lifecard').nth(7).click();
 for(const scope of ['period','year']){await page.locator(`#lifetable [data-life-summary] [data-life-completed="${scope}"]`).click();assert(await page.locator('.life-products-detail').isVisible());await page.locator('#close').click();}
 assert.equal(await page.locator('#lifecycle .metric-help,#lifecycle [title]').count(),0);
 await page.locator('#lifecards .lifecard').nth(3).click();await page.locator('#lifetable [data-life-summary] [data-life-completed="year"]').click();await verify(3,'year');
 await page.locator('#projects').screenshot({path:fileURLToPath(new URL('../../outputs/lifecycle-project-link.png',import.meta.url))});
}
