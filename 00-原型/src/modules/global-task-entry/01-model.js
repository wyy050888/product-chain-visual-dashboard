// 原台账样例独立迁移一次；保留旧任务及用户录入，已删除的台账不恢复。
const gdManualStorageKey='dashboard.global-manual-tasks.v1';
const gdLedgerSampleStorageKey='dashboard.task-ledger-source-samples.202610.v2';
let gdManualLoaded=false;
function gdEnsureManualTasks(){
 if(gdManualLoaded)return;gdManualLoaded=true;
 try{
  const saved=JSON.parse(localStorage.getItem(gdManualStorageKey)||'[]');if(!Array.isArray(saved)||saved.length>1000)return;
  let records=saved.filter(task=>task?.gdManualEntry===true&&task.source==='manual'&&String(task.id).startsWith('manual|')&&['pending','working','paused','done'].includes(task.status)&&typeof task.title==='string'&&typeof task.description==='string'&&Array.isArray(task.logs));
  // 旧任务没有gdLedger，不能据此跳过新版台账初始化；删除记录仍视为已初始化。
  if(!records.some(task=>task.gdLedger)&&!localStorage.getItem(gdLedgerSampleStorageKey))records.push(...gdLedgerSampleRows.map(([sourceRow,...values])=>{
   const input=Object.fromEntries(gdLedgerColumns.map(([key],index)=>[key,values[index]]));input.gdCategory=gdLedgerChain(input.gdCategory);const task=gdLedgerPrepare(input,{sample:true});
   const id='manual|sample|202610|'+sourceRow;
   return {...task,id,spuId:'GLOBAL|'+id,sampleSource:{file:'【每日跟进】产品链任务清单汇总.xlsx',sheet:'【每日更新】10月日常任务清单',row:sourceRow}};
  }));
  if(records.length)upPersistTodos({...upTodos,...Object.fromEntries(records.map(task=>[task.id,upNormalizeTodo(gdLedgerAsSingle(task))]))});
  localStorage.setItem(gdLedgerSampleStorageKey,'1');
 }catch(_){toast('手工任务本地记录读取失败，请检查浏览器存储')}
}
function gdManualSnapshot(tasks){return Object.values(tasks).filter(task=>task.gdManualEntry===true)}
function gdStoreManualTasks(tasks){
 const records=gdManualSnapshot(tasks);if(records.length>1000)throw Error('本地手工任务最多保存1000条');
 try{localStorage.setItem(gdManualStorageKey,JSON.stringify(records))}catch(_){throw Error('本地保存失败，请检查浏览器存储空间；更改未保存')}
}
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
function gdPrepareManualTask(values,catalog,origin={}){return gdLedgerPrepare(values,origin)}
function gdCommitManualTasks(entries){
 if(!entries.length)throw Error('没有可保存的任务');
 const next={...upTodos};for(const task of entries)next[task.id]=task;
 upPersistTodos(next);
}
function gdTaskManagementMarkup(){return '<div class="gd-task-management"><button type="button" class="btn primary" data-gd-task-create>新增任务</button><button type="button" class="btn" data-gd-task-import>导入任务</button></div>'}
function gdRevealManualTasks(entries=[]){
 gdState.part='tasks';gdState.taskDueRange={start:'',end:''};gdState.filters[gdFilterKey('tasks','all')]={...gdFilterDefaults('tasks'),status:'all'};gdState.pages['tasks|all']=1;
 const range=gdTaskRegistrationRange();if(range.start&&entries.some(task=>task.registrationDate<range.start||task.registrationDate>range.end))gdState.taskPeriod=null;gdRender();
}
