// 详情字段按项编辑与保存；未保存值只留在当前编辑器，不写入列表或任务草稿。
const upTodoInlineLabels={title:'事项名称',description:'问题描述',plan:'执行事项',action:'执行事项',feedback:'反馈',department:'责任部门',assignee:'负责人',due:'计划完成日期',priority:'优先级',status:'状态'};
function upTodoInlineDisplay(key,content,responsibility='',disabled=false,execution=false){
 return `<div class="up-todo-inline" data-todo-field="${key}" ${responsibility?`data-todo-responsibility="${esc(responsibility)}"`:''} ${execution?'data-todo-execution-field':''}><button type="button" class="up-todo-inline-read" data-todo-field-edit="${key}" aria-label="编辑${upTodoInlineLabels[key]}" ${disabled?'disabled':''}><span>${content}</span></button></div>`;
}
function upTodoInlineControl(task,key,role=null){
 const label=upTodoInlineLabels[key],value=(role||task)[key]||'';
 if(key==='assignee')return upTodoPeopleInput(value,task,'assignee',true);
 if(key==='department')return `<select aria-label="${label}" data-inline-value>${[...new Set([...upTodoDepartments,value])].filter(Boolean).map(name=>`<option ${name===value?'selected':''}>${esc(name)}</option>`).join('')}</select>`;
 if(key==='status')return `<select aria-label="${label}" data-inline-value>${Object.entries(upTodoStatuses).filter(([k])=>k!=='suggested').map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${v}</option>`).join('')}</select>`;
 if(key==='priority')return `<select aria-label="${label}" data-inline-value>${Object.entries(upTodoPriorities).map(([k,v])=>`<option value="${k}" ${k===upTodoPriorityKey(value)?'selected':''}>${v}</option>`).join('')}</select>`;
 if(['description','plan','action','feedback'].includes(key))return `<textarea aria-label="${label}" data-inline-value rows="3" maxlength="3000" ${['description','action'].includes(key)?'required':''}>${esc(value)}</textarea>`;
 return `<input aria-label="${label}" data-inline-value type="${key==='due'?'date':'text'}" ${key==='title'?'maxlength="120"':''} required value="${esc(value)}">`;
}
function upBindTodoInline(dialog,task,onChange){
 dialog.upInlineCleanup?.();let active=null;
 const syncDates=()=>{
  const completed=dialog.querySelector('[data-todo-completed-date]');if(completed)completed.textContent=upTodoDate(task.completedAt);
  const overdue=dialog.querySelector('[data-todo-overdue]');if(overdue)overdue.innerHTML=upTodoOverdue(task);
 };
 const changeStatus=e=>{
  const select=e.target.closest('[data-todo-status-select]');if(!select)return;
  if(!save()){select.value=task.status;return}
  try{
   const saved=upSaveTodo(upTodos[task.id]||task,'edit',{status:select.value});Object.assign(task,saved);
   select.className='up-todo-status-select '+task.status;syncDates();onChange('status');
  }catch(error){select.value=task.status;dialog.querySelector('.up-todo-dialog-body>.up-todo-dialog-error').textContent=error.message}
 };
 dialog.addEventListener('change',changeStatus);
 const field=(key,role='',summary=false)=>[...dialog.querySelectorAll('[data-todo-field]')].find(n=>n.dataset.todoField===key&&(n.dataset.todoResponsibility||'')===role&&Boolean(n.closest('[data-todo-execution]'))===summary);
 const focusRead=(key,role='',summary=false)=>field(key,role,summary)?.querySelector('[data-todo-field-edit]')?.focus({preventScroll:true});
 const restore=()=>{
  if(!active)return;const {holder,display,cleanup}=active;cleanup?.();
  holder.innerHTML=display;holder.classList.remove('editing');holder.onkeydown=null;active=null;
 };
 const resolveRole=(roleId,execution)=>{
  if(!roleId)return null;const rows=upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)];
  return execution?upTodoExecutionState(task,upTodoResponsibilityGroups(rows).find(g=>g.rows.some(r=>r.id===roleId))):rows.find(r=>r.id===roleId);
 };
 const save=()=>{
  if(!active)return true;
  const {holder,key,roleId,execution}=active,input=holder.querySelector('[data-inline-value]'),value=input.value.trim();
  const role=resolveRole(roleId,execution);
  const validation=holder.querySelector('[data-people-query]')||input;
  if(!validation.checkValidity()){holder.querySelector('[role="alert"]').textContent='请填写'+upTodoInlineLabels[key];validation.focus();return false}
  if(value===String((role||task)[key]||'')&&(key!=='assignee'||(role||task).department===upTodoPersonDepartment(value,task))){restore();return true}
  try{
   const saved=roleId?(execution?upTodoSaveExecution:upTodoSaveResponsibility)(task.id,roleId,{[key]:value}):upSaveTodo(upTodos[task.id]||task,'edit',{[key]:value});Object.assign(task,saved);
   if(roleId){restore();syncDates();onChange(key,roleId);return true}
   const content=key==='description'?upTodoDescriptionMarkup(task):key==='status'?upTodoStatusTag(task):key==='priority'?upTodoPriorityTag(task,false):esc(key==='assignee'?(task.department||upTodoPersonDepartment(task.assignee,task)||'—')+' / '+(task.assignee||'待分配'):task[key]||'—');
   active.cleanup?.();holder.outerHTML=upTodoInlineDisplay(key,content);active=null;
   const completed=dialog.querySelector('[data-todo-completed-date]');if(completed)completed.textContent=upTodoDate(task.completedAt);
   if(key==='due')syncDates();
   onChange(key);return true;
  }catch(error){holder.querySelector('[role="alert"]').textContent=error.message;input.focus();return false}
 };
 const start=button=>{
  const key=button.dataset.todoFieldEdit,roleId=button.closest('[data-todo-field]').dataset.todoResponsibility||'',summary=Boolean(button.closest('[data-todo-execution]'));
  if(!save())return;
  const holder=field(key,roleId,summary);if(!holder||holder.querySelector('button')?.disabled)return;
  const execution=holder.hasAttribute('data-todo-execution-field'),role=resolveRole(roleId,execution);
  active={holder,key,roleId,summary,execution,display:holder.innerHTML};holder.classList.add('editing');
  holder.innerHTML=upTodoInlineControl(task,key,role)+'<p class="up-todo-dialog-error" role="alert"></p>';
  holder.onkeydown=e=>{if(!e.isComposing&&e.key==='Enter'&&(e.ctrlKey||e.metaKey||e.target.tagName==='INPUT')){e.preventDefault();if(save())focusRead(key,roleId,summary)}};
  if(key==='assignee')upBindTodoPeople(holder,task);
  if(key==='priority'){const picker=upMountTodoPriority(holder.querySelector('select'));active.cleanup=()=>picker.destroy();picker.open();return}
  (holder.querySelector('[data-people-query]')||holder.querySelector('[data-inline-value]')).focus();
 };
 // 保持编辑器到click阶段，避免pointerdown时收起导致按钮位置改变、点击丢失。
 const pointer=e=>{if(active&&!active.holder.contains(e.target)){if(e.target.matches('[data-todo-status-select]')){if(!save())e.preventDefault()}else e.preventDefault()}};
 const outside=e=>{if(active&&!active.holder.contains(e.target)&&!save()){e.preventDefault();e.stopImmediatePropagation()}};
 const click=e=>{const button=e.target.closest('[data-todo-field-edit]');if(button)start(button)};
 const change=e=>{if(active?.holder.contains(e.target)&&(e.target.matches('select,[data-people-query]'))){const {key,roleId,summary}=active;if(save())focusRead(key,roleId,summary)}};
 const blur=()=>queueMicrotask(()=>{if(dialog.isConnected&&active&&!active.holder.contains(document.activeElement))save()});
 dialog.addEventListener('pointerdown',pointer,true);dialog.addEventListener('click',outside,true);dialog.addEventListener('click',click);dialog.addEventListener('change',change);dialog.addEventListener('focusout',blur);
 dialog.upFlushInline=save;
 dialog.upCancelInline=()=>{if(!active)return false;const {key,roleId,summary}=active;restore();focusRead(key,roleId,summary);return true};
 dialog.upInlineCleanup=()=>{active?.cleanup?.();dialog.removeEventListener('change',changeStatus);dialog.removeEventListener('pointerdown',pointer,true);dialog.removeEventListener('click',outside,true);dialog.removeEventListener('click',click);dialog.removeEventListener('change',change);dialog.removeEventListener('focusout',blur);dialog.upFlushInline=null;dialog.upCancelInline=null;active=null};
}
