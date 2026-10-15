// 待办以产品与部门协同为单位；诊断覆盖全平台，渠道仅作为问题依据。
const upTodoStorageKey='product-risk-todos-v1',upTodoDrafts=new Map();
const upTodoDepartments=['产品中心','项目部','品质中心','研发中心','采购部'];
// 本地原型固定的当前账号；正式接入时由登录会话提供。
const upTodoCurrentUser='林悦';
const upTodoStatuses={suggested:'待下发',pending:'待处理',working:'处理中',done:'已完成'};
const upTodoPriorities={red:'红灯',yellow:'黄灯',green:'绿灯'};
function upTodoAssignable(task){return task?.assignees||aiAssignees.map(([name])=>({name,department:upTodoPersonDepartment(name)}))}
function upTodoPersonDepartment(name,task){
 if(task?.assignees)return task.assignees.find(person=>person.name===name)?.department||'';
 const role=aiAssignees.find(([n])=>n===name)?.[1]||'';
 return {'研发部':'研发中心','品质部':'品质中心','采购部':'采购部','项目部':'项目部'}[role]||(role?'产品中心':'');
}
function upTodoPersonLabel(name,task){return name?(task?.assignees?.find(person=>person.name===name)?.label||name+' · '+upTodoPersonDepartment(name,task)):'—'}
// 兼容历史任务：待验收回到处理中，保留处理结果；完成日期只取真实完成记录。
function upNormalizeTodo(task){
 const assigned=task.logs.find(l=>l.action==='assign'),completed=[...task.logs].reverse().find(l=>l.to==='done');
 return {...task,status:task.status==='review'?'working':task.status,
  description:task.description||task.basis?.[0]||'',priority:upTodoPriorities[task.priority]?task.priority:'yellow',
  assignedBy:task.assignedBy||assigned?.actor||'',assignedAt:task.assignedAt||assigned?.at||task.createdAt||'',
  completedAt:task.status==='done'?(task.completedAt||completed?.at||''):''};
}
let upTodos={};
try{
 const saved=JSON.parse(localStorage.getItem(upTodoStorageKey)||'{}');
 if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
  upTodos=Object.fromEntries(Object.entries(saved).filter(([key,t])=>t&&t.id===key&&t.spuId&&(upTodoStatuses[t.status]||t.status==='review')&&Array.isArray(t.logs)).map(([key,t])=>[key,upNormalizeTodo(t)]));
  if(JSON.stringify(saved)!==JSON.stringify(upTodos))localStorage.setItem(upTodoStorageKey,JSON.stringify(upTodos));
 }
}catch(_){}
function upTodoId(state,department){return [state.spuId,'all',state.start,state.end,department].join('|')}
function upTodoList(m,state){
 if(state.platform!=='all'){state={...state,platform:'all'};m=upDetailModel(state)}
 const proposals=upDiagnoseTodos(m,state);
 upEnsureTodoSamples(m,state);
 upUpgradeProductTodoDescriptions(state);
 const existing=Object.values(upTodos).filter(t=>t.spuId===state.spuId);
 // 保留已下发的历史记录；旧版渠道任务也可承接同期间部门建议，避免重复下发。
 const scopes=new Set(existing.filter(t=>t.source!=='manual').map(t=>[t.start,t.end,t.suggestionDepartment||t.department].join('|')));
 return [...proposals.filter(t=>!scopes.has([t.start,t.end,t.department].join('|'))),...existing.filter(t=>!t.deletedAt)];
}
// 状态在详情中编辑；完成自动记日期，重新打开清除当前完成日期。
function upNewTodo(m,state){
 return {id:'new|'+state.spuId,spuId:state.spuId,objectName:m.product.name,platform:'all',start:state.start,end:state.end,
  title:'',description:'',plan:'',assignee:'',department:'',due:'',priority:'yellow',
  status:'pending',assignedBy:'',assignedAt:'',completedAt:'',evidence:'',basis:[],logs:[],source:'manual'};
}
function upPersistTodos(next){
 try{localStorage.setItem(upTodoStorageKey,JSON.stringify(next))}catch(_){throw new Error('保存失败，请检查浏览器存储空间')}
 upTodos=next;
}
function upBuildTodo(task,action,values){
 const actor=upTodoCurrentUser;
 if(!['create','edit','assign'].includes(action))throw new Error('不支持此操作');
 if(!aiAssignees.some(([name])=>name===actor))throw new Error('请选择当前操作人');
 if(action==='edit'&&(!upTodos[task.id]||upTodos[task.id].deletedAt))throw new Error('待办已删除，请刷新列表');
 if(action==='assign'&&(task.status!=='suggested'||upTodos[task.id]))throw new Error('该建议已下发，请刷新列表');
 const editable=['title','description','plan','assignee','due','priority',...(action==='edit'?['status']:[])];
 const next={...(action==='edit'?upTodos[task.id]:task),...Object.fromEntries(editable.filter(k=>k in values).map(k=>[k,values[k]]))},now=new Date().toISOString();
 if(!upTodoAssignable(next).some(person=>person.name===next.assignee))throw new Error('请选择负责人');
 if(!next.title.trim()||!next.description.trim())throw new Error('请填写待办事项和问题描述');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(next.due))throw new Error('请选择截止日期');
 if((action!=='edit'||next.due!==task.due)&&next.due<aiToday())throw new Error('截止日期不能早于今天');
 if(!upTodoPriorities[next.priority])throw new Error('请选择优先级');
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
 return next;
}
function upSaveTodo(task,action,values){
 const next=upBuildTodo(task,action,values);upPersistTodos({...upTodos,[next.id]:next});upTodoDrafts.delete(task.id);return next;
}
function upDeleteTodo(task){
 const actor=upTodoCurrentUser;
 if(!aiAssignees.some(([name])=>name===actor))throw new Error('请选择当前操作人');
 const saved=upTodos[task.id];if(!saved||saved.deletedAt)throw new Error('待办已删除，请刷新列表');
 // 删除标记防止历史样例或同一建议在刷新后重新出现。
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
