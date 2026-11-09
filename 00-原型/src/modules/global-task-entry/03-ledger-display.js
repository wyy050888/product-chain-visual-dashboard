// 详情默认展示；文本结束输入时保存，选择器确认后保存。
function gdLedgerDisplayValue(form,key){
 const value=form.elements[key]?.value||'';
 if(key==='priority')return '<span class="up-todo-priority '+esc(value)+'">'+esc(upTodoPriorities[value]||'—')+'</span>';
 if(key==='status')return '<span class="up-todo-status '+esc(value)+'">'+esc(gdLedgerStatus[value]||'—')+'</span>';
 if(!value)return '<span class="gd-ledger-placeholder">—</span>';
 if(['registrationDate','due','completedAt'].includes(key))return esc(upTodoDate(value).replaceAll('-','/'));
 return esc(value);
}
function gdBindLedgerDisplay(form){
 const dialog=form.closest('dialog'),inline=dialog.classList.contains('gd-task-detail-drawer'),fields=[...form.querySelectorAll('[data-ledger-field]')],events=new AbortController();let active=null;
 const refresh=()=>{
  for(const field of fields){
   const key=field.dataset.ledgerField,button=field.querySelector('[data-ledger-display]');button.innerHTML=gdLedgerDisplayValue(form,key);
   button.disabled=key==='completedAt'&&form.elements.status.value!=='done';
  }
 };
 const finish=()=>{
  if(!active)return false;
  if(form.gdSaveLedgerField?.(active.dataset.ledgerField)===false)return false;
  active.querySelectorAll(':popover-open').forEach(menu=>{menu.hidePopover();menu.hidden=true});
  active.querySelectorAll('[aria-expanded=true]').forEach(button=>button.setAttribute('aria-expanded','false'));
  active.classList.remove('is-editing');active=null;refresh();return true;
 };
 const activate=(field,open=false)=>{
  if(!inline||field.querySelector('[data-ledger-display]').disabled)return;
  if(active!==field){if(active&&finish()===false)return;active=field;field.classList.add('is-editing')}
  const control=field.querySelector('.gd-ledger-edit-control'),target=control.querySelector('[data-gd-assignee-query], [data-todo-priority-trigger], .gd-ledger-status-trigger, input:not([type=hidden]):not(:disabled), textarea, select:not([hidden])');
  target?.focus({preventScroll:true});
  if(open&&target?.closest('[data-gd-task-date]'))target.closest('[data-gd-task-date]').gdDatePickerOpen?.();
  else if(open&&target?.matches('[data-todo-priority-trigger],.gd-ledger-status-trigger'))target.click();
  else if(open&&target?.matches('select,input[type=date]'))try{target.showPicker?.()}catch(_){}
 };
 form.addEventListener('input',refresh,{signal:events.signal});form.addEventListener('change',refresh,{signal:events.signal});
 if(inline){
  form.addEventListener('change',event=>{
   const field=event.target.closest('[data-ledger-field]');
   if(field&&event.target.matches('select,input[type=hidden],[data-gd-task-date] input'))form.gdSaveLedgerField?.(field.dataset.ledgerField);
  },{signal:events.signal});
  for(const field of fields)field.querySelector('[data-ledger-display]').onclick=()=>activate(field,true);
  form.addEventListener('invalid',event=>{const field=event.target.closest('[data-ledger-field]');if(field)activate(field)},{capture:true,signal:events.signal});
  dialog.addEventListener('pointerdown',event=>{if(active&&!active.contains(event.target)&&!(dateRangeActive?.panel.contains(event.target)&&active.contains(dateRangeActive.panel.gdTaskDateField)))finish()},{capture:true,signal:events.signal});
  form.addEventListener('focusout',event=>{
   const field=active;if(!field||field.contains(event.relatedTarget))return;
   setTimeout(()=>{if(dialog.open&&active===field&&!field.contains(document.activeElement)&&!field.querySelector(':popover-open')&&!field.contains(dateRangeActive?.panel.gdTaskDateField))finish()},0);
  },{signal:events.signal});
  dialog.upCancelInline=()=>{if(active?.querySelector(':popover-open'))return false;return finish()};
  dialog.upFlushInline=()=>!active||finish();
 }
 dialog.addEventListener('close',()=>events.abort(),{once:true});refresh();
}
