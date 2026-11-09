import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {verifyTodoOriginsModel} from './todo-origins-model.mjs';

const storageKey='product-risk-todos-v1';
export async function todoOrigins(page){
 verifyTodoOriginsModel();
 const initial=await page.evaluate(()=>globalDiagnosisAudit()),read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
 for(const row of initial.tasks){const task=row.task;assert(task.originEvidence?.sources?.length,task.id);for(const source of task.originEvidence.sources){assert(source.sourceName&&source.content&&source.date&&(source.capturedAt||source.capturedDate),task.id);assert.doesNotMatch(source.sourceName,/未记录|原待办保存记录/)}}
 for(const row of initial.work){const task=(await read())[row.task.id];assert.equal(task.originEvidence.originId,row.id);assert.deepEqual(task.originEvidence.sources.map(s=>s.id),row.sources.map(s=>s.id),'来源按原事项保存，不借用同产品其他材料')}
 const history={id:'origin-regression-history',spuId:'SPU-SOURCE-003',objectName:'创维取暖器A944',platform:'all',source:'global-diagnosis',title:'复核历史经营亏损',description:'全公司 · 亏损金额 29.0w',plan:'核实定价与库存去化安排',start:'2026-10-01',end:'2026-10-10',due:'2026-10-17',status:'working',priority:'P1',department:'产品中心',assignee:'陈嘉',assignedAt:'2026-10-12T09:00:00+08:00',createdAt:'2026-10-12T09:00:00+08:00',logs:[{action:'assign',actor:'AI',at:'2026-10-12T09:00:00+08:00',to:'pending'},{action:'feedback',at:'2026-10-13T09:00:00+08:00',note:'保留历史办理'}],responsibilities:[{id:'history-role',actionId:'history-action',assignee:'陈嘉',department:'产品中心',action:'核实定价与库存去化安排',status:'working',feedback:'已联系工厂',completedAt:''}]};
 await page.evaluate(({key,task})=>{const all=JSON.parse(localStorage.getItem(key));all[task.id]=task;localStorage.setItem(key,JSON.stringify(all))},{key:storageKey,task:history});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#ai [data-gd-part="closure"]').waitFor();
 const saved=(await read())[history.id];assert.equal(saved.status,history.status);assert.equal(saved.description,history.description);assert.deepEqual(saved.responsibilities,history.responsibilities);assert.deepEqual(saved.logs,history.logs);assert.match(saved.originEvidence.sources[0].content,/29\.0w/);
 const root=page.locator('#ai');await root.locator('[data-gd-part="closure"]').click();await root.locator('[data-gd-search]').fill('创维取暖器A944');
 await root.locator('[data-gd-task="'+history.id+'"] [data-gd-action="task-detail"]').click();
 const dialog=page.locator('.up-todo-dialog[open]');await dialog.locator('[data-todo-evidence]').click();
 const evidence=await dialog.locator('.gd-todo-basis').innerText();assert.match(evidence,/AI分析/);assert.match(evidence,/创维取暖器A944AI经营诊断261010/);assert.match(evidence,/29\.0w/);assert.doesNotMatch(evidence,/未记录|未保存独立|原待办保存记录/);
 await dialog.locator('[data-todo-close]').click();const snapshot=JSON.stringify(saved.originEvidence);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#ai [data-gd-part="closure"]').waitFor();assert.equal(JSON.stringify((await read())[history.id].originEvidence),snapshot,'重载不重算历史分析或重复保存来源');
 await verifyLegacyOriginShapes(page,history,read);
}
async function verifyLegacyOriginShapes(page,history,read){
 const legacy={...history,id:'legacy-a944-no-source',source:undefined,end:'',assignedBy:'林悦',description:'全公司 · 亏损金额29.0w',plan:'复核定价、毛利与库存结构，制定销售去化或产品调整方案。',status:'pending',logs:[{action:'assign',actor:'林悦',at:history.assignedAt,to:'pending'}],responsibilities:history.responsibilities.map(role=>({...role,status:'pending',feedback:''}))};
 const variants=[legacy,{...history,id:'global-diagnosis|legacy-origin-test',source:undefined},{...history,id:'legacy-ai-source',source:'old-auto',assignedBy:'AI'},{...history,id:'legacy-origin-placeholder',originEvidence:{sources:[{sourceName:'未记录来源名称',content:history.description}]}}];
 const protectedTask={...legacy,id:'manual-origin-test',source:'manual',plan:'人工输入的事项'};
 const before=await read();await page.evaluate(({key,tasks})=>{const all=JSON.parse(localStorage.getItem(key));for(const task of tasks)all[task.id]=task;localStorage.setItem(key,JSON.stringify(all))},{key:storageKey,tasks:[...variants,protectedTask]});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#ai [data-gd-part="closure"]').waitFor();const after=await read();
 for(const id of Object.keys(before))assert(after[id],'补齐来源不删除其他历史任务');
 for(const task of variants){assert(after[task.id].originEvidence?.sources.length,task.id);assert.equal(after[task.id].description,task.description);assert.equal(after[task.id].plan,task.plan);assert.equal(after[task.id].status,task.status);assert.deepEqual(after[task.id].responsibilities,task.responsibilities);assert.deepEqual(after[task.id].logs,task.logs)}
 assert.equal(after[protectedTask.id].originEvidence,undefined,'人工事项不虚构来源');
 const root=page.locator('#ai');await root.locator('[data-gd-part="closure"]').click();await root.locator('[data-gd-search]').fill('创维取暖器A944');await root.locator('[data-gd-task="'+legacy.id+'"] [data-gd-action="task-detail"]').click();
 const dialog=page.locator('.up-todo-dialog[open]');await dialog.locator('[data-todo-evidence]').click();const sources=await dialog.locator('[data-todo-basis-location]').allTextContents();assert(sources.length);assert.match(sources.join('\n'),/AI分析.*创维取暖器A944AI经营诊断261012.*抓取日期/s);assert.doesNotMatch(await dialog.locator('.gd-todo-basis').innerText(),/未记录|未保存独立|原待办保存记录/);assert.match(await dialog.locator('[data-todo-basis-content]').innerText(),/29\.0w/);
 await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/todo-origin-legacy-a944.png',import.meta.url))});
 await dialog.locator('[data-todo-close]').click();const checkpoint=JSON.stringify(after[legacy.id].originEvidence);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#ai [data-gd-part="closure"]').waitFor();assert.equal(JSON.stringify((await read())[legacy.id].originEvidence),checkpoint,'旧格式来源补齐后重载保持同一快照');
}
