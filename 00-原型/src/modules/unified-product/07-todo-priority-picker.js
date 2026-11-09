// 原生select保留表单值/change协议；可见选项复用P0-P3标签颜色。
let upTodoPrioritySequence=0;
function upMountTodoPriority(select){
 const id='up-todo-priority-'+(++upTodoPrioritySequence),events=new AbortController(),keys=Object.keys(upTodoPriorities);
 const wrapper=document.createElement('div');wrapper.className='up-todo-priority-picker';
 const mark=key=>`<span class="up-todo-priority ${key}">${esc(upTodoPriorities[key])}</span>`;
 wrapper.innerHTML=`<button type="button" class="up-todo-priority-trigger" data-todo-priority-trigger role="combobox" aria-label="优先级" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}"><span data-priority-value></span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg></button><div id="${id}" class="up-todo-priority-options" data-todo-priority-popup role="listbox" aria-label="优先级选项" popover="manual" hidden>${keys.map(key=>`<button type="button" role="option" tabindex="-1" id="${id}-${key}" data-todo-priority-choice="${key}" aria-selected="false">${mark(key)}<span class="up-priority-check" aria-hidden="true"></span></button>`).join('')}</div>`;
 select.hidden=true;select.after(wrapper);
 const trigger=wrapper.querySelector('[data-todo-priority-trigger]'),panel=wrapper.querySelector('[data-todo-priority-popup]'),options=[...panel.querySelectorAll('[role=option]')];let index=0,floating=null;
 const sync=()=>{const key=upTodoPriorityKey(select.value);wrapper.querySelector('[data-priority-value]').innerHTML=mark(key);for(const option of options){const selected=option.dataset.todoPriorityChoice===key;option.setAttribute('aria-selected',String(selected));option.querySelector('.up-priority-check').textContent=selected?'✓':''}};
 const highlight=()=>{options.forEach((option,i)=>option.dataset.active=String(i===index));trigger.setAttribute('aria-activedescendant',options[index].id)};
 const position=()=>{
  if(!panel.isConnected||!panel.matches(':popover-open'))return;
  const rect=trigger.getBoundingClientRect();panel.style.width=Math.min(Math.max(rect.width,180),innerWidth-16)+'px';
  const height=panel.getBoundingClientRect().height;
  panel.style.left=Math.max(8,Math.min(rect.left,innerWidth-panel.getBoundingClientRect().width-8))+'px';panel.style.top=(rect.bottom+4+height<=innerHeight-8?rect.bottom+4:Math.max(8,rect.top-height-4))+'px';
 };
 const close=(focus=false)=>{floating?.abort();floating=null;if(panel.isConnected&&panel.matches(':popover-open'))panel.hidePopover();panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');if(focus&&trigger.isConnected)trigger.focus({preventScroll:true})};
 const open=()=>{
  index=Math.max(0,keys.indexOf(upTodoPriorityKey(select.value)));sync();highlight();panel.hidden=false;panel.showPopover();trigger.setAttribute('aria-expanded','true');position();trigger.focus({preventScroll:true});
  floating?.abort();floating=new AbortController();window.addEventListener('resize',position,{signal:floating.signal});document.addEventListener('scroll',position,{capture:true,signal:floating.signal});
 };
 const choose=key=>{select.value=key;sync();close();select.dispatchEvent(new Event('change',{bubbles:true}));if(trigger.isConnected)trigger.focus({preventScroll:true})};
 trigger.onclick=()=>panel.matches(':popover-open')?close():open();
 panel.onpointerdown=e=>e.preventDefault();panel.onclick=e=>{const option=e.target.closest('[data-todo-priority-choice]');if(option)choose(option.dataset.todoPriorityChoice)};
 trigger.onkeydown=e=>{
  if(e.isComposing)return;
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   e.preventDefault();const wasOpen=panel.matches(':popover-open');if(!wasOpen)open();
   index=e.key==='Home'?0:e.key==='End'?keys.length-1:wasOpen?(index+(e.key==='ArrowDown'?1:-1)+keys.length)%keys.length:index;highlight();
  }else if(e.key==='Enter'||e.key===' '){e.preventDefault();panel.matches(':popover-open')?choose(keys[index]):open()}
  else if(e.key==='Tab')close();
 };
 document.addEventListener('pointerdown',e=>{if(!wrapper.contains(e.target))close()},{capture:true,signal:events.signal});
 select.addEventListener('change',sync,{signal:events.signal});panel.upClosePriority=()=>close(true);sync();
 return {open,destroy(){close();events.abort();panel.upClosePriority=null;wrapper.remove();select.hidden=false}};
}
