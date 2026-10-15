// 详情字段按项编辑与保存；未保存值只留在当前编辑器，不写入列表或任务草稿。
const upTodoInlineLabels={title:'待办事项',description:'问题描述',plan:'处理要求',assignee:'负责人',due:'截止日期',priority:'优先级',status:'任务状态'};
function upTodoInlineDisplay(key,content){
 return `<div class="up-todo-inline" data-todo-field="${key}"><button type="button" class="up-todo-inline-read" data-todo-field-edit="${key}" aria-label="编辑${upTodoInlineLabels[key]}"><span>${content}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M10 3l3 3M3 10l7-7a2 2 0 0 1 3 3l-7 7-4 1z"/></svg></button></div>`;
}
function upTodoInlineControl(task,key){
 const label=upTodoInlineLabels[key],value=task[key]||'';
 if(key==='assignee')return upTodoPeopleInput(value,task,'assignee',true);
 if(key==='status')return `<select aria-label="${label}" data-inline-value>${Object.entries(upTodoStatuses).filter(([k])=>k!=='suggested').map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${v}</option>`).join('')}</select>`;
 if(key==='priority')return `<select aria-label="${label}" data-inline-value>${Object.entries(upTodoPriorities).map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${v}</option>`).join('')}</select>`;
 if(key==='description'||key==='plan')return `<textarea aria-label="${label}" data-inline-value rows="3" maxlength="3000" ${key==='description'?'required':''}>${esc(value)}</textarea>`;
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
 const restore=()=>{
  if(!active)return;const {holder,display}=active;
  holder.innerHTML=display;holder.classList.remove('editing');holder.onkeydown=null;active=null;
 };
 const save=()=>{
  if(!active)return true;
  const {holder,key}=active,input=holder.querySelector('[data-inline-value]'),value=input.value.trim();
  const validation=holder.querySelector('[data-people-query]')||input;
  if(!validation.checkValidity()){holder.querySelector('[role="alert"]').textContent='请填写'+upTodoInlineLabels[key];validation.focus();return false}
  if(value===String(task[key]||'')){restore();return true}
  try{
   const saved=upSaveTodo(upTodos[task.id]||task,'edit',{[key]:value});Object.assign(task,saved);
   const content=key==='description'?upTodoDescriptionMarkup(task):key==='status'?upTodoStatusTag(task):key==='priority'?upTodoPriorityTag(task):esc(key==='assignee'?upTodoPersonLabel(task.assignee,task):task[key]||'—');
   holder.outerHTML=upTodoInlineDisplay(key,content);active=null;
   const completed=dialog.querySelector('[data-todo-completed-date]');if(completed)completed.textContent=upTodoDate(task.completedAt);
   if(key==='due')syncDates();
   onChange(key);return true;
  }catch(error){holder.querySelector('[role="alert"]').textContent=error.message;input.focus();return false}
 };
 const start=button=>{
  if(!save())return;
  const key=button.dataset.todoFieldEdit,holder=button.closest('[data-todo-field]');
  active={holder,key,display:holder.innerHTML};holder.classList.add('editing');
  holder.innerHTML=upTodoInlineControl(task,key)+'<p class="up-todo-dialog-error" role="alert"></p>';
  holder.onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey||e.target.tagName==='INPUT')){e.preventDefault();save()}};
  if(key==='assignee')upBindTodoPeople(holder,task);
  (holder.querySelector('[data-people-query]')||holder.querySelector('[data-inline-value]')).focus();
 };
 // 保持编辑器到click阶段，避免pointerdown时收起导致按钮位置改变、点击丢失。
 const pointer=e=>{if(active&&!active.holder.contains(e.target)){if(e.target.matches('[data-todo-status-select]')){if(!save())e.preventDefault()}else e.preventDefault()}};
 const outside=e=>{if(active&&!active.holder.contains(e.target)&&!save()){e.preventDefault();e.stopImmediatePropagation()}};
 const click=e=>{const button=e.target.closest('[data-todo-field-edit]');if(button)start(button)};
 const blur=()=>queueMicrotask(()=>{if(dialog.isConnected&&active&&!active.holder.contains(document.activeElement))save()});
 dialog.addEventListener('pointerdown',pointer,true);dialog.addEventListener('click',outside,true);dialog.addEventListener('click',click);dialog.addEventListener('focusout',blur);
 dialog.upFlushInline=save;
 dialog.upCancelInline=()=>{if(!active)return false;const key=active.key;restore();dialog.querySelector('[data-todo-field-edit="'+key+'"]').focus();return true};
 dialog.upInlineCleanup=()=>{dialog.removeEventListener('change',changeStatus);dialog.removeEventListener('pointerdown',pointer,true);dialog.removeEventListener('click',outside,true);dialog.removeEventListener('click',click);dialog.removeEventListener('focusout',blur);dialog.upFlushInline=null;dialog.upCancelInline=null;active=null};
}
