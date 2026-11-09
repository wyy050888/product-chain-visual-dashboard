import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {verifyTodoDialogLayout} from './todo-dialog-layout.mjs';
import {fillTodoRoleFeedback,setTodoRoleStatus} from './todo-inline-helpers.mjs';
import {verifyTodoBasis} from './todo-basis.mjs';

function verifyTaskIdentity(){
 const sandbox={upTodoPriorityKey:value=>value,DATA_CUTOFF:'2026-10-10',upTodos:{},gdPrepareProposal:task=>task,shiftDate:(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}};
 vm.createContext(sandbox);
 // 与页面一致加载公共负责人逻辑，独立身份检查不复制协同待办实现。
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/07-todo-collaboration-model.js',import.meta.url),'utf8'),sandbox);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/03-tasks.js',import.meta.url),'utf8'),sandbox);
 const row={id:'focus-direction-project',kind:'focus',source:'projects',projectId:0,objectName:'项目A',title:'核实工作重点',owner:'周铭',department:'产品中心',date:'2026-10-08',problem:'重点待核实',action:'按现有待办跟进'};
 const legacy={id:'global-diagnosis|'+row.id,spuId:'GLOBAL|'+row.id,gdProjectId:0,gdSource:'projects',objectName:'项目A',status:'done'};
 sandbox.upTodos[legacy.id]=legacy;
 assert.equal(sandbox.gdProposal(row),legacy,'同一对象兼容旧编号及完成状态，项目0同样有效');
 const other={...row,projectId:1,objectName:'项目B'},proposal=sandbox.gdProposal(other);
 assert.notEqual(proposal.id,legacy.id);assert.equal(proposal.status,'suggested');assert.equal(proposal.objectName,'项目B');
 sandbox.upTodos[proposal.id]={...proposal,status:'done'};
 assert.equal(sandbox.gdProposal({...other,date:'2026-10-09'}).status,'done','原问题再次读取不会重开已完成任务');
 const report={...row,id:'legacy-report',kind:'report',spuId:'SPU-A',projectId:undefined,type:'日报'},reportTask={id:'global-diagnosis|legacy-report',gdSource:report.source,spuId:'GLOBAL|report',objectName:'周铭 · 日报 · '+report.date,businessObjects:[{type:'report',id:report.id+'|'+report.date,name:'周铭 · 日报 · '+report.date}],status:'done'};
 sandbox.upTodos[reportTask.id]=reportTask;assert.equal(sandbox.gdProposal(report),reportTask,'旧编号日志纠正产品关联后仍复用原待办');assert.notEqual(sandbox.gdProposal({...report,date:'2026-10-09'}).id,reportTask.id,'不同日期日志不混用旧待办');
 legacy.deletedAt='2026-10-19T08:00:00Z';assert.equal(sandbox.gdProposal(row).deletedAt,legacy.deletedAt,'旧编号的删除标记同样保留');
 const product={...row,id:'focus-risk-product',source:'risk',projectId:undefined,spuId:'SPU-A',objectName:'产品A'};
 const saved={...legacy,id:'global-diagnosis|'+product.id,spuId:'SPU-A',gdProjectId:undefined,gdSource:'risk',deletedAt:undefined};sandbox.upTodos[saved.id]=saved;
 assert.equal(sandbox.gdProposal(product),saved);assert.equal(sandbox.gdProposal({...product,spuId:'SPU-B',objectName:'产品B'}).status,'suggested');
 assert.equal(sandbox.gdTaskKey({...row,id:'coordinate-project'}),sandbox.gdTaskKey({...row,id:'resource-test'}),'同一协同事项仍复用原待办');
 // 产品身份和来源独立；任务类型、新老品、无效来源均不能证明来自风险模块。
 sandbox.upSpus=new Map([['SPU-A',{spuId:'SPU-A',name:'产品A',cohort:'old'}],['SPU-B',{spuId:'SPU-B',name:'产品B',cohort:'new'}]]);
 sandbox.upTodoStatuses={pending:'待处理'};sandbox.upProduct=p=>p;sandbox.pfCategory=()=> '清洁类';sandbox.aiToday=()=> '2026-10-10';
 const sources=[{id:'risk',name:'全局高危预警',rows:[]},{id:'projects',name:'项目进度',rows:[{id:0,name:'项目0'}]}];
 for(const input of [{spuId:'SPU-A'},{spuId:'SPU-B'},{spuId:'SPU-A',taskType:'cost-reduction'},{spuId:'SPU-A',gdSource:'invalid'}]){
  const adapted=sandbox.gdTaskRow({...input,status:'pending'},sources);assert.equal(adapted.source,'');assert.equal(adapted.sourceName,'待确认');assert.equal(adapted.objectName,sandbox.upSpus.get(input.spuId).name);
 }
 const confirmed=sandbox.gdTaskRow({spuId:'SPU-A',gdSource:'risk',status:'pending'},sources);assert.equal(confirmed.sourceName,'全局高危预警');
 assert.equal(sandbox.gdTaskRow({gdProjectId:0,gdSource:'projects',status:'pending'},sources).objectName,'项目0');
 const unknown=sandbox.gdTaskRow({status:'pending'},sources);assert.equal(unknown.objectName,'未关联');assert.equal(unknown.sourceName,'待确认');assert.equal(unknown.category,'—');
 const legacyRow=sandbox.gdTaskRow({source:'global-legacy',gdSource:'projects',objectName:'旧事项标题',status:'pending'},sources);assert.equal(legacyRow.objectName,'未关联');assert.equal(legacyRow.sourceName,'待确认');
 assert.equal(sandbox.gdTaskRow({source:'global-legacy',gdSource:'projects',gdProjectId:0,status:'pending'},sources).objectName,'项目0','旧任务如有明确项目编号仍保留关联');

}


function verifyTaskLookup(){
 const origin={id:'issue',kind:'block',task:{id:'task'}},data={reports:[],focus:[],coordination:[origin],resource:[],tasks:[],meetings:[]};let builds=0;
 const box={drawerProfile:()=>{},gdRenderedData:data,gdDataset:()=>{builds++;return data},gdProposal:r=>r.task};vm.createContext(box);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/05-evidence.js',import.meta.url),'utf8'),box);
 assert.equal(box.gdFind('issue'),origin);assert.equal(box.gdEvidenceOrigin({kind:'task',task:{id:'task',gdIssue:'issue'}}),origin);assert.equal(builds,0,'列表及待办依据查找复用当前快照，不重算九模块');
 box.gdRenderedData={...data,coordination:[{...origin,title:'已刷新'}]};assert.equal(box.gdFind('issue').title,'已刷新','使用最新一次列表快照');
 assert.equal(box.gdFind('issue',data),origin,'显式数据仍优先');box.gdRenderedData=null;assert.equal(box.gdFind('issue'),origin);assert.equal(builds,1,'尚未渲染时保留数据回退');
}

export async function globalDiagnosisTodoSync(page){
 await verifyTodoBasis(page);
 verifyTaskIdentity();verifyTaskLookup();const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),store=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')));
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="all"]').click();await root.locator('[data-gd-status="all"]').click();let d=await audit();const row=d.coordination.find(r=>r.id==='coordinate-project'),id=row.task.id;
 // 样例增加后任务可能随改期排到下一页；用业务对象限定当前验收记录。
 await root.locator('[data-gd-search]').fill(row.objectName);
 assert.equal(id,d.resource.find(r=>r.id==='resource-test').task.id);
 const progress=role=>({selectOption:async status=>{await root.locator('[data-gd-row="coordinate-project"] [data-gd-action="task-detail"]').first().click();const detail=page.locator('.up-todo-dialog[open]');await setTodoRoleStatus(detail.locator('[data-responsibility-row="'+role.id+'"]'),status);await detail.locator('[data-todo-close]').click()}});
 // 打开原待办，在公共办理界面反馈、改期；两个诊断入口必须同步同一任务。
 const taskCount=Object.keys(await store()).length;
 const opening=await page.evaluate(()=>new Promise(resolve=>{const start=performance.now();document.querySelector('[data-gd-row="coordinate-project"] [data-gd-action="task-detail"]').click();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)))}));
 assert(opening<700,'查看待办不能进入秒级阻塞：'+Math.round(opening)+'ms');console.log('查看待办至绘制：'+Math.round(opening)+'ms');
 const dialog=page.locator('.up-todo-dialog[open]');assert.equal(await dialog.locator('#up-todo-dialog-title').innerText(),'任务详情');
 await fillTodoRoleFeedback(dialog.locator('[data-responsibility-row]').first(),'已确认样机交付清单，品质窗口待复核');
 await dialog.locator('[data-todo-field-edit="due"]').click();await dialog.locator('[data-todo-field="due"] input').fill('2027-02-03');await dialog.locator('[data-todo-field="due"] input').press('Enter');
 await dialog.locator('[data-todo-close]').click();assert.equal(Object.keys(await store()).length,taskCount);
 assert.equal((await store())[id].due,'2027-02-03');assert.equal((await audit()).resource.find(r=>r.id==='resource-test').task.due,'2027-02-03');
 assert((await root.locator('[data-gd-row="coordinate-project"] [data-label="计划完成日期"]').allTextContents()).every(date=>date==='27/02/03'));
 assert.equal((await store())[id].responsibilities[0].feedback,'已确认样机交付清单，品质窗口待复核');
 await progress(row.participants[0]).selectOption('done');assert.equal((await store())[id].status,'working');assert.equal((await store())[id].completedAt,'');
 const actual=()=>root.locator('[data-gd-row="coordinate-project"] [data-label="实际完成日期"]');
 assert.equal(await actual().innerText(),'—','部分负责人完成不代表整条任务完成');
 for(const role of row.participants.slice(1))await progress(role).selectOption('done');assert.equal((await store())[id].status,'done');assert((await store())[id].completedAt);assert.notEqual(await actual().innerText(),'—');
 d=await audit();assert.equal(d.resource.find(r=>r.id==='resource-test').task.status,'done');assert.equal(d.tasks.filter(t=>t.id===id).length,1);assert.equal(d.coordination.find(r=>r.id===row.id).problem,row.problem,'完成任务不擅自消除原风险');
 await progress(row.participants[1]).selectOption('working');assert.equal(await actual().innerText(),'—','重新处理即清空该责任人完成日期');assert.equal((await store())[id].status,'working');assert.equal((await store())[id].completedAt,'');
 await page.reload();await root.locator('[data-gd-part="resource"]').click();
 assert.equal((await audit()).resource.find(r=>r.id==='resource-test').participants[0].feedback,'已确认样机交付清单，品质窗口待复核','已完成执行人的反馈仍保存在共享待办');
 assert.equal(await root.locator('[data-gd-row="resource-test"]').count(),1,'还有未完成负责人时默认继续展示任务');
 await root.locator('[data-gd-status="all"]').click();assert((await root.locator('[data-gd-row="resource-test"]').innerText()).includes('已确认样机交付清单'));


 // 无既有节点的日志核对自动派发，AI给出节点；不需要操作下发。
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="reports"]').click();d=await audit();const report=d.reports.find(r=>r.missing&&r.task.gdDueSource==='ai-suggested'),count=Object.keys(await store()).length;
 assert(report);assert.equal(report.task.assignedBy,'AI');assert.equal(report.task.due,report.task.gdSuggestedDue);assert(report.task.due>=(await audit()).range.end);assert.equal(await root.locator('[data-gd-dispatch]').count(),0);assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),true);
 await root.locator('[data-gd-part="closure"]').click();await root.locator('[data-gd-search]').fill(report.participants[0].action);assert((await audit()).visible.some(r=>r.id===report.task.id));await page.locator('#refreshai').click();assert.equal(Object.keys(await store()).length,count);
 // 外部模块删除同一待办后，所有入口及刷新都不再派生同一任务。
 await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('product-risk-todos-v1'));s[id].deletedAt=new Date().toISOString();localStorage.setItem('product-risk-todos-v1',JSON.stringify(s))},id);await page.reload();d=await audit();assert(!d.coordination.some(r=>r.id==='coordinate-project'));assert(!d.resource.some(r=>r.id==='resource-test'));assert(!d.tasks.some(r=>r.id===id));
 const focus=d.focus.find(r=>r.id==='focus-direction-project'),legacyId='global-diagnosis|'+focus.id;
 await page.evaluate(({task,id})=>{const s=JSON.parse(localStorage.getItem('product-risk-todos-v1'));delete s[task.id];s[id]={...task,id,responsibilities:undefined,assignee:'周铭',status:'done',logs:[],completedAt:'2026-10-10T08:00:00Z'};localStorage.setItem('product-risk-todos-v1',JSON.stringify(s))},{task:focus.task,id:legacyId});
 await page.reload();d=await audit();assert.equal(d.focus.find(r=>r.id===focus.id).task.id,legacyId);assert.equal(d.focus.find(r=>r.id===focus.id).task.status,'done');assert(!d.tasks.some(r=>r.id===focus.task.id));
 await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('product-risk-todos-v1'));s[id].deletedAt=new Date().toISOString();localStorage.setItem('product-risk-todos-v1',JSON.stringify(s))},legacyId);await page.reload();assert(!(await audit()).focus.some(r=>r.id===focus.id));
 await verifyTodoDialogLayout(page);
}
