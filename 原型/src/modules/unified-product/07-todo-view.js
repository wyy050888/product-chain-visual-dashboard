function upTodoPeople(value='',task){
 return '<option value="">请选择</option>'+upTodoAssignable(task).map(({name})=>`<option value="${esc(name)}" ${name===value?'selected':''}>${esc(upTodoPersonLabel(name,task))}</option>`).join('');
}
function upTodoOverdue(task){return task.status!=='done'&&task.status!=='suggested'&&task.due&&task.due<aiToday()?'<span class="up-todo-overdue">已逾期</span>':''}
function upTodoStatusTag(task){return `<span class="up-todo-status ${task.status}">${upTodoStatuses[task.status]}</span>`}
function upTodoStatusSelect(task){return `<select class="up-todo-status-select ${task.status}" data-todo-status-select aria-label="任务状态">${Object.entries(upTodoStatuses).filter(([key])=>key!=='suggested').map(([key,label])=>`<option value="${key}" ${key===task.status?'selected':''}>${label}</option>`).join('')}</select>`}
function upTodoDueCell(task){return `<span class="up-todo-due">${esc(task.due||'—')}${upTodoOverdue(task)}</span>`}
function upTodoDate(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(d)}
// 下发时间读取原始记录，按北京时间显示；旧记录只有日期时不补造具体时刻。
function upTodoDispatchTime(value){
 if(!value)return '—';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return upTodoDate(value)+'（时间未记录）';
 const date=new Date(value);if(Number.isNaN(date.getTime()))return '—';
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date);
}
function upTodoDispatcher(task){return task.status==='suggested'?'—':task.source==='manual'?(task.assignedBy||'手工创建'):'AI自动下发'}
function upTodoPriorityTag(task){
 const key=upTodoPriorityKey(task.priority);
 return `<span class="up-todo-priority ${key}" aria-label="${upTodoPriorities[key]}">${key}</span>`;
}
// 一列保留部门与人员的对应关系；全局协同可传单个责任项。
function upTodoOwnerCell(task,role=null){
 const roles=role?[role]:upTodoCollaborative(task)?task.responsibilities:[upTodoLegacyResponsibility(task)];
 return roles.map(r=>`<div class="up-todo-owner"><small>${esc(r.department||upTodoPersonDepartment(r.assignee,task)||'—')}</small> / <span>${esc(r.assignee||'待分配')}</span></div>`).join('');
}
function upTodoRow(t,suggested){
 const action=(mode,label)=>`<button type="button" class="link" data-todo-open="${mode}" data-todo-id="${esc(t.id)}">${label}</button>`;
 const operations=suggested?action('detail','详情')+action('assign','下发'):action('detail','详情')+action('delete','删除');
 const subject=`<div class="up-todo-subject-cell">${suggested?`<input type="checkbox" data-todo-select="${esc(t.id)}" aria-label="选择${esc(t.title)}">`:''}<div class="up-todo-subject"><b>${esc(upTodoExecutionText(t))}</b></div></div>`;
 return [upTodoPriorityTag(t),`<div class="up-todo-description">${esc(upTodoProblemSummary(t))}</div>`,subject,upTodoOwnerCell(t),upTodoDueCell(t),esc(upTodoDate(t.completedAt)),upTodoStatusTag(t),`<div class="up-todo-row-actions">${operations}</div>`];
}
