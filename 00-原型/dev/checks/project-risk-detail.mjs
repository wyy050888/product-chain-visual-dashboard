import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export async function projectRiskDetail(page){
 const ctx=vm.createContext({});ctx.window||={};vm.runInContext(fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8'),ctx);for(const file of ['01-model','12-risk-detail-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const colors=['红灯','黄灯','绿灯'].map(light=>({project:{name:'项目'},risk:{id:light,light}}));assert.deepEqual(ctx.ppRiskFiltered(colors).map(entry=>entry.risk.light),['红灯','黄灯']);assert.equal(colors.length,3);
 const fixture=[{project:{id:1,plan:'2027-01-01'},risk:{id:'a',deadline:'2026-12-31'}},{project:{id:2,plan:'2026-12-31'},risk:{id:'b',deadline:null}},{project:{id:3,plan:null},risk:{id:'c',deadline:'2026-12-31'}}];
 assert.deepEqual(ctx.ppRiskSorted(fixture,{key:'deadline',direction:'desc'}).map(e=>e.risk.id),['a','c','b']);
 assert.deepEqual(ctx.ppRiskSorted(fixture,{key:'plan',direction:'asc'}).map(e=>e.project.id),[2,1,3]);
 const mixed=[{project:{id:1,plan:'2026-12-30',revisedPlan:'2027-01-05'},risk:{id:'late'}},{project:{id:2,plan:'2027-01-01'},risk:{id:'original'}},{project:{id:3,plan:null,revisedPlan:'2027-01-02'},risk:{id:'revised'}},{project:{id:4,plan:null},risk:{id:'missing'}}];
 assert.deepEqual(ctx.ppRiskSorted(mixed,{key:'plan',direction:'asc'}).map(e=>e.risk.id),['original','revised','late','missing']);
 assert.deepEqual(ctx.ppRiskSorted(mixed,{key:'plan',direction:'desc'}).map(e=>e.risk.id),['late','revised','original','missing']);
 assert.equal(ctx.ppRiskFields({status:'已闭环',actualRectifiedAt:'2026-10-09',closedAt:'2026-10-11'},'2026-10-10').verificationStatus,'待验证');
 assert.equal(ctx.ppRiskFields({status:'已整改',actualRectifiedAt:'2026-10-11'},'2026-10-10').rectificationStatus,'整改中');
 await page.locator('a[href="#projects"]').click();
 assert.equal(await page.locator('.pp-table th').nth(5).innerText(),'责任部门');assert.equal(await page.locator('.pp-table th').filter({hasText:'责任链主'}).count(),0);
 assert(await page.locator('.pp-table .pp-traffic').count()>0);
 const chartRed=await page.locator('#projects .pp-red').first().evaluate(e=>getComputedStyle(e).backgroundColor);
 const assertLights=async container=>{
  assert.equal(await container.locator('.pp-traffic-radio').count(),0,'只读灯色不显示蓝色选择圈');
  const reds=container.locator('.pp-traffic-red .pp-traffic-pill');
  assert((await reds.evaluateAll(els=>els.map(e=>getComputedStyle(e).backgroundColor))).every(color=>color===chartRed),'普通红灯与左侧图表同色');
  assert((await container.locator('.pp-traffic-high .pp-traffic-pill').evaluateAll(els=>els.map(e=>getComputedStyle(e).backgroundColor))).every(color=>color!==chartRed),'高危红灯保持独立颜色');
 };
 await page.locator('[data-pp-light-tab="红灯"]').click();
 await assertLights(page.locator('.pp-table'));
 await page.locator('[data-pp-reset]').click();
 // 已移除风险新增/闭环图，公共风险表通过实际内嵌部门台账验证。
 assert.equal(await page.locator('[data-pp-event-group]').count(),0);
 await page.locator('[data-pp-analysis-department="产品中心"]').click();await page.locator('[data-analysis-department="产品中心"] [data-mode="all"]').click();
 const table=page.locator('#pp-analysis-ledger-results'),audit=()=>page.evaluate(()=>projectAnalysisAudit());
 assert(await page.locator('#overlay').isHidden());assert.equal(await table.locator('th').count(),20);
 assert.deepEqual((await table.locator('th').allTextContents()).map(t=>t.trim()),['产品名称','项目红绿灯','项目状态','计划上市日期','延期天数','项目任务','风险单红绿灯','问题类别','问题描述','根因分析','纠正措施','预防措施','责任链主','发生日期','整改期限','当前状态','闭环验证','实际整改日期','闭环验证日期','操作']);
 await assertLights(table);
 const verify=async()=>{
  const data=await audit(),key=data.state.sort.key,dir=data.state.sort.direction,rows=data.filteredRecords;
  assert.deepEqual(await table.locator('tbody tr[data-risk-id]').evaluateAll(es=>es.map(e=>e.dataset.riskId)),rows.slice((data.state.page-1)*20,data.state.page*20).map(e=>String(e.risk.id)));
  const value=e=>key==='plan'?([e.project.plan,e.project.revisedPlan].filter(Boolean).sort().at(-1)||null):key==='delay'?e.project.delay:e.risk[key];
  let previous=null,missing=false;for(const row of rows){const v=value(row);if(v==null){missing=true;continue}assert(!missing,'空值始终置后');if(previous!=null)assert(dir==='asc'?v>=previous:v<=previous);previous=v}
 };
 for(const key of ['plan','delay','occurredAt','deadline','actualRectifiedAt','verifiedAt'])for(let n=0;n<2;n++){await page.locator('[data-pp-analysis-sort="'+key+'"]').click();await verify()}
 for(const field of ['plan','occurredAt','deadline','actualRectifiedAt','verifiedAt'])assert((await table.locator('td[data-field="'+field+'"]').allTextContents()).every(v=>!v.match(/20\d{2}-\d{2}-\d{2}/)));
 const records=(await audit()).records,search=page.locator('#pp-analysis-filters input[type="search"]');assert(records.length>20,'覆盖多页风险');
 await page.locator('.pp-analysis-pages [aria-label="下一页"]').click();assert.equal((await audit()).state.page,2);await verify();
 await search.fill(records[0].project.name);assert.equal((await audit()).state.page,1);assert((await audit()).filteredRecords.every(r=>r.project.name.includes(records[0].project.name)));
 await page.locator('[data-pp-analysis-reset]').click();assert.equal((await audit()).filteredRecords.length,records.length);
 await table.locator('[data-pp-analysis-view]').first().click();assert.equal(await page.locator('#toast').innerText(),'点击跳转项目详情页-风险管理');assert(await page.locator('#overlay').isHidden());
 for(const width of [1920,900,600,390]){await page.setViewportSize({width,height:1080});assert(await table.locator('.pp-analysis-ledger-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));assert(await page.locator('#pp-ai').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'台账不得撑宽页面')}
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：现有内嵌风险表20列、六指标双向排序、空值置后、实际日期、分页及窄屏');
}
