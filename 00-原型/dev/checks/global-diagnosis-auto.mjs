import {verifyAutoDates} from './global-diagnosis-auto-unit.mjs';

import assert from 'node:assert/strict';
export async function globalDiagnosisAuto(page){
 verifyAutoDates();
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),store=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')));
 let d=await audit(),saved=await store();const issues=[...d.reports,...d.focus,...d.coordination,...d.resource];
 assert(issues.length>0);for(const row of issues){assert(saved[row.task.id]);assert(['P0','P1','P2','P3'].includes(row.task.priority));assert.notEqual(row.task.status,'suggested');assert(row.participants.every(r=>r.assignee));if(row.task.gdAutomatic){assert.equal(row.task.assignedBy,'AI');assert.equal(row.task.logs.filter(l=>l.actor==='AI'&&l.action==='assign').length,1);assert(row.participants.every(r=>r.completionCriteria&&r.completionCriteria!=='—'))}}
 assert.doesNotMatch(issues.flatMap(r=>r.participants.map(p=>p.action)).join('\n'),/去钉钉|交了没有|没交就|什么时候|多少钱|怎么改|怎么做|再贴上/,'执行事项采用简洁书面语');
 const shared=d.coordination.find(r=>r.id==='coordinate-project');assert.equal(shared.task.id,d.resource.find(r=>r.id==='resource-test').task.id);assert(!d.tasks.some(r=>r.id.includes('|meeting-delivery|')),'同一项目交付会议不另建重复待办');
 const ids=Object.keys(saved).sort();for(const key of ['resource','execution','closure','coordination'])await root.locator('[data-gd-part="'+key+'"]').click();await page.locator('#refreshai').click();await page.reload();assert.deepEqual(Object.keys(await store()).sort(),ids);assert.equal(await root.locator('[data-gd-dispatch]').count(),0);
 d=await audit();const report=d.reports.find(r=>r.missing&&r.task.gdDueSource==='ai-suggested');assert(report);assert.equal(report.task.due,report.task.gdSuggestedDue);assert(report.task.due>=d.range.end);assert.match(report.problem,/确认.*没交.*没同步/);assert.equal(report.problemType,'待确认');
 // 已有分工/人工改期/办理反馈保持，诊断信号可更新而不重复派发。

 // 同一任务的优先级可在详情修改，闭环排序按任务实际优先级更新。
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-row="'+shared.id+'"] [data-gd-action="task-detail"]').first().click();
 const priorityDialog=page.locator('.up-todo-dialog[open]');await priorityDialog.locator('[data-todo-field-edit="priority"]').click();
 assert.deepEqual(await priorityDialog.locator('[data-inline-value] option').evaluateAll(es=>es.map(e=>e.value)),['P0','P1','P2','P3']);
 await priorityDialog.locator('[data-todo-priority-choice="P0"]').click();await priorityDialog.locator('header h3').click();await priorityDialog.locator('[data-todo-close]').click();
 await root.locator('[data-gd-part="closure"]').click();assert.equal(await root.locator('[data-gd-task]').first().getAttribute('data-gd-task'),shared.task.id,'P0排在其他任务之前');
 const badge=root.locator('[data-gd-task="'+shared.task.id+'"] .up-todo-priority').first();assert.equal(await badge.innerText(),'P0');assert.equal(await badge.getAttribute('data-metric-rule'),null,'优先级不触发指标说明');await page.keyboard.press('Escape');
 const id=shared.task.id;await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('product-risk-todos-v1')),t=s[id];t.due='2027-02-02';t.plan='保留已确认的执行安排';t.responsibilities[0]={...t.responsibilities[0],assignee:'陈嘉',status:'done',feedback:'已确认物料清单',completedAt:'2026-10-20T12:00:00Z'};t.gdProblem='过期的诊断信号';t.gdImpact='旧信号';s[id]=t;localStorage.setItem('product-risk-todos-v1',JSON.stringify(s))},id);
 await page.reload();saved=await store();const task=saved[id];assert.equal(task.priority,'P0');assert.equal(task.due,'2027-02-02');assert.equal(task.plan,'保留已确认的执行安排');assert.equal(task.responsibilities[0].assignee,'陈嘉');assert.equal(task.responsibilities[0].feedback,'已确认物料清单');assert.equal(task.responsibilities[0].status,'done');assert.notEqual(task.gdProblem,'过期的诊断信号');assert.equal(task.logs.filter(l=>l.actor==='AI'&&l.action==='assign').length,1);
 assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),true);
 // 旧日志待办曾误用正文产品身份：原单修正，办理信息不变，也不反复写库。
 const productLog=(await audit()).reports.find(r=>r.spuId);assert(productLog);
 await page.evaluate(row=>{const s=JSON.parse(localStorage.getItem('product-risk-todos-v1')),t=s[row.task.id];t.spuId=row.spuId;t.objectName=row.objectName;t.businessObjects=[{type:'product',id:row.spuId,name:row.objectName}];t.due='2027-03-01';t.responsibilities[0].feedback='日志已补充，等复核';localStorage.setItem('product-risk-todos-v1',JSON.stringify(s))},productLog);
 await page.reload();d=await audit();saved=await store();const fixed=saved[productLog.task.id],log=d.reports.find(r=>r.id===productLog.id);
 assert.deepEqual(fixed.businessObjects,log.businessObjects);assert.equal(fixed.businessObjects[0].type,'report');assert.equal(fixed.objectName,log.logOwner+' · '+log.type+' · '+log.date);assert(fixed.spuId.startsWith('GLOBAL|report|'));assert.equal(fixed.due,'2027-03-01');assert.equal(fixed.responsibilities[0].feedback,'日志已补充，等复核');assert.equal(fixed.logs.filter(l=>l.actor==='AI'&&l.action==='assign').length,1);
 assert.deepEqual(d.tasks.find(r=>r.id===fixed.id).businessObjects,fixed.businessObjects,'闭环列表复用相同日志对象');
 await audit();assert.deepEqual(await store(),saved,'身份修正后重复诊断不反复保存');assert.deepEqual(Object.keys(saved).sort(),ids,'不新建重复待办');
}
