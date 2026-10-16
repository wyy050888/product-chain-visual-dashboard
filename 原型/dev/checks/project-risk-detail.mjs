import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export async function projectRiskDetail(page){
 const ctx=vm.createContext({});for(const file of ['01-model','12-risk-detail-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const fixture=[{project:{id:1,plan:'2027-01-01'},risk:{id:'a',deadline:'2026-12-31'}},{project:{id:2,plan:'2026-12-31'},risk:{id:'b',deadline:null}},{project:{id:3,plan:null},risk:{id:'c',deadline:'2026-12-31'}}];
 assert.deepEqual(ctx.ppRiskSorted(fixture,{key:'deadline',direction:'desc'}).map(e=>e.risk.id),['a','c','b']);
 assert.deepEqual(ctx.ppRiskSorted(fixture,{key:'plan',direction:'asc'}).map(e=>e.project.id),[2,1,3]);
 assert.equal(ctx.ppRiskFields({status:'已闭环',actualRectifiedAt:'2026-10-09',closedAt:'2026-10-11'},'2026-10-10').verificationStatus,'待验证');
 assert.equal(ctx.ppRiskFields({status:'已整改',actualRectifiedAt:'2026-10-11'},'2026-10-10').rectificationStatus,'整改中');
 await page.locator('a[href="#projects"]').click();
 assert.equal(await page.locator('.pp-table th').nth(7).innerText(),'责任部门');assert.equal(await page.locator('.pp-table th').nth(9).innerText(),'责任链主');
 assert(await page.locator('.pp-table .pp-traffic').count()>0);
 await page.locator('#pp-ai .pp-root-item').first().click();
 const table=page.locator('#pp-risk-detail-table'),audit=()=>page.evaluate(()=>projectRiskDetailAudit());
 assert.equal(await table.locator('th').count(),21);assert.deepEqual((await audit()).sort,{key:'deadline',direction:'asc'});
 const expectedHeaders=['产品名称','项目红绿灯','项目状态','计划上线日期延期上线日期','延期天数','卡点阶段','项目任务','风险单红绿灯','问题类别','问题描述','根因分析','纠正措施','预防措施','责任链主','发生日期','整改期限','当前状态','闭环验证','实际整改日期','闭环验证日期','操作'];
 assert.deepEqual((await table.locator('th').allTextContents()).map(s=>s.trim()),expectedHeaders);
 assert.equal(await page.locator('#dialogbody [data-pp-ledger]').count(),0);
 assert.equal(await table.locator('.metric-help').count(),0);
 const initial=await audit();assert(initial.records.length>1);assert.equal(await table.locator('tbody tr').count(),initial.records.length);assert.equal(await table.locator('.pp-task-name').count(),initial.records.reduce((n,e)=>n+e.risk.taskNames.length,0));
 const verify=async()=>{
  const data=await audit(),key=data.sort.key,direction=data.sort.direction,value=e=>['plan','revisedPlan','delay'].includes(key)?e.project[key]:e.risk[key];
  const ids=data.records.map(e=>e.risk.id);assert.deepEqual(await table.locator('[data-risk-id]').evaluateAll(els=>els.map(e=>e.dataset.riskId)),ids);
  let previous=null,missing=false;for(const e of data.records){const v=value(e);if(v==null){missing=true;continue}assert(!missing);if(previous!=null)assert(direction==='asc'?v>=previous:v<=previous);previous=v;}
 };
 await verify();
 for(const key of ['plan','revisedPlan','delay','occurredAt','deadline','actualRectifiedAt','verifiedAt'])for(let n=0;n<2;n++){await page.locator(`[data-pp-risk-sort="${key}"]`).click();await verify();}
 for(const field of ['plan','occurredAt','deadline','actualRectifiedAt','verifiedAt']){const values=await table.locator(`td[data-field="${field}"]`).allTextContents();assert(values.every(v=>!v.match(/20\d{2}-\d{2}-\d{2}/)));}
 assert((await table.locator('td[data-field="rectificationStatus"]').allTextContents()).every(v=>['待整改','整改中','已整改','—'].includes(v)));
 assert((await table.locator('td[data-field="verificationStatus"]').allTextContents()).every(v=>['待验证','已验证'].includes(v)));
 await table.locator('[data-pp-analysis-view]').first().click();assert.equal(await page.locator('#toast').innerText(),'点击跳转项目详情页-风险管理');assert(await table.isVisible());
 const row=table.locator('tbody tr').first(),first=(await audit()).records[0];
 assert.equal(await row.locator('[data-field="projectLight"] .pp-traffic').getAttribute('aria-label'),first.project.status==='红灯'&&first.project.delay>15?'高危红灯':first.project.status);
 assert.equal(await row.locator('[data-field="light"] .pp-traffic').getAttribute('aria-label'),first.risk.light);
 for(const width of [1920,900,600]){await page.setViewportSize({width,height:1080});assert(await table.evaluate(e=>e.scrollWidth>e.clientWidth));assert(await page.locator('#dialog').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));}
 await page.setViewportSize({width:1920,height:1080});await table.evaluate(e=>e.scrollLeft=0);await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-detail.png',import.meta.url))});await table.evaluate(e=>e.scrollLeft=e.scrollWidth);await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-detail-status.png',import.meta.url))});
 await page.locator('#modalclose').click();await page.locator('#pp-ai .pp-root-item').first().click();assert.deepEqual((await audit()).sort,{key:'deadline',direction:'asc'});await page.locator('#modalclose').click();
 const events=await page.evaluate(()=>projectRiskEventsAudit()),closed=events.groups.find(g=>g.closed.length);
 await page.locator(`[data-pp-event-group="${closed.key}"][data-kind="closed"]`).click();
 assert((await page.locator('#pp-risk-detail-table td[data-field="rectificationStatus"]').allTextContents()).every(v=>v==='已整改'));
 assert((await page.locator('#pp-risk-detail-table td[data-field="verificationStatus"]').allTextContents()).every(v=>v==='已验证'));
 const verified=await page.evaluate(()=>projectRiskDetailAudit().records);assert(verified.every(e=>e.risk.actualRectifiedAt&&e.risk.verifiedAt&&e.risk.actualRectifiedAt<=e.risk.verifiedAt));
 await page.locator('#modalclose').click();
}
