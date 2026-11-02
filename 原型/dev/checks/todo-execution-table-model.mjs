import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';

export function verifyExecutionTableModel(){
 const task={id:'table-model',status:'working',assignee:'甲',due:'2026-10-24',title:'任务',logs:[],assignees:[{name:'甲',department:'产品中心'},{name:'乙',department:'采购部'},{name:'丙',department:'品质中心'}],responsibilities:[
  {id:'a',actionId:'shared',assignee:'甲',department:'产品中心',action:'确认交付',status:'done',feedback:'甲的验收记录',completedAt:'2026-10-22T08:00:00Z'},
  {id:'b',actionId:'shared',assignee:'乙',department:'采购部',action:'确认交付',status:'working',feedback:'乙的供货记录',completedAt:''},
  {id:'c',actionId:'other',assignee:'丙',department:'品质中心',action:'复核品质',status:'done',feedback:'已复核',completedAt:'2026-10-22T09:00:00Z'}]};
 let writes=0;const box={upTodos:{[task.id]:structuredClone(task)},crypto:{randomUUID},aiToday:()=>'2026-10-23',upTodoCurrentUser:'测试账号',upTodoDepartments:task.assignees.map(p=>p.department),upTodoAssignable:t=>t.assignees,upTodoPersonDepartment:(name,t)=>t.assignees.find(p=>p.name===name)?.department||'',upPersistTodos:next=>{writes++;box.upTodos=next}};
 vm.createContext(box);for(const file of ['07-todo-collaboration-model.js','07-todo-execution-model.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/'+file,import.meta.url),'utf8'),box);
 const group=box.upTodoResponsibilityGroups(task.responsibilities)[0],snapshot=JSON.stringify(task),view=box.upTodoExecutionState(task,group);
 assert.equal(view.status,'working');assert.equal(view.completedAt,'');assert.match(view.feedback,/甲：甲的验收记录\n乙：乙的供货记录/);assert.equal(view.due,task.due);assert.equal(JSON.stringify(task),snapshot,'读取旧逐人数据不改写');
 let saved=box.upTodoSaveExecution(task.id,'a',{due:'2026-10-25'});assert.equal(writes,1);assert(saved.responsibilities.slice(0,2).every(r=>r.due==='2026-10-25'));assert.equal(saved.responsibilities[0].feedback,task.responsibilities[0].feedback);assert.equal(saved.responsibilities[1].status,'working');assert.equal(JSON.stringify(saved.responsibilities[2]),JSON.stringify({...task.responsibilities[2],due:task.due}),'旧事项先保留原继承日期');assert.equal(saved.due,'2026-10-25');
 const checkpoint=JSON.stringify(box.upTodos);for(const due of ['2026-02-30','2026-10-22',''])assert.throws(()=>box.upTodoSaveExecution(task.id,'a',{due}),/日期/);assert.equal(JSON.stringify(box.upTodos),checkpoint,'无效日期不写入任何责任项');
 saved=box.upTodoSaveExecution(task.id,'a',{action:'锁定统一交期',feedback:'已对齐交期',status:'done'});assert.equal(saved.status,'done');assert(saved.completedAt);assert(saved.responsibilities.slice(0,2).every(r=>r.action==='锁定统一交期'&&r.feedback==='已对齐交期'&&r.status==='done'));assert(saved.logs.at(-1).previous.some(r=>r.feedback==='甲的验收记录'),'旧个人反馈留存于办理记录');
 saved=box.upTodoSaveExecution(task.id,'a',{status:'working'});assert.equal(saved.completedAt,'');assert(saved.responsibilities.slice(0,2).every(r=>!r.completedAt));
 saved=box.upTodoSetActionOwners(task.id,'a',['甲','乙','丙']);assert.equal(saved.responsibilities.find(r=>r.actionId==='shared'&&r.assignee==='丙').due,'2026-10-25','加人继承本事项日期');
 const beforeInvalid=writes;assert.throws(()=>box.upTodoAddResponsibilities(task.id,{action:'新增事项',assignees:['甲'],due:'2026-02-30'}),/日期/);assert.equal(writes,beforeInvalid,'新行校验失败不产生半条记录');
 saved=box.upTodoAddResponsibilities(task.id,{action:'新增事项',assignees:['甲','乙'],due:'2026-10-26',feedback:'新备注',status:'pending'});assert.equal(writes,beforeInvalid+1,'多选新增整批一次提交');assert(saved.responsibilities.filter(r=>r.action==='新增事项').every(r=>r.due==='2026-10-26'&&r.feedback==='新备注'));
 assert.equal(box.upTodoExecutionState(saved,box.upTodoResponsibilityGroups(saved.responsibilities).find(g=>g.rows[0].action==='新增事项')).status,'pending','填写备注不改变用户选择的事项状态');
 const added=saved.responsibilities.filter(r=>r.action==='新增事项'),remaining=saved.responsibilities.filter(r=>r.action!=='新增事项'),beforeDelete=writes;
 saved=box.upTodoDeleteExecution(task.id,added[1].id);
 assert.equal(saved.due,'2026-10-25','删除最晚事项后自动回退至剩余事项最晚日期');
 assert.equal(writes,beforeDelete+1,'多人事项整组删除只保存一次');assert.equal(JSON.stringify(saved.responsibilities),JSON.stringify(remaining),'其他事项及个人反馈原样保留');
 assert.equal(saved.logs.at(-1).action,'execution-delete');assert.equal(JSON.stringify(saved.logs.at(-1).previous),JSON.stringify(added),'办理记录保留被删除事项的全部成员与备注');
 const afterDelete=JSON.stringify(box.upTodos);assert.throws(()=>box.upTodoDeleteExecution(task.id,added[0].id),/不存在/);assert.equal(JSON.stringify(box.upTodos),afterDelete,'重复删除不写入');
 saved=box.upTodoDeleteExecution(task.id,'a');assert.equal(saved.responsibilities.length,1);assert.equal(saved.assignee,'丙');assert.equal(saved.status,'done','移除未完成事项后按剩余事项更新任务状态');assert.equal(saved.completedAt,task.responsibilities[2].completedAt);assert.equal(saved.due,'2026-10-24','没有用新汇总日期污染原事项日期');
 const finalState=JSON.stringify(box.upTodos),finalWrites=writes;assert.throws(()=>box.upTodoDeleteExecution(task.id,'c'),/至少保留/);assert.equal(writes,finalWrites);assert.equal(JSON.stringify(box.upTodos),finalState,'最后一条执行事项不可删除');
 const legacy=box.upTodoAggregate({...task,responsibilities:[{...task.responsibilities[0]},{...task.responsibilities[2],due:'2026-10-31'}]});assert.equal(legacy.due,'2026-10-31');assert.equal(legacy.responsibilities[0].due,'2026-10-24','旧样例兼容：原事项保留原日期，新增31日时整单取31日');
 const shortened=box.upTodoAggregate({...legacy,responsibilities:legacy.responsibilities.map((r,i)=>i?{...r,due:'2026-10-23'}:r)});assert.equal(shortened.due,'2026-10-24','把最晚日期改早时同步回退');
 assert.equal(box.upTodoAggregate({...task,responsibilities:task.responsibilities.map(r=>({...r,due:''}))}).due,'','全部事项未填日期时不保留旧整单日期');
 assert.equal(box.upTodoPlannedDate({...task,responsibilities:[{...task.responsibilities[0],due:'2026-02-30'},{...task.responsibilities[2],due:'2026-10-25'}]}),'2026-10-25','无效日期不参与汇总');
}
