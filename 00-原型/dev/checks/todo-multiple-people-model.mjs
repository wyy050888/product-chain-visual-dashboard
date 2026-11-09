import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';

export function verifyTodoPeopleModel(){
 let writes=0;
 const assignees=[{name:'原负责人',department:'产品中心'},{name:'甲',department:'采购部'},{name:'乙',department:'研发中心'},{name:'丙',department:'品质中心'}];
 const completed='2026-10-20T08:00:00Z',original={id:'people-model',assignees,assignee:'原负责人',department:'产品中心',title:'原事项',plan:'原执行事项',status:'done',evidence:'保留原反馈',completedAt:completed,logs:[]};
 const box={upTodos:{[original.id]:original},crypto:{randomUUID},upTodoCurrentUser:'测试账号',upTodoDepartments:assignees.map(p=>p.department),upTodoAssignable:t=>t.assignees,upTodoPersonDepartment:(name,t)=>t.assignees.find(p=>p.name===name)?.department||'',upPersistTodos:next=>{writes++;box.upTodos=next}};
 vm.createContext(box);vm.runInContext(fs.readFileSync(new URL('../../src/modules/unified-product/07-todo-collaboration-model.js',import.meta.url),'utf8'),box);
 let saved=box.upTodoAddResponsibilities(original.id,{assignees:['甲','乙'],department:'错误部门',responsibilityId:'original'});
 assert.equal(writes,1,'整批只保存一次');assert.equal(saved.responsibilities.length,3);assert(saved.responsibilities.every(r=>r.actionId===saved.responsibilities[0].actionId));
 assert.equal(saved.responsibilities[0].id,'original');assert.equal(saved.responsibilities[0].status,'done');assert.equal(saved.responsibilities[0].feedback,'保留原反馈');assert.equal(saved.responsibilities[0].completedAt,completed);assert.equal(saved.status,'working');
 assert.equal(saved.responsibilities[1].department,'采购部');assert.equal(saved.responsibilities[2].department,'研发中心','按人员字典确定部门，不接受表单覆盖');
 assert.throws(()=>box.upTodoAddResponsibilities(original.id,{assignees:['丙','不存在'],responsibilityId:'original'}),/有效负责人/);assert.equal(writes,1,'含无效人员整批不写入');
 assert.throws(()=>box.upTodoAddResponsibilities(original.id,{assignees:['甲'],responsibilityId:'original'}),/已有/);assert.equal(writes,1,'已有人员不重复保存');
 assert.throws(()=>box.upTodoSaveResponsibility(original.id,'original',{action:'  '}),/执行事项/);assert.equal(writes,1,'空执行事项不改任何人');
 saved=box.upTodoSaveResponsibility(original.id,'original',{action:'共享内容更新'});assert(saved.responsibilities.every(r=>r.action==='共享内容更新'));assert.equal(saved.responsibilities[0].feedback,'保留原反馈');
 const duplicateWrites=writes;assert.throws(()=>box.upTodoAddResponsibilities(original.id,{assignees:['丙'],action:'共享内容更新'}),/已有相同执行事项/);assert.equal(writes,duplicateWrites,'相同内容使用原事项加人，不另建分组');
 const [,a,b]=saved.responsibilities;saved=box.upTodoSaveResponsibility(original.id,a.id,{status:'done'});assert.equal(saved.status,'working');saved=box.upTodoSaveResponsibility(original.id,b.id,{status:'done'});assert.equal(saved.status,'done');
 const checkpoint=JSON.stringify(box.upTodos);assert.throws(()=>box.upTodoSaveResponsibility(original.id,a.id,{assignee:'乙'}),/已有/);assert.equal(JSON.stringify(box.upTodos),checkpoint,'更换负责人也不允许同事项重复人员');
 saved=box.upTodoSaveResponsibility(original.id,a.id,{assignee:'丙'});assert.equal(saved.responsibilities[1].department,'品质中心');assert.equal(saved.responsibilities[1].status,'pending');assert.equal(saved.responsibilities[2].status,'done');assert.equal(saved.status,'working');
 const member=saved.responsibilities[0],count=writes;
 assert.throws(()=>box.upTodoSetActionOwners(original.id,member.id,[]),/至少保留/);assert.throws(()=>box.upTodoSetActionOwners(original.id,member.id,['不存在']),/有效负责人/);assert.equal(writes,count);
 saved=box.upTodoSetActionOwners(original.id,member.id,['原负责人','乙','甲','甲']);assert.equal(saved.responsibilities.length,3);assert.equal(saved.responsibilities[0].feedback,'保留原反馈');assert.equal(saved.responsibilities[0].status,'done');assert.equal(saved.responsibilities[2].department,'采购部');assert.equal(saved.responsibilities[2].status,'pending');
 assert(saved.logs.some(log=>log.action==='remove-responsibility'&&log.assignee==='丙'));
 const unchanged=writes;box.upTodoSetActionOwners(original.id,member.id,['原负责人','乙','甲']);assert.equal(writes,unchanged,'未改变选择不重复保存');
 console.log('通过：多人批量保存原子性、自动部门、旧单兼容、共享事项、独立状态与负责人变更');
}
