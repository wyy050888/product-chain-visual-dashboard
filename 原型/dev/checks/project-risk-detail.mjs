import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export async function projectRiskDetail(page){
 const ctx=vm.createContext({});for(const file of ['01-model','12-risk-detail-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const fixture=[{project:{id:1,plan:'2027-01-01'},risk:{id:'a',deadline:'2026-12-31'}},{project:{id:2,plan:'2026-12-31'},risk:{id:'b',deadline:null}},{project:{id:3,plan:null},risk:{id:'c',deadline:'2026-12-31'}}];
 assert.deepEqual(ctx.ppRiskSorted(fixture,{key:'deadline',direction:'desc'}).map(e=>e.risk.id),['a','c','b']);
 assert.deepEqual(ctx.ppRiskSorted(fixture,{key:'plan',direction:'asc'}).map(e=>e.project.id),[2,1,3]);
 const mixed=[{project:{id:1,plan:'2026-12-30',revisedPlan:'2027-01-05'},risk:{id:'late'}},{project:{id:2,plan:'2027-01-01'},risk:{id:'original'}},{project:{id:3,plan:null,revisedPlan:'2027-01-02'},risk:{id:'revised'}},{project:{id:4,plan:null},risk:{id:'missing'}}];
 assert.deepEqual(ctx.ppRiskSorted(mixed,{key:'plan',direction:'asc'}).map(e=>e.risk.id),['original','revised','late','missing']);
 assert.deepEqual(ctx.ppRiskSorted(mixed,{key:'plan',direction:'desc'}).map(e=>e.risk.id),['late','revised','original','missing']);
 assert.equal(ctx.ppRiskFields({status:'已闭环',actualRectifiedAt:'2026-10-09',closedAt:'2026-10-11'},'2026-10-10').verificationStatus,'待验证');
 assert.equal(ctx.ppRiskFields({status:'已整改',actualRectifiedAt:'2026-10-11'},'2026-10-10').rectificationStatus,'整改中');
 await page.locator('a[href="#projects"]').click();
 assert.equal(await page.locator('.pp-table th').nth(7).innerText(),'责任部门');assert.equal(await page.locator('.pp-table th').nth(9).innerText(),'责任链主');
 assert(await page.locator('.pp-table .pp-traffic').count()>0);
 const chartRed=await page.locator('#projects .pp-red').first().evaluate(e=>getComputedStyle(e).backgroundColor);
 const assertLights=async container=>{
  assert.equal(await container.locator('.pp-traffic-radio').count(),0,'只读灯色不显示蓝色选择圈');
  const reds=container.locator('.pp-traffic-red .pp-traffic-pill');
  assert((await reds.evaluateAll(els=>els.map(e=>getComputedStyle(e).backgroundColor))).every(color=>color===chartRed),'普通红灯与左侧图表同色');
  assert((await container.locator('.pp-traffic-high .pp-traffic-pill').evaluateAll(els=>els.map(e=>getComputedStyle(e).backgroundColor))).every(color=>color!==chartRed),'高危红灯保持独立颜色');
 };
 await page.locator('[data-pp-link="light"][data-value="红灯"]').click();
 await assertLights(page.locator('.pp-table'));
 await page.locator('[data-pp-reset]').click();
 await page.locator('#pp-ai .pp-root-item').first().click();
 const table=page.locator('#pp-risk-detail-table'),audit=()=>page.evaluate(()=>projectRiskDetailAudit());
 assert(await page.locator('#dialog>.dialogfoot').isHidden());assert(await page.locator('#close').isVisible());
 const assertLayout=async()=>{
  const layout=await page.evaluate(()=>{
   const dialog=document.querySelector('#dialog'),body=document.querySelector('#dialogbody'),table=document.querySelector('#pp-risk-detail-table'),pager=document.querySelector('#pp-risk-detail-pages');
   const d=dialog.getBoundingClientRect(),t=table.getBoundingClientRect(),p=pager.getBoundingClientRect();
   return {width:d.width,viewport:innerWidth,bottomGap:innerHeight-p.bottom,bodyOverflow:body.scrollHeight-body.clientHeight,tableBottom:t.bottom,pagerTop:p.top,tableHeight:t.height};
  });
  if(layout.viewport>=1700)assert(layout.width>=layout.viewport*.79,'风险抽屉应使用更宽的展示区域');
  assert(layout.bottomGap<=26,'分页下方不应出现大块留白');
  assert(layout.bodyOverflow<=1,'只让表格滚动，避免正文与表格双重滚动');
  assert(Math.abs(layout.tableBottom-layout.pagerTop)<=1,'表格自适应占满分页上方空间');
  assert(layout.tableHeight>150);
 };
 await assertLayout();

 assert.equal(await table.locator('th').count(),20);assert.deepEqual((await audit()).sort,{key:'deadline',direction:'asc'});
 const expectedHeaders=['产品名称','项目红绿灯','项目状态','计划上线日期','延期天数','项目任务','风险单红绿灯','问题类别','问题描述','根因分析','纠正措施','预防措施','责任链主','发生日期','整改期限','当前状态','闭环验证','实际整改日期','闭环验证日期','操作'];
 assert.deepEqual((await table.locator('th').allTextContents()).map(s=>s.trim()),expectedHeaders);
 assert.equal(await table.locator('th').nth(3).locator('[data-pp-risk-sort]').count(),1);
 assert.equal(await table.locator('[data-pp-risk-sort="revisedPlan"]').count(),0);
 assert.equal(await page.locator('#dialogbody [data-pp-ledger]').count(),0);
 assert.equal(await table.locator('.metric-help').count(),0);
 assert(await table.locator('.pp-traffic-red .pp-traffic-pill').count()>0);await assertLights(table);
 const initial=await audit();assert(initial.records.length>1);assert.equal(await table.locator('tbody tr').count(),Math.min(initial.records.length,20));assert.equal(await table.locator('.pp-task-name').count(),initial.records.slice(0,20).reduce((n,e)=>n+e.risk.taskNames.length,0));
 const verify=async()=>{
  const data=await audit(),key=data.sort.key,direction=data.sort.direction,value=e=>key==='plan'?([e.project.plan,e.project.revisedPlan].filter(Boolean).sort().at(-1)||null):key==='delay'?e.project.delay:e.risk[key];
  const ids=data.records.slice((data.page-1)*data.pageSize,data.page*data.pageSize).map(e=>e.risk.id);assert.deepEqual(await table.locator('[data-risk-id]').evaluateAll(els=>els.map(e=>e.dataset.riskId)),ids);
  let previous=null,missing=false;for(const e of data.records){const v=value(e);if(v==null){missing=true;continue}assert(!missing);if(previous!=null)assert(direction==='asc'?v>=previous:v<=previous);previous=v;}
 };
 await verify();
 for(const key of ['plan','delay','occurredAt','deadline','actualRectifiedAt','verifiedAt'])for(let n=0;n<2;n++){await page.locator(`[data-pp-risk-sort="${key}"]`).click();await verify();}
 for(const field of ['plan','occurredAt','deadline','actualRectifiedAt','verifiedAt']){const values=await table.locator(`td[data-field="${field}"]`).allTextContents();assert(values.every(v=>!v.match(/20\d{2}-\d{2}-\d{2}/)));}
 assert((await table.locator('td[data-field="rectificationStatus"]').allTextContents()).every(v=>['待整改','整改中','已整改','—'].includes(v)));
 assert((await table.locator('td[data-field="verificationStatus"]').allTextContents()).every(v=>['待验证','已验证'].includes(v)));
 await table.locator('[data-pp-analysis-view]').first().click();assert.equal(await page.locator('#toast').innerText(),'点击跳转项目详情页-风险管理');assert(await table.isVisible());
 const row=table.locator('tbody tr').first(),first=(await audit()).records[0];
 assert.equal(await row.locator('[data-field="projectLight"] .pp-traffic').getAttribute('aria-label'),first.project.status==='红灯'&&first.project.delay>15?'高危红灯':first.project.status);
 assert.equal(await row.locator('[data-field="light"] .pp-traffic').getAttribute('aria-label'),first.risk.light);
 for(const width of [1920,900,600]){await page.setViewportSize({width,height:1080});await assertLayout();assert(await table.evaluate(e=>e.scrollWidth>e.clientWidth));assert(await page.locator('#dialog').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));}
 await page.setViewportSize({width:1920,height:1080});await table.evaluate(e=>e.scrollLeft=0);await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-detail.png',import.meta.url))});await table.evaluate(e=>e.scrollLeft=e.scrollWidth);await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-detail-status.png',import.meta.url))});
 await page.locator('#close').click();await page.locator('#pp-ai .pp-root-item').first().click();assert.deepEqual((await audit()).sort,{key:'deadline',direction:'asc'});await page.locator('#close').click();
 await page.locator('#pp-ai [data-mode="all"]').first().click();
 await assertLayout();
 const all=(await audit()).records,form=page.locator('#pp-risk-filters'),search=form.locator('input[type="search"]');
 assert(all.length>20);await page.locator('#pp-risk-detail-pages [aria-label="下一页"]').click();
 const example=all.find(e=>e.risk.light==='红灯'&&e.risk.owner&&e.risk.rootCause&&e.risk.taskNames.length);
 await search.fill(example.project.name);assert.equal((await audit()).page,1,'输入立即筛选并回到第1页');
 assert.equal(await form.getByRole('button',{name:'查询',exact:true}).count(),0);
 await search.press('Enter');assert.equal((await audit()).page,1);assert((await audit()).records.every(e=>e.project.name.includes(example.project.name)));assert((await audit()).records.length>0);
 for(const query of [example.risk.owner,example.risk.rootCause,example.risk.taskNames[0]]){
  await search.fill(' '+query+' ');
  const data=await audit();assert(data.records.length>0);assert(data.records.every(({project,risk})=>[project.name,...risk.taskNames,risk.rootCause,risk.owner].some(value=>String(value||'').includes(query))));
 }
 await form.locator('[data-pp-risk-reset]').click();assert.equal((await audit()).records.length,all.length);
 const pick=async(key,values)=>{
  const menu=form.locator('.pf-multi').filter({has:page.locator('[name="'+key+'"]')});
  await menu.locator('summary').click();await menu.locator('input[value="all"]').check();
  for(const value of values)await menu.locator('input[value="'+value+'"]').check();
  assert.equal(await menu.getAttribute('open'),'','勾选后菜单保持打开，允许继续多选');await page.keyboard.press('Escape');
 };
 // 各字段支持多选；字段内OR、字段间AND，取消和全选立即回写。
 for(const [key,values] of [['light',['红灯','黄灯']],['rectificationStatus',['待整改','整改中']],['verificationStatus',['待验证','已验证']]]){
  await pick(key,values);const data=await audit();assert.deepEqual(data.filters[key],values);
  assert.deepEqual(data.records.map(e=>e.risk.id).sort(),all.filter(e=>values.includes(e.risk[key])).map(e=>e.risk.id).sort());
  const menu=form.locator('.pf-multi').filter({has:page.locator('[name="'+key+'"]')});await menu.locator('summary').click();
  await menu.locator('input[value="'+values[0]+'"]').uncheck();assert.deepEqual((await audit()).filters[key],[values[1]]);
  await menu.locator('input[value="all"]').check();assert.deepEqual((await audit()).filters[key],[]);assert.equal((await audit()).records.length,all.length);await page.keyboard.press('Escape');
 }
 for(const key of ['light','rectificationStatus','verificationStatus'])await pick(key,[example.risk[key]]);
 const combined=(await audit()).records;assert(combined.length>0);assert(combined.every(e=>['light','rectificationStatus','verificationStatus'].every(key=>e.risk[key]===example.risk[key])));
 assert.equal(await page.locator('#pp-risk-detail-pages .list-pagination').getAttribute('data-list-total'),String(combined.length));
 await table.locator('[data-pp-risk-sort="delay"]').click();assert.equal((await audit()).records.length,combined.length);assert.deepEqual((await audit()).filters.light,[example.risk.light]);
 await search.fill('不存在的风险台账关键词');await search.press('Enter');assert.equal((await audit()).records.length,0);assert.match(await table.innerText(),/暂无符合条件/);
 assert.equal(await page.locator('#pp-risk-detail-pages .list-pagination').getAttribute('data-list-total'),'0');
 await form.locator('[data-pp-risk-reset]').click();assert.equal((await audit()).records.length,all.length);assert.equal(await search.inputValue(),'');assert.equal((await audit()).total,all.length);

 const images=await table.locator('.pp-product img').evaluateAll(images=>images.map(image=>({complete:image.complete,width:image.naturalWidth})));assert(images.every(image=>image.complete&&image.width>0));
 await page.setViewportSize({width:1920,height:760});await assertLayout();
 await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-all-fit.png',import.meta.url))});
 await page.setViewportSize({width:1920,height:1080});
 // 主表与抽屉复用产品单元格；将实际缺图单元格放入抽屉验证局部样式。
 await page.evaluate(()=>{const missing=document.querySelector('#projects .pp-product:has(.pp-placeholder)');document.querySelector('#pp-risk-detail-table .pp-product').replaceWith(missing.cloneNode(true))});
 // 缺失图片使用居中占位，不把其他产品的图片填到该项目上。
 const placeholder=table.locator('.pp-placeholder').first();
 assert(await placeholder.count()>0);assert.equal(await placeholder.getAttribute('aria-label'),'暂无产品图片');
 const centered=await placeholder.evaluate(e=>{const box=e.getBoundingClientRect(),icon=e.querySelector('svg').getBoundingClientRect();return Math.abs(box.x+box.width/2-icon.x-icon.width/2)<1&&Math.abs(box.y+box.height/2-icon.y-icon.height/2)<1});
 assert(centered);
 await assertLayout();
 await page.locator('#close').click();
 const events=await page.evaluate(()=>projectRiskEventsAudit()),closed=events.groups.find(g=>g.closed.length);
 await page.locator(`[data-pp-event-group="${closed.key}"][data-kind="closed"]`).click();
 assert((await page.locator('#pp-risk-detail-table td[data-field="rectificationStatus"]').allTextContents()).every(v=>v==='已整改'));
 assert((await page.locator('#pp-risk-detail-table td[data-field="verificationStatus"]').allTextContents()).every(v=>v==='已验证'));
 const verified=await page.evaluate(()=>projectRiskDetailAudit().records);assert(verified.every(e=>e.risk.actualRectifiedAt&&e.risk.verifiedAt&&e.risk.actualRectifiedAt<=e.risk.verifiedAt));
 await page.locator('#close').click();
 const group=events.groups.filter(g=>g.new.length>20).sort((a,b)=>b.new.length-a.new.length)[0];assert(group,'样例需要覆盖多页风险');
 await page.locator(`[data-pp-event-group="${group.key}"][data-kind="new"]`).click();
 const pager=page.locator('#pp-risk-detail-pages .list-pagination');
 assert.equal(await page.locator('.pp-analysis-total').count(),0);
 assert.equal(await page.locator('#dialogbody .list-pagination').count(),1);
 assert.equal((await audit()).pageSize,20);assert.equal((await audit()).page,1);
 assert.equal(await pager.locator('.list-page-size').innerText(),'20条/页');
 assert.equal(await pager.getAttribute('data-list-total'),String(group.new.length));
 assert.equal(await table.locator('tbody tr').count(),20);await verify();
 assert(await pager.locator('[aria-label="上一页"]').isDisabled());
 await pager.locator('[aria-label="下一页"]').click();assert.equal((await audit()).page,2);await verify();
 assert.equal(await table.locator('tbody tr').count(),Math.min(20,group.new.length-20));
 const jump=pager.locator('input');await jump.fill('999');await jump.press('Enter');
 assert.equal((await audit()).page,Math.ceil(group.new.length/20));await verify();
 assert(await pager.locator('[aria-label="下一页"]').isDisabled());
 await table.locator('[data-pp-risk-sort="deadline"]').click();assert.equal((await audit()).page,1);await verify();
 for(const width of [1920,600]){await page.setViewportSize({width,height:1080});assert(await pager.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&e.scrollWidth<=e.clientWidth}));}
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-pagination.png',import.meta.url))});
 await page.locator('#close').click();
 await page.locator(`[data-pp-event-group="${group.key}"][data-kind="new"]`).click();assert.equal((await audit()).page,1);assert.deepEqual((await audit()).filters,{query:'',light:[],rectificationStatus:[],verificationStatus:[]});await page.locator('#close').click();
}
