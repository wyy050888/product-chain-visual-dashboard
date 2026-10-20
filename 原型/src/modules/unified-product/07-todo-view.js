function upTodoPeople(value='',task){
 return '<option value="">请选择</option>'+upTodoAssignable(task).map(({name})=>`<option value="${esc(name)}" ${name===value?'selected':''}>${esc(upTodoPersonLabel(name,task))}</option>`).join('');
}
function upTodoOverdue(task){return task.status!=='done'&&task.status!=='suggested'&&task.due&&task.due<aiToday()?'<span class="up-todo-overdue">已逾期</span>':''}
function upTodoStatusTag(task){return `<span class="up-todo-status ${task.status}">${upTodoStatuses[task.status]}</span>`}
function upTodoStatusSelect(task){return `<select class="up-todo-status-select ${task.status}" data-todo-status-select aria-label="任务状态">${Object.entries(upTodoStatuses).filter(([key])=>key!=='suggested').map(([key,label])=>`<option value="${key}" ${key===task.status?'selected':''}>${label}</option>`).join('')}</select>`}
function upTodoDueCell(task){return `<span class="up-todo-due">${esc(task.due||'—')}${upTodoOverdue(task)}</span>`}
function upTodoDate(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(d)}
function upTodoPriorityTag(task){const key=upTodoPriorities[task.priority]?task.priority:'yellow';return `<span class="up-todo-priority ${key}" role="img" aria-label="${upTodoPriorities[key]}"></span>`}
function upTodoRow(t,suggested){
 const action=(mode,label)=>`<button type="button" class="link" data-todo-open="${mode}" data-todo-id="${esc(t.id)}">${label}</button>`;
 const operations=suggested?action('detail','详情')+action('assign','下发'):action('detail','详情')+action('delete','删除');
 const subject=`<div class="up-todo-subject-cell">${suggested?`<input type="checkbox" data-todo-select="${esc(t.id)}" aria-label="选择${esc(t.title)}">`:''}<div class="up-todo-subject"><b>${esc(t.title)}</b></div></div>`;
 return [subject,`<div class="up-todo-description">${esc(upTodoDescriptionText(t))}</div>`,esc(upTodoPersonLabel(t.assignee,t)),upTodoDueCell(t),esc(upTodoDate(t.completedAt)),upTodoPriorityTag(t),upTodoStatusTag(t),esc(t.assignedBy||'—'),esc(upTodoDate(t.assignedAt)),`<div class="up-todo-row-actions">${operations}</div>`];
}
function upMountTodos(root,m,state,source={}){
 const host=root.querySelector('[data-up-panel="handling"]');
 state.todoTab||='execution';
 const render=()=>{
  const tasks=source.list?source.list():upTodoList(m,state),suggested=state.todoTab==='suggestions',selected=new Set();
  const groups={execution:tasks.filter(t=>t.status!=='suggested'),suggestions:tasks.filter(t=>t.status==='suggested')};
  const select=(id,label,options,value)=>`<label>${label}<select id="${id}" aria-label="${label}"><option value="all">全部</option>${options.map(([key,text])=>`<option value="${esc(key)}" ${key===value?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
  host.innerHTML=`<div class="up-todo-toolbar"><div class="up-todo-tabs" role="tablist" aria-label="待办类型">${[['execution','执行待办'],['suggestions','AI建议']].map(([key,label])=>`<button type="button" role="tab" data-todo-tab="${key}" aria-selected="${state.todoTab===key}">${key==='suggestions'?'<span class="up-todo-ai-brand"><i class="up-todo-ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M10.5 3.5 13 9l5.5 2.5L13 14l-2.5 5.5L8 14l-5.5-2.5L8 9Z" fill="currentColor"/><path d="m18.5 2 .9 2.6L22 5.5l-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z" fill="currentColor"/><circle cx="19.5" cy="18.5" r="1.5" fill="currentColor" opacity=".7"/></svg></i><b>AI 建议</b>':label}<span class="up-todo-tab-count">${groups[key].length}</span>${key==='suggestions'?'</span>':''}</button>`).join('')}</div><div class="up-todo-toolbar-actions"><button type="button" class="btn primary" data-todo-create>新增待办</button>${suggested?'<button type="button" class="btn primary" data-todo-batch disabled>批量下发</button>':''}</div></div>
   <div class="up-todo-filters"><label class="up-todo-search"><input type="search" id="up-todo-query" aria-label="搜索待办" placeholder="搜索待办事项 / 问题描述 / 负责人 / 下发人" value="${esc(state.todoQuery||'')}"></label>${select('up-todo-department','负责部门',(source.departments||upTodoDepartments).map(d=>[d,d]),state.todoDepartment)}${!suggested?select('up-todo-status','状态',Object.entries(upTodoStatuses).filter(([key])=>key!=='suggested'),state.todoStatus):''}${select('up-todo-priority','优先级',Object.entries(upTodoPriorities),state.todoPriority)}<button type="button" class="link" data-todo-reset>重置筛选</button></div>
   <div id="up-todo-message" role="status" aria-live="polite"></div><div class="up-table up-todo-table" id="up-todo-table"></div><div id="up-todo-pager"></div>`;
  const syncSelection=()=>{
   const boxes=[...host.querySelectorAll('[data-todo-select]')];for(const box of boxes)box.checked=selected.has(box.dataset.todoSelect);
   const all=host.querySelector('[data-todo-select-all]');if(all){all.checked=boxes.length>0&&boxes.every(b=>b.checked);all.indeterminate=boxes.some(b=>b.checked)&&!all.checked}
   const batch=host.querySelector('[data-todo-batch]');if(batch){batch.disabled=!selected.size;batch.textContent=selected.size?'批量下发（'+selected.size+'）':'批量下发'}
  };
  const fill=()=>{
   selected.clear();
   const query=(state.todoQuery||'').trim().toLocaleLowerCase();
   const visible=groups[state.todoTab].filter(t=>(!state.todoDepartment||state.todoDepartment==='all'||t.department===state.todoDepartment||upTodoPersonDepartment(t.assignee,t)===state.todoDepartment)&&(suggested||!state.todoStatus||state.todoStatus==='all'||t.status===state.todoStatus)&&(!state.todoPriority||state.todoPriority==='all'||t.priority===state.todoPriority)&&(!query||[t.title,t.description,t.assignee,t.assignedBy].some(v=>String(v||'').toLocaleLowerCase().includes(query)))).sort((a,b)=>suggested?0:((a.status==='done')-(b.status==='done')||a.due.localeCompare(b.due)));
   upMountTable(host.querySelector('#up-todo-table'),host.querySelector('#up-todo-pager'),[suggested?'<label class="up-todo-select-all"><input type="checkbox" data-todo-select-all aria-label="全选本页">待办事项</label>':'待办事项','问题描述','负责人','截止日期','实际完成日期','优先级','状态','下发人','下发日期','操作'],visible.map(t=>upTodoRow(t,suggested)),suggested?'暂无符合条件的AI建议':'暂无符合条件的执行待办');
   syncSelection();
  };
  fill();
  host.querySelector('#up-todo-table').onchange=e=>{
   if(e.target.matches('[data-todo-select]')){const id=e.target.dataset.todoSelect;if(e.target.checked)selected.add(id);else selected.delete(id)}
   if(e.target.matches('[data-todo-select-all]'))for(const box of host.querySelectorAll('[data-todo-select]')){if(e.target.checked)selected.add(box.dataset.todoSelect);else selected.delete(box.dataset.todoSelect)}
   syncSelection();
  };
  const pager=host.querySelector('#up-todo-pager');
  pager.addEventListener('click',()=>queueMicrotask(syncSelection),true);
  pager.addEventListener('change',()=>queueMicrotask(syncSelection),true);
  pager.addEventListener('keydown',()=>queueMicrotask(syncSelection),true);
  for(const [id,key] of [['up-todo-department','todoDepartment'],['up-todo-status','todoStatus'],['up-todo-priority','todoPriority']]){const input=host.querySelector('#'+id);if(input)input.onchange=e=>{state[key]=e.target.value;fill()}}
  host.querySelector('#up-todo-query').oninput=e=>{state.todoQuery=e.target.value;fill()};
  host.querySelector('[data-todo-reset]').onclick=()=>{state.todoQuery='';state.todoDepartment=state.todoStatus=state.todoPriority='all';render()};
  host.querySelector('.up-todo-tabs').onclick=e=>{const button=e.target.closest('[data-todo-tab]');if(button){state.todoTab=button.dataset.todoTab;render()}};
  const onSaved=action=>{
   state.todoTab='execution';state.todoQuery='';state.todoDepartment=state.todoStatus=state.todoPriority='all';render();
   if(!source.list)upMountAiSummary(root,m,state);
   host.querySelector('#up-todo-message').textContent={create:'待办已新增',edit:'待办已保存',assign:'待办已下发',delete:'待办已删除',complete:'待办已完成'}[action];
  };
  const batch=host.querySelector('[data-todo-batch]');if(batch)batch.onclick=()=>upOpenTodoBatch(groups.suggestions.filter(t=>selected.has(t.id)),onSaved);
  host.querySelector('[data-todo-create]').onclick=()=>upOpenTodoDialog(source.create?source.create():upNewTodo(m,state),'create',state,onSaved);
  host.querySelector('#up-todo-table').onclick=e=>{
   const button=e.target.closest('[data-todo-open]');if(!button)return;
   const task=tasks.find(t=>t.id===button.dataset.todoId);if(!task)return;
   upOpenTodoDialog(task,button.dataset.todoOpen,state,onSaved);
  };
 };
 render();
}
