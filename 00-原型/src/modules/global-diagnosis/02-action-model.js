// 业务适配只提供执行内容和已有分工；实际办理仍使用共用待办。
const gdObjectTypes=diagnosisObjectTypes;
function gdActionRecipe(row){
 const role=(assignee,department,action)=>({id:department,assignee,department,action,status:'pending',feedback:'',completedAt:''});
 let problem=row.problem||'',participants;
 const key=gdTaskKey(row);
 if(row.decisionParticipants?.length){
  participants=row.decisionParticipants.map(person=>({...role(person.assignee,person.department,person.action),completionCriteria:person.completionCriteria}));
 }else if(key.startsWith('project-delivery|')){
  problem='样机什么时候交、什么时候检测还没商量好，需要采购和品质一起确认。';
  participants=[role('沈舟','项目部','确认样机交付、检测排期及责任人。'),role('唐琪','采购部','确认物料齐套日期，反馈缺料及到货计划。'),role('刘畅','品质中心','确认检测排期、验收标准及结论日期。')];
 }else if(key.startsWith('product-margin|')){
  problem='这款产品利润低，还没确定是重新谈价格，还是调整产品结构。';
  participants=[role('唐琪','采购部','提交适用型号报价、采购条件、生效日期及单台降本测算。'),role('王磊','研发中心','提交结构优化方案、验证周期、成本变化及交付影响。'),role('周铭','产品中心','比较议价与结构优化方案，明确改善路径及后续计划。')];
 }else if(key.startsWith('supplier-admission|')){
  problem='供应商资料和样品检测时间还没确认，能用的供应商数量也不够。';
  participants=[role('唐琪','采购部','提交供方资料、样品和报价，补齐缺失项。'),role('刘畅','品质中心','确认样品检测排期、准入标准及评审结论。')];
 }else if(row.id==='resource-s-core'){
  problem='既要保证当前产品不断货，也要准备下一代产品，需要安排好人员和时间。';
  participants=[role('林悦','产品中心','明确迭代优先级、版本及排期。'),role('唐琪','采购部','核对供货缺口与产能，制定保供计划。'),role('王磊','研发中心','明确验证项目、人员需求及排期。')];
 }else if(row.kind==='report'){
  problem=row.missing?'系统没找到这份该交的日志，需要确认是没交，还是没同步过来。':row.incomplete?'日志没写清接下来做什么，需要补上负责人和完成时间。':'这份日志交晚了，需要确认原因和有没有耽误工作。';
  participants=[role(row.owner,row.department,row.missing?'核实日志提交状态，补齐缺失日志及链接。':row.incomplete?'补齐日志行动计划、责任人、完成日期及链接。':'核实晚交原因及影响，反馈补交结果。')];
 }else if(row.kind==='focus'){
  const actions={'focus-direction':'核实样机验收进展，补充记录及评审安排。','focus-risk-response':'复核产品风险，提交整改验证结果及记录。','focus-interruption':'核实准入进展，补充缺失资料及评审排期。'};
  problem={'focus-direction':'样机验收已经分好工，但这段时间的记录里没看到相关工作，需要确认实际做了没有。','focus-risk-response':'产品质量问题还在，但这段时间没看到负责人重新检查的记录，需要确认有没有跟进。','focus-interruption':'供应商还没完成准入，后续记录里没看到继续跟进的情况，需要确认进展。'}[row.issueType]||problem;
  participants=[role(row.owner,row.department,actions[row.issueType]||row.action)];
 }else participants=[role(row.owner||'',row.department||'',row.action||row.task?.plan||row.plan||row.title)];
 return {problem,participants,problemType:['focus','report','decision','task'].includes(row.kind)?'待确认':'风险',suggestedDue:row.due>=aiToday()?row.due:''};
}
function gdBusinessObjects(row,task=row.task||row){
 // 日志内容中的产品/项目只作背景，日志本身始终归属原提交人。
 if(row.kind==='report')return [{type:'report',id:row.id+'|'+row.date,name:(row.logOwner||row.owner)+' · '+row.type+' · '+row.date}];
 const supplied=task.businessObjects||row.businessObjects;
 if(supplied?.length)return supplied.filter(o=>o?.name).map(o=>({...o,type:diagnosisObjectType(o.type)})).filter((o,i,a)=>a.findIndex(x=>x.type===o.type&&x.id===o.id&&x.name===o.name)===i);
 const product=upSpus.get(row.spuId||task.spuId);
 if(product)return [{type:'product',id:product.spuId,name:product.name}];
 if(row.projectId!=null||task.gdProjectId!=null)return [{type:'project',id:String(row.projectId??task.gdProjectId),name:row.objectName||task.objectName}];
 if(row.shopId||task.gdShopId)return [{type:'shop',id:String(row.shopId||task.gdShopId),name:row.objectName||task.objectName}];
 return [{type:'',id:row.source||task.gdSource||task.id,name:row.objectName||task.objectName||'未关联'}];
}
function gdNormalizeReportTask(task,row){
 if(row.kind!=='report')return task;
 const businessObjects=gdBusinessObjects(row),objectName=businessObjects[0].name,spuId='GLOBAL|'+gdTaskKey(row);
 if(task.spuId===spuId&&task.objectName===objectName&&JSON.stringify(task.businessObjects)===JSON.stringify(businessObjects))return task;
 return {...task,spuId,objectName,businessObjects};
}
function gdPrepareProposal(task,row){
 if(upTodos[task.id])return task;
 const recipe=gdActionRecipe(row);
 // 项目卡点只读展示原负责人，名单随来源任务传递，不受固定演示目录限制。
 const sourcePeople=row.kind==='key-work'&&row.keyType==='project'?recipe.participants.filter(r=>r.assignee).map(r=>({name:r.assignee,department:r.department})):null;
 const proposal=sourcePeople?{...task,assignees:sourcePeople}:task;
 const participants=recipe.participants.map(r=>({...r,assignee:upTodoAssignable(proposal).some(p=>p.name===r.assignee)?r.assignee:''}));
 return {...proposal,gdIssue:row.id,gdSource:row.source,gdProjectId:row.projectId,gdCategory:row.category,gdWorkKey:row.workKey,gdEventKey:row.eventKey,gdRiskIdentity:row.riskIdentity,gdRiskId:row.riskId,
  assignee:participants.find(r=>r.assignee)?.assignee||'',department:participants.find(r=>r.assignee)?.department||task.department,businessObjects:gdBusinessObjects(row,task),
  plan:participants.map(r=>r.assignee+'：'+r.action).join('\n'),description:recipe.problem,gdProblem:recipe.problem,gdImpact:gdActionImpact(row),gdProblemType:recipe.problemType,gdSuggestedDue:recipe.suggestedDue,
  originEvidence:gdTaskOriginEvidence(row,task),responsibilities:participants.map(role=>({...role,completionCriteria:gdCompletionCriteria(row,role)}))};
}
function gdTaskProblem(task){
 if(task.gdProblem)return task.gdProblem;
 const text=upTodoDescriptionText(task)||task.description||task.title;
 return text.replace(/^事实依据[:：]\s*/,'').split(/\n\s*\n(?:判断理由|统计期间)[:：]/)[0].trim();
}
function gdPresentAction(row,origins=[]){
 const origin=row.kind==='task'?origins.find(r=>gdProposal(r).id===row.task.id)||row:row,task=row.task||gdProposal(origin),recipe=gdActionRecipe(origin);
 const draft=task.status==='suggested'?upTodoDrafts.get(task.id):null,editable={...task,...draft};
 const participants=(upTodoCollaborative(editable)?editable.responsibilities:[upTodoLegacyResponsibility(editable)]).map(role=>({...role,completionCriteria:role.completionCriteria||task.completionCriteria||(origin!==row||row.kind!=='task'?gdCompletionCriteria(origin,role):'—')}));
 return {...row,task,executionTask:editable,participants,businessObjects:gdBusinessObjects(origin,task),causalProblem:gdCausalProblem(origin,task),
  problem:task.gdProblem||(row.kind==='task'&&origin===row?gdTaskProblem(task):recipe.problem),impact:task.gdImpact??gdActionImpact(origin),
  problemType:task.gdProblemType||recipe.problemType,owner:upTodoOwnerText(editable),department:editable.department||row.department,
  action:editable.plan,due:task.due||editable.gdSuggestedDue||'',suggestedDue:editable.gdSuggestedDue||'',status:upTodoStatuses[task.status]};
}
