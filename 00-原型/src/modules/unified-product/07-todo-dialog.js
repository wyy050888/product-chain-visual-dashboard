// 待办详情：基础信息分组展示，负责人统一在反馈区维护，依据在内容底部展开。
function upTodoCommonFields(task,editable,inline){
 const display=(key,value)=>inline?upTodoInlineDisplay(key,value):value;
 const item=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
 const owner=upTodoCollaborative(task)&&(!editable||task.gdWorkKey)?`<div data-up-collab-owners>${upTodoOwnerCell(task)}</div>`:editable?upTodoPeopleInput(task.assignee,task):display('assignee',esc((task.department||upTodoPersonDepartment(task.assignee,task)||'—')+' / '+(task.assignee||'待分配')));
 const planned=upTodoPlannedDate(task);
 const due=editable?`<input name="due" aria-label="计划完成日期" type="date" required value="${esc(task.due||'')}">`:`<span data-todo-planned-date>${esc(upTodoDate(planned))}</span>`;
 const priority=editable?`<select name="priority" aria-label="优先级">${Object.entries(upTodoPriorities).map(([key,label])=>`<option value="${key}" ${key===upTodoPriorityKey(task.priority)?'selected':''}>${label}</option>`).join('')}</select>`:display('priority',upTodoPriorityTag(task,false));
 const status=upTodoCollaborative(task)||inline?`<span data-up-collab-status>${upTodoStatusTag(task)}</span>`:upTodoStatusTag(task);
 const date=`<div class="up-todo-due">${due}<span data-todo-overdue>${editable?'':upTodoOverdue({...task,due:planned})}</span></div>`;
 return `<dl class="up-todo-common ${editable?'up-todo-common-assign':''}">${editable?'':item('状态',status)}${item('优先级',priority)}${item('计划完成日期',date)}${inline||editable&&task.gdWorkKey&&upTodoCollaborative(task)?'':item('责任部门/责任人',owner)}${editable?'':item('实际完成日期',`<span data-todo-completed-date>${esc(upTodoDate(task.completedAt))}</span>`)+item('下发人',esc(upTodoDispatcher(task)))+item('下发时间',esc(upTodoDispatchTime(task.assignedAt)))}</dl>`;
}
function upTodoTitleField(task,editable,businessObjects=task.businessObjects){
 // 业务对象与事项标题独立；没有关联时明确显示未关联，不拿行动标题代替。
 const names=[...new Set((businessObjects||[]).map(object=>String(object.name||'').trim()).filter(Boolean))];
 if(!names.length)names.push(task.objectName||upSpus.get(task.spuId)?.name||'未关联');
 const heading=`<section class="up-todo-title-section"><div class="up-todo-title" data-todo-business-object>${names.map(esc).join('<br>')}</div></section>`;
 return heading+(editable?`<label class="up-todo-dialog-field">事项名称<input name="title" required maxlength="120" value="${esc(task.title)}"></label>`:'');
}
function upTodoExecutionMarkup(task,inline){
 if(!upTodoCollaborative(task))return inline?upTodoInlineDisplay('plan',esc(upTodoExecutionText(task))):esc(upTodoExecutionText(task));
 return upTodoResponsibilityGroups(task.responsibilities).map(group=>{
  const role=group.rows[0],text=group.rows.map(r=>(r.department||'待分配')+' / '+(r.assignee||'待分配')).join('、')+'：'+upTodoExecutionText(task,role);
  return inline?upTodoInlineDisplay('action',esc(text),role.id):esc(text);
 }).join(inline?'':'<br>');
}
function upTodoDetailFields(task,editable,inline=false,problemMarkup=''){
 const field=(name,label,value,required=false)=>`<label class="up-todo-dialog-field">${label}<textarea name="${name}" rows="3" maxlength="3000" ${required?'required':''}>${esc(value||'')}</textarea></label>`;
 if(editable)return `${upTodoHasEvidence(task)?`<section><h5>问题描述</h5><div class="up-todo-field-text" data-todo-problem>${problemMarkup||esc(upTodoProblemSummary(task))}</div></section>`:field('description','问题描述',task.description,true)}${upTodoCollaborative(task)&&task.gdWorkKey?upTodoAssignmentPreview(task):field('plan','执行事项',task.plan)}`;
 const display=(key,value)=>inline?upTodoInlineDisplay(key,value):value;
 const problem=problemMarkup||(upTodoHasEvidence(task)?esc(upTodoProblemSummary(task)):display('description',upTodoDescriptionMarkup(task)));
 return `<section><h5>问题描述</h5><div class="up-todo-field-text" data-todo-problem>${problem}</div></section>${inline?'':`<section><h5>执行事项</h5><div class="up-todo-field-text" data-todo-execution>${upTodoExecutionMarkup(task,false)}</div></section>`}${task.evidence?`<section><h5>处理结果</h5><p>${esc(task.evidence)}</p></section>`:''}`;
}
function upOpenTodoDialog(original,mode,state,onSaved){
 const task={...original},origin=document.activeElement;
 if(['create','assign'].includes(mode))Object.assign(task,upTodoDrafts.get(task.id));
 const headingId=document.getElementById('up-todo-dialog-title')?'up-todo-dialog-title-'+crypto.randomUUID():'up-todo-dialog-title';
 const dialog=document.createElement('dialog');dialog.className='up-todo-dialog';dialog.setAttribute('aria-labelledby',headingId);
 const close=()=>{if(dialog.upFlushInline?.()===false)return;dialog.close()};
 const draw=()=>{
  dialog.upObjectEditCleanup?.();
  dialog.upInlineCleanup?.();dialog.querySelector('[data-up-collaboration]')?.upExecutionConfirmCleanup?.();dialog.querySelector('[data-up-collaboration]')?.upPeopleMultipleCleanup?.();
  dialog.upPriorityCleanup?.();dialog.upPriorityCleanup=null;
  dialog.upCancelResponsibilityDraft=null;
  const editable=['create','assign'].includes(mode),deleting=mode==='delete',inline=mode==='detail'&&task.status!=='suggested';
  dialog.classList.toggle('up-todo-dialog-detail',!editable&&!deleting);
  dialog.classList.toggle('up-todo-drawer',!deleting);
  dialog.classList.toggle('up-todo-dialog-delete',deleting);
  const titles={create:'新增待办',assign:'下发待办',basis:'任务详情',detail:'任务详情',delete:'删除任务'};
  const detailHeading=mode==='detail'||mode==='basis';
  const canDelete=detailHeading&&task.status!=='suggested'&&upTodos[task.id]&&!upTodos[task.id].deletedAt;
  const hasFooter=editable||deleting,hasEvidence=!deleting&&(upTodoHasEvidence(task)||!!state.todoEvidenceMarkup);
  const evidenceTitle=state.todoEvidenceTitle??'任务依据';
  const evidenceMarkup=hasEvidence?(state.todoEvidenceMarkup?.(task)||upTodoEvidenceMarkup(task)):'';
  const button=(action,label)=>`<button type="submit" class="btn ${action==='delete'?'up-todo-delete-confirm':'primary'}" data-todo-action="${action}">${label}</button>`;
  const basics=deleting?'':`<aside class="up-todo-basic-section" aria-label="基础信息">${upTodoCommonFields(task,editable,inline)}</aside>`;
  const content=deleting?'<p class="up-todo-delete-question">确认删除这条任务？</p>':upTodoDetailFields(task,editable,inline,state.todoProblemMarkup?.(task)||'')+(inline?'<div data-up-collaboration></div>':'')+(hasEvidence?`<section class="up-todo-evidence-section"><button type="button" class="link" data-todo-evidence aria-expanded="false" aria-controls="up-todo-evidence-panel">查看依据</button><section class="up-todo-evidence" id="up-todo-evidence-panel" data-todo-evidence-panel hidden tabindex="-1">${evidenceTitle?`<h5>${esc(evidenceTitle)}</h5>`:''}${evidenceMarkup}</section></section>`:'');
  dialog.innerHTML=`<form novalidate><header><h3 id="${headingId}" class="${detailHeading?'up-todo-detail-heading':''}">${detailHeading?upTodoDetailHeading(task,state.todoBusinessObjects):titles[mode]}</h3><div class="up-todo-dialog-header-actions">${!editable&&!deleting&&task.status==='suggested'?'<button type="button" class="btn primary" data-todo-to-assign>下发待办</button>':''}${canDelete?'<button type="button" class="btn up-todo-delete-trigger" data-todo-delete>删除任务</button>':''}<button type="button" class="up-todo-dialog-close" data-todo-close aria-label="关闭待办${deleting?'弹窗':'抽屉'}">×</button></div></header>
   ${detailHeading||deleting?'':`<div class="up-todo-heading">${upTodoTitleField(task,editable,state.todoBusinessObjects)}</div>`}
   <div class="up-todo-workspace"><div class="up-todo-dialog-body"><div id="up-todo-panel-detail">${content}</div><p class="up-todo-dialog-error" role="alert"></p></div>${basics}</div>
   ${hasFooter?`<footer><div><button type="button" class="btn" data-todo-close>${editable||deleting?'取消':'关闭'}</button>${editable?button(mode,mode==='assign'?'确认下发':'保存'):deleting?button('delete','确认删除'):task.status==='suggested'?'<button type="button" class="btn primary" data-todo-to-assign>下发待办</button>':''}</div></footer>`:''}</form>`;
  const evidenceButton=dialog.querySelector('[data-todo-evidence]');if(evidenceButton)evidenceButton.onclick=()=>{const panel=dialog.querySelector('[data-todo-evidence-panel]'),open=panel.hidden;panel.hidden=!open;evidenceButton.setAttribute('aria-expanded',String(open));evidenceButton.textContent=open?'收起依据':'查看依据';if(open){panel.focus({preventScroll:true});panel.scrollIntoView({block:'nearest'})}};
  if(editable){upBindTodoPeople(dialog,task);const picker=upMountTodoPriority(dialog.querySelector('select[name="priority"]'));dialog.upPriorityCleanup=()=>picker.destroy()}
  let refreshCollaboration=()=>{};
  const syncResponsibilitySummary=saved=>{
   if(!dialog.querySelector('[data-up-collab-status]')){draw();onSaved('edit');return}
   dialog.querySelector('[data-up-collab-status]').innerHTML=upTodoStatusTag(saved);
   const execution=dialog.querySelector('[data-todo-execution]');if(execution)execution.innerHTML=upTodoExecutionMarkup(saved,inline);
   dialog.querySelector('[data-todo-completed-date]').textContent=upTodoDate(saved.completedAt);dialog.querySelector('[data-todo-planned-date]').textContent=upTodoDate(upTodoPlannedDate(saved));dialog.querySelector('[data-todo-overdue]').innerHTML=upTodoOverdue(saved);onSaved('edit');
  };
  if(inline)upBindTodoInline(dialog,task,(key,roleId)=>{if(roleId||key==='plan')refreshCollaboration();if(roleId)syncResponsibilitySummary(task);else onSaved('edit')});
  const collaboration=dialog.querySelector('[data-up-collaboration]');
  if(collaboration)refreshCollaboration=upMountTodoCollaboration(collaboration,task,syncResponsibilitySummary);
  const form=dialog.querySelector('form');
  if(inline&&task.gdManualEntry)gdMountTaskObjectEdit(dialog,task,saved=>{Object.assign(task,saved);state.todoBusinessObjects=saved.businessObjects;onSaved('edit');draw()});
  for(const b of dialog.querySelectorAll('[data-todo-close]'))b.onclick=close;
  const remove=dialog.querySelector('[data-todo-delete]');
  if(remove)remove.onclick=()=>{
   if(dialog.upFlushInline?.()===false)return;
   // 确认层复用共用删除模型；取消不重绘父层，保留执行事项草稿和滚动位置。
   upOpenTodoDialog(upTodos[task.id]||task,'delete',state,action=>{dialog.close();onSaved(action)});
  };
  const forward=dialog.querySelector('[data-todo-to-assign]');if(forward)forward.onclick=()=>{mode='assign';Object.assign(task,upTodoDrafts.get(task.id));draw()};
  const values=()=>({...Object.fromEntries(['title','description','plan','assignee','due','priority'].filter(key=>form.elements[key]).map(key=>[key,form.elements[key].value.trim()]))});
  if(editable){form.oninput=()=>{Object.assign(task,values());upTodoDrafts.set(task.id,values());form.querySelectorAll('[data-todo-assign-date="inherit"]').forEach(node=>{node.textContent=upTodoDate(task.due)})};form.onchange=form.oninput}
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
 dialog.addEventListener('close',()=>{dialog.upObjectEditCleanup?.();dialog.upInlineCleanup?.();dialog.upPriorityCleanup?.();dialog.querySelector('[data-up-collaboration]')?.upExecutionConfirmCleanup?.();dialog.querySelector('[data-up-collaboration]')?.upPeopleMultipleCleanup?.();dialog.remove();if(origin?.isConnected)origin.focus({preventScroll:true});else document.querySelector('[data-todo-tab][aria-selected="true"]')?.focus({preventScroll:true})},{once:true});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
 dialog.showModal();
}
window.addEventListener('keydown',event=>{
 if(event.isComposing)return;
 const dialog=[...document.querySelectorAll('.up-todo-dialog[open]')].at(-1);
  if(dialog&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(dialog.upCancelObjectEdit?.())return;if(!dialog.upCancelInline?.()){const popup=dialog.querySelector('[data-todo-priority-popup]:popover-open'),people=dialog.querySelector('.up-todo-people-options:popover-open');if(popup)popup.upClosePriority?.();else if(people)people.closest('[data-people-picker]')?.upClosePeople?.();else if(!dialog.upCancelResponsibilityDraft?.())dialog.close()}}
},true);
