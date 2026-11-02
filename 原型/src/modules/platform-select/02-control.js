let uiPlatformSelectId=0,uiPlatformActive=null;
function uiPlatformMountSelect(select){
 if(select.uiPlatformControl){select.uiPlatformControl.sync();return}
 if(!uiIsPlatformSelect(select)||select.hasAttribute('data-platform-enhanced'))return;
 if(select.multiple){if(select.closest('.pf-multi')){select.uiPlatformMulti=true;uiPlatformSyncMulti(select)}return}
 if(select.hidden)return;
 let field=select.parentElement;
 if(!field.matches('label,.unified-input-group')){const wrapper=document.createElement('span');select.before(wrapper);wrapper.append(select);field=wrapper}
 const button=document.createElement('button'),value=document.createElement('span'),arrow=document.createElement('i'),panel=document.createElement('div');
 field.classList.add('ui-platform-select');select.dataset.uiPlatformSelect='';select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 button.type='button';button.className='ui-platform-trigger';button.setAttribute('role','combobox');
 button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
 button.setAttribute('aria-label',select.getAttribute('aria-label')||field.querySelector('.unified-field-name')?.textContent||'平台筛选');
 value.className='ui-platform-value';arrow.className='ui-dropdown-icon';arrow.setAttribute('aria-hidden','true');button.append(value,arrow);
 panel.id='ui-platform-options-'+(++uiPlatformSelectId);panel.className='ui-platform-options';panel.popover='auto';
 panel.setAttribute('role','listbox');panel.setAttribute('aria-label',button.getAttribute('aria-label')+'选项');button.setAttribute('aria-controls',panel.id);
 select.after(button,panel);
 let signature='';
 const isOpen=()=>panel.matches(':popover-open');
 const close=(focus=false)=>{if(isOpen())panel.hidePopover();button.setAttribute('aria-expanded','false');if(uiPlatformActive===control)uiPlatformActive=null;if(focus&&button.isConnected)button.focus({preventScroll:true})};
 const sync=()=>{
  const options=[...select.options],next=JSON.stringify(options.map(o=>[o.value,o.textContent,o.disabled]));
  if(signature!==next){signature=next;uiPlatformPaintOptions(select,panel)}
  const text=select.selectedOptions[0]?.textContent.trim()||'—';
  if(value.textContent!==text)uiPlatformLabel(value,text);
  button.disabled=select.disabled;button.title=text;button.setAttribute('aria-valuetext',text);
  for(const row of panel.querySelectorAll('[data-ui-platform-value]'))row.setAttribute('aria-selected',String(row.dataset.uiPlatformValue===select.value));
 };
 const open=(keyboard=false)=>{
  sync();if(uiPlatformActive&&uiPlatformActive!==control)uiPlatformActive.close();
  panel.showPopover();button.setAttribute('aria-expanded','true');uiPlatformActive=control;uiPlatformPlace(button,panel);
  if(keyboard)(panel.querySelector('[aria-selected=true]:not(:disabled)')||panel.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
 };
 const control={select,button,panel,sync,close};select.uiPlatformControl=control;
 button.onclick=e=>{e.preventDefault();isOpen()?close():open(e.detail===0)};
 button.onkeydown=e=>{
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   e.preventDefault();open(true);const rows=[...panel.querySelectorAll('button:not(:disabled)')];
   if(e.key==='Home')rows[0]?.focus();if(e.key==='End')rows.at(-1)?.focus();
  }
 };
 panel.onclick=e=>{
  const row=e.target.closest('[data-ui-platform-value]');if(!row||row.disabled)return;e.preventDefault();
  const changed=select.value!==row.dataset.uiPlatformValue;select.value=row.dataset.uiPlatformValue;close(e.detail===0);
  if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}))}sync();
 };
 panel.onkeydown=e=>{
  const rows=[...panel.querySelectorAll('button:not(:disabled)')],at=rows.indexOf(document.activeElement);
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?rows.length-1:(at+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;
   rows[index]?.focus();
  }else if(e.key==='Tab')close();
 };
 panel.addEventListener('toggle',()=>{button.setAttribute('aria-expanded',String(isOpen()));if(!isOpen()&&uiPlatformActive===control)uiPlatformActive=null});
 select.addEventListener('change',sync);sync();
}
// Escape先收起平台选项，避免触发父级抽屉的关闭；滚动和缩放时重新定位。
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&uiPlatformActive){e.preventDefault();e.stopImmediatePropagation();uiPlatformActive.close(true)}},true);
function uiPlatformReposition(){if(!uiPlatformActive)return;const {button,panel}=uiPlatformActive;if(!button.isConnected||!button.checkVisibility())uiPlatformActive.close();else uiPlatformPlace(button,panel)}
document.addEventListener('scroll',uiPlatformReposition,true);window.addEventListener('resize',uiPlatformReposition);
