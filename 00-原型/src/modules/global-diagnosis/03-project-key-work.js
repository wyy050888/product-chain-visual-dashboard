// 只消费当前有效灯色，不由延期反推阶段或项目红灯。关联核对限定到同一项目内的同一任务。
function gdProjectTaskLinked(project,stage,task,dispatches=[]){
 const same=value=>value!=null&&String(value)===String(task.id);
 if(task.riskId||(task.riskIds||[]).length||task.executionOrderId||(task.executionOrders||[]).length)return true;
 const ledger=project.ledger||[];
 if(ledger.some(risk=>{
  if(same(risk.taskId)||(risk.taskIds||[]).some(same))return true;
  // 兼容旧台账的任务名称关联；有明确ID时不得再用同名任务兜底。
  if(risk.taskId!=null||(risk.taskIds||[]).length)return false;
  const stages=Array.isArray(risk.stage)?risk.stage:risk.stage?[risk.stage]:[];
  return (!stages.length||stages.includes(stage.name))&&(risk.taskNames||[]).includes(task.name);
 }))return true;
 return dispatches.some(order=>{
  if(order.projectId!=null)return String(order.projectId)===String(project.id)&&same(order.taskId??order.targetId);
  const sourceKey=project.reference?project.sourceKey:project.model;
  return sourceKey&&order.sourceKey===sourceKey&&same(order.targetId);
 });
}
function gdProjectTaskGaps(project,stages,dispatches=[]){
 if(project.projectState!=='进行中'||project.status!=='红灯')return [];
 return stages.flatMap((stage,index)=>stage.light!=='红灯'?[]:(stage.tasks||[])
  .filter(task=>task.id!=null&&task.light==='红灯'&&!task.done&&!gdProjectTaskLinked(project,stage,task,dispatches))
  .map(task=>({stage,task,stageId:stage.id??task.si??index})));
}
function gdProjectDispatchRows(){
 return Object.entries(projectDispatches).map(([key,order])=>({...order,sourceKey:key.split('|').at(-2)}));
}
// 项目任务与人员目录是两类来源；已有负责人不能因不在演示人员名单中而丢失。
function gdProjectTaskOwner(project,task){
 const taskOwner=String(task.owner||'').trim(),assignee=taskOwner||String(project.owner||'').trim();
 const rawDepartment=taskOwner?task.dept:project.dept;
 const department=({'产品部':'产品中心','研发部':'研发中心','品质部':'品质中心'})[rawDepartment]||rawDepartment||'';
 return {assignee,department};
}
// 同一项目任务首次被诊断为卡点时记下发现日，刷新不顺延整改期限。
let gdProjectDiscoveryDates;
function gdProjectDiscoveryDate(workKey){
 if(!gdProjectDiscoveryDates){
  try{const saved=JSON.parse(localStorage.getItem('dashboard.project-block-discoveries.v1')||'{}');gdProjectDiscoveryDates=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{}}catch(_){gdProjectDiscoveryDates={}}
 }
 const saved=gdProjectDiscoveryDates[workKey];
 if(typeof saved==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(saved))return saved;
 gdProjectDiscoveryDates[workKey]=DATA_CUTOFF;
 try{localStorage.setItem('dashboard.project-block-discoveries.v1',JSON.stringify(gdProjectDiscoveryDates))}catch(_){/* 无法持久化时保留本次会话的发现日。 */}
 return DATA_CUTOFF;
}
function gdProjectRectificationDue(discoveredAt){return discoveredAt?shiftDate(discoveredAt,3):''}
function gdProjectKeyWork(context){
 const dispatches=gdProjectDispatchRows();
 return withPeriod('projects',()=>context.by('projects').rows.flatMap(project=>{
  if(project.projectState!=='进行中'||project.status!=='红灯')return [];
  const stages=project.stageData||projectControlModel(project).stageData;
  return gdProjectTaskGaps(project,stages,dispatches).map(({stage,task,stageId})=>{
   const workKey=['project-task',project.id,stageId,task.id].join('|');
   const discoveredAt=gdProjectDiscoveryDate(workKey),due=gdProjectRectificationDue(discoveredAt);
   const object={key:'project|'+project.id,type:'project',projectId:project.id,name:project.name,category:project.category};
   const {assignee:person,department}=gdProjectTaskOwner(project,task);
   const taskProblem=task.target&&project.reference&&project.report?project.report:task.problem;
   const state=[task.delay>0?'任务已延期 '+task.delay+' 天':'','尚未登记对应风险台账，也未落实执行单。'].filter(Boolean).join('；');
   const problem=[taskProblem&&taskProblem!=='当前无异常'?taskProblem:'阶段任务尚未完成',state].join('\n');
   const content=['项目：'+project.name,'项目红绿灯：'+project.status,'阶段：'+stage.name,'阶段红绿灯：'+stage.light,'项目任务：'+task.name,'任务红绿灯：'+task.light,'原任务计划完成日期：'+(task.end||'—'),'任务延期：'+(task.delay??'—')+'天','任务负责人：'+person,'负责人部门：'+department,taskProblem,'关联风险台账：未关联','关联执行单：未关联'].filter(Boolean).join('\n');
   const source={id:workKey,objectKey:object.key,objectName:object.name,date:DATA_CUTOFF,capturedDate:DATA_CUTOFF,source:'项目进度\n'+project.name+'\n'+DATA_CUTOFF,content};
   const action='核实「'+task.name+'」的卡点，明确处置方案、责任人与完成日期，关联项目风险台账及执行单。';
   return {id:'key|'+workKey,kind:'key-work',keyType:'project',workKey,projectTaskId:task.id,projectTaskName:task.name,projectStageId:stageId,projectId:project.id,
    object,objectName:object.name,projectDelay:project.delay,source:'projects',sourceName:'项目进度',category:project.category,department,owner:person,
    date:DATA_CUTOFF,discoveredAt,due,light:project.status,projectLight:typeof ppProjectDisplayLight==='function'?ppProjectDisplayLight(project):project.status,title:stage.name+'：'+task.name,problem,summary:action,action,
    problemSource:{sourceId:source.id,quote:taskProblem?.slice(0,48)},sources:[{...source,...diagnosisNormalizeSource(source)}],
    decisionParticipants:[{assignee:person,department,action,completionCriteria:'处置方案明确，已关联风险台账和执行单。'}],
    businessObjects:[{type:'project',id:String(project.id),name:project.name}]};
  });
 }));
}
