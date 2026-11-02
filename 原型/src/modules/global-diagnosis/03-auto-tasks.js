// 自动派发按共用任务编号批量保存；筛选、刷新和跨分类均复用同一记录。
function gdAutoAssign(rows){
 const next={...upTodos},seen=new Set();let changed=false;
 for(const row of rows){
  const proposal=gdProposal(row),saved=next[proposal.id];
  if(seen.has(proposal.id)||saved?.deletedAt)continue;
  seen.add(proposal.id);
  const recipe=gdActionRecipe(row),signal={gdProblem:recipe.problem,gdImpact:gdActionImpact(row),gdObservedOn:DATA_CUTOFF};
  if(saved&&saved.status!=='suggested'){
   const refreshed=gdRefreshActionCopy(row.kind==='report'?gdNormalizeReportTask(saved,row):saved),signalChanged=saved.gdAutomatic&&Object.entries(signal).some(([key,value])=>saved[key]!==value);
   const bindOrigin=!upTodoHasOrigin(saved)||saved.originEvidence.mode==='ai';
   if(refreshed!==saved||signalChanged||bindOrigin){next[saved.id]={...refreshed,...(saved.gdAutomatic?signal:{}),...(bindOrigin?{originEvidence:gdTaskOriginEvidence(row,saved)}:{})};changed=true}
   continue;
  }
  const draft={...proposal,...upTodoDrafts.get(proposal.id)},task=gdRefreshActionCopy(row.kind==='report'?gdNormalizeReportTask(draft,row):draft),roles=upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)];
  if(roles.some(role=>!upTodoAssignable(task).some(person=>person.name===role.assignee)))throw new Error('业务责任人未匹配，无法自动派发：'+row.title);
  const businessDue=(task.due>=aiToday()?task.due:'')||(row.due>=aiToday()?row.due:''),due=businessDue||shiftDate(aiToday(),row.priority==='red'?1:3);
  const prepared=saved?upTodoAggregate({...task,status:'pending',due}):upBuildTodo(task,'assign',{due});
  const now=new Date().toISOString();
  next[task.id]={...prepared,...signal,originEvidence:upTodoHasOrigin(prepared)&&prepared.originEvidence.mode==='records'?prepared.originEvidence:gdTaskOriginEvidence(row,prepared),gdAutomatic:true,gdDueSource:businessDue?'business-plan':'ai-suggested',gdSuggestedDue:businessDue?'':due,
   assignedBy:'AI',assignedAt:now,createdAt:prepared.createdAt||now,updatedAt:now,
   logs:[...(prepared.logs||[]),{at:now,actor:'AI',action:'assign',from:'suggested',to:'pending',note:'AI诊断自动派发'}]};
  upTodoDrafts.delete(task.id);changed=true;
 }
 if(changed)upPersistTodos(next);
}
