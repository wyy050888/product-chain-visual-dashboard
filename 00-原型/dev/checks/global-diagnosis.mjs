import {globalDiagnosisWidth} from './global-diagnosis-layout.mjs';
import {verifyActionSummaryModel} from './global-diagnosis-action-summary.mjs';
import {verifyCausalProblemModel} from './global-diagnosis-problem-summary.mjs';
import assert from 'node:assert/strict';
export async function globalDiagnosis(page){
 verifyActionSummaryModel();
 verifyCausalProblemModel();
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 assert.deepEqual(await root.locator('#aigrid h3').allTextContents(),['产品链紧急协同','资源建议','执行诊断','任务闭环']);
 const data=await audit();assert.equal(data.sources.length,9);assert(data.sources.every(s=>s.total>0));assert.equal(new Set(data.tasks.map(r=>r.id)).size,data.tasks.length);
 for(const [part,tab] of [['coordination','all'],['resource','all'],['execution','reports'],['execution','focus'],['closure',null]]){
  await root.locator('[data-gd-part="'+part+'"]').click();if(tab)await root.locator('[data-gd-tab="'+tab+'"]').click();
  assert.deepEqual(await root.locator('[data-gd-table] th').allTextContents(),['业务对象','优先级','问题描述','执行事项','责任部门/责任人','计划完成日期','状态','实际完成日期','操作']);
  assert.equal(await root.locator('[data-gd-action]:not([data-gd-action="task-detail"]),.gd-detail-links,[data-gd-issue-type],[data-gd-report-type]').count(),0);
  assert.equal(await root.locator('select[data-gd-status]').count(),0);assert.deepEqual(await root.locator('[data-gd-status]').evaluateAll(es=>es.map(e=>e.dataset.gdStatus)),['all','pending','working','done']);assert.deepEqual(await root.locator('[data-gd-status][aria-pressed="true"]').evaluateAll(es=>es.map(e=>e.dataset.gdStatus)),['pending','working']);
  assert.equal(await root.locator('[data-gd-dispatch],[data-gd-feedback],[data-gd-edit-due]').count(),0);assert.equal(await root.locator('[data-label="操作"] [data-gd-action="task-detail"]').count(),await root.locator('[data-gd-task]').count());assert(await root.locator('.gd-business-type').count()>0);const entries=(await audit()).tableRows.slice(0,8),rows=entries.map(({row,roles})=>({...row,participants:roles}));assert.equal(await root.locator('.gd-task-start').count(),rows.length);
  // 每类诊断主表与详情复用同一问题展示，执行事项对应责任项，查看不改写历史正文。
  if(rows.length){
   const first=root.locator('[data-gd-task]').first(),problem=await first.locator('[data-label="问题描述"]').innerText();
   await first.locator('[data-gd-action="task-detail"]').click();const detail=page.locator('.up-todo-dialog[open]');
   const displayName=name=>name.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,(_,year,month,day)=>year.slice(2)+'/'+month+'/'+day);assert.equal((await detail.locator('[data-todo-business-object]').allTextContents()).join('\n'),rows[0].businessObjects.map(object=>displayName(object.name)).join('\n'));assert.equal(await detail.locator('.up-todo-title-section h5,[data-todo-type],[name="taskType"]').count(),0);
   assert.equal((await detail.locator('[data-todo-problem]').innerText()).replace(/\s/g,''),problem.replace(/\s/g,''));
   const execution=await detail.locator('[data-todo-execution]').innerText();for(const role of rows[0].participants)assert(execution.includes(role.action));
   assert((await detail.locator('.up-todo-common dt').allTextContents()).includes('计划完成日期'));
   assert.doesNotMatch((await detail.locator('h5').allTextContents()).join(' '),/待办事项|处理要求/);
   await detail.locator('[data-todo-close]').click();
  }
  for(const row of rows){
   const group=root.locator('[data-gd-task="'+row.task.id+'"]');assert.equal(await group.count(),1,'同一任务只占一行');
   assert.equal((await group.locator('[data-label="问题描述"]').innerText()).replace(/\s/g,''),row.causalProblem.replace(/\s/g,''),'问题按原因与后果展示');
   const full=await group.locator('.gd-owner-summary').getAttribute('data-metric-rule');
   const actions=group.locator('.gd-action-content');assert.equal(await actions.count(),await group.locator('.gd-action-summary').count());
   for(const action of await actions.all()){assert.match(await action.locator(':scope>strong').innerText(),/^【[^】]+】$/);assert.doesNotMatch(await action.locator(':scope>strong').innerText(),/^【(?:建议|评估|考虑)/);assert(Number(await action.locator(':scope>strong').evaluate(e=>getComputedStyle(e).fontWeight))>=600);assert(await action.locator('.gd-action-detail').innerText(),'具体执行内容仍然保留')}
   assert.equal(await group.locator('.gd-owner-line').count(),Math.min(2,new Set(row.participants.map(role=>role.department+' / '+role.assignee)).size));
   for(const role of row.participants){assert(full.includes(role.department+' / '+role.assignee));assert((await group.locator('[data-label="执行事项"]').innerText()).includes(role.action));if(row.task.gdAutomatic)assert(role.completionCriteria&&role.completionCriteria!=='—')}
   assert.equal(await group.locator('[data-label="计划完成日期"]').innerText(),row.task.due?row.task.due.slice(2).replaceAll('-','/'):'—');
   const completed=row.task.status==='done'&&row.task.completedAt?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(row.task.completedAt)).slice(2).replaceAll('-','/'):'—';
   assert.equal(await group.locator('[data-label="实际完成日期"]').innerText(),completed,'按任务展示实际完成日期');
   assert.equal(await group.locator('[data-label="优先级"] .up-todo-priority').getAttribute('aria-label'),({P0:'P0 · 紧急',P1:'P1 · 高',P2:'P2 · 中',P3:'P3 · 低'})[row.task.priority]);
   assert.notEqual(row.task.status,'suggested');assert(row.businessObjects.length);assert(row.problem);assert(['风险','待确认'].includes(row.problemType));
  }
 }
 assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),true);
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="all"]').click();
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});
  await globalDiagnosisWidth(page,width);
  assert(await root.locator('.gd-action-content').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)),'动作被截断 '+width);
  assert.equal(await root.locator('[data-gd-progress],td select').count(),0);
 }
 await page.setViewportSize({width:1920,height:1080});
}
