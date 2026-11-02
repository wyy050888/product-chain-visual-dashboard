// 单选输入后检索；多选可展开浏览并直接键入筛选，提交稳定的人员值。
let upTodoPeopleSequence=0;
function upTodoPeopleInput(value='',task,name='assignee',inline=false,plain=false){
 const id='up-people-'+(++upTodoPeopleSequence);
 return `<div class="up-todo-people" data-people-picker><input type="hidden" ${inline?'data-inline-value':`name="${esc(name)}"`} value="${esc(value)}"><input type="${plain?'text':'search'}" data-people-query role="combobox" aria-label="负责人" aria-autocomplete="list" aria-controls="${id}" aria-expanded="false" autocomplete="off" placeholder="输入姓名搜索" required value="${value?esc(upTodoPersonLabel(value,task)):''}"><div class="up-todo-people-options" id="${id}" role="listbox" popover="manual" hidden></div></div>`;
}
function upBindTodoPeople(root,task){
 for(const picker of root.querySelectorAll('[data-people-picker]')){
  const value=picker.querySelector('input[type="hidden"]'),input=picker.querySelector('[data-people-query]'),menu=picker.querySelector('[role="listbox"]');
  // 先挂载公共搜索外壳再聚焦，避免异步包装移走正在编辑的输入节点。
  const multiple=picker.closest('[data-owner-select]');if(!multiple)uiMountSearchField(input);
  let matches=[],index=-1;
  const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');index=-1};
  picker.upClosePeople=close;
  const choose=person=>{
   if(multiple&&picker.upChoosePerson){picker.upChoosePerson(person);input.focus();input.oninput();return}
   value.value=person.name;input.value=upTodoPersonLabel(person.name,task);input.setCustomValidity('');close();
   if(picker.upChoosePerson)picker.upChoosePerson(person);else input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();
  };
  input.oninput=()=>{
   value.value='';input.setCustomValidity(multiple?'':'请选择匹配的负责人');index=-1;
   const query=input.value.trim().toLocaleLowerCase();
   if(!query&&!multiple){close();return}
   matches=upTodoAssignable(task).filter(p=>![...(!multiple?picker.upSelectedPeople||[]:[]),...(picker.upExcludedPeople||[])].includes(p.name)&&upTodoPersonLabel(p.name,task).toLocaleLowerCase().includes(query));
   menu.innerHTML=matches.length?matches.map((p,i)=>`<button type="button" role="option" aria-selected="${multiple&&picker.upSelectedPeople?.includes(p.name)?'true':'false'}" id="${menu.id}-${i}" data-person-index="${i}">${multiple?'<span class="up-todo-owner-check" aria-hidden="true">'+(picker.upSelectedPeople?.includes(p.name)?'✓':'')+'</span>':''}${esc(upTodoPersonLabel(p.name,task))}</button>`).join(''):'<div class="up-todo-people-empty">没有匹配人员</div>';
   menu.hidden=false;
   const rect=input.getBoundingClientRect(),width=Math.min(rect.width,innerWidth-24);
   menu.style.width=width+'px';menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-width-12))+'px';
   menu.style.maxHeight='220px';menu.showPopover();
   // 长事项接近视口底部时向上展开，菜单不能随旧的下方坐标落到屏幕外。
   const below=Math.max(0,innerHeight-rect.bottom-12),above=Math.max(0,rect.top-12),needed=Math.min(220,menu.scrollHeight+2);
   const down=below>=needed||below>=above,height=Math.max(32,Math.min(needed,down?below:above));
   menu.style.maxHeight=height+'px';menu.style.top=(down?rect.bottom+4:Math.max(8,rect.top-height-4))+'px';
   input.setAttribute('aria-expanded','true');
  };
  // 单选不在focus时展开；多选的展开/收起由人员下拉组件管理。
  menu.onpointerdown=e=>e.preventDefault();
  menu.onclick=e=>{const option=e.target.closest('[data-person-index]');if(option)choose(matches[+option.dataset.personIndex])};
  input.onkeydown=e=>{
   if(menu.hidden||e.isComposing)return;
   if(['ArrowDown','ArrowUp'].includes(e.key)){
    e.preventDefault();if(!matches.length)return;
    index=(index+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
    for(const [i,option] of [...menu.querySelectorAll('[role="option"]')].entries()){if(!multiple)option.setAttribute('aria-selected',String(i===index));option.toggleAttribute('data-people-highlight',i===index)}
    input.setAttribute('aria-activedescendant',menu.id+'-'+index);
   }else if(e.key==='Enter'){
    e.preventDefault();e.stopPropagation();if(index>=0)choose(matches[index]);
   }
  };
  picker.onfocusout=()=>queueMicrotask(()=>{if(!picker.contains(document.activeElement))close()});
 }
}
