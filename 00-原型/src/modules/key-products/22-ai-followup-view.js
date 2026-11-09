// 两处经营明细复用同一待办入口，保留表内AI依据。
function kpmInsightJudgment(item){return kpmInlineInsight(item)}
function kpmInsightTaskCell(item,{compact=false}={}){
 const t=item.task;return `<button class="link" data-kpm-ai-task="${item.product.spuId}" ${t?.deletedAt?'disabled':''}>${t?.deletedAt?'已删除':t?esc(upTodoStatuses[t.status]):'下发'}</button>${t?`${compact?'':`<small>${esc(upTodoOwnerText(t))}</small>`}${upTodoCollaborative(t)?`<small>${t.responsibilities.filter(r=>r.assignee&&r.status==='done').length}/${t.responsibilities.length}完成</small>`:''}`:''}`;
}
function kpmOpenFollowupTask(item,period){
 const task=drawerWithPeriod(period,()=>kpmFollowupTask(item),'matrix');if(task.deletedAt){toast('关联待办已删除');return;}
 if(!upTodos[task.id]||!upTodoCollaborative(upTodos[task.id])&&upTodoCollaborative(task))try{upPersistTodos({...upTodos,[task.id]:task})}catch(error){toast(error.message);return;}
 document.querySelector('#dialogbody .kpm-management-drawer')?.upRefresh?.();
 upOpenTodoDialog(upTodos[task.id],'detail',{},()=>document.querySelector('#dialogbody .kpm-management-drawer')?.upRefresh?.());
}
