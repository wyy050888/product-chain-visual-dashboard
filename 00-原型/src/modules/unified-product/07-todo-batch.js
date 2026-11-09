// 批量下发先校验全部任务，再一次性保存，避免只下发其中一部分。
function upOpenTodoBatch(tasks,onSaved){
 const dialog=document.createElement('dialog');dialog.className='up-todo-dialog up-todo-batch';dialog.setAttribute('aria-label','批量下发');
 dialog.innerHTML=`<form novalidate><header><h3>批量下发（${tasks.length}）</h3><button type="button" class="up-todo-dialog-close" data-batch-close aria-label="关闭">×</button></header><div class="up-todo-dialog-body"><label class="up-todo-batch-date">统一截止日期<input type="date" data-batch-due min="${aiToday()}"></label><div class="up-todo-batch-table"><table><thead><tr><th>待办事项</th><th>任务类型</th><th>负责人</th><th>截止日期</th><th>优先级</th></tr></thead><tbody>${tasks.map((task,i)=>`<tr data-batch-index="${i}"><td>${esc(task.title)}</td><td>${upTodoTypes[upTodoType(task)]}</td><td>${upTodoPeopleInput(task.assignee,task,'owner-'+i)}</td><td><input type="date" name="due-${i}" aria-label="${esc(task.title)}截止日期" required min="${aiToday()}" value="${esc(task.due||'')}"></td><td><select name="priority-${i}" aria-label="${esc(task.title)}优先级">${Object.entries(upTodoPriorities).map(([key,label])=>`<option value="${key}" ${key===upTodoPriorityKey(task.priority)?'selected':''}>${label}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><p class="up-todo-dialog-error" role="alert"></p></div><footer><div><button type="button" class="btn" data-batch-close>取消</button><button type="submit" class="btn primary" data-batch-submit>确认下发</button></div></footer></form>`;
 for(const button of dialog.querySelectorAll('[data-batch-close]'))button.onclick=()=>dialog.close();
 tasks.forEach((task,i)=>upBindTodoPeople(dialog.querySelector('[data-batch-index="'+i+'"]'),task));
 const form=dialog.querySelector('form');
 dialog.querySelector('[data-batch-due]').onchange=e=>{for(const input of dialog.querySelectorAll('[name^="due-"]'))input.value=e.target.value};
 form.onsubmit=e=>{
  e.preventDefault();if(!form.reportValidity())return;
  const items=tasks.map((task,i)=>({task,values:{assignee:form.elements['owner-'+i].value,due:form.elements['due-'+i].value,priority:form.elements['priority-'+i].value}}));
  try{upAssignTodos(items);dialog.close();onSaved('assign')}catch(error){dialog.querySelector('[role="alert"]').textContent=error.message}
 };
 const origin=document.activeElement;dialog.addEventListener('close',()=>{dialog.remove();if(origin?.isConnected)origin.focus({preventScroll:true})},{once:true});
 document.body.append(dialog);dialog.showModal();
}
