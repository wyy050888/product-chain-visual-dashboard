// 负责人键入后搜索，多选以标签显示；统一提交系统姓名，点击空框不展示全员。
function gdTaskAssigneePickerMarkup(menuId='gd-task-assignee-options',options={}){
 const id=esc(menuId),name=esc(options.name||'assignee'),label=esc(options.label||'负责人');return `<div class="gd-task-assignee-picker" data-gd-assignee-picker><div class="gd-task-assignee-control"><input role="combobox" aria-label="${label}" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="${id}" aria-expanded="false" data-gd-assignee-query placeholder="输入姓名或部门搜索，可选多人" autocomplete="off" ${options.required===false?'':'required'} maxlength="60"><input type="hidden" name="${name}"><div class="gd-task-assignee-selected" data-gd-assignee-selected></div></div><div id="${id}" class="gd-task-object-options" role="listbox" aria-multiselectable="true" aria-label="负责人匹配选项" popover="manual" hidden></div></div>`;
}
function gdBindTaskAssigneePicker(form,options={}){
 const picker=form.querySelector('[data-gd-assignee-picker]'),input=picker.querySelector('[data-gd-assignee-query]'),menu=picker.querySelector('[role=listbox]'),value=picker.querySelector('input[type=hidden]'),dialog=form.closest('dialog'),controller=new AbortController();
 const people=gdTaskPeople().map(({name,department})=>({name,label:department?name+'-'+department:name})),chips=picker.querySelector('[data-gd-assignee-selected]'),control=picker.querySelector('.gd-task-assignee-control');let names=options.value&&!gdTaskPersonEmpty(options.value)?gdTaskOwnerNames(options.value):[],matches=[],index=-1;
 const required=options.required!==false;
 const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');index=-1};
 const sync=()=>{
  value.value=options.separator?names.join(options.separator):names.length>1?JSON.stringify(names):names[0]||'';input.required=required&&!names.length;
  control.classList.toggle('has-selection',!!names.length);input.placeholder=names.length?'继续添加':'输入姓名或部门搜索，可选多人';
  chips.innerHTML=names.map(name=>'<span class="gd-task-person-chip">'+esc(people.find(person=>person.name===name)?.label||name)+'<button type="button" data-gd-assignee-remove="'+esc(name)+'" aria-label="移除'+esc(name)+'">×</button></span>').join('');
  value.dispatchEvent(new Event('change',{bubbles:true}));
 };
 const choose=person=>{if(!names.includes(person.name))names.push(person.name);input.value='';input.setCustomValidity('');sync();close();input.focus()};
 const show=()=>{
  const query=gdTaskObjectKey(input.value);if(!query){close();return}
  matches=people.filter(person=>!names.includes(person.name)&&gdTaskObjectKey(person.label).includes(query));index=-1;
  menu.innerHTML=matches.length?matches.map((person,i)=>'<button type="button" role="option" tabindex="-1" aria-selected="false" id="'+menu.id+'-'+i+'" data-gd-assignee-index="'+i+'" data-gd-assignee-name="'+esc(person.name)+'">'+esc(person.label)+'</button>').join(''):'<div class="gd-task-object-empty">没有匹配的负责人</div>';
  menu.hidden=false;const rect=control.getBoundingClientRect(),width=Math.min(rect.width,innerWidth-24);
  Object.assign(menu.style,{width:width+'px',left:Math.max(8,Math.min(rect.left,innerWidth-width-12))+'px',maxHeight:'240px'});menu.showPopover();
  const below=Math.max(0,innerHeight-rect.bottom-12),above=Math.max(0,rect.top-12),needed=Math.min(240,menu.scrollHeight+2),down=below>=needed||below>=above,height=Math.max(32,Math.min(needed,down?below:above));
  menu.style.maxHeight=height+'px';menu.style.top=(down?rect.bottom+4:Math.max(8,rect.top-height-4))+'px';input.setAttribute('aria-expanded','true');
 };
 input.addEventListener('input',event=>{input.setCustomValidity(input.value.trim()?'请从匹配列表选择负责人':'');if(event.isComposing)close();else show()});
 input.addEventListener('compositionend',show);
 menu.onpointerdown=event=>event.preventDefault();menu.onclick=event=>{const option=event.target.closest('[data-gd-assignee-index]');if(option)choose(matches[Number(option.dataset.gdAssigneeIndex)])};
 input.onkeydown=event=>{
  if(event.isComposing)return;
  if(event.key==='Backspace'&&!input.value&&names.length){names.pop();sync();close();return}
  if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();close();return}
  if(['ArrowDown','ArrowUp'].includes(event.key)){
   if(!input.value.trim())return;event.preventDefault();if(menu.hidden)show();if(!matches.length)return;
   index=index<0?(event.key==='ArrowDown'?0:matches.length-1):(index+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
   for(const [i,option]of [...menu.querySelectorAll('[role=option]')].entries())option.setAttribute('aria-selected',String(i===index));
   input.setAttribute('aria-activedescendant',menu.id+'-'+index);menu.children[index].scrollIntoView({block:'nearest'});
  }else if(event.key==='Enter'&&!menu.hidden){event.preventDefault();event.stopPropagation();if(index>=0)choose(matches[index]);else if(matches.length===1)choose(matches[0])}
 };
 chips.onpointerdown=event=>{if(event.target.closest('[data-gd-assignee-remove]'))event.preventDefault()};
 chips.onclick=event=>{const button=event.target.closest('[data-gd-assignee-remove]');if(!button)return;names=names.filter(name=>name!==button.dataset.gdAssigneeRemove);sync();close();input.focus()};
 control.addEventListener('click',event=>{if(event.target!==input&&!event.target.closest('button'))input.focus()});
 picker.onfocusout=()=>queueMicrotask(()=>{if(!picker.contains(document.activeElement))close()});
 dialog.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},{capture:true,signal:controller.signal});
 window.addEventListener('resize',close,{signal:controller.signal});dialog.addEventListener('close',()=>{close();controller.abort()},{once:true,signal:controller.signal});
 sync();
 return {destroy:()=>{close();controller.abort()}};
}
