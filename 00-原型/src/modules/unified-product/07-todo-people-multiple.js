// 新建表单与事项单元格共用多选；调用方决定何时保存。
function upTodoPeopleMultiple(task,rowId=''){
 return `<div class="up-todo-people-multiple up-todo-owner-select" data-people-multiple data-owner-select ${rowId?`data-responsibility-owners="${esc(rowId)}"`:''}><button type="button" class="up-todo-owner-read" data-people-display aria-label="编辑负责人" aria-haspopup="listbox" aria-expanded="false"><span data-people-label>选择负责人</span><i class="up-todo-owner-caret ui-dropdown-icon" aria-hidden="true"></i></button><div class="up-todo-owner-editor" data-people-editor hidden><div class="up-todo-people-selected" data-people-selected></div>${upTodoPeopleInput('',task,'new-responsibility-owners',false,true)}</div></div>`;
}
function upBindTodoPeopleMultiple(root,task,optionsFor=()=>({})){
 root.upPeopleMultipleCleanup?.();const hosts=[...root.querySelectorAll('[data-people-multiple]')];
 for(const host of hosts){
  const options=optionsFor(host),picker=host.querySelector('[data-people-picker]'),input=picker.querySelector('[data-people-query]'),value=picker.querySelector('input[type=hidden]'),chips=host.querySelector('[data-people-selected]');
  const display=host.querySelector('[data-people-display]'),editor=host.querySelector('[data-people-editor]'),closePopup=picker.upClosePeople;
  picker.upSelectedPeople=[...(options.selected||[])];input.required=false;input.placeholder='输入姓名搜索';input.setAttribute('aria-label','搜索并多选负责人');picker.querySelector('[role=listbox]').setAttribute('aria-multiselectable','true');
  const close=()=>{closePopup();input.value='';input.setCustomValidity('');editor.hidden=true;display.hidden=false;display.setAttribute('aria-expanded','false')};
  host.upClosePeopleEdit=close;picker.upClosePeople=close;
  host.upOpenPeople=()=>{display.hidden=true;editor.hidden=false;display.setAttribute('aria-expanded','true');input.focus({preventScroll:true});input.oninput()};
  display.onclick=()=>host.upOpenPeople();display.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();host.upOpenPeople()}};
  host.onfocusout=()=>queueMicrotask(()=>{if(host.isConnected&&!host.contains(document.activeElement))close()});
  const sync=()=>{
   value.value=JSON.stringify(picker.upSelectedPeople);
   host.querySelector('[data-people-label]').innerHTML=picker.upSelectedPeople.length?picker.upSelectedPeople.map(name=>'<span class="up-todo-owner-person">'+esc(name)+'<small>-'+esc(upTodoPersonDepartment(name,task)||'未分配部门')+'</small></span>').join('、'):'<span class="up-todo-inline-placeholder">选择负责人</span>';
   chips.innerHTML=picker.upSelectedPeople.map(name=>`<span class="up-todo-person-chip">${esc(upTodoPersonLabel(name,task))}<button type="button" data-people-remove="${esc(name)}" aria-label="移除${esc(name)}">×</button></span>`).join('');
  };
  const change=names=>{
   const previous=picker.upSelectedPeople;picker.upSelectedPeople=names;
   try{options.onChange?.([...names]);input.value='';input.setCustomValidity('');sync()}catch(error){picker.upSelectedPeople=previous;sync();options.onError?.(error.message)}
  };
  picker.upChoosePerson=person=>change(picker.upSelectedPeople.includes(person.name)?picker.upSelectedPeople.filter(name=>name!==person.name):[...picker.upSelectedPeople,person.name]);
  chips.onclick=e=>{const button=e.target.closest('[data-people-remove]');if(!button)return;change(picker.upSelectedPeople.filter(name=>name!==button.dataset.peopleRemove));input.focus()};
  input.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!e.isComposing&&!input.value&&picker.upSelectedPeople.length)change(picker.upSelectedPeople.slice(0,-1))});
  host.upPeopleSelection=()=>{if(input.value.trim())throw new Error('请从搜索结果中选择负责人');return [...picker.upSelectedPeople]};
  host.upPeopleReset=(excluded=[])=>{picker.upSelectedPeople=[];picker.upExcludedPeople=excluded;input.value='';input.setCustomValidity('');picker.upClosePeople();sync()};
  sync();
 }
 const outside=e=>{for(const host of hosts)if(!host.contains(e.target))host.upClosePeopleEdit()};
 document.addEventListener('pointerdown',outside,true);
 root.upPeopleMultipleCleanup=()=>{document.removeEventListener('pointerdown',outside,true);for(const host of hosts)host.upClosePeopleEdit();root.upPeopleMultipleCleanup=null};
}
