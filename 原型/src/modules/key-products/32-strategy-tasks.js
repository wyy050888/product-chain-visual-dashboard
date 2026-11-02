// 经营事项共用原待办身份；只在下发时保存，浏览和筛选不生成任务。
function kpmBuildStrategyTask(item){
 const existing=kpmStrategyRelatedTask(item.product,item.strategyCategory,item.activities.map(a=>a.record),item.cutoff);
 if(existing)return kpmCollaborativeTask(existing,item.advice);
 const p=item.product,a=item.advice,now=new Date().toISOString(),id='ai-business|'+p.spuId+'|'+a.issue;
 const task={id,spuId:p.spuId,objectName:p.name,platform:'all',strategyCategory:item.strategyCategory,managementIssue:a.issue,source:'ai-business-followup',descriptionVersion:3,
  title:kpmStrategyCategories[item.strategyCategory]+'：'+p.name,description:a.reason,plan:a.actions.map(([d,text])=>d+'：'+text).join('；'),department:a.department,assignee:upTodoAssignable({}).find(person=>person.department===a.department)?.name||'',
  start:aiToday(),end:item.cutoff,due:'',priority:item.stage==='red'?'red':'yellow',taskType:a.type,status:'pending',assignedBy:upTodoCurrentUser,assignedAt:now,createdAt:now,completedAt:'',evidence:'',basis:item.activities.map(v=>v.record.source),logs:[{at:now,actor:upTodoCurrentUser,action:'assign',to:'pending',note:'下发AI经营建议'}]};
 return kpmCollaborativeTask(task,a);
}
