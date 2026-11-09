// 新建任务的执行明细直接保存到详情使用的同组责任项，不另外维护任务日期/负责人。
function gdTaskExecutionRows(values){
 if(!Array.isArray(values)||!values.length)throw Error('至少保留一条执行事项');
 const seen=new Set();return values.map((row,index)=>{
  const action=String(row.action||'').trim();if(!action||action.length>3000)throw Error('第'+(index+1)+'条执行事项必填，最多3000字');
  if(seen.has(action))throw Error('已有相同执行事项，请在同一行选择多位负责人');seen.add(action);
  return {action,assignees:gdTaskOwnerNames(row.assignees),due:upTodoValidateExecutionDue(row.due)};
 });
}
function gdTaskInitialExecutions(task,rows){
 const responsibilities=rows.flatMap(row=>{const actionId='action-'+crypto.randomUUID();return row.assignees.map(assignee=>({id:'role-'+crypto.randomUUID(),actionId,assignee,department:upTodoPersonDepartment(assignee,task),action:row.action,due:row.due,status:'pending',feedback:'',completedAt:''}))});
 return upTodoAggregate({...task,responsibilities});
}
function gdTaskExecutionSignature(task){
 const groups=upTodoCollaborative(task)?upTodoResponsibilityGroups(task.responsibilities):[{rows:[{action:task.plan,assignee:task.assignee,due:task.due}]}];
 return groups.map(({rows})=>[rows[0].action||task.plan,[...new Set(rows.map(row=>row.assignee).filter(Boolean))].sort(),rows[0].due??task.due]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
