// 产品与降本沿用原待办身份；跨板块的同一协同事项只下发一次。
function gdTaskKey(row){
 if(row.kind==='report')return 'report|'+row.id+'|'+(row.logOwner||row.owner)+'|'+row.date;
 if(['coordinate-project','resource-test','meeting-delivery'].includes(row.id))return 'project-delivery|'+row.projectId;
 if(['coordinate-margin','resource-engineering'].includes(row.id))return 'product-margin|'+row.spuId;
 if(['coordinate-supplier','resource-supplier'].includes(row.id))return 'supplier-admission|'+row.projectId;
 const object=row.spuId?'spu|'+row.spuId:row.projectId!=null?'project|'+row.source+'|'+row.projectId:'object|'+row.source+'|'+row.objectName;
 return row.id+'|'+object;
}
// 旧编号仅在业务对象一致时继续使用，保留完成/删除标记，不迁移或重开任务。
function gdSavedTask(row,id){
 if(upTodos[id])return upTodos[id];
 const old=upTodos['global-diagnosis|'+row.id];
 if(!old||old.gdSource!==row.source)return null;
 const report=old.businessObjects?.find(object=>object.type==='report');
 const matches=row.kind==='report'&&report?report.id===row.id+'|'+row.date:row.spuId?old.spuId===row.spuId:row.projectId!=null?old.gdProjectId!=null&&String(old.gdProjectId)===String(row.projectId):old.objectName===row.objectName;
 return matches?old:null;
}
function gdProposal(row){
 if(row.workTaskId&&upTodos[row.workTaskId])return upTodos[row.workTaskId];
 if(!row.workTaskId&&gdTaskKey(row).startsWith('product-margin|')){const opportunity=ccOpportunityRows().find(r=>r.spuId===row.spuId);if(opportunity)return gdPrepareProposal({...ccOpportunityTask(opportunity),gdIssue:row.id,gdSource:row.source,gdCategory:row.category},row)}
 const id=row.workTaskId||'global-diagnosis|'+gdTaskKey(row),saved=gdSavedTask(row,id);if(saved)return saved;
 const facts=row.focusEvidence?row.focusEvidence.expected+'\n\n抓取工作：\n'+row.focusEvidence.observed+'\n\n业务背景：\n'+row.impact+'\n\n发现的偏差：\n'+row.problem+'\n\n会议来源：'+row.focusEvidence.meeting.file+' · '+row.focusEvidence.meeting.sheet+' · 第'+row.focusEvidence.meeting.row+'行':row.problem+'\n'+(row.impact||'');
 return gdPrepareProposal({id,spuId:row.spuId||'GLOBAL|'+gdTaskKey(row),objectName:row.objectName,platform:'all',start:shiftDate(DATA_CUTOFF,-6),end:DATA_CUTOFF,
  title:row.title,description:'事实依据：\n'+facts+'\n\n判断理由：\n'+row.action+'\n\n统计期间：'+row.date+' — '+DATA_CUTOFF,descriptionVersion:3,plan:row.action,department:row.department,taskType:row.department==='采购部'?'supply-optimization':row.department==='品质中心'?'quality-improvement':row.department==='研发中心'?'development-improvement':'delivery-assurance',
  assignee:'',due:'',status:'suggested',priority:row.kind==='report'?(row.missing?'P2':'P3'):upTodoPriorityKey(row.priority),source:'global-diagnosis',logs:[],basis:[],evidence:'',completedAt:'',assignedBy:'',assignedAt:'',gdIssue:row.id,gdSource:row.source,gdCategory:row.category,gdProjectId:row.projectId},row);
}
function gdMeetings(context){return [
 {id:'meeting-delivery',kind:'meeting',title:'确认重点项目样机交付清单',source:'projects',sourceName:'项目协调会',department:'项目部',owner:'沈舟',objectName:context.project.name,projectId:context.project.id,category:context.project.category,date:shiftDate(DATA_CUTOFF,-2),due:shiftDate(DATA_CUTOFF,2),priority:'red',problem:'会议决议：项目部汇总采购与品质反馈，形成样机交付清单。',action:'确认交付内容、节点及验收岗位，向参与部门反馈。'},
 {id:'meeting-quality',kind:'meeting',title:'回收重点产品整改验证结论',source:'risk',sourceName:'品质专项会',department:'品质中心',owner:'刘畅',objectName:context.product.name,spuId:context.product.spuId,category:context.product.category,date:shiftDate(DATA_CUTOFF,-3),due:shiftDate(DATA_CUTOFF,-1),priority:'yellow',problem:'会议决议：品质提交问题复现与整改验证结论，产品中心复核后续观察安排。',action:'提交验证结论并关联观察指标。'}
 ]}
function gdLegacyTaskOrigin(record){
 const sourceName=String(record.source||'').split(' · ')[0];
 return {version:1,mode:'records',originId:record.id,analysisKind:'record',analysis:record.problem,sources:[{id:record.id,sourceType:sourceName,sourceName:record.subject+' · '+sourceName,date:record.date,capturedDate:DATA_CUTOFF,source:sourceName+'\n'+record.subject+'\n'+record.date,content:record.problem+'\n处理要求：'+record.action}]};
}
function gdEnsureTasks(){
 const next={...upTodos};let changed=false;
 // 历史总诊断任务一次性迁入共用任务库，原存储保留。
 for(const [key,old] of Object.entries(aiTasks)){
  const id='global-legacy|'+key,record=aiRecords.find(r=>r.id===key);if(!record)continue;
  if(next[id]){if(!upTodoHasOrigin(next[id])||next[id].originEvidence.mode==='ai'){next[id]={...next[id],originEvidence:gdLegacyTaskOrigin(record)};changed=true}continue}
  const assignee=aiAssignees.some(([name])=>name===old.assignee)?old.assignee:'林悦';
  next[id]={id,spuId:'GLOBAL|legacy|'+key,objectName:'',title:old.title||record.subject,description:record.problem,plan:old.notes||record.action,department:upTodoPersonDepartment(assignee),assignee,due:old.due||aiToday(),status:'pending',taskType:'other',priority:'yellow',source:'global-legacy',start:record.date,end:DATA_CUTOFF,logs:[],gdSource:'',gdCategory:'',assignedBy:'林悦',assignedAt:old.createdAt||'',createdAt:old.createdAt||'',updatedAt:old.updatedAt||'',originEvidence:gdLegacyTaskOrigin(record)};changed=true;
 }
 if(changed)try{upPersistTodos(next)}catch(_){/* 无法写入样例不阻止查看抓取依据；用户保存由表单显示错误。 */}
}
function gdTaskRow(task,sources){
 // 只使用明确来源；旧迁入记录的固定项目标记和事项标题不作为业务关联。
 const product=upSpus.get(task.spuId),legacy=task.source==='global-legacy',source=legacy&&task.gdSource==='projects'&&task.gdProjectId==null?null:sources.find(s=>s.id===task.gdSource);
 const project=task.gdProjectId==null?null:source?.id==='projects'?source.rows.find(r=>String(r.id)===String(task.gdProjectId)):source?.id==='suppliers'?source.rows.find(r=>String(r.project.id)===String(task.gdProjectId))?.project:null;
 const objectName=product?.name||project?.name||(!legacy?String(task.objectName||'').trim():'')||'未关联',status=upTodoStatuses[task.status];
 return {...task,task,kind:'task',source:source?.id||'',sourceName:source?.name||'待确认',objectName,category:(!legacy&&task.gdCategory)||(product?pfCategory(upProduct(product)):project?.category||'—'),owner:upTodoOwnerText(task)||'未指派',date:task.end||task.assignedAt?.slice(0,10)||DATA_CUTOFF,problem:task.description,status,overdue:task.status!=='suggested'&&task.status!=='done'&&!!task.due&&task.due<aiToday()};
}
function gdDataset(){return gdBuildDiagnosis()}

// 仅处理本次页面内已有的兼容字段，不恢复旧版持久化办理记录。
let gdLegacyRead=false;
function gdAdoptLegacyRecords(rows){
 if(gdLegacyRead)return;gdLegacyRead=true;
 const next={...upTodos};let changed=false;
 try{
  for(const task of Object.values(next))if(task.gdCheck&&!String(task.evidence||'').includes(task.gdCheck)){
   next[task.id]={...task,evidence:[task.evidence,'历史核验记录：'+task.gdCheck].filter(Boolean).join('\n')};changed=true;
  }
  if(changed)upPersistTodos(next);
 }catch(_){gdLegacyRead=false}
}
