// 人员检索只在输入后显示匹配项；显示姓名/部门，提交稳定的人员值。
let upTodoPeopleSequence=0;
function upTodoPeopleInput(value='',task,name='assignee',inline=false){
 const id='up-people-'+(++upTodoPeopleSequence);
 return `<div class="up-todo-people" data-people-picker><input type="hidden" ${inline?'data-inline-value':`name="${esc(name)}"`} value="${esc(value)}"><input type="search" data-people-query role="combobox" aria-label="负责人" aria-autocomplete="list" aria-controls="${id}" aria-expanded="false" autocomplete="off" placeholder="输入姓名搜索" required value="${value?esc(upTodoPersonLabel(value,task)):''}"><div class="up-todo-people-options" id="${id}" role="listbox" popover="manual" hidden></div></div>`;
}
function upBindTodoPeople(root,task){
 for(const picker of root.querySelectorAll('[data-people-picker]')){
  const value=picker.querySelector('input[type="hidden"]'),input=picker.querySelector('[data-people-query]'),menu=picker.querySelector('[role="listbox"]');
  let matches=[],index=-1;
  const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');index=-1};
  const choose=person=>{
   value.value=person.name;input.value=upTodoPersonLabel(person.name,task);input.setCustomValidity('');close();
   input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();
  };
  input.oninput=()=>{
   value.value='';input.setCustomValidity('请选择匹配的负责人');index=-1;
   const query=input.value.trim().toLocaleLowerCase();
   if(!query){close();return}
   matches=upTodoAssignable(task).filter(p=>upTodoPersonLabel(p.name,task).toLocaleLowerCase().includes(query));
   menu.innerHTML=matches.length?matches.map((p,i)=>`<button type="button" role="option" aria-selected="false" id="${menu.id}-${i}" data-person-index="${i}">${esc(upTodoPersonLabel(p.name,task))}</button>`).join(''):'<div class="up-todo-people-empty">没有匹配人员</div>';
   menu.hidden=false;
   const rect=input.getBoundingClientRect();menu.style.width=rect.width+'px';menu.style.left=Math.min(rect.left,innerWidth-rect.width-12)+'px';
   menu.style.top=(rect.bottom+4)+'px';menu.style.maxHeight=Math.min(220,innerHeight-rect.bottom-16)+'px';
   menu.showPopover();input.setAttribute('aria-expanded','true');
  };
  // 不绑定focus展开：单击空输入框不会暴露全量人员。
  menu.onpointerdown=e=>e.preventDefault();
  menu.onclick=e=>{const option=e.target.closest('[data-person-index]');if(option)choose(matches[+option.dataset.personIndex])};
  input.onkeydown=e=>{
   if(menu.hidden)return;
   if(['ArrowDown','ArrowUp'].includes(e.key)){
    e.preventDefault();if(!matches.length)return;
    index=(index+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
    for(const [i,option] of [...menu.querySelectorAll('[role="option"]')].entries())option.setAttribute('aria-selected',String(i===index));
    input.setAttribute('aria-activedescendant',menu.id+'-'+index);
   }else if(e.key==='Enter'){
    e.preventDefault();e.stopPropagation();if(index>=0)choose(matches[index]);
   }
  };
  picker.onfocusout=()=>queueMicrotask(()=>{if(!picker.contains(document.activeElement))close()});
 }
}
