// 首次关联时按现有部门行动补齐责任项，不生成新的待办ID，不把旧完成状态复制给其他人。
function kpmCollaborativeTask(task,advice){
 if(upTodoCollaborative(task)||task.deletedAt)return task;
 const responsibilities=advice.actions.map(([department,action],index)=>{
  const original=department===task.department&&task.assignee;
  const assignee=original?task.assignee:upTodoAssignable(task).find(p=>p.department===department)?.name||'';
  return {id:'role-'+index,department,assignee,action,status:original&&['working','done'].includes(task.status)?task.status:'pending',feedback:original?task.evidence||'':'',completedAt:original&&task.status==='done'?task.completedAt||'':''};
 });
 return upTodoAggregate({...task,responsibilities});
}
