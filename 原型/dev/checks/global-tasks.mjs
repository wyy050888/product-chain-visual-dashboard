import {closeTaskEntry} from './global-task-close.mjs';
import {verifyTaskDrawer} from './global-task-drawer.mjs';
import {verifyTaskAssigneePicker} from './global-task-assignee.mjs';
import {verifyTaskImportTemplate} from './task-import-template.mjs';
import {verifyTaskObjectPicker} from './global-task-entry.mjs';
import {verifyDiagnosisCatalogModel} from './diagnosis-catalog.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function globalTasks(page){
 verifyDiagnosisCatalogModel();
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),manual=async()=>(await audit()).tasks.filter(row=>row.task.gdManualEntry),dialog=()=>page.locator('.gd-task-entry-dialog');
 await root.locator('[data-gd-part="tasks"]').click();
 assert.deepEqual(await root.locator('#aigrid h3').allTextContents(),['重点工作清单','工作偏差预警','日周报诊断','任务清单']);
 await verifyTaskDrawer(page);
 const objects=await verifyTaskObjectPicker(page);await verifyTaskAssigneePicker(page);
 const initial=await audit();assert(initial.tasks.length>0);assert.equal(initial.counts.at(-1).count,initial.tasks.length);
 for(const status of ['pending','working','done','all']){
  await root.locator('[data-gd-status="'+status+'"]').click();assert.equal(await root.locator('[data-gd-status="'+status+'"]').getAttribute('aria-selected'),'true');
  assert((await audit()).visible.every(row=>status==='all'||row.task.status===status));
 }
 await root.locator('[data-gd-status="pending"]').focus();await page.keyboard.press('ArrowRight');assert.equal((await audit()).state.filters['tasks/all'].status,'working');await root.locator('[data-gd-status="all"]').click();
 await root.locator('[data-gd-task-create]').click();await dialog().locator('[name=title]').fill('取消录入');await closeTaskEntry(page);assert.equal((await manual()).length,0);
 const fill=async title=>{
  const d=dialog();await d.locator('[name=title]').fill(title);await d.locator('[name=description]').fill('核对样机交付记录\n确认验证窗口');await d.locator('[name=plan]').fill('确认样机交付并反馈安排');await d.locator('[data-gd-assignee-query]').fill('林');await d.locator('[data-gd-assignee-name="林悦"]').click();await d.locator('[name=due]').fill('2026-11-03');
 };
 await root.locator('[data-gd-task-create]').click();await fill('新增任务回归');await dialog().locator('[name=objectType]').selectOption('product');await dialog().locator('[name=objectReference]').click();const code=await dialog().locator('[data-gd-object-code]').first().getAttribute('data-gd-object-code');await dialog().locator('[name=objectReference]').fill(code);await dialog().locator('[role=option]').first().click();
 await dialog().locator('[name=due]').fill('2026-10-25');await dialog().locator('[data-gd-entry-save]').click();assert.equal((await manual()).length,0,'过期新任务不写入');await dialog().locator('[name=due]').fill('2026-11-03');await dialog().locator('[data-gd-entry-save]').click();await dialog().waitFor({state:'detached'});
 let rows=await manual();assert.equal(rows.length,1);const created=rows[0].task;assert.equal(created.status,'pending');assert.equal(created.businessObjects[0].type,'product');assert.equal(created.assignee,'林悦');assert.equal(created.assignedBy,'林悦');assert(['环境','清洁','厨电','个护&健康'].includes(created.gdCategory),'产品保存自动带出链群');assert.equal(created.businessObjects[0].category,created.gdCategory);
 await root.locator('[data-gd-search]').fill('新增任务回归');assert.equal(await root.locator('[data-gd-task]').count(),1);await root.locator('[data-gd-action="task-detail"]').click();
 const details=page.locator('.up-todo-dialog');assert.match(await details.innerText(),/林悦/);await details.locator('[data-todo-evidence]').click();assert.equal(await details.locator('[data-source-type-key="manual-task"]').count(),1,'手工来源不标AI分析');await details.locator('[data-todo-execution-field] [data-todo-field-edit="status"]').first().click();await details.locator('.editing select').selectOption('working');
 await page.waitForFunction(id=>globalDiagnosisAudit().tasks.find(row=>row.task.id===id)?.task.status==='working',created.id);await details.locator('[data-todo-close]').first().click();
 await root.locator('[data-gd-search]').fill('');await root.locator('[data-gd-status="working"]').click();assert((await audit()).visible.some(row=>row.task.id===created.id));await root.locator('[data-gd-status="all"]').click();
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});await root.locator('[data-gd-part="tasks"]').click();rows=await manual();assert.equal(rows.length,1);assert.equal(rows[0].task.status,'working','刷新保留状态变更');
 await root.locator('[data-gd-task-import]').click();const download=page.waitForEvent('download');await dialog().locator('[data-gd-task-template]').click();await verifyTaskImportTemplate(page,dialog,await download);
 const headers=['业务对象类型','业务对象','事项名称','优先级','问题描述','执行事项','负责人','计划完成日期','链群'];
 const row=(title,owner='林悦',date='2026-11-04')=>['','',title,'P1','核对来源数据\n确认实际进度','汇总验证结果',owner,date,'环境'];
 const file=async (records,columns=headers)=>{
  const text='\ufeff'+[columns,...records].map(values=>values.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
  await dialog().locator('[data-gd-task-file]').setInputFiles({name:'任务回归.csv',mimeType:'text/csv',buffer:Buffer.from(text)});await dialog().locator('[data-gd-task-import-preview]').getByText(/校验通过|处错误/).first().waitFor();
 };
 const newHeaders=['业务对象类型','业务对象（名称/SPU码/型号/店铺ID）','事项名称','优先级','问题描述','执行事项','负责人','计划完成日期','链群（店铺留空）'];
 const shopImport=['店铺',objects.shop.id,'店铺导入校验','P2','核对店铺数据','确认处理安排','林悦','2026-11-04','环境'];
 await file([shopImport],newHeaders);assert(await dialog().locator('[data-gd-task-confirm]').isDisabled());assert.match(await dialog().innerText(),/店铺任务不填写链群/);
 shopImport[8]='';await file([shopImport],newHeaders);assert(!(await dialog().locator('[data-gd-task-confirm]').isDisabled()),'新模板支持店铺且无需链群');
 if(objects.product.model){await file([['产品',objects.product.model,'型号导入校验','P2','核对产品数据','确认处理安排','林悦','2026-11-04','']],newHeaders);assert(!(await dialog().locator('[data-gd-task-confirm]').isDisabled()),'导入支持唯一产品型号')}
 await file([row('批次有效行'),row('批次错误行','系统外姓名')]);assert(await dialog().locator('[data-gd-task-confirm]').isDisabled());assert.equal((await manual()).length,1,'有错误时整批不落库');assert.match(await dialog().locator('[data-gd-task-import-preview]').innerText(),/第|3/);await closeTaskEntry(page);
 await root.locator('[data-gd-task-import]').click();await file([row('文件内重复'),row('文件内重复')]);assert(await dialog().locator('[data-gd-task-confirm]').isDisabled());assert.match(await dialog().innerText(),/重复/);await closeTaskEntry(page);
 await root.locator('[data-gd-task-import]').click();await file([row('CSV导入甲'),row('CSV导入乙')]);assert(!(await dialog().locator('[data-gd-task-confirm]').isDisabled()));await dialog().locator('[data-gd-task-confirm]').click();await dialog().waitFor({state:'detached'});assert.equal((await manual()).length,3);assert((await manual()).filter(row=>row.task.title.startsWith('CSV')).every(row=>row.task.status==='pending'&&row.task.description.includes('\n')));
 await root.locator('[data-gd-task-import]').click();await file([row('CSV导入甲')]);assert(await dialog().locator('[data-gd-task-confirm]').isDisabled());assert.match(await dialog().innerText(),/已有任务/);await closeTaskEntry(page);
 for(const [name,valid]of [['global-tasks-formula.xlsx',false],['global-tasks-import.xlsx',true]]){
  await root.locator('[data-gd-task-import]').click();await dialog().locator('[data-gd-task-file]').setInputFiles(fileURLToPath(new URL('../fixtures/'+name,import.meta.url)));await dialog().locator('[data-gd-task-import-preview]').getByText(/校验通过|处错误/).first().waitFor();assert.equal(await dialog().locator('[data-gd-task-confirm]').isDisabled(),!valid);
  if(valid){await dialog().locator('[data-gd-task-confirm]').click();await dialog().waitFor({state:'detached'})}else{assert.match(await dialog().innerText(),/公式/);await closeTaskEntry(page);}
 }
 assert.equal((await manual()).length,4,'Excel、CSV均导入同一任务库');
 const storageBefore=await page.evaluate(()=>localStorage.getItem('dashboard.global-manual-tasks.v1'));
 await root.locator('[data-gd-task-create]').click();await fill('存储失败任务');await page.evaluate(()=>{window.gdTestStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dashboard.global-manual-tasks.v1')throw Error('quota');return window.gdTestStorageSet.call(this,key,value)}});await dialog().locator('[data-gd-entry-save]').click();assert.match(await dialog().locator('[data-gd-entry-error]').innerText(),/本地保存失败/);assert.equal((await manual()).length,4);await page.evaluate(()=>{Storage.prototype.setItem=window.gdTestStorageSet;delete window.gdTestStorageSet});assert.equal(await page.evaluate(()=>localStorage.getItem('dashboard.global-manual-tasks.v1')),storageBefore);await closeTaskEntry(page);
 await root.locator('[data-gd-search]').fill('CSV导入乙');const deleting=(await manual()).find(row=>row.task.title==='CSV导入乙').task.id;await root.locator('[data-gd-action="task-detail"]').click();await page.locator('.up-todo-dialog [data-todo-delete]').click();await page.locator('.up-todo-dialog-delete [data-todo-action="delete"]').click();await page.locator('.up-todo-dialog').waitFor({state:'detached'});assert(!(await manual()).some(row=>row.task.id===deleting));
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});await root.locator('[data-gd-part="tasks"]').click();assert.equal((await manual()).length,3,'刷新不恢复已删除任务');
 await root.locator('[data-gd-task-create]').click();await fill('店铺链群回归');await dialog().locator('[name=objectType]').selectOption('shop');await dialog().locator('[name=objectReference]').fill(objects.shop.id);await dialog().locator('[role=option]').first().click();await dialog().locator('[data-gd-entry-save]').click();await dialog().waitFor({state:'detached'});
 const shopTask=(await manual()).find(row=>row.task.title==='店铺链群回归').task;assert.equal(shopTask.businessObjects[0].type,'shop');assert.equal(shopTask.gdCategory,'');assert.equal(shopTask.businessObjects[0].category,'','店铺保存不带链群');
 await root.locator('[data-gd-task-create]').click();await fill('项目链群回归');await dialog().locator('[name=objectType]').selectOption('project');await dialog().locator('[name=objectReference]').click();await dialog().locator('[data-gd-object-id="'+objects.project.id+'"]').click();const projectCategory=await dialog().locator('[name=category]').inputValue();await dialog().locator('[data-gd-entry-save]').click();await dialog().waitFor({state:'detached'});
 const projectTask=(await manual()).find(row=>row.task.title==='项目链群回归').task;assert(projectCategory);assert.equal(projectTask.gdCategory,projectCategory);assert.equal(projectTask.businessObjects[0].category,projectCategory,'项目保存自动带出链群');
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:1080});assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'任务区自身不外溢 '+width);await root.locator('[data-gd-task-create]').click();assert(await dialog().evaluate(e=>e.scrollWidth<=e.clientWidth+1),'新增表单不外溢 '+width);await closeTaskEntry(page);
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('a[href="#ai"]').click();await root.screenshot({path:'outputs/global-tasks-1920.png'});
 console.log('通过：任务清单恢复、状态联动、手工新增/取消、CSV及Excel导入、整批失败不写入、重复/公式校验、本地恢复/删除、保存失败回滚、宽窄屏。');
}
