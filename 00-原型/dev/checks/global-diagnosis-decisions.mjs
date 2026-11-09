import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import assert from 'node:assert/strict';

export async function globalDiagnosisDecisions(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),store=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')));
 const ids=['decision-launch-batch','decision-test-route','decision-backup-supplier'];
 const select=async()=>{await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="decision"]').click();await resetDiagnosisFilters(root)};
 await select();const initial=await audit(),samples=initial.coordination.filter(row=>ids.includes(row.id));
 assert.equal(samples.length,3);assert.equal(new Set(samples.map(row=>row.task.id)).size,3);
 assert.deepEqual(samples.map(row=>row.participants.length),[2,3,3]);
 for(const row of samples){
  assert.equal(row.kind,'decision');assert(row.options.length>=2);assert(row.date>=initial.range.start&&row.date<=initial.range.end);assert(row.task.due>initial.range.end);
  assert(row.task.gdAutomatic);assert(row.participants.every(role=>role.assignee&&role.completionCriteria&&role.completionCriteria!=='—'));
  await root.locator('[data-gd-search]').fill(row.title);assert.equal((await audit()).tableRows.length,1);
  assert.equal(await root.locator('[data-gd-tab="decision"]>span').innerText(),'1');
  await root.locator('[data-gd-row="'+row.id+'"] [data-gd-action="task-detail"]').first().click();
  const dialog=page.locator('.up-todo-dialog[open]');assert.equal(await dialog.locator('[data-responsibility-row]').count(),row.participants.length);await dialog.locator('[data-todo-evidence]').click();
  assert.match(await dialog.locator('[data-todo-basis-location]').innerText(),/产品链决策评审样例.xlsx[\s\S]*待决策事项/);
  assert.match(await dialog.locator('[data-todo-basis-content]').innerText(),/讨论记录.*\n会议决议/s);await dialog.locator('[data-todo-close]').click();
 }
 await root.locator('[data-gd-search]').fill('');const before=await store(),old=initial.coordination.find(row=>row.id==='coordinate-margin').task;
 // 已有已完成事项继续保留；新增样例不能靠重开旧单实现。
 await page.evaluate(id=>{const saved=JSON.parse(localStorage.getItem('product-risk-todos-v1')),task=saved[id];task.status='done';task.completedAt=new Date().toISOString();task.responsibilities=task.responsibilities.map(role=>({...role,status:'done',completedAt:task.completedAt}));localStorage.setItem('product-risk-todos-v1',JSON.stringify(saved))},old.id);
 await page.reload();await select();let data=await audit();assert(!data.visible.some(row=>row.id==='coordinate-margin'));assert.equal(data.tableRows.length,3);assert.equal(await root.locator('[data-gd-tab="decision"]>span').innerText(),'3');
 const first=samples[0].task.id;
 await page.evaluate(id=>{const saved=JSON.parse(localStorage.getItem('product-risk-todos-v1')),task=saved[id];task.status='done';task.completedAt=new Date().toISOString();task.responsibilities=task.responsibilities.map(role=>({...role,status:'done',completedAt:task.completedAt}));localStorage.setItem('product-risk-todos-v1',JSON.stringify(saved))},first);
 await page.reload();await select();data=await audit();assert(!data.visible.some(row=>row.task.id===first));assert.equal(data.tableRows.length,2);assert.equal((await store())[old.id].status,'done');assert.deepEqual(Object.keys(await store()).sort(),Object.keys(before).sort(),'刷新和完成不会创建重复样例待办');
 console.log('通过：三类决策样例、八条分工、方案/完成标准/会议依据、默认可见、计数与刷新身份稳定，原完成状态保留');
}
