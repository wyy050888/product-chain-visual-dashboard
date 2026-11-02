// 新增和导入共用负责人解析；assignees字段在任务中保留给人员目录，不存所选名单。
function gdTaskOwnerNames(value){
 let names=value;
 if(!Array.isArray(names)){
  const text=String(value??'').trim();
  if(text.startsWith('[')){try{names=JSON.parse(text)}catch(_){throw Error('负责人格式错误，请填写钉钉名称，多人用顿号分隔')}}
  else names=text.split(/[、,，;；\n]+/);
 }
 if(!Array.isArray(names))throw Error('负责人请填写钉钉名称');
 names=[...new Set(names.map(name=>String(name).trim()).filter(Boolean))];
 if(!names.length||names.some(name=>!aiAssignees.some(([person])=>person===name)))throw Error('未找到负责人，请填写钉钉名称，多人用顿号分隔');
 return names;
}
function gdTaskInitialOwners(task,names){
 if(names.length===1)return task;
 const actionId='action-'+crypto.randomUUID();
 return upTodoAggregate({...task,responsibilities:names.map(assignee=>({id:'role-'+crypto.randomUUID(),actionId,
  assignee,department:upTodoPersonDepartment(assignee,task),action:task.plan,due:task.due,status:'pending',feedback:'',completedAt:''}))});
}
