import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function verifyTaskIdentity(){
 const sandbox={DATA_CUTOFF:'2026-10-10',upTodos:{},shiftDate:(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/03-tasks.js',import.meta.url),'utf8'),sandbox);
 const row={id:'focus-direction-project',kind:'focus',source:'projects',projectId:0,objectName:'项目A',title:'核实工作重点',owner:'周铭',department:'产品中心',date:'2026-10-08',problem:'重点待核实',action:'按现有待办跟进'};
 const legacy={id:'global-diagnosis|'+row.id,spuId:'GLOBAL|'+row.id,gdProjectId:0,gdSource:'projects',objectName:'项目A',status:'done'};
 sandbox.upTodos[legacy.id]=legacy;
 assert.equal(sandbox.gdProposal(row),legacy,'同一对象兼容旧编号及完成状态，项目0同样有效');
 const other={...row,projectId:1,objectName:'项目B'},proposal=sandbox.gdProposal(other);
 assert.notEqual(proposal.id,legacy.id);assert.equal(proposal.status,'suggested');assert.equal(proposal.objectName,'项目B');
 sandbox.upTodos[proposal.id]={...proposal,status:'done'};
 assert.equal(sandbox.gdProposal({...other,date:'2026-10-09'}).status,'done','原问题再次读取不会重开已完成任务');
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

export async function globalDiagnosisTodoSync(page){
 verifyTaskIdentity();await page.emulateMedia({reducedMotion:'reduce'});
 const storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),dialog=page.locator('.up-todo-dialog');
 const cardsMatch=()=>page.waitForFunction(()=>{const data=globalDiagnosisAudit();return [...document.querySelectorAll('#aigrid .gd-card-number')].every((node,i)=>parseInt(node.textContent,10)===data.counts[i].count)});
 try{
  const original=await audit(),row=original.coordination.find(r=>r.id==='coordinate-margin'),task=row.task;
  await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-status]').selectOption('pending');
  await page.locator('#matrix [data-kpm-search]').fill(row.objectName);
  const openProduct=async()=>{await page.locator('#matrix [data-kpm-detail="'+task.spuId+'"]').first().click();await page.locator('[data-drawer-tab="handling"]').click();await page.locator('#up-todo-query').fill(task.title)};
  const openTask=mode=>page.locator('[data-todo-open="'+mode+'"][data-todo-id="'+task.id+'"]').click();
  await openProduct();await openTask('detail');await dialog.locator('[data-todo-status-select]').selectOption('done');await dialog.locator('[data-todo-close]').click();await page.locator('#close').click();await cardsMatch();
  let data=await audit();assert.equal(data.coordination.find(r=>r.id===row.id).status,'已完成');assert.equal(data.resource.find(r=>r.id==='resource-engineering').status,'已完成');
  assert.equal(data.state.part,'coordination');assert.equal(data.state.filters.coordination.status,'pending');assert(!data.visible.some(r=>r.id===row.id));assert.equal(await root.locator('[data-gd-id="'+row.id+'"]').count(),0,'外模块完成后自动退出待处理列表，无需刷新');
  assert.equal(data.tasks.filter(r=>r.id===task.id).length,1);assert.equal(data.coordination.find(r=>r.id===row.id).task.evidence,'','完成不要求额外结果或验收');
  // 仍用原待办编辑状态和删除入口，验证删除后的全板块及计数同步。
  await openProduct();await openTask('detail');await dialog.locator('[data-todo-status-select]').selectOption('pending');await dialog.locator('[data-todo-close]').click();
  await openTask('delete');await dialog.locator('[data-todo-action="delete"]').click();await page.locator('#close').click();await cardsMatch();
  const deletedAbsent=async()=>{const d=await audit();assert(!d.coordination.some(r=>r.id===row.id));assert(!d.resource.some(r=>r.id==='resource-engineering'));assert(!d.tasks.some(r=>r.id===task.id));assert.equal(await root.locator('[data-gd-id="'+row.id+'"]').count(),0);assert(await page.evaluate(id=>Boolean(JSON.parse(localStorage.getItem('product-risk-todos-v1'))[id]?.deletedAt),task.id))};
  await deletedAbsent();await page.locator('#refreshai').click();await deletedAbsent();await page.reload();await deletedAbsent();await cardsMatch();
  // 工作聚焦的旧编号完成/删除记录只关联原对象；删除后不复活。
  data=await audit();const focus=data.focus.find(r=>r.id==='focus-direction-project'),legacyId='global-diagnosis|'+focus.id;
  await page.evaluate(({task,id})=>{const saved=JSON.parse(localStorage.getItem('product-risk-todos-v1'));saved[id]={...task,id,status:'done',logs:[],completedAt:'2026-10-10T08:00:00Z'};localStorage.setItem('product-risk-todos-v1',JSON.stringify(saved))},{task:focus.task,id:legacyId});
  await page.reload();data=await audit();assert.equal(data.focus.find(r=>r.id===focus.id).task.id,legacyId);assert.equal(data.focus.find(r=>r.id===focus.id).status,'已完成');assert(!data.tasks.some(r=>r.id===focus.task.id),'兼容旧任务不重复派生新建议');
  await page.evaluate(id=>{const saved=JSON.parse(localStorage.getItem('product-risk-todos-v1'));saved[id].deletedAt='2026-10-19T08:00:00Z';localStorage.setItem('product-risk-todos-v1',JSON.stringify(saved))},legacyId);
  await page.reload();data=await audit();assert(!data.focus.some(r=>r.id===focus.id));assert(!data.tasks.some(r=>r.id===legacyId));await cardsMatch();
  assert.deepEqual(errors,[]);
 }finally{await page.evaluate(saved=>{localStorage.clear();for(const [key,value] of Object.entries(saved))localStorage.setItem(key,value)},storage)}
}