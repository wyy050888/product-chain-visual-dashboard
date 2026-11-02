// responsibilities保存责任项；assignee只为旧入口保留兼容值，整单状态始终由责任项汇总。
function upTodoCollaborative(task){return Array.isArray(task?.responsibilities)&&task.responsibilities.length>0}
function upTodoOwnerNames(task){return upTodoCollaborative(task)?[...new Set(task.responsibilities.map(r=>r.assignee).filter(Boolean))]:task.assignee?[task.assignee]:[]}
function upTodoOwnerText(task){const names=upTodoOwnerNames(task),missing=task.responsibilities?.filter(r=>!r.assignee).length||0;return (names.join('、')||'待分配')+(missing&&names.length?' · '+missing+'项待分配':'')}
function upTodoDepartmentsFor(task){return upTodoCollaborative(task)?[...new Set(task.responsibilities.map(r=>r.department))]:[task.department]}
// 整单计划日期取左侧可见执行事项的最晚有效日期，包含已完成事项。
function upTodoPlannedDate(task){
 const dates=upTodoCollaborative(task)?upTodoResponsibilityGroups(task.responsibilities).map(g=>g.rows[0].due??task.due??''):[task.due||''];
 return dates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d).sort().at(-1)||'';
}
function upTodoAggregate(task){
 if(!upTodoCollaborative(task)||task.deletedAt)return task;
 let responsibilities=task.responsibilities.map(r=>({...r,status:['pending','working','done'].includes(r.status)?r.status:'pending',completedAt:r.status==='done'?r.completedAt||'':''}));
 const due=upTodoPlannedDate({...task,responsibilities});
 // 仅在整单日期将变化时固化旧继承值，保持原事项日期及无关历史记录。
 if(due!==(task.due||''))responsibilities=responsibilities.map(r=>r.due==null?{...r,due:task.due||''}:r);
 const done=responsibilities.every(r=>r.assignee&&r.status==='done'),active=responsibilities.some(r=>r.status!=='pending'||r.feedback);
 const status=task.status==='suggested'?'suggested':done?'done':active?'working':'pending';
 const dates=responsibilities.map(r=>r.completedAt).filter(d=>Number.isFinite(Date.parse(d))).sort((a,b)=>Date.parse(a)-Date.parse(b));
 return {...task,responsibilities,due,assignee:responsibilities.some(r=>r.assignee===task.assignee)?task.assignee:responsibilities.find(r=>r.assignee)?.assignee||'',status,completedAt:status==='done'?(task.completedAt||dates.at(-1)||''):''};
}
function upTodoLegacyResponsibility(task){return {id:'original',department:task.department||upTodoPersonDepartment(task.assignee,task),assignee:task.assignee||'',action:task.plan||task.title,due:task.due||'',status:task.status==='done'?'done':task.status==='working'?'working':'pending',feedback:task.evidence||'',completedAt:task.completedAt||''}}
// 责任人仍独立保存状态和反馈；actionId只标识多人共用的执行事项，旧记录各自独立。
function upTodoResponsibilityGroups(rows){
 const groups=new Map();
 for(const row of rows){const key=row.actionId?'action:'+row.actionId:'role:'+row.id;if(!groups.has(key))groups.set(key,{key,rows:[]});groups.get(key).rows.push(row)}
 return [...groups.values()];
}
// 主表和详情复用实际行动；标题只用于标识事项，不替代已填写的执行内容。
function upTodoExecutionText(task,role=null){
 if(role)return role.action||task.plan||task.title||'—';
 if(upTodoCollaborative(task))return upTodoResponsibilityGroups(task.responsibilities).map(group=>group.rows.map(r=>(r.department||'待分配')+' / '+(r.assignee||'待分配')).join('、')+'：'+upTodoExecutionText(task,group.rows[0])).join('\n');
 return task.plan||task.title||'—';
}
function upTodoSaveResponsibility(taskId,rowId,patch){
 const task=upTodos[taskId];if(!task||task.deletedAt)throw new Error('待办已删除');if(task.status==='suggested')throw new Error('请先下发待办');
 const rows=upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)],now=new Date().toISOString();
 const old=rows.find(r=>r.id===rowId);if(!old)throw new Error('责任项不存在');
 const next={...old,...Object.fromEntries(['department','assignee','action','status','feedback'].filter(k=>k in patch).map(k=>[k,patch[k]]))};
 if('department' in patch&&!upTodoDepartments.includes(next.department)&&next.department!==old.department)throw new Error('请选择有效责任部门');
 if('action' in patch){next.action=String(next.action||'').trim();if(!next.action||next.action.length>3000)throw new Error('请填写执行事项，最多3000字')}
 if(next.assignee&&!upTodoAssignable(task).some(p=>p.name===next.assignee))throw new Error('请选择有效负责人');
 if(next.assignee&&next.assignee!==old.assignee&&old.actionId&&rows.some(r=>r.id!==rowId&&r.actionId===old.actionId&&r.assignee===next.assignee))throw new Error('该执行事项已有所选负责人');
 if('assignee' in patch)next.department=upTodoPersonDepartment(next.assignee,task);
 if(!['pending','working','done'].includes(next.status))throw new Error('请选择有效状态');
 if(next.status!=='pending'&&!next.assignee)throw new Error('请先分配负责人');
 if(next.assignee!==old.assignee){next.status='pending';next.feedback='';next.completedAt=''}
 else if(next.status!==old.status)next.completedAt=next.status==='done'?now:'';
 next.feedback=String(next.feedback||'').slice(0,3000);next.updatedAt=now;
 const responsibilities=rows.map(r=>r.id===rowId?next:'action' in patch&&old.actionId&&r.actionId===old.actionId?{...r,action:next.action,updatedAt:now}:r);
 const updated=upTodoAggregate({...task,responsibilities,updatedAt:now,completedAt:'',logs:[...task.logs,{at:now,actor:upTodoCurrentUser,action:'responsibility',responsibilityId:rowId,assignee:next.assignee,from:old.status,to:next.status,note:next.feedback,previousFeedback:old.feedback||'',...('action' in patch?{previousAction:old.action,execution:next.action}:{})}]});
 upPersistTodos({...upTodos,[task.id]:updated});return updated;
}
function upTodoAddResponsibility(taskId,values){
 return upTodoAddResponsibilities(taskId,{...values,assignees:[values.assignee]});
}
// 修改同一执行事项的人员集合；沿用已有责任项身份、状态和反馈。
function upTodoSetActionOwners(taskId,rowId,names){
 const task=upTodos[taskId];if(!task||task.deletedAt||task.status==='suggested')throw new Error('任务不可编辑');
 const rows=upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)];
 const group=upTodoResponsibilityGroups(rows).find(g=>g.rows.some(r=>r.id===rowId));if(!group)throw new Error('执行事项不存在');
 const assignees=[...new Set(names||[])],people=upTodoAssignable(task);
 if(!assignees.length)throw new Error('每条执行事项至少保留一位负责人');
 if(assignees.some(name=>!people.some(p=>p.name===name)))throw new Error('请选择有效负责人');
 const now=new Date().toISOString(),first=group.rows[0],actionId=first.actionId||'action-'+crypto.randomUUID();
 const previous=new Map(group.rows.filter(r=>r.assignee).map(r=>[r.assignee,r]));
 const members=assignees.map(assignee=>previous.get(assignee)||{id:'role-'+crypto.randomUUID(),department:upTodoPersonDepartment(assignee,task),assignee,action:upTodoExecutionText(task,first),due:first.due??task.due??'',status:'pending',feedback:'',completedAt:''}).map(r=>({...r,actionId}));
 if(members.some(r=>!r.department))throw new Error('负责人缺少部门信息');
 const ids=new Set(group.rows.map(r=>r.id)),responsibilities=rows.flatMap(r=>r.id===first.id?members:ids.has(r.id)?[]:[r]);
 const added=members.filter(r=>!previous.has(r.assignee)),removed=group.rows.filter(r=>!assignees.includes(r.assignee));
 if(!added.length&&!removed.length)return task;
 // 移除者的原反馈留在操作记录中；其他执行事项保持原值。
 const logs=[...added.map(r=>({at:now,actor:upTodoCurrentUser,action:'add-responsibility',responsibilityId:r.id,actionId,assignee:r.assignee,to:'pending',note:r.action})),...removed.map(r=>({at:now,actor:upTodoCurrentUser,action:'remove-responsibility',responsibilityId:r.id,actionId,assignee:r.assignee,from:r.status,note:r.action,previousFeedback:r.feedback||'',previousCompletedAt:r.completedAt||''}))];
 const next=upTodoAggregate({...task,responsibilities,completedAt:'',updatedAt:now,logs:[...task.logs,...logs]});
 upPersistTodos({...upTodos,[task.id]:next});return next;
}
function upTodoAddResponsibilities(taskId,values){
 const task=upTodos[taskId];if(!task||task.deletedAt||task.status==='suggested')throw new Error('待办不可编辑');
 const assignees=[...new Set(values.assignees||[])];if(!assignees.length||assignees.some(name=>!upTodoAssignable(task).some(p=>p.name===name)))throw new Error('请选择有效负责人');
 const rows=upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)];
 const target=values.responsibilityId?rows.find(r=>r.id===values.responsibilityId):null;if(values.responsibilityId&&!target)throw new Error('执行事项不存在，请重新选择');
 const action=String(target?upTodoExecutionText(task,target):values.action||'').trim();if(!action||action.length>3000)throw new Error('请填写执行事项，最多3000字');
 const existing=target?rows.filter(r=>r.id===target.id||target.actionId&&r.actionId===target.actionId):rows.filter(r=>r.action===action);
 if(!target&&existing.length)throw new Error('已有相同执行事项，请在该事项中添加负责人');
 if(assignees.some(name=>existing.some(r=>r.assignee===name)))throw new Error('该执行事项已有所选负责人');
 const now=new Date().toISOString(),actionId=target?.actionId||'action-'+crypto.randomUUID();
 const due='due' in values?upTodoValidateExecutionDue(values.due):target?.due??task.due??'',status=values.status||'pending',feedback=String(values.feedback||'').trim();
 if(!['pending','working','done'].includes(status))throw new Error('请选择有效状态');if(feedback.length>3000)throw new Error('反馈备注最多3000字');
 const additions=assignees.map(assignee=>({id:'role-'+crypto.randomUUID(),actionId,department:upTodoPersonDepartment(assignee,task),assignee,action,due,status,feedback,completedAt:status==='done'?now:''}));
 if(additions.some(row=>!row.department))throw new Error('负责人缺少部门信息');
 const responsibilities=[...rows.map(r=>r.id===target?.id?{...r,actionId}:r),...additions];
 const logs=additions.map(r=>({at:now,actor:upTodoCurrentUser,action:'add-responsibility',responsibilityId:r.id,actionId,assignee:r.assignee,to:status,note:action}));
 const next=upTodoAggregate({...task,responsibilities,completedAt:'',updatedAt:now,logs:[...task.logs,...logs]});
 upPersistTodos({...upTodos,[task.id]:next});return next;
}
