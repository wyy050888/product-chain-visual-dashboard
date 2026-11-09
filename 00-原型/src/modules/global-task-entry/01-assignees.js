// 新增和导入共用负责人解析；assignees字段在任务中保留给人员目录，不存所选名单。
// 原型人员候选包含原台账中的姓名；不代表已连接正式钉钉组织架构。
function gdTaskPersonEmpty(value){return !String(value??'').trim()||['-','/','—','--','无'].includes(String(value).trim())}
function gdTaskPersonNames(value){return [...new Set((Array.isArray(value)?value:String(value??'').split(/[、,，;；\n]+/)).map(name=>String(name).trim()).filter(name=>!gdTaskPersonEmpty(name)))]}
function gdTaskPeople(){
 const people=new Map(aiAssignees.filter(([name])=>!gdTaskPersonEmpty(name)).map(([name])=>[name,{name,department:upTodoPersonDepartment(name)}]));
 for(const row of gdLedgerSampleRows)for(const value of [row[3],row[9],row[10]])for(const name of gdTaskPersonNames(value))if(!people.has(name))people.set(name,{name,department:''});
 for(const row of gdLedgerSampleRows)for(const name of gdTaskPersonNames(row[9]))people.get(name).department=row[11];
 return [...people.values()];
}
function gdTaskOwnerNames(value){
 let names=value;
 if(!Array.isArray(names)){
  const text=String(value??'').trim();
  if(text.startsWith('[')){try{names=JSON.parse(text)}catch(_){throw Error('负责人格式错误，请填写钉钉名称，多人用顿号分隔')}}
  else names=text.split(/[、,，;；\n]+/);
 }
 if(!Array.isArray(names))throw Error('负责人请填写钉钉名称');
 names=[...new Set(names.map(name=>String(name).trim()).filter(Boolean))];
 if(!names.length||names.some(name=>!gdTaskPeople().some(person=>person.name===name)))throw Error('未找到负责人，请填写钉钉名称，多人用顿号分隔');
 return names;
}
function gdTaskInitialOwners(task,names){
 if(names.length===1)return task;
 const actionId='action-'+crypto.randomUUID();
 return upTodoAggregate({...task,responsibilities:names.map(assignee=>({id:'role-'+crypto.randomUUID(),actionId,
  assignee,department:upTodoPersonDepartment(assignee,task),action:task.plan,due:task.due,status:'pending',feedback:'',completedAt:''}))});
}
