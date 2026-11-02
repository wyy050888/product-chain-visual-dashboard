// 手工任务与现有任务共库；仅本入口新增/导入的记录独立持久化，不恢复旧演示缓存。
const gdManualStorageKey='dashboard.global-manual-tasks.v1';
let gdManualLoaded=false;
function gdEnsureManualTasks(){
 if(gdManualLoaded)return;gdManualLoaded=true;
 try{
  const saved=JSON.parse(localStorage.getItem(gdManualStorageKey)||'[]');if(!Array.isArray(saved)||saved.length>1000)return;
  const records=saved.filter(task=>task?.gdManualEntry===true&&task.source==='manual'&&String(task.id).startsWith('manual|')&&['pending','working','done'].includes(task.status)&&typeof task.title==='string'&&typeof task.description==='string'&&Array.isArray(task.logs));
  if(records.length)upPersistTodos({...upTodos,...Object.fromEntries(records.map(task=>[task.id,upNormalizeTodo(task)]))});
 }catch(_){toast('手工任务本地记录读取失败，请检查浏览器存储')}
}
function gdManualSnapshot(tasks){return Object.values(tasks).filter(task=>task.gdManualEntry===true)}
function gdStoreManualTasks(tasks){
 const records=gdManualSnapshot(tasks);if(records.length>1000)throw Error('本地手工任务最多保存1000条');
 try{localStorage.setItem(gdManualStorageKey,JSON.stringify(records))}catch(_){throw Error('本地保存失败，请检查浏览器存储空间；更改未保存')}
}
document.addEventListener('product-todos-updated',()=>{
 if(!gdManualLoaded||!Object.values(upTodos).some(task=>task.gdManualEntry))return;
 try{gdStoreManualTasks(upTodos)}catch(error){toast(error.message)}
});
// 导入产品按SPU码、店铺按ID、项目按完整名称匹配；不靠任务标题推断关联。
function gdTaskObjectCatalog(){
 return [...[...upSpus].map(([id,p])=>({type:'product',id:String(id),spuId:id,name:p.name,category:pfCategory(p),code:p.spuCode||id,model:p.model})),
  ...sampleProjectSource.map(p=>({type:'project',id:String(p.id),projectId:p.id,name:p.name,category:pfCategory(p),code:'',projectType:ppProjectType(p.type)})),
  ...brShopRows().map(p=>({type:'shop',id:String(p.shopId||p.id),name:p.name||p.shopName,category:'',code:String(p.shopId||p.id),platform:p.channel}))
 ].map(object=>({...object,category:pfCategories.includes(object.category)?object.category:'',aliases:[object.id,String(object.code),object.name,object.model].filter(value=>value&&!['—','undef','undefined'].includes(value))}));
}
function gdTaskObjectKey(value){return String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'')}
function gdTaskResolveObject(type,reference,catalog,importMode=false){
 if((!type||type==='未关联')&&!reference)return null;
 const key=diagnosisObjectType(type);if(!['product','project','shop'].includes(key))throw Error('业务对象类型请选择产品、项目、店铺；未关联时两列留空');
 const importField=key==='product'?'code':key==='project'?'name':'id';
 const matches=catalog.filter(object=>object.type===key&&(importMode?String(object[importField])===String(reference):object.aliases.some(alias=>gdTaskObjectKey(alias)===gdTaskObjectKey(reference))));
 if(matches.length!==1)throw Error(importMode?matches.length?'业务对象匹配多条，请核对产品SPU码、店铺ID或完整项目名称':'未找到业务对象，请填写有效的产品SPU码、店铺ID或完整项目名称':matches.length?'业务对象匹配多条，请填写SPU码或ID':'未找到业务对象，请核对名称、编码或型号');
 return matches[0];
}
function gdTaskAssociation(object,category,scopeId){
 return {spuId:object?.spuId||'GLOBAL|manual|'+scopeId,objectName:object?.name||'未关联',
  businessObjects:object?[{type:object.type,id:object.id,name:object.name,category,...(object.spuId?{spuId:object.spuId}:{})}]:[],
  gdSource:object?.type==='project'?'projects':object?.type==='product'?'matrix':'manual',gdProjectId:object?.projectId,gdCategory:category};
}
function gdManualTaskSignature(task){return JSON.stringify([task.businessObjects?.map(object=>[object.type,object.id])||[],task.title,task.description,gdTaskExecutionSignature(task)])}
function gdPrepareManualTask(values,catalog,origin={}){
 const executions=values.executions?gdTaskExecutionRows(values.executions):null;
 if(executions)values={...values,plan:executions.map(row=>row.action).join('\n'),assignee:executions[0].assignees,due:executions.map(row=>row.due).sort().at(-1)};
 const input=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,String(value??'').trim()]));
 for(const [key,label,max]of [['title','事项名称',120],['description','问题描述',3000],...(!executions?[['plan','执行事项',3000]]:[])])if(!input[key]||input[key].length>max)throw Error(label+'必填，最多'+max+'字');
 if(origin.file)input.due=uiImportDate(input.due,'计划完成日期');
 if(!uiPeriodValidDate(input.due))throw Error('计划完成日期请填写有效的YYYY-MM-DD日期');
 const owners=gdTaskOwnerNames(values.assignee);input.assignee=owners[0];
 const object=gdTaskResolveObject(input.objectType,input.objectReference,catalog,!!origin.file);
 if(object?.type==='shop'&&input.category)throw Error('店铺任务不填写链群');
 const category=object?.type==='shop'?'':input.category||object?.category||'';
 if(category&&!pfCategories.includes(category))throw Error('链群请选择环境、清洁、厨电或个护&健康');
 if(input.category&&object?.category&&input.category!==object.category)throw Error('链群与业务对象主数据不一致');
 const priority=input.priority||'P2';if(!Object.hasOwn(upTodoPriorities,priority))throw Error('优先级只能填写P0、P1、P2或P3');
 const now=new Date().toISOString(),id=crypto.randomUUID(),sourceName=origin.file?'任务导入 · '+origin.file+' · 第'+origin.row+'行':'手工新增任务';
 const base={id:'new-global|'+id,...gdTaskAssociation(object,category,id),
  platform:'all',start:DATA_CUTOFF,end:DATA_CUTOFF,source:'manual',gdManualEntry:true,
  taskType:'other',status:'pending',logs:[{at:now,actor:upTodoCurrentUser,action:origin.file?'import':'create',note:sourceName}],basis:[],
  originEvidence:{version:1,mode:'records',analysisKind:'record',analysis:input.description,sources:[{sourceTypeKey:origin.file?'task-import':'manual-task',sourceType:origin.file?'任务导入':'手工录入',sourceName,date:DATA_CUTOFF,capturedAt:now,content:input.description+'\n执行事项：'+input.plan}]}};
 const task=upBuildTodo(base,'create',{...input,priority,taskType:'other'});return executions?gdTaskInitialExecutions(task,executions):gdTaskInitialOwners(task,owners);
}
function gdCommitManualTasks(entries){
 if(!entries.length)throw Error('没有可导入的任务');
 const next={...upTodos},seen=new Set(Object.values(next).filter(task=>task.gdManualEntry&&!task.deletedAt).map(gdManualTaskSignature));
 for(const task of entries){const key=gdManualTaskSignature(task);if(seen.has(key))throw Error('存在重复任务：'+task.title);seen.add(key);next[task.id]=task}
 gdStoreManualTasks(next);upPersistTodos(next);
}
function gdTaskManagementMarkup(){return '<div class="gd-task-management"><button type="button" class="btn primary" data-gd-task-create>新增任务</button><button type="button" class="btn" data-gd-task-import>导入任务</button></div>'}
function gdRevealManualTasks(){
 gdState.part='tasks';gdState.taskDueRange={start:'',end:''};gdState.filters[gdFilterKey('tasks','all')]=gdFilterDefaults('tasks');gdState.pages['tasks|all']=1;
 const range=gdRange();if(DATA_CUTOFF<range.start||DATA_CUTOFF>range.end)gdApplyPeriod(drawerPeriodFromRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF}));else gdRender();
}
