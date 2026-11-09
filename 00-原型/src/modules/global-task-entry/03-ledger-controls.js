// 台账状态复用任务标签颜色，选中值与候选均为标签；原生字段保留表单提交能力。
function gdLedgerStatusEntries(creating=false){return Object.entries(gdLedgerStatus).filter(([key])=>!creating||key!=='done')}
function gdLedgerStatusMarkup(value,creating=false){
 return '<div class="gd-ledger-status"><select name="status" aria-label="状态" hidden>'+gdLedgerStatusEntries(creating).map(([key,label])=>'<option value="'+key+'" '+(key===value?'selected':'')+'>'+label+'</option>').join('')+'</select><button type="button" class="gd-ledger-status-trigger" aria-label="选择状态" aria-haspopup="listbox" aria-expanded="false"><span data-ledger-status-label></span><span aria-hidden="true">⌄</span></button><div class="gd-task-object-options gd-ledger-status-options" role="listbox" aria-label="状态选项" popover="manual" hidden></div></div>';
}
function gdBindLedgerForm(form){
 for(const name of ['primaryOwner','secondaryOwner','requestor']){
  const field=form.querySelector('[data-ledger-field="'+name+'"]');
  gdBindTaskAssigneePicker(field,{value:form.gdLedgerValues?.[name]||'',required:name==='primaryOwner',separator:'、'});
 }
 const dialog=form.closest('dialog'),creating=dialog.classList.contains('gd-task-create-drawer'),status=form.elements.status,host=form.querySelector('.gd-ledger-status'),trigger=host.querySelector('button'),menu=host.querySelector('[role=listbox]'),controller=new AbortController();
 const datePickers=[...form.querySelectorAll('[data-gd-task-date]')].map(field=>gdBindTaskDatePicker(field.parentElement,{iso:true,validate:value=>gdLedgerDate(value,field.querySelector('input').getAttribute('aria-label')),min:()=>field.querySelector('input').name==='registrationDate'?'1900-01-01':form.elements.registrationDate.value.replaceAll('/','-')||'1900-01-01',max:()=>field.querySelector('input').name==='completedAt'?aiToday():'9999-12-31'}));
 dialog.addEventListener('close',()=>datePickers.forEach(picker=>picker.destroy()),{once:true});
 const priorityPicker=upMountTodoPriority(form.elements.priority);
 dialog.addEventListener('close',()=>priorityPicker.destroy(),{once:true});
 dialog.addEventListener('keydown',event=>{
  const panel=form.querySelector('[data-todo-priority-popup]:popover-open');
  if(event.key==='Escape'&&panel){event.preventDefault();event.stopPropagation();panel.upClosePriority?.()}
 });
 const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();menu.hidden=true;trigger.setAttribute('aria-expanded','false')};
 let previousStatus=status.value;
 const sync=()=>{
  trigger.setAttribute('aria-label','状态：'+gdLedgerStatus[status.value]);trigger.querySelector('[data-ledger-status-label]').innerHTML='<span class="up-todo-status '+status.value+'">'+gdLedgerStatus[status.value]+'</span>';
  const completed=form.elements.completedAt;
  if(completed){
   const done=status.value==='done';completed.disabled=!done;completed.required=done;
   completed.min=form.elements.registrationDate.value;completed.max=aiToday();
   if(!done)completed.value='';else if(previousStatus!=='done'||!completed.value)completed.value=aiToday();
   form.querySelector('[data-ledger-field=completedAt] .gd-task-required').hidden=!done;
  }
  datePickers.forEach(picker=>picker.sync());previousStatus=status.value;
  menu.innerHTML=gdLedgerStatusEntries(creating).map(([key,label])=>'<button type="button" role="option" data-ledger-status="'+key+'" aria-selected="'+(key===status.value)+'"><span class="up-todo-status '+key+'">'+label+'</span></button>').join('');
 };
 status.addEventListener('change',sync);form.gdSyncLedgerForm=sync;
 trigger.onclick=()=>{
  if(!menu.hidden){close();return}sync();const rect=trigger.getBoundingClientRect();menu.hidden=false;
  Object.assign(menu.style,{width:Math.min(rect.width,innerWidth-24)+'px',left:Math.max(8,rect.left)+'px',maxHeight:'230px'});menu.showPopover();
  const below=innerHeight-rect.bottom-12,above=rect.top-12,height=Math.min(230,menu.scrollHeight+2),down=below>=height||below>=above;
  menu.style.maxHeight=Math.max(32,Math.min(height,down?below:above))+'px';menu.style.top=(down?rect.bottom+4:Math.max(8,rect.top-height-4))+'px';
  trigger.setAttribute('aria-expanded','true');menu.querySelector('[aria-selected="true"]')?.focus();
 };
 menu.onpointerdown=event=>event.preventDefault();
 menu.onclick=event=>{const option=event.target.closest('[data-ledger-status]');if(!option||!gdLedgerStatusEntries(creating).some(([key])=>key===option.dataset.ledgerStatus))return;status.value=option.dataset.ledgerStatus;status.dispatchEvent(new Event('change',{bubbles:true}));close();trigger.focus()};
 menu.onkeydown=event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();trigger.focus()}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const options=[...menu.querySelectorAll('[role=option]')],current=options.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?options.length-1:(current+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next]?.focus()}
 };
 host.addEventListener('focusout',event=>{if(!host.contains(event.relatedTarget))close()});
 dialog.addEventListener('click',event=>{if(!host.closest('[data-ledger-field]').contains(event.target))close()},{signal:controller.signal});
 dialog.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},{capture:true,signal:controller.signal});
 window.addEventListener('resize',close,{signal:controller.signal});
 dialog.addEventListener('close',()=>{close();controller.abort()},{once:true});sync();
 form.elements.registrationDate.addEventListener('change',()=>{if(form.elements.completedAt)form.elements.completedAt.min=form.elements.registrationDate.value});
 gdBindLedgerDisplay(form);
}

let gdLedgerDepartmentCleanup=null;
function gdBindLedgerDepartments(root){
 gdLedgerDepartmentCleanup?.();gdLedgerDepartmentCleanup=null;
 const trigger=root.querySelector('[data-gd-other-departments]'),menu=root.querySelector('#gd-ledger-other-menu');if(!trigger||!menu)return;
 menu.querySelector('.gd-tag-filter>span')?.remove();
 const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover()};
 const position=()=>{
  if(!menu.matches(':popover-open'))return;const rect=trigger.getBoundingClientRect(),width=menu.getBoundingClientRect().width,height=menu.getBoundingClientRect().height;
  if(rect.bottom<0||rect.top>innerHeight){close();return}
  menu.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';menu.style.top=(innerHeight-rect.bottom>height+12?rect.bottom+5:Math.max(12,rect.top-height-5))+'px';
 };
 trigger.onclick=()=>{if(menu.matches(':popover-open')){close();return}menu.showPopover();position()};
 menu.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
 const events=new AbortController();gdLedgerDepartmentCleanup=()=>{close();events.abort()};
 window.addEventListener('scroll',event=>{if(!menu.contains(event.target))position()},{capture:true,signal:events.signal});
 window.addEventListener('resize',position,{signal:events.signal});
}
