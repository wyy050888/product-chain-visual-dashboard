// 待办以产品与部门协同为单位；诊断覆盖全平台，渠道仅作为问题依据。
const upTodoDrafts=new Map();
const upTodoDepartments=filterCatalog.primaryDepartments;
// 本地原型固定的当前账号；正式接入时由登录会话提供。
const upTodoCurrentUser='林悦';
const upTodoStatuses={suggested:'待下发',pending:'待处理',working:'处理中',done:'已完成'};
// 类型描述业务目的，不随负责人部门或执行状态变化。历史自动任务按规则来源兼容。
const upTodoTypes={'cost-reduction':'降本优化','business-improvement':'经营改善','delivery-assurance':'交付保障','quality-improvement':'品质改善','development-improvement':'研发改进','supply-optimization':'供需优化','compliance-remediation':'合规整改',other:'其他'};
function upTodoType(task){
 if(task?.suggestionKey==='cost-reduction'||String(task?.id||'').startsWith('cost-reduction|'))return 'cost-reduction';
 if(upTodoTypes[task?.taskType])return task.taskType;
 if(task?.source==='manual')return 'other';
 return {'产品中心':'business-improvement','项目部':'delivery-assurance','品质中心':'quality-improvement','研发中心':'development-improvement','采购部':'supply-optimization'}[task?.suggestionDepartment||task?.department]||'other';
}
// 优先级与业务红黄绿、任务状态独立；P0需明确紧急事件依据，不由逾期自动升级。
const upTodoPriorities={P0:'P0 · 紧急',P1:'P1 · 高',P2:'P2 · 中',P3:'P3 · 低'};
const upTodoPriorityRules={
 P0:'经营中断、重大合规或安全事件等紧急事项；立即组织处置与升级协调。',
 P1:'关键交付受阻、重大经营风险或重点项目卡点；优先安排责任人与资源。',
 P2:'一般风险、资源协调及经营改善事项；按计划推进并跟踪节点。',
 P3:'资料补齐、常规核对及非阻断跟进事项；纳入常规工作计划。'
};
const upTodoLegacyPriorities={red:'P1',yellow:'P2',green:'P3'};
function upTodoPriorityKey(value){return Object.hasOwn(upTodoPriorities,value)?value:Object.hasOwn(upTodoLegacyPriorities,value)?upTodoLegacyPriorities[value]:'P2'}
function upTodoPriorityRank(value){return ['P0','P1','P2','P3'].indexOf(upTodoPriorityKey(value))}

function upTodoAssignable(task){return task?.assignees||aiAssignees.map(([name])=>({name,department:upTodoPersonDepartment(name)}))}
function upTodoPersonDepartment(name,task){
 if(task?.assignees)return task.assignees.find(person=>person.name===name)?.department||'';
 const role=aiAssignees.find(([n])=>n===name)?.[1]||'';
 return {'研发部':'研发中心','品质部':'品质中心','采购部':'采购部','项目部':'项目部'}[role]||(role?'产品中心':'');
}
function upTodoPersonLabel(name,task){return name?name+'-'+(upTodoPersonDepartment(name,task)||'未分配部门'):'—'}
// 兼容历史任务：待验收回到处理中，保留处理结果；完成日期只取真实完成记录。
function upNormalizeTodo(task){
 const assigned=task.logs.find(l=>l.action==='assign'),completed=[...task.logs].reverse().find(l=>l.to==='done');
 // 只统一旧自动下发日志的称谓，用户填写的备注不改写。
 const logs=task.logs.map(log=>task.source==='ai-business-followup'&&log.action==='assign'&&log.note==='采纳AI经营建议'?{...log,note:'下发AI经营建议'}:log);
 return upTodoWithOrigin(upTodoAggregate({...task,logs,taskType:upTodoType(task),status:task.status==='review'?'working':task.status,
  description:task.description||task.basis?.[0]||'',priority:upTodoPriorityKey(task.priority),
  assignedBy:task.assignedBy||assigned?.actor||'',assignedAt:task.assignedAt||assigned?.at||task.createdAt||'',
  completedAt:task.status==='done'?(task.completedAt||completed?.at||''):''}));
}
// 演示操作仅保留于当前页面；刷新从样例重建，不读取旧任务缓存。
let upTodos={};
function upTodoId(state,department){return [state.spuId,'all',state.start,state.end,department].join('|')}
function upTodoList(m,state){
 if(state.platform!=='all'){state={...state,platform:'all'};m=upDetailModel(state)}
 const proposals=upDiagnoseTodos(m,state);
 upEnsureTodoSamples(m,state);
 upUpgradeProductTodoDescriptions(state);
 const existing=Object.values(upTodos).filter(t=>t.spuId===state.spuId);
 // 保留已下发的历史记录；旧版渠道任务也可承接同期间部门建议，避免重复下发。
 const scopes=new Set(existing.filter(t=>t.source!=='manual').map(t=>[t.start,t.end,t.suggestionKey||t.suggestionDepartment||t.department].join('|')));
 return [...proposals.filter(t=>!scopes.has([t.start,t.end,t.suggestionKey||t.department].join('|'))),...existing.filter(t=>!t.deletedAt)];
}
// 状态在详情中编辑；完成自动记日期，重新打开清除当前完成日期。
function upNewTodo(m,state){
 return {id:'new|'+state.spuId,spuId:state.spuId,objectName:m.product.name,platform:'all',start:state.start,end:state.end,
  title:'',description:'',plan:'',assignee:'',department:'',due:'',priority:'P2',taskType:'other',
  status:'pending',assignedBy:'',assignedAt:'',completedAt:'',evidence:'',basis:[],logs:[],source:'manual'};
}
function upPersistTodos(next){
 next=Object.fromEntries(Object.entries(next).map(([id,t])=>[id,upTodoWithOrigin(upTodoAggregate({...t,priority:upTodoPriorityKey(t.priority)}))]));
 upTodos=next;document.dispatchEvent(new CustomEvent('product-todos-updated'));
}
function upBuildTodo(task,action,values){
 const actor=upTodoCurrentUser;
 if(!['create','edit','assign'].includes(action))throw new Error('不支持此操作');
 if(!aiAssignees.some(([name])=>name===actor))throw new Error('请选择当前操作人');
 if(action==='edit'&&(!upTodos[task.id]||upTodos[task.id].deletedAt))throw new Error('待办已删除，请刷新列表');
 if(action==='edit'&&'due' in values)throw new Error('请在执行事项中修改计划完成日期');
 if(action==='assign'&&(task.status!=='suggested'||upTodos[task.id]))throw new Error('该建议已下发，请刷新列表');
 const editable=['taskType','title','description','plan','assignee','due','priority',...(action==='edit'?['status']:[])];
 const next={...(action==='edit'?upTodos[task.id]:task),...Object.fromEntries(editable.filter(k=>k in values).map(k=>[k,values[k]]))},now=new Date().toISOString();
 if(!upTodoTypes[next.taskType||upTodoType(task)])throw new Error('请选择任务类型');
 next.taskType=task.source==='manual'?(next.taskType||upTodoType(task)):upTodoType(task);
 if(upTodoCollaborative(task)&&('status' in values||'assignee' in values))throw new Error('请在任务下发区分别更新');
 if(!upTodoCollaborative(next)&&!upTodoAssignable(next).some(person=>person.name===next.assignee))throw new Error('请选择负责人');
 if(!next.title.trim()||!next.description.trim())throw new Error('请填写待办事项和问题描述');
 // AI建议没有既有承诺日期时保留空值；编辑其他字段不强迫补填日期。
 const undatedFollowup=!next.due&&(!!task.gdIssue||action==='edit'&&task.source==='ai-business-followup'&&!task.due);
 if(!undatedFollowup&&!/^\d{4}-\d{2}-\d{2}$/.test(next.due))throw new Error('请选择截止日期');
 if(next.due&&(action!=='edit'||next.due!==task.due)&&next.due<aiToday())throw new Error('截止日期不能早于今天');
 if(!Object.hasOwn(upTodoPriorities,next.priority)&&!Object.hasOwn(upTodoLegacyPriorities,next.priority))throw new Error('请选择优先级');
 next.priority=upTodoPriorityKey(next.priority);
 next.department=upTodoPersonDepartment(next.assignee,next);
 delete next.collaboratingDepartments;
 if(action!=='edit'){
  if(action==='create')next.id='manual|'+crypto.randomUUID();
  if(action==='assign')next.suggestionDepartment=task.department;
  next.status='pending';next.createdAt=now;next.assignedAt=now;next.assignedBy=actor;next.completedAt='';
 }
 if(action==='edit'&&'status' in values){
  if(!['pending','working','done'].includes(next.status)||task.status==='suggested')throw new Error('请选择有效任务状态');
  if(next.status!==task.status){next.completedAt=next.status==='done'?now:'';next.completedBy=next.status==='done'?actor:''}
 }
 if('description' in values)next.descriptionVersion=2;
 next.updatedAt=now;
 return upTodoAggregate(next);
}
function upSaveTodo(task,action,values){
 const next=upBuildTodo(task,action,values);upPersistTodos({...upTodos,[next.id]:next});upTodoDrafts.delete(task.id);return next;
}
function upDeleteTodo(task){
 const actor=upTodoCurrentUser;
 if(!aiAssignees.some(([name])=>name===actor))throw new Error('请选择当前操作人');
 const saved=upTodos[task.id];if(!saved||saved.deletedAt)throw new Error('待办已删除，请刷新列表');
 // 删除标记防止当前页面内同一建议重新出现；刷新后恢复样例。
 upPersistTodos({...upTodos,[task.id]:{...saved,deletedAt:new Date().toISOString(),deletedBy:actor}});
 upTodoDrafts.delete(task.id);
}

function upAssignTodos(items){
 if(!items.length)throw new Error('请选择待下发建议');
 if(new Set(items.map(item=>item.task.id)).size!==items.length)throw new Error('不能重复下发同一建议');
 const next={...upTodos};
 for(const {task,values} of items){const prepared=upBuildTodo(task,'assign',values);next[prepared.id]=prepared}
 upPersistTodos(next);for(const {task} of items)upTodoDrafts.delete(task.id);
}
