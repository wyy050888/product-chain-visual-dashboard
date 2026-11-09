// 详情按字段提交；状态与实际完成日期作为同一次变更保存。
function gdOpenLedgerDetail(row){
 const current=upTodos[row.task?.id||row.id];if(!current||current.deletedAt)return;let task=gdLedgerAsSingle(current);
 const dialog=gdTaskEntryShell('任务详情',gdLedgerDetailMarkup(task),null,true,'gd-task-detail-drawer'),form=dialog.querySelector('form');
 form.gdLedgerValues=task;gdBindLedgerForm(form);gdBindTaskEntryClose(dialog);
 form.gdSaveLedgerField=key=>{
  const field=form.querySelector('[data-ledger-field="'+key+'"]'),error=dialog.querySelector('[data-gd-entry-error]');
  const showError=message=>{
   error.textContent=message;let local=field.querySelector('.gd-ledger-save-error');
   if(!local){local=document.createElement('small');local.className='gd-ledger-save-error';local.setAttribute('role','alert');field.append(local)}local.textContent=message;
  };
  try{
   for(const control of field.querySelectorAll('input,textarea,select'))if(!control.checkValidity()){showError(control.validationMessage);return false}
   const latest=upTodos[task.id];if(!latest||latest.deletedAt)throw Error('任务已删除，请关闭后刷新');
   if(latest.updatedAt!==task.updatedAt)throw Error('任务已被更新，请关闭后重新打开');
   const names=key==='status'?['status','completedAt']:[key];
   const patch=Object.fromEntries(names.map(name=>[name,form.elements[name]?.value||'']));
   const values=gdLedgerFields({...Object.fromEntries(gdLedgerColumns.map(([name])=>[name,latest[name]||''])),...patch}),changes=gdLedgerChanges(latest,values);
   if(changes.length){
    const now=new Date().toISOString(),saved={...gdLedgerAsSingle(latest),...values,description:values.deliverable,plan:values.title,assignee:gdTaskOwnerNames(values.primaryOwner)[0],updatedAt:now,logs:[...(latest.logs||[]),{at:now,actor:upTodoCurrentUser,action:'edit',from:latest.status,to:values.status,changes}]};
    gdCommitManualTasks([saved]);task=saved;form.gdLedgerValues=saved;
    dialog.querySelector('.gd-ledger-change-panel').innerHTML='<h4>变更记录</h4>'+gdLedgerChangeMarkup(saved);gdRender();
   }
   error.textContent='';field.querySelector('.gd-ledger-save-error')?.remove();dialog.gdMarkTaskFieldsSaved(names);return true;
  }catch(e){showError(e.message);return false}
 };
 form.onsubmit=event=>{event.preventDefault();dialog.upFlushInline?.()};
}
