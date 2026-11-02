// 任务下发表格的草稿与事件；模型原子保存，展示组件不直接写存储。
function upMountTodoCollaboration(host,task,onChange){
 const emptyDraft=()=>({action:'',assignees:[],query:'',status:'pending',due:'',feedback:''});
 let adding=false,draft=emptyDraft(),deleteConfirm=null;
 const error=message=>{
  const target=host.querySelector(adding?'[data-responsibility-form] [role=alert]':'[data-collaboration-error]');
  target.textContent=message;if(message)target.scrollIntoView({block:'nearest'});
 };
 const captureDraft=()=>{
  const form=host.querySelector('[data-responsibility-form]');if(!adding||!form)return;
  draft={action:form.querySelector('[data-responsibility-action]').value,assignees:[...(form.querySelector('[data-people-picker]').upSelectedPeople||[])],query:form.querySelector('[data-people-query]').value,status:form.querySelector('[data-responsibility-status]').value,due:form.querySelector('[data-responsibility-due]').value,feedback:form.querySelector('[data-responsibility-feedback]').value};
 };
 function render(){
  captureDraft();cancelDelete();host.upPeopleMultipleCleanup?.();
  const rows=upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)];
  const groups=upTodoResponsibilityGroups(rows);
  const completed=groups.filter(g=>g.rows.every(r=>r.assignee&&r.status==='done')).length;
  host.innerHTML=`<section class="up-collaboration"><header><h5>任务下发 <small>已完成 ${completed}/${groups.length} 项</small></h5><button type="button" class="link" data-responsibility-add>新增执行事项</button></header><p class="up-todo-dialog-error" data-collaboration-error role="alert"></p><div class="up-collaboration-scroll"><table aria-label="任务下发"><colgroup><col style="width:27%"><col style="width:23%"><col style="width:10%"><col style="width:12%"><col style="width:12%"><col style="width:16%"></colgroup><thead><tr>${['执行事项','负责人','状态','计划完成日期','实际完成日期','反馈备注'].map(label=>'<th>'+label+'</th>').join('')}</tr></thead><tbody>${groups.map(g=>upTodoExecutionGroup(g,task,groups.length>1)).join('')+upTodoExecutionDraft(task,draft,adding)}</tbody></table></div></section>`;
  upBindTodoPeople(host,task);
  upBindTodoPeopleMultiple(host,task,picker=>{
   const rowId=picker.dataset.responsibilityOwners;if(!rowId)return {selected:draft.assignees};
   const group=groups.find(g=>g.rows[0].id===rowId);
   return {selected:group.rows.map(r=>r.assignee).filter(Boolean),onError:error,onChange:names=>{
    captureDraft();
    const position=rows.findIndex(r=>r.id===rowId),saved=upTodoSetActionOwners(task.id,rowId,names),focusId=saved.responsibilities[position].id;
    Object.assign(task,saved);onChange(saved);
    // 保存选择后继续编辑本行，保持下拉展开以便连续多选。
    queueMicrotask(()=>{if(!host.isConnected)return;render();host.querySelector(`[data-responsibility-owners="${CSS.escape(focusId)}"]`)?.upOpenPeople()});
   }};
  });
  if(adding)host.querySelector('[data-responsibility-form] [data-people-query]').value=draft.query;
 }
 const cancelDraft=()=>{
  if(!adding)return false;adding=false;draft=emptyDraft();render();host.querySelector('[data-responsibility-add]').focus({preventScroll:true});return true;
 };
 const cancelDelete=(focus=false)=>{if(!deleteConfirm)return false;deleteConfirm.close(focus);return true};
 host.upExecutionConfirmCleanup=()=>cancelDelete();
 host.closest('dialog').upCancelResponsibilityDraft=()=>cancelDelete(true)||cancelDraft();
 host.onclick=e=>{
  const remove=e.target.closest('[data-execution-delete]');
  if(remove&&!remove.disabled){
   cancelDelete();
   deleteConfirm=upMountExecutionDeleteConfirm(remove,()=>{
    const saved=upTodoDeleteExecution(task.id,remove.dataset.executionDelete);Object.assign(task,saved);render();onChange(saved);host.querySelector('[data-execution-group] [data-todo-field-edit="action"]')?.focus({preventScroll:true});
   },()=>{deleteConfirm=null});
   return;
  }
  const add=e.target.closest('[data-responsibility-add]');
  if(add){
   if(adding){host.querySelector('[data-responsibility-action]').focus();return}
   adding=true;render();host.querySelector('[data-responsibility-action]').focus();return;
  }
  if(e.target.closest('[data-responsibility-cancel]')){cancelDraft();return}
  if(e.target.closest('[data-responsibility-submit]')){
   const form=host.querySelector('[data-responsibility-form]');
   try{const saved=upTodoAddResponsibilities(task.id,{assignees:form.querySelector('[data-people-multiple]').upPeopleSelection(),action:form.querySelector('[data-responsibility-action]').value,status:form.querySelector('[data-responsibility-status]').value,due:form.querySelector('[data-responsibility-due]').value,feedback:form.querySelector('[data-responsibility-feedback]').value});Object.assign(task,saved);adding=false;draft=emptyDraft();render();onChange(saved)}catch(err){error(err.message)}
  }
 };
 render();
 return render;
}
