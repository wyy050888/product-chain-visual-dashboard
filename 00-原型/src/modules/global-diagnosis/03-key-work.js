// 项目卡点排除已有执行单；新增高危只按风险榜出现记录判断。
const gdKeyWorkStandards=[
 ['项目卡点','• 项目进行中，项目、所属阶段和任务均为红灯。\n• 该任务既未关联项目风险台账，也未关联执行单。\n• 按当前有效灯色判断；项目或阶段修正后，不因任务延期红灯重复提醒。'],
 ['新增高危','• 当前满足上方风险预警条件。\n• 同一榜单、产品/SKU或店铺、平台合并去重。\n• 以上方风险榜最近出现日为第1天，第2～15天不重复，第16天起重判；持续入榜不重复。']
];
function gdHasExecution(row,tasks=Object.values(upTodos)){
 if(row.executionOrderId||(row.executionOrders||[]).length)return true;
 return tasks.some(task=>{
  if(task.status==='suggested')return false;
  // 按稳定风险身份识别已有执行单；是否排除由各清单规则决定。
  if(row.keyType==='high-risk'&&task.status!=='done'&&!task.deletedAt){
   const event=task.gdEventKey||'';
   if(row.riskIdentity&&(task.gdRiskIdentity===row.riskIdentity||event.startsWith('risk-alert|'+row.riskIdentity+'|')))return true;
   if(row.riskAlertId&&event.startsWith('risk-alert|'+row.riskAlertId+'|'))return true;
  }
  if(task.gdWorkKey&&task.gdWorkKey===row.workKey||task.gdEventKey&&task.gdEventKey===row.eventKey)return true;
  if(row.projectTaskId!=null&&String(task.gdProjectId)===String(row.projectId)&&String(task.gdProjectTaskId)===String(row.projectTaskId))return true;
  if(task.id===row.workTaskId)return true;
  if(row.riskId!=null&&String(task.gdProjectId)===String(row.projectId)&&task.gdRiskId===row.riskId)return true;
  // 旧版项目整单已覆盖交付卡点；已有任务不再按台账拆出重复建议。
  return row.keyType==='project'&&row.projectTaskId==null&&String(task.gdProjectId)===String(row.projectId)&&task.gdSource==='projects'
   &&['work-core-delivery','work-core-mold','work-core-certification','coordinate-project','meeting-delivery'].includes(task.gdIssue);
 });
}
function gdKeySource(id,object,date,content){
 const source={id,objectKey:object.key,objectName:object.name,date,capturedDate:DATA_CUTOFF,
  source:'项目风险台账&执行单\n'+object.name+'\n'+date,content};
 return {...source,...diagnosisNormalizeSource(source)};
}
function gdBuildKeyWork(context,sample,origins,range){
 const highRisks=gdNewRiskKeyWork(context,range);
 const candidates=[...highRisks,...gdProjectKeyWork(context)],seen=new Set();
 return candidates.filter(row=>{
  if((row.keyType==='project'?(DATA_CUTOFF<range.start||DATA_CUTOFF>range.end):(row.date<range.start||row.date>range.end))||seen.has(row.workKey)||(row.keyType==='project'&&gdHasExecution(row)))return false;
  seen.add(row.workKey);return true;
 }).map(row=>{
  const adapted={...row,workTaskId:row.workTaskId||'global-diagnosis|'+row.workKey},proposal=gdProposal(adapted);
  const {priority:unusedPriority,...proposalFields}=proposal;
  const task={...proposalFields,due:row.due>=aiToday()?row.due:''};
  if(task.responsibilities?.length===1&&!task.responsibilities[0].assignee){task.plan=task.responsibilities[0].action;delete task.responsibilities}
  return {...gdPresentAction({...adapted,task}),due:row.due};
 });
}

// 两类重点工作按诊断日期排序；不再使用优先级展示、筛选或排序。
function gdKeyWorkSorted(rows,filter=gdTableFilters()){
 const direction=filter.sortDirection==='desc'?-1:1;
 return [...rows].sort((a,b)=>{
  if(filter.sort==='listedAt')return gdFollowDate(a,'firstAt').localeCompare(gdFollowDate(b,'firstAt'))*direction||a.id.localeCompare(b.id);
  if(filter.sort==='due')return String(a.due||'').localeCompare(String(b.due||''))*direction||a.id.localeCompare(b.id);
  return gdFollowDate(b,'firstAt').localeCompare(gdFollowDate(a,'firstAt'))||(Number(b.projectDelay)||0)-(Number(a.projectDelay)||0)||a.id.localeCompare(b.id);
 });
}
