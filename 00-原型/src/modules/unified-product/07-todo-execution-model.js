// 表格以执行事项为单位编辑；沿用责任项身份，旧的逐人记录不在读取时改写。
function upTodoExecutionState(task,group){
 const rows=group.rows,first=rows[0],done=rows.every(r=>r.assignee&&r.status==='done');
 const status=done?'done':rows.some(r=>r.status==='working'||r.status==='done')?'working':'pending';
 const dates=rows.map(r=>r.completedAt).filter(d=>Number.isFinite(Date.parse(d))).sort((a,b)=>Date.parse(a)-Date.parse(b));
 const notes=rows.filter(r=>r.feedback),unique=[...new Set(notes.map(r=>r.feedback))];
 const feedback=unique.length===1?unique[0]:notes.map(r=>(r.assignee||'待分配')+'：'+r.feedback).join('\n');
 return {...first,status,due:first.due??task.due??'',completedAt:done?dates.at(-1)||'':'',feedback};
}
function upTodoValidateExecutionDue(value,previous=''){
 const date=String(value||'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('请选择有效的计划完成日期');
 if(date!==previous&&date<aiToday())throw new Error('计划完成日期不能早于今天');
 return date;
}
function upTodoSaveExecution(taskId,rowId,patch){
 const task=upTodos[taskId];if(!task||task.deletedAt||task.status==='suggested')throw new Error('任务不可编辑');
 const rows=upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)];
 const group=upTodoResponsibilityGroups(rows).find(g=>g.rows.some(r=>r.id===rowId));if(!group)throw new Error('执行事项不存在');
 const previous=upTodoExecutionState(task,group),values=Object.fromEntries(['action','status','due','feedback'].filter(k=>k in patch).map(k=>[k,String(patch[k]??'').trim()]));
 if('action' in values&&(!values.action||values.action.length>3000))throw new Error('请填写执行事项，最多3000字');
 if('action' in values&&rows.some(r=>!group.rows.includes(r)&&r.action===values.action))throw new Error('已有相同执行事项');
 if('status' in values&&!['pending','working','done'].includes(values.status))throw new Error('请选择有效状态');
 if(values.status&&values.status!=='pending'&&group.rows.some(r=>!r.assignee))throw new Error('请先分配负责人');
 if('due' in values)values.due=upTodoValidateExecutionDue(values.due,previous.due);
 if(values.feedback?.length>3000)throw new Error('反馈/进展最多3000字');
 if(Object.entries(values).every(([key,value])=>value===String(previous[key]||'')))return task;
 const now=new Date().toISOString(),ids=new Set(group.rows.map(r=>r.id));
 const responsibilities=rows.map(r=>!ids.has(r.id)?r:{...r,...values,completedAt:'status' in values?(values.status==='done'?r.completedAt||now:''):r.completedAt,updatedAt:now});
 const logs=[...task.logs,{at:now,actor:upTodoCurrentUser,action:'execution-update',responsibilityId:rowId,changes:values,previous:group.rows.map(r=>({id:r.id,assignee:r.assignee,status:r.status,due:r.due??task.due??'',feedback:r.feedback||'',completedAt:r.completedAt||''}))}];
 const next=upTodoAggregate({...task,responsibilities,updatedAt:now,completedAt:'',logs});
 upPersistTodos({...upTodos,[task.id]:next});return next;
}
// 按执行事项整组删除；保留完整办理快照，其他事项不改写。
function upTodoDeleteExecution(taskId,rowId){
 const task=upTodos[taskId];if(!task||task.deletedAt||task.status==='suggested')throw new Error('任务不可编辑');
 const rows=upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)];
 const groups=upTodoResponsibilityGroups(rows),group=groups.find(g=>g.rows.some(r=>r.id===rowId));
 if(!group)throw new Error('执行事项不存在');
 if(groups.length===1)throw new Error('至少保留一条执行事项');
 const now=new Date().toISOString(),ids=new Set(group.rows.map(r=>r.id));
 const responsibilities=rows.filter(r=>!ids.has(r.id));
 const log={at:now,actor:upTodoCurrentUser,action:'execution-delete',responsibilityId:rowId,execution:upTodoExecutionText(task,group.rows[0]),previous:group.rows.map(r=>({...r}))};
 const next=upTodoAggregate({...task,responsibilities,updatedAt:now,completedAt:'',logs:[...task.logs,log]});
 upPersistTodos({...upTodos,[task.id]:next});return next;
}
