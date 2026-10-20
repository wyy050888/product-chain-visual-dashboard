// 唯一日期弹层控制器：选区、快捷项、键盘、定位及关闭均由此维护。
let dateRangeActive=null;
function openDateRangePicker(trigger,range,apply,options){
 dateRangeActive?.close(false);
 const {presets=dateRangePresets,id='date-range-popover',label='选择日期范围',clearable=false,onClose}=options;
 const resolve=value=>typeof value==='function'?value():value;
 let min,max;
 function refreshBounds(){dashboardSyncDate();min=resolve(options.min);max=resolve(options.max)||DATA_CUTOFF}
 refreshBounds();
 const panel=document.createElement('div');panel.id=id;panel.className='risk-date-popover';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',label);
 const initial=dateRangeClamp(range.end||range.start||dashboardToday(),min,max),state={start:range.start||'',end:range.end||'',anchor:'',focusDate:range.start||initial,month:'',preset:''};
 const count=()=>innerWidth<=700?1:2,firstMonth=date=>dateRangeMonthShift(date.slice(0,7),1-count());
 state.month=firstMonth(initial);
 const presetRange=key=>{refreshBounds();return dateRangePreset(key).map(date=>dateRangeClamp(date,min,max))};
 state.preset=presets.find(([key])=>{const [start,end]=presetRange(key);return state.start===start&&state.end===end})?.[0]||'';
 const events=new AbortController(),handle={panel,close};dateRangeActive=handle;
 document.body.append(panel);trigger.setAttribute('aria-expanded','true');
 function close(focus=true){
  if(dateRangeActive!==handle)return;dateRangeActive=null;
  events.abort();observer.disconnect();panel.remove();trigger.setAttribute('aria-expanded','false');onClose?.();
  if(focus&&trigger.isConnected&&trigger.checkVisibility())trigger.focus({preventScroll:true});
 }
 function position(){
  if(!trigger.isConnected||!trigger.checkVisibility()){close(false);return}
  const r=trigger.getBoundingClientRect();
  if(r.bottom<0||r.top>innerHeight){close(false);return}
  panel.style.left=Math.max(8,Math.min(innerWidth-panel.offsetWidth-8,r.right-panel.offsetWidth))+'px';
  panel.style.top=Math.max(8,Math.min(innerHeight-panel.offsetHeight-8,r.bottom+8))+'px';
 }
 function render(focus){
  refreshBounds();
  panel.innerHTML=`<div class="risk-calendar-body"><nav class="risk-calendar-presets" aria-label="快捷日期">${presets.map(([key,name])=>`<button type="button" data-range-preset="${esc(key)}" aria-pressed="${state.preset===key}">${esc(name)}</button>`).join('')}${clearable?'<button type="button" data-range-clear>清空</button>':''}</nav><div class="risk-calendar-months"><div class="risk-calendar-nav"><button type="button" data-range-month="-1" aria-label="上一月" ${state.month<=min.slice(0,7)?'disabled':''}>‹</button><button type="button" data-range-month="1" aria-label="下一月" ${dateRangeMonthShift(state.month,count()-1)>=max.slice(0,7)?'disabled':''}>›</button></div>${Array.from({length:count()},(_,i)=>dateRangeMonthMarkup(dateRangeMonthShift(state.month,i),state,{min,max})).join('')}</div></div>`;
  position();if(focus)panel.querySelector(focus)?.focus({preventScroll:true});
 }
 function commit(start,end){close();apply(start,end)}
 panel.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.hasAttribute('data-range-clear')){commit('','');return}
  const {rangePreset,rangeMonth,rangeDate}=button.dataset;
  if(rangePreset){commit(...presetRange(rangePreset));return}
  if(rangeMonth){state.month=dateRangeMonthShift(state.month,Number(rangeMonth));render(`[data-range-month="${rangeMonth}"]`);return}
  if(rangeDate){state.focusDate=rangeDate;state.preset='';
   if(state.anchor){commit(...[state.anchor,rangeDate].sort());return}
   state.start=state.end=state.anchor=rangeDate;render(`[data-range-date="${rangeDate}"]:not(:disabled)`);
  }
 },{signal:events.signal});
 window.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return}
  if(!panel.contains(event.target))return;
  const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7},date=event.target.dataset.rangeDate;
  if(date&&offsets[event.key]!==undefined){
   event.preventDefault();event.stopImmediatePropagation();const next=shiftDate(date,offsets[event.key]);if(next<min||next>max)return;
   state.focusDate=next;if(next.slice(0,7)<state.month||next.slice(0,7)>dateRangeMonthShift(state.month,count()-1))state.month=firstMonth(next);
   render(`[data-range-date="${next}"]:not(:disabled)`);
  }
  if(event.key==='Tab'){
   const controls=[...panel.querySelectorAll('button:not(:disabled)')].filter(node=>node.tabIndex>=0&&node.checkVisibility());
   if(event.shiftKey&&event.target===controls[0]){event.preventDefault();controls.at(-1)?.focus()}
   else if(!event.shiftKey&&event.target===controls.at(-1)){event.preventDefault();controls[0]?.focus()}
  }
 },{capture:true,signal:events.signal});
 document.addEventListener('pointerdown',event=>{if(!panel.contains(event.target)&&!trigger.contains(event.target))close(false)},{signal:events.signal});
 window.addEventListener('resize',()=>{state.month=firstMonth(state.focusDate||initial);render()},{signal:events.signal});
 window.addEventListener('scroll',event=>{if(!panel.contains(event.target))position()},{capture:true,signal:events.signal});
 const observer=new MutationObserver(()=>{if(!trigger.isConnected||!trigger.checkVisibility())close(false)});
 observer.observe(document.body,{childList:true,subtree:true});
 for(const owner of [trigger.closest('#overlay'),trigger.closest('section.section')].filter(Boolean))observer.observe(owner,{attributes:true,attributeFilter:['hidden','class']});
 render();
 const focus=panel.querySelector('[data-range-preset="'+state.preset+'"]')||panel.querySelector('[tabindex="0"]:not(:disabled)')||panel.querySelector('button:not(:disabled)');
 focus?.focus({preventScroll:true});focus?.scrollIntoView({block:'nearest',inline:'nearest'});
 return handle;
}
