// 待办详情：顶部公共信息、就地编辑、问题描述内完整呈现判断理由。
function upTodoCommonFields(task,editable,inline){
 const display=(key,value)=>inline?upTodoInlineDisplay(key,value):value;
 const item=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
 const owner=editable?upTodoPeopleInput(task.assignee,task):display('assignee',esc(upTodoPersonLabel(task.assignee,task)));
 const due=editable?`<input name="due" aria-label="截止日期" type="date" required value="${esc(task.due||'')}">`:display('due',esc(task.due||'—'));
 const priority=editable?`<select name="priority" aria-label="优先级">${Object.entries(upTodoPriorities).map(([key,label])=>`<option value="${key}" ${key===task.priority?'selected':''}>${label}</option>`).join('')}</select>`:display('priority',upTodoPriorityTag(task));
 const status=inline?upTodoStatusSelect(task):upTodoStatusTag(task);
 const date=`<div class="up-todo-due">${due}<span data-todo-overdue>${editable?'':upTodoOverdue(task)}</span></div>`;
 return `<dl class="up-todo-common ${editable?'up-todo-common-assign':''}">${editable?'':item('任务状态',status)}${item('负责人',owner)}${item('截止日期',date)}${item('优先级',priority)}${editable?'':item('实际完成日期',`<span data-todo-completed-date>${esc(upTodoDate(task.completedAt))}</span>`)+item('下发人',esc(task.assignedBy||'—'))+item('下发日期',esc(upTodoDate(task.assignedAt)))}</dl>`;
}
function upTodoDetailFields(task,editable,inline=false){
 const field=(name,label,value,required=false)=>`<label class="up-todo-dialog-field">${label}<textarea name="${name}" rows="3" maxlength="3000" ${required?'required':''}>${esc(value||'')}</textarea></label>`;
 if(editable)return `<label class="up-todo-dialog-field">待办事项<input name="title" required maxlength="120" value="${esc(task.title)}"></label>${field('description','问题描述',task.description,true)}${field('plan','处理要求',task.plan)}`;
 const display=(key,value)=>inline?upTodoInlineDisplay(key,value):value;
 return `<section><h5>待办事项</h5><div class="up-todo-title">${display('title',esc(task.title))}</div></section><section><h5>问题描述</h5><div class="up-todo-field-text">${display('description',upTodoDescriptionMarkup(task))}</div></section><section><h5>处理要求</h5><div class="up-todo-field-text">${display('plan',esc(task.plan||'—'))}</div></section>${task.evidence?`<section><h5>处理结果</h5><p>${esc(task.evidence)}</p></section>`:''}`;
}
function upOpenTodoDialog(original,mode,state,onSaved){
 const task={...original},origin=document.activeElement;
 if(['create','assign'].includes(mode))Object.assign(task,upTodoDrafts.get(task.id));
 const dialog=document.createElement('dialog');dialog.className='up-todo-dialog';dialog.setAttribute('aria-labelledby','up-todo-dialog-title');
 const close=()=>{if(dialog.upFlushInline?.()===false)return;dialog.close()};
 const draw=()=>{
  dialog.upInlineCleanup?.();
  const editable=['create','assign'].includes(mode),deleting=mode==='delete';
  dialog.classList.toggle('up-todo-dialog-detail',!editable&&!deleting);
  const titles={create:'新增待办',assign:'下发待办',basis:'待办详情',detail:'待办详情',delete:'删除待办'};
  const hasFooter=editable||deleting;
  const button=(action,label)=>`<button type="submit" class="btn ${action==='delete'?'up-todo-delete-confirm':'primary'}" data-todo-action="${action}">${label}</button>`;
  dialog.innerHTML=`<form novalidate><header><h3 id="up-todo-dialog-title">${titles[mode]}</h3><div class="up-todo-dialog-header-actions">${!editable&&!deleting&&task.status==='suggested'?'<button type="button" class="btn primary" data-todo-to-assign>下发待办</button>':''}<button type="button" class="up-todo-dialog-close" data-todo-close aria-label="关闭待办弹窗">×</button></div></header>
${upTodoCommonFields(task,editable,mode==='detail'&&task.status!=='suggested')}
   <div class="up-todo-dialog-body"><div id="up-todo-panel-detail">${deleting?'<p class="up-todo-delete-question">确认删除这条待办？</p>':''}${upTodoDetailFields(task,editable,mode==='detail'&&task.status!=='suggested')}</div><p class="up-todo-dialog-error" role="alert"></p></div>
   ${hasFooter?`<footer><div><button type="button" class="btn" data-todo-close>${editable||deleting?'取消':'关闭'}</button>${editable?button(mode,mode==='assign'?'确认下发':'保存'):deleting?button('delete','确认删除'):task.status==='suggested'?'<button type="button" class="btn primary" data-todo-to-assign>下发待办</button>':''}</div></footer>`:''}</form>`;
  if(editable)upBindTodoPeople(dialog,task);
  if(mode==='detail'&&task.status!=='suggested')upBindTodoInline(dialog,task,()=>onSaved('edit'));
  const form=dialog.querySelector('form');
  for(const b of dialog.querySelectorAll('[data-todo-close]'))b.onclick=close;
  const forward=dialog.querySelector('[data-todo-to-assign]');if(forward)forward.onclick=()=>{mode='assign';Object.assign(task,upTodoDrafts.get(task.id));draw()};
  const values=()=>({...Object.fromEntries(['title','description','plan','assignee','due','priority'].filter(key=>form.elements[key]).map(key=>[key,form.elements[key].value.trim()]))});
  if(editable){form.oninput=()=>{Object.assign(task,values());upTodoDrafts.set(task.id,values())};form.onchange=form.oninput}
  form.onsubmit=e=>{
   e.preventDefault();const action=e.submitter?.dataset.todoAction;if(!action)return;
   if(editable&&!form.checkValidity()){form.reportValidity();return}
   try{
    if(action==='delete')upDeleteTodo(original);else upSaveTodo(original,action,values());
    close();onSaved(action);
   }catch(error){const message=dialog.querySelector('.up-todo-dialog-error');message.textContent=error.message;message.scrollIntoView({block:'nearest'})}
  };
 };
 draw();document.body.append(dialog);
 dialog.addEventListener('close',()=>{dialog.upInlineCleanup?.();dialog.remove();if(origin?.isConnected)origin.focus({preventScroll:true});else document.querySelector('[data-todo-tab][aria-selected="true"]')?.focus({preventScroll:true})},{once:true});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
 dialog.showModal();
}
window.addEventListener('keydown',event=>{
 const dialog=document.querySelector('.up-todo-dialog[open]');
 if(dialog&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(!dialog.upCancelInline?.())dialog.close()}
},true);
