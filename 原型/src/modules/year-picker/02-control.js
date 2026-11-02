let uiYearSequence=0,uiYearActive=null;
// 仅在本控件上同步程序赋值；不劫持全局原型，也不额外派发业务事件。
function uiYearWatchSelection(select){
 for(const key of ['value','selectedIndex']){
  if(Object.hasOwn(select,key))continue;
  const native=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,key);
  Object.defineProperty(select,key,{configurable:true,get:native.get,set(value){const before=native.get.call(this);native.set.call(this,value);if(native.get.call(this)!==before)this.uiYearControl?.sync()}});
 }
}
function uiYearMount(select,style){
 if(select.uiYearControl?.field.contains(select)){select.uiYearControl.sync();return}
 if(select.hidden||!uiYearOptions(select))return;
 let field=select.closest('.ui-year-field'),button=field?.querySelector(':scope>.ui-year-trigger'),panel=field?.querySelector(':scope>.ui-year-panel');
 if((!field||!button)&&!style)return;
 if(!field){
  field=document.createElement('span');field.className='ui-year-field';
  const width=parseFloat(style.width);field.style.width=Number.isFinite(width)&&width>0?width+'px':'104px';field.style.flex=style.flex;
  select.before(field);field.append(select);select.style.height=style.height;
 }
 if(!button){
  button=document.createElement('button');button.type='button';button.className='ui-year-trigger';
  for(const property of uiYearStyleProperties)button.style[property]=style[property];
  button.innerHTML='<span class="ui-year-value"></span><i aria-hidden="true"></i>';field.append(button);
 }
 if(!panel){panel=document.createElement('div');panel.className='ui-year-panel';panel.popover='auto';field.append(panel)}
 panel.id='ui-year-panel-'+(++uiYearSequence);panel.setAttribute('role','dialog');panel.setAttribute('aria-label',uiYearLabel(select));
 select.dataset.uiYearSource='';select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-label',uiYearLabel(select));
 const isOpen=()=>panel.matches(':popover-open');
 const close=(focus=false)=>{if(isOpen())panel.hidePopover();button.setAttribute('aria-expanded','false');if(uiYearActive===control)uiYearActive=null;if(focus&&button.isConnected)button.focus({preventScroll:true})};
 const value=button.querySelector('.ui-year-value');
 const fingerprint=()=>JSON.stringify([...select.options].map(o=>[o.value,o.textContent,o.selected,o.disabled,!!o.closest('optgroup')?.disabled]));
 let signature='';
 const sync=()=>{
  const text=select.selectedOptions[0]?.textContent.trim()||'请选择年份';
  if(value.textContent!==text)value.textContent=text;
  if(button.disabled!==select.disabled)button.disabled=select.disabled;if(field.hidden!==select.hidden)field.hidden=select.hidden;
  if(button.getAttribute('aria-valuetext')!==text)button.setAttribute('aria-valuetext',text);
  if(isOpen()){const next=fingerprint();if(next!==signature){uiYearPaint(control);uiYearReposition()}signature=next}
 };
 const open=(keyboard=false)=>{
  sync();if(button.disabled)return;if(uiYearActive&&uiYearActive!==control)uiYearActive.close();
  const rows=uiYearOptions(select),year=rows.find(row=>row.option.selected&&row.year)?.year||Math.max(...rows.filter(row=>row.year).map(row=>row.year));
  control.decade=Math.floor(year/10)*10;uiYearPaint(control);signature=fingerprint();panel.showPopover();button.setAttribute('aria-expanded','true');uiYearActive=control;uiYearPlace(control);
  if(keyboard)(panel.querySelector('[aria-pressed=true]:not(:disabled)')||panel.querySelector('[data-ui-year-value]:not(:disabled)'))?.focus({preventScroll:true});
 };
 const control={select,field,button,panel,decade:2020,sync,close};select.uiYearControl=control;uiYearWatchSelection(select);
 button.onclick=e=>{e.preventDefault();e.stopPropagation();isOpen()?close():open(e.detail===0)};
 button.onkeydown=e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();open(true)}};
 panel.onclick=e=>{
  const chosen=e.target.closest('button');if(!chosen||chosen.disabled)return;e.preventDefault();e.stopPropagation();
  if(chosen.hasAttribute('data-ui-year-step')){control.decade+=Number(chosen.dataset.uiYearStep)*10;uiYearPaint(control);uiYearPlace(control);panel.querySelector('[data-ui-year-step="'+chosen.dataset.uiYearStep+'"]:not(:disabled)')?.focus({preventScroll:true});return}
  const rows=uiYearOptions(select),row=rows.find(row=>chosen.hasAttribute('data-ui-year-clear')?!row.year:row.year===Number(chosen.dataset.uiYearValue));if(!row)return;
  const changed=select.value!==row.option.value,id=select.id,label=uiYearLabel(select),scope=select.closest('[id]')?.id;
  close();select.value=row.option.value;if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}))}sync();
  requestAnimationFrame(()=>{const source=id?document.getElementById(id):(document.getElementById(scope)||document).querySelector('select[aria-label="'+CSS.escape(label)+'"]');(source?.uiYearControl?.button||button).isConnected&&(source?.uiYearControl?.button||button).focus({preventScroll:true})});
 };
 panel.onkeydown=e=>{
  if(e.key==='Tab'){close();return}
  const buttons=[...panel.querySelectorAll('[data-ui-year-value]')],index=buttons.indexOf(e.target),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[e.key];
  if(index<0||delta===undefined&&!['Home','End'].includes(e.key))return;e.preventDefault();
  let next=e.key==='Home'?0:e.key==='End'?buttons.length-1:index+delta;
  while(next>=0&&next<buttons.length&&buttons[next].disabled)next+=delta|| (e.key==='Home'?1:-1);
  if(buttons[next]&&!buttons[next].disabled)buttons[next].focus({preventScroll:true});
 };
 panel.addEventListener('toggle',()=>{button.setAttribute('aria-expanded',String(isOpen()));if(!isOpen()&&uiYearActive===control)uiYearActive=null});sync();
}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&uiYearActive){e.preventDefault();e.stopImmediatePropagation();uiYearActive.close(true)}},true);
// 连续滚动与窗口变化合并到同一帧；只有打开的弹层读取位置。
let uiYearPositionFrame=0;
function uiYearReposition(){
 if(!uiYearActive||uiYearPositionFrame)return;
 uiYearPositionFrame=requestAnimationFrame(()=>{uiYearPositionFrame=0;const control=uiYearActive;if(!control)return;if(!control.select.isConnected||!control.button.checkVisibility())control.close();else uiYearPlace(control)});
}
document.addEventListener('scroll',uiYearReposition,true);window.addEventListener('resize',uiYearReposition);
