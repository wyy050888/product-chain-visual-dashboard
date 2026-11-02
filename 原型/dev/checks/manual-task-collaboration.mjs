import assert from 'node:assert/strict';
import {setTodoRoleStatus,fillTodoRoleFeedback} from './todo-inline-helpers.mjs';
import {verifyTaskImportTemplate} from './task-import-template.mjs';

export async function manualTaskCollaboration(page){
 await page.clock.setFixedTime(new Date('2026-10-27T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const root=page.locator('#ai'),entry=page.locator('.gd-task-entry-dialog'),detail=page.locator('.up-todo-dialog-detail');
 const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')||'[]'));
 const record=async()=> (await records()).find(t=>t.title==='多人协同回归');
 await root.locator('[data-gd-part="tasks"]').click();await root.locator('[data-gd-task-create]').click();
 for(const [name,text]of Object.entries({title:'多人协同回归',description:'核验交付记录',plan:'确认样机交付',due:'2026-11-04'}))await entry.locator('[name='+name+']').fill(text);
 for(const name of ['林悦','唐琪']){await entry.locator('[data-gd-assignee-query]').fill(name);await entry.locator('[data-gd-assignee-name="'+name+'"]').click()}
 assert(await entry.locator('.gd-task-execution-columns>span').nth(1).locator('.gd-task-required').isVisible());
 await entry.screenshot({path:'outputs/task-create-multiple-1920.png'});
 await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});
 let task=await record();const id=task.id;assert.equal((await records()).length,1);assert.deepEqual(task.responsibilities.map(r=>r.assignee),['林悦','唐琪']);assert.equal(new Set(task.responsibilities.map(r=>r.actionId)).size,1);
 assert.deepEqual(task.responsibilities.map(r=>r.department),['产品中心','采购部']);
 await root.locator('[data-gd-search]').fill('多人协同回归');await root.locator('[data-gd-action="task-detail"]').click();
 assert.match(await detail.locator('h3').innerText(),/多人协同回归/);assert.doesNotMatch(await detail.locator('h3').innerText(),/未关联/);
 assert.equal((await detail.locator('.gd-task-object-current').innerText()).match(/未关联/g)?.length,1,'未关联只显示一次');
 assert.equal(await detail.locator('[data-execution-group]').count(),1);assert.match(await detail.locator('[data-people-label]').innerText(),/林悦[\s\S]*唐琪/);
 await setTodoRoleStatus(detail.locator('[data-execution-group]').first(),'working');
 await fillTodoRoleFeedback(detail.locator('[data-execution-group]').first(),'已核对，待确认交付');
 const responsibilities=(await record()).responsibilities,origin=(await record()).originEvidence;
 const edit=()=>detail.locator('.gd-task-object-editor'),open=()=>detail.locator('[data-gd-object-edit]').click();
 const select=async type=>{await edit().locator('[name=objectType]').selectOption(type);await edit().locator('[name=objectReference]').click();const option=edit().locator('[role=option]').first(),data=await option.evaluate(el=>({id:el.dataset.gdObjectId,name:el.querySelector('b').textContent}));await option.click();return data};
 await open();await select('product');
 for(const width of [1920,390]){await page.setViewportSize({width,height:1080});assert(await edit().evaluate(node=>node.scrollWidth<=node.clientWidth+1),'关联编辑无横溢 '+width);await detail.screenshot({path:'outputs/task-object-edit-'+width+'.png'})}
 await page.setViewportSize({width:1920,height:1080});await edit().locator('[data-gd-object-cancel]').click();assert.deepEqual((await record()).businessObjects,[],'取消不保存关联');
 await open();await edit().locator('[name=objectType]').selectOption('product');await edit().locator('[name=objectReference]').click();await page.keyboard.press('Escape');assert(await edit().isVisible());assert(await edit().locator('[role=listbox]').isHidden());await page.keyboard.press('Escape');assert.equal(await edit().count(),0);assert(await detail.isVisible());
 for(const type of ['product','project','shop']){
  await open();const selected=await select(type),category=await edit().locator('[name=category]').inputValue();
  if(type==='shop')assert(await edit().locator('[data-gd-task-chain]').isHidden());else assert(await edit().locator('[name=category]').isDisabled());
  await edit().locator('[data-gd-object-save]').click();assert.equal(await edit().count(),0);task=await record();assert.equal(task.id,id);assert.equal(task.businessObjects[0].type,type);assert.equal(task.businessObjects[0].id,selected.id);assert.equal(task.gdCategory,type==='shop'?'':category);assert.match(await detail.locator('.gd-task-object-current').innerText(),new RegExp(selected.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.deepEqual(task.responsibilities,responsibilities);assert.deepEqual(task.originEvidence,origin);assert.equal(task.status,'working');
  if(type==='shop'){assert.equal(task.gdProjectId,undefined);assert(task.spuId.startsWith('GLOBAL|manual|'))}
 }
 await open();await select('product');const before=await record();
 await page.evaluate(()=>{window.taskStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dashboard.global-manual-tasks.v1')throw Error('quota');return window.taskStorageSet.call(this,k,v)}});
 await edit().locator('[data-gd-object-save]').click();assert.match(await edit().locator('[role=alert]').innerText(),/本地保存失败/);assert.deepEqual(await record(),before,'修改保存失败不污染记录');
 await page.evaluate(()=>{Storage.prototype.setItem=window.taskStorageSet;delete window.taskStorageSet});await edit().locator('[data-gd-object-cancel]').click();
 await open();await edit().locator('[name=objectType]').selectOption('');await edit().locator('[name=category]').selectOption('清洁');await edit().locator('[data-gd-object-save]').click();task=await record();assert.deepEqual(task.businessObjects,[]);assert.equal(task.objectName,'未关联');assert.equal(task.gdCategory,'清洁');
 await detail.locator('[data-todo-close]').first().click();
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});await root.locator('[data-gd-part="tasks"]').click();task=await record();assert.equal(task.gdCategory,'清洁');assert.deepEqual(task.responsibilities,responsibilities);
 const headers=['业务对象类型','业务对象','事项名称','优先级','问题描述','执行事项','负责人','计划完成日期','链群'];
 const row=(title,owner)=>['','',title,'P2','导入核验','确认安排',owner,'2026-11-04','环境'];
 const upload=async rows=>{const csv=[headers,...rows].map(r=>r.map(v=>'"'+v+'"').join(',')).join('\r\n');await entry.locator('[data-gd-task-file]').setInputFiles({name:'多人任务.csv',mimeType:'text/csv',buffer:Buffer.from('\ufeff'+csv)});await entry.locator('[data-gd-task-import-preview]').getByText(/校验通过|处错误/).first().waitFor()};
 await root.locator('[data-gd-task-import]').click();await upload([row('多人CSV','林悦、唐琪'),row('错误CSV','林悦、陌生人')]);assert(await entry.locator('[data-gd-task-confirm]').isDisabled());assert.equal((await records()).length,1);
 await upload([row('多人CSV','林悦、唐琪、林悦')]);assert.match(await entry.locator('[data-gd-task-import-preview]').innerText(),/林悦、唐琪/);await entry.locator('[data-gd-task-confirm]').click();await entry.waitFor({state:'detached'});
 assert.equal((await records()).length,2);assert.equal((await records()).find(t=>t.title==='多人CSV').responsibilities.length,2);
 await root.locator('[data-gd-task-import]').click();await upload([row('多人CSV','唐琪;林悦')]);assert(await entry.locator('[data-gd-task-confirm]').isDisabled());assert.match(await entry.innerText(),/重复/);
 const download=page.waitForEvent('download');await entry.locator('[data-gd-task-template]').click();await verifyTaskImportTemplate(page,()=>entry,await download);await entry.locator('[data-gd-task-confirm]').click();await entry.waitFor({state:'detached'});
 assert.equal((await records()).length,3);assert.equal((await records()).find(t=>t.title==='说明模板回归').responsibilities.length,2,'Excel多人导入保存到共用执行结构');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});await root.locator('[data-gd-part="tasks"]').click();assert.equal((await records()).length,3);
 console.log('通过：新增/CSV/Excel多人下发、详情产品/项目/店铺/未关联修改、链群同步、执行记录保留、取消/Escape、存储失败回滚、刷新恢复。');
}
