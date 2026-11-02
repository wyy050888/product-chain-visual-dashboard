import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import assert from 'node:assert/strict';
export async function globalDiagnosisConsistency(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),initial=await audit();
 const project=initial.coordination.find(r=>r.id==='coordinate-project'),base=project.task;
 const fixtures=[
  {...base,id:'association-product',gdIssue:'',gdSource:'',gdProjectId:undefined,spuId:initial.coordination.find(r=>r.spuId).spuId,objectName:'',businessObjects:undefined},
  {...base,id:'association-empty',gdIssue:'',gdSource:'invalid',gdProjectId:undefined,objectName:'',businessObjects:undefined},
  {...base,id:'association-history',gdIssue:'coordinate-project',gdProjectId:999999,objectName:'历史项目A',businessObjects:undefined},
  {...base,id:'association-shop',gdIssue:'',gdSource:'risk',gdProjectId:undefined,spuId:'shop:306131028',shopId:'306131028',scope:'shop',objectName:'康佳清洁电器旗舰店',businessObjects:undefined},
  {...base,id:'association-legacy-owner',gdIssue:'coordinate-project',responsibilities:undefined,assignee:'周铭',plan:'保留原任务执行安排',due:'2026-11-20'}
 ].map(t=>({...t,title:t.id,status:'pending',logs:[]}));
 await page.evaluate(items=>{const s=JSON.parse(localStorage.getItem('product-risk-todos-v1'));for(const t of items)s[t.id]=t;localStorage.setItem('product-risk-todos-v1',JSON.stringify(s))},fixtures);
 await page.reload();await root.locator('[data-gd-part="closure"]').click();let d=await audit();const by=id=>d.tasks.find(r=>r.id===id);
 assert.equal(by('association-product').businessObjects[0].type,'product');assert.equal(by('association-empty').businessObjects[0].name,'未关联');assert.equal(by('association-history').businessObjects[0].name,'历史项目A');assert.equal(by('association-shop').businessObjects[0].type,'shop');assert.equal(by('association-shop').businessObjects[0].id,'306131028');
 assert.equal(by('association-legacy-owner').participants.length,1);assert.equal(by('association-legacy-owner').participants[0].assignee,'周铭');assert.equal(by('association-legacy-owner').participants[0].action,'保留原任务执行安排');assert.equal(by('association-legacy-owner').due,'2026-11-20');
 for(const t of fixtures){await root.locator('[data-gd-search]').fill(t.id);assert.equal(await root.locator('.gd-task-start').count(),1);assert((await root.locator('[data-label="业务对象"]').allTextContents()).every(text=>text.includes(by(t.id).businessObjects[0].name)))}
 await resetDiagnosisFilters(root);await root.locator('[data-gd-search]').fill('康佳清洁电器旗舰店');assert((await audit()).visible.some(r=>r.id==='association-shop'));await resetDiagnosisFilters(root);

 // 自动节点与已有计划分开保留，人工改期不被下一轮诊断覆盖。
 await root.locator('[data-gd-part="resource"]').click();const auto=(await audit()).resource.find(r=>r.task.gdAutomatic);assert(auto);assert.equal(auto.task.assignedBy,'AI');
 const original={due:auto.task.due,suggested:auto.task.gdSuggestedDue};await root.locator('[data-gd-action="task-detail"][data-gd-id="'+auto.id+'"]').first().click();const dialog=page.locator('.up-todo-dialog[open]');await dialog.locator('[data-todo-field-edit="due"]').click();await dialog.locator('[data-todo-field="due"] input').fill('2027-01-03');await dialog.locator('[data-todo-field="due"] input').press('Enter');await dialog.locator('[data-todo-close]').click();let assigned=(await audit()).resource.find(r=>r.id===auto.id);assert.equal(assigned.task.due,'2027-01-03');assert.equal(assigned.task.gdSuggestedDue,original.suggested);
 await page.locator('#refreshai').click();assert.equal((await audit()).resource.find(r=>r.id===auto.id).task.due,'2027-01-03');
 const date=project.date;await root.locator('#gd-date-trigger').click();const day=page.locator('#up-date-popover [data-range-date="'+date+'"]:not(.outside)');await day.click();await day.click();d=await audit();assert.deepEqual(d.range,{start:date,end:date});
 for(const row of [...d.coordination,...d.resource])assert(d.tasks.some(t=>t.id===row.task.id),'统计期间不切断已关联任务');
 await page.locator('#refreshai').click();d=await audit();assert.equal(new Set(d.tasks.map(r=>r.id)).size,d.tasks.length);
}
