// 产品与降本沿用原待办身份；跨板块的同一协同事项只下发一次。
function gdTaskKey(row){
 if(['coordinate-project','resource-test'].includes(row.id))return 'project-delivery|'+row.projectId;
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
 const matches=row.spuId?old.spuId===row.spuId:row.projectId!=null?old.gdProjectId!=null&&String(old.gdProjectId)===String(row.projectId):old.objectName===row.objectName;
 return matches?old:null;
}
function gdProposal(row){
 if(gdTaskKey(row).startsWith('product-margin|')){const opportunity=ccOpportunityRows().find(r=>r.spuId===row.spuId);if(opportunity)return {...ccOpportunityTask(opportunity),gdIssue:row.id,gdSource:row.source,gdCategory:row.category}}
 const id='global-diagnosis|'+gdTaskKey(row),saved=gdSavedTask(row,id);if(saved)return saved;
 const facts=row.focusEvidence?row.focusEvidence.expected+'\n\n抓取工作：\n'+row.focusEvidence.observed+'\n\n业务背景：\n'+row.impact+'\n\n发现的偏差：\n'+row.problem+'\n\n会议来源：'+row.focusEvidence.meeting.file+' · '+row.focusEvidence.meeting.sheet+' · 第'+row.focusEvidence.meeting.row+'行':row.problem+'\n'+(row.impact||'');
 return {id,spuId:row.spuId||'GLOBAL|'+gdTaskKey(row),objectName:row.objectName,platform:'all',start:shiftDate(DATA_CUTOFF,-6),end:DATA_CUTOFF,
  title:row.title,description:'事实依据：\n'+facts+'\n\n判断理由：\n'+row.action+'\n\n统计期间：'+row.date+' — '+DATA_CUTOFF,descriptionVersion:3,plan:row.action,department:row.department,taskType:row.department==='采购部'?'supply-optimization':row.department==='品质中心'?'quality-improvement':row.department==='研发中心'?'development-improvement':'delivery-assurance',
  assignee:'',due:'',status:'suggested',priority:row.priority,source:'global-diagnosis',logs:[],basis:[],evidence:'',completedAt:'',assignedBy:'',assignedAt:'',gdIssue:row.id,gdSource:row.source,gdCategory:row.category,gdProjectId:row.projectId};
}
function gdMeetings(context){return [
 {id:'meeting-delivery',kind:'meeting',title:'确认重点项目样机交付清单',source:'projects',sourceName:'项目协调会',department:'项目部',owner:'沈舟',objectName:context.project.name,projectId:context.project.id,category:context.project.category,date:shiftDate(DATA_CUTOFF,-2),due:shiftDate(DATA_CUTOFF,2),priority:'red',problem:'会议决议：项目部汇总采购与品质反馈，形成样机交付清单。',action:'确认交付内容、节点及验收岗位，向参与部门反馈。'},
 {id:'meeting-quality',kind:'meeting',title:'回收重点产品整改验证结论',source:'risk',sourceName:'品质专项会',department:'品质中心',owner:'刘畅',objectName:context.product.name,spuId:context.product.spuId,category:context.product.category,date:shiftDate(DATA_CUTOFF,-3),due:shiftDate(DATA_CUTOFF,-1),priority:'yellow',problem:'会议决议：品质提交问题复现与整改验证结论，产品中心复核后续观察安排。',action:'提交验证结论并关联观察指标。'}
 ]}
function gdEnsureTasks(issues,meetings){
 const rows=[issues.coordination[1],issues.coordination[0],issues.resource[1],meetings[1]],statuses=['pending','working','working','done'],next={...upTodos};let changed=false;
 rows.forEach((row,i)=>{
  const proposal=gdProposal(row);if(upTodos[proposal.id])return;
  const at=shiftDate(DATA_CUTOFF,-4)+'T09:00:00+08:00',done=statuses[i]==='done';
  next[proposal.id]={...proposal,status:statuses[i],assignee:row.owner,department:row.department,due:i===3?row.due:shiftDate(DATA_CUTOFF,i===0?-1:2),assignedBy:'林悦',assignedAt:at,createdAt:at,updatedAt:at,completedAt:done?shiftDate(DATA_CUTOFF,-1)+'T16:00:00+08:00':'',evidence:done?'已完成样品问题复现与验证，形成复测结论；后续退货数据继续观察。':'',logs:[{at,actor:'林悦',action:'assign',from:'suggested',to:statuses[i],note:'会议确认的处理任务'}]};changed=true;
 });
 // 历史总诊断任务一次性迁入共用任务库，原存储保留。
 for(const [key,old] of Object.entries(aiTasks)){
  const id='global-legacy|'+key;if(next[id])continue;const record=aiRecords.find(r=>r.id===key);if(!record)continue;
  const assignee=aiAssignees.some(([name])=>name===old.assignee)?old.assignee:'林悦';
  next[id]={id,spuId:'GLOBAL|legacy|'+key,objectName:'',title:old.title||record.subject,description:record.problem,plan:old.notes||record.action,department:upTodoPersonDepartment(assignee),assignee,due:old.due||aiToday(),status:'pending',taskType:'other',priority:'yellow',source:'global-legacy',start:record.date,end:DATA_CUTOFF,logs:[],gdSource:'',gdCategory:'',assignedBy:'林悦',assignedAt:old.createdAt||'',createdAt:old.createdAt||'',updatedAt:old.updatedAt||''};changed=true;
 }
 if(changed)try{upPersistTodos(next)}catch(_){/* 无法写入样例不阻止查看抓取依据；用户保存由表单显示错误。 */}
}
function gdTaskRow(task,sources){
 // 只使用明确来源；旧迁入记录的固定项目标记和事项标题不作为业务关联。
 const product=upSpus.get(task.spuId),legacy=task.source==='global-legacy',source=legacy&&task.gdSource==='projects'&&task.gdProjectId==null?null:sources.find(s=>s.id===task.gdSource);
 const project=task.gdProjectId==null?null:source?.id==='projects'?source.rows.find(r=>String(r.id)===String(task.gdProjectId)):source?.id==='suppliers'?source.rows.find(r=>String(r.project.id)===String(task.gdProjectId))?.project:null;
 const objectName=product?.name||project?.name||(!legacy?String(task.objectName||'').trim():'')||'未关联',status=upTodoStatuses[task.status];
 return {...task,task,kind:'task',source:source?.id||'',sourceName:source?.name||'待确认',objectName,category:(!legacy&&task.gdCategory)||(product?pfCategory(upProduct(product)):project?.category||'—'),owner:task.assignee||'未指派',date:task.end||task.assignedAt?.slice(0,10)||DATA_CUTOFF,problem:task.description,status,overdue:task.status!=='suggested'&&task.status!=='done'&&!!task.due&&task.due<aiToday()};
}
function gdDataset(){
 const sources=gdBusinessSources(),context=gdBusinessContext(sources),reports=gdReports(context),issues=gdIssues(context),meetings=gdMeetings(context);
 // 先复用产品既有历史样例，再挂接跨模块任务，避免抢占产品首次打开的样例初始化。
 for(const product of [context.product,context.newProduct]){const state={spuId:product.spuId,start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF,platform:'all'};upEnsureTodoSamples(upDetailModel(state),state)}
 gdEnsureTasks(issues,meetings);
 gdAdoptLegacyRecords([...issues.focus,...issues.coordination,...issues.resource,...meetings]);
 const range=gdRange(),inPeriod=row=>row.date<=range.end;
 const proposals=[...issues.focus,...issues.coordination,...issues.resource,...meetings].filter(inPeriod).map(gdProposal);
 // 当前期间展示的事项，其关联待办必须进入闭环列表；统计截止日不能切断已有任务关联。
 const linked=new Set(proposals.filter(t=>!t.deletedAt).map(t=>t.id)),all=new Map(proposals.filter(t=>!t.deletedAt).map(t=>[t.id,t]));
 // 同编号事项已有的明确来源仅用于展示，保存值和待办身份保持不变。
 for(const task of Object.values(upTodos))if(!task.deletedAt)all.set(task.id,{...all.get(task.id),...task});
 const tasks=[...all.values()].filter(t=>!t.deletedAt&&(linked.has(t.id)||(t.end||DATA_CUTOFF)<=range.end&&((t.end||DATA_CUTOFF)>=range.start||t.status!=='done'))).map(t=>gdTaskRow(t,sources));
 const resolved=row=>{const task=gdProposal(row);return {...row,task,status:upTodoStatuses[task.status],owner:task.assignee||row.owner,department:task.assignee?task.department:row.department,due:task.due||row.due}};
 const active=row=>!row.task.deletedAt;
 const data={sources,context,reports,focus:issues.focus.map(row=>{const task=gdProposal(row);return {...row,task,due:task.due||row.due,status:task.status==='suggested'?'待核实':upTodoStatuses[task.status]}}).filter(active),tasks,coordination:issues.coordination.filter(inPeriod).map(resolved).filter(active),resource:issues.resource.filter(inPeriod).map(resolved).filter(active),meetings:meetings.filter(inPeriod).filter(row=>!gdProposal(row).deletedAt)};
 data.focus=data.focus.map(gdWithIssueType);
 return data;
}

// 旧版扩展记录仅做一次兼容读取，不再维护独立方案或核验账本。
let gdLegacyRead=false;
function gdAdoptLegacyRecords(rows){
 if(gdLegacyRead)return;gdLegacyRead=true;
 const next={...upTodos};let changed=false;
 try{
  const old=JSON.parse(localStorage.getItem('global-diagnosis-v2')||'null');
  for(const [id,record] of Object.entries(old?.resolutions||{})){
   const row=rows.find(r=>r.id===id);if(!row||!record.note)continue;
   const proposal=gdProposal(row),task=next[proposal.id];
   const note='历史处理记录：'+record.note+(record.owner?'；责任人：'+record.owner:'')+(record.due?'；日期：'+record.due:'');
   if(task&&!task.deletedAt&&!String(task.plan||'').includes(record.note)){next[task.id]={...task,plan:(task.plan||'')+'\n\n'+note};changed=true}
   else if(!task&&!upTodoDrafts.has(proposal.id))upTodoDrafts.set(proposal.id,{plan:proposal.plan+'\n\n'+note,assignee:record.owner||'',due:record.due||''});
  }
  for(const task of Object.values(next))if(task.gdCheck&&!String(task.evidence||'').includes(task.gdCheck)){
   next[task.id]={...task,evidence:[task.evidence,'历史核验记录：'+task.gdCheck].filter(Boolean).join('\n')};changed=true;
  }
  if(changed)upPersistTodos(next);
 }catch(_){gdLegacyRead=false}
}
