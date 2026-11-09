// 任务字段统一校验；登记日期不使用导入时间。
const gdLedgerChains=[...filterCatalog.chains,'无'];
const gdLedgerDepartments=['采购部','产品链','项目部','产品中心','订单履约部','发货部','风控中心','计划管理部','品质中心','研发中心','用户中心'];
function gdLedgerDepartment(value,strict=true){
 const text=String(value??'').trim(),name=text==='计划部'?'计划管理部':text;
 if(strict&&!gdLedgerDepartments.includes(name))throw Error(name?'所属部门请选择列表中的部门':'所属部门必填');return name;
}
function gdLedgerChain(value,strict=false){
 const text=String(value??'').trim(),known=filterCatalog.normalizeChain(text==='个护/健康'?'个护&健康':text);
 if(known)return known;if(!text||['无','/','—','--'].includes(text))return '无';
 if(strict)throw Error('链群请选择环境、清洁、厨电、个护&健康或无');return '无';
}
function gdLedgerOwners(value,label,required=false){
 if(gdTaskPersonEmpty(value)){if(required)throw Error(label+'必填');return ''}
 try{return gdTaskOwnerNames(value).map(name=>gdLedgerPerson(name,label,true)).join('、')}catch(error){throw Error(label+'：'+error.message)}
}
const gdLedgerStatus={pending:'未开始',working:'跟进中',paused:'已暂停',done:'已完成'};
const gdLedgerColumns=[['registrationDate','登记日期'],['priority','优先级'],['requestor','提需人'],['ledgerTaskType','任务类型'],['title','任务'],['deliverable','目标/交付物'],['latestProgress','最新进展'],['status','状态'],['primaryOwner','责任人'],['secondaryOwner','第二负责人'],['department','所属部门'],['gdCategory','链群'],['due','计划完成日期'],['completedAt','实际完成日期']];
function gdLedgerPerson(value,label,required=false){
 const name=String(value||'').trim();if(!name){if(required)throw Error(label+'必填');return ''}
 const matches=gdTaskPeople().filter(person=>person.name===name);if(matches.length!==1)throw Error(label+(matches.length?'匹配到重名人员，请核对钉钉人员身份':'不在钉钉组织架构中'));return name;
}
function gdLedgerDate(value,label,required=false){
 if(!String(value??'').trim()){if(required)throw Error(label+'必填');return ''}
 const date=uiImportDate(String(value).replaceAll('-','/'),label);if(!uiPeriodValidDate(date))throw Error(label+'请填写有效日期（YYYY/MM/DD）');return date;
}
function gdLedgerFields(values){
 const v=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,String(v??'').trim()]));
 v.registrationDate=gdLedgerDate(v.registrationDate,'登记日期',true);
 v.due=gdLedgerDate(v.due,'计划完成日期',true);v.completedAt=gdLedgerDate(v.completedAt,'实际完成日期');
 if(!v.title||v.title.length>120)throw Error('任务必填，最多120字');
 for(const key of ['deliverable','latestProgress'])if(v[key]?.length>3000)throw Error(gdLedgerColumns.find(([k])=>k===key)[1]+'最多3000字');
 for(const key of ['ledgerTaskType','department','gdCategory'])if(v[key]?.length>120)throw Error(gdLedgerColumns.find(([k])=>k===key)[1]+'最多120字');
 for(const [key,label,required]of [['requestor','提需人',false],['primaryOwner','责任人',true],['secondaryOwner','第二负责人',false]])v[key]=gdLedgerOwners(v[key],label,required);
 v.department=gdLedgerDepartment(v.department);
 v.gdCategory=gdLedgerChain(v.gdCategory,true);
 if(!Object.hasOwn(upTodoPriorities,v.priority))throw Error('优先级请选择一般、重要或紧急');
 if(!Object.hasOwn(gdLedgerStatus,v.status))throw Error('状态请选择未开始、跟进中、已暂停或已完成');
 if(v.due<v.registrationDate)throw Error('计划完成日期不能早于登记日期');
 if(v.status==='done'&&!v.completedAt)throw Error('已完成任务须填写实际完成日期');
 if(v.status!=='done'&&v.completedAt)throw Error('未完成任务不填写实际完成日期');
 if(v.completedAt&&(v.completedAt<v.registrationDate||v.completedAt>aiToday()))throw Error('实际完成日期须在登记日期至今天之间');
 return v;
}
// 一次保存一条任务；多人仅表示共同负责，不生成分人状态或执行事项。
function gdLedgerPrepare(values,origin={}){
 const input=gdLedgerFields(values),now=new Date().toISOString(),id='manual|'+crypto.randomUUID();
 return {...input,id,source:'manual',gdManualEntry:true,gdLedger:true,gdSingleTask:true,spuId:'GLOBAL|'+id,platform:'all',taskType:'other',description:input.deliverable,plan:input.title,assignee:gdTaskOwnerNames(input.primaryOwner)[0],createdAt:now,assignedAt:input.registrationDate,updatedAt:now,assignedBy:origin.sample?'':upTodoCurrentUser,logs:origin.sample?[]:[{at:now,actor:upTodoCurrentUser,action:origin.file?'import':'create',...(origin.file?{note:origin.file}:{})}],basis:[],businessObjects:[],importFile:origin.file||''};
}
// 旧分工完整归档，原任务身份、状态、时间和台账字段保持原值。
function gdLedgerAsSingle(task){
 if(!task.gdLedger)return task;
 const cleaned={...task,department:gdLedgerDepartment(task.department,false),requestor:gdTaskPersonNames(task.requestor).join('、'),secondaryOwner:gdTaskPersonNames(task.secondaryOwner).join('、')};
 if(task.gdSingleTask)return cleaned;
 const {responsibilities,ledgerPaused,...single}=task;
 return {...single,...cleaned,responsibilities:undefined,ledgerPaused:undefined,gdSingleTask:true,...(responsibilities?.length?{gdLegacyExecutions:[...(task.gdLegacyExecutions||[]),...responsibilities]}:{})};
}
function gdLedgerRow(task){return {id:task.id,task,kind:'task',title:task.title,problem:task.deliverable,owner:task.primaryOwner,department:task.department,categories:[gdLedgerChain(task.gdCategory)],businessObjects:[],participants:task.responsibilities||[],date:task.registrationDate}}
function gdLedgerValues(field){return [...new Set(Object.values(upTodos).filter(t=>t.gdLedger&&!t.deletedAt).map(t=>String(t[field]||'').trim()).filter(Boolean))]}
function gdLedgerFingerprint(month){return JSON.stringify(Object.values(upTodos).filter(t=>t.gdManualEntry&&!t.deletedAt&&String(t.registrationDate||upTodoDate(t.assignedAt)).slice(0,7)===month).map(t=>[t.id,t.updatedAt,t.status,t.responsibilities]).sort((a,b)=>a[0].localeCompare(b[0])))}
function gdLedgerCoverage(entries){return [...new Set(entries.map(t=>t.registrationDate.slice(0,7)))].sort().map(month=>({month,oldCount:Object.values(upTodos).filter(t=>t.gdManualEntry&&!t.deletedAt&&String(t.registrationDate||upTodoDate(t.assignedAt)).slice(0,7)===month).length,newCount:entries.filter(t=>t.registrationDate.startsWith(month)).length,fingerprint:gdLedgerFingerprint(month)}))}
function gdReplaceLedgerMonths(batch){
 if(!batch.entries.length)throw Error('没有可导入的任务');
 if(batch.coverage.some(c=>c.fingerprint!==gdLedgerFingerprint(c.month)))throw Error('台账已变化，请重新上传核对覆盖范围');
 const months=new Set(batch.coverage.map(c=>c.month)),next={...upTodos};
 for(const task of Object.values(next))if(task.gdManualEntry&&months.has(String(task.registrationDate||upTodoDate(task.assignedAt)).slice(0,7)))delete next[task.id];
 for(const task of batch.entries)next[task.id]=task;
 upPersistTodos(next);
}

function gdLedgerMatches(task,filter,ignore=''){
 const match=(field,value)=>ignore===field||pfIncludes(filter[field],value);
 // 人员检索取当前表格的三个字段，不检索已归档的旧执行人员。
 const text=[task.ledgerTaskType,task.title,task.deliverable,task.latestProgress,task.requestor,task.primaryOwner,task.secondaryOwner].join(' ').toLocaleLowerCase();
 return match('status',task.status)&&match('priority',upTodoPriorityKey(task.priority))&&match('category',gdLedgerChain(task.gdCategory))&&match('department',task.department)&&(!filter.query||text.includes(filter.query.trim().toLocaleLowerCase()));
}
