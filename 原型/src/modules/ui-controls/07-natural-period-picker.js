// 与现有自然期间控件共用样式、标签及期间算法；调用方负责持久化筛选值。
function uiBindNaturalPeriod({trigger,panel,getSelection,getMaxDate,onApply}){
 const events=new AbortController();let floating=null,state=null;
 const position=()=>{
  if(!panel.isConnected||!panel.matches(':popover-open'))return;
  const anchor=trigger.getBoundingClientRect(),box=panel.getBoundingClientRect();
  panel.style.left=Math.max(8,Math.min(anchor.left,innerWidth-box.width-8))+'px';
  panel.style.top=Math.max(8,Math.min(anchor.bottom+8+box.height<=innerHeight?anchor.bottom+8:anchor.top-box.height-8,innerHeight-box.height-8))+'px';
 };
 const close=()=>{floating?.abort();floating=null;if(panel.isConnected&&panel.matches(':popover-open'))panel.hidePopover()};
 const render=focus=>{
  panel.dataset.periodMode=state.mode;panel.innerHTML=uiNaturalPeriodMarkup(state,getSelection(),getMaxDate());position();
  if(focus)panel.querySelector(focus)?.focus({preventScroll:true});
 };
 const apply=selection=>{
  const range=uiNaturalPeriodRange(selection,getMaxDate());if(!range)return;
  close();onApply(selection.mode==='day'?{...selection,...range}:selection,range);trigger.isConnected&&trigger.focus({preventScroll:true});
 };
 trigger.addEventListener('click',()=>{
  if(panel.matches(':popover-open')){close();return}
  const selected=getSelection(),fallback=getMaxDate()||dashboardToday(),anchor=selected?.mode==='day'?selected.start:fallback;
  state={mode:selected?.mode||'day',year:selected?.year||Number(anchor.slice(0,4)),month:selected?.mode==='month'?selected.value:Number(anchor.slice(5,7)),draft:selected?.mode==='day'?{start:selected.start,end:selected.end}:{start:null,end:null},awaitingEnd:false};
  render();panel.showPopover();position();panel.querySelector(`[data-natural-mode="${state.mode}"]`)?.focus({preventScroll:true});
 },{signal:events.signal});
 panel.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||button.disabled)return;const d=button.dataset;
  if(d.naturalMode){state.mode=d.naturalMode;state.awaitingEnd=false;const selected=getSelection();state.draft=selected?.mode==='day'?{start:selected.start,end:selected.end}:{start:null,end:null};render(`[data-natural-mode="${state.mode}"]`)}
  else if(d.naturalYearStep){state.year=Math.max(1,Math.min(9998,state.year+Number(d.naturalYearStep)*(state.mode==='year'?9:1)));render(`[data-natural-year-step="${d.naturalYearStep}"]`)}
  else if(d.naturalMonthStep){
   const date=uiPeriodDate(state.year,state.month+Number(d.naturalMonthStep),1);state.year=Math.max(1,Math.min(9998,Number(date.slice(0,4))));state.month=Number(date.slice(5,7));render(`[data-natural-month-step="${d.naturalMonthStep}"]`);
  }else if(d.naturalValue){const value=Number(d.naturalValue);apply({mode:state.mode,year:state.mode==='year'?value:state.year,value:state.mode==='year'?1:value})}
  else if(d.naturalDay){
   if(!state.awaitingEnd){
    state.draft={start:d.naturalDay,end:d.naturalDay};state.awaitingEnd=true;render(`[data-natural-day="${d.naturalDay}"]`);
   }else{
    const dates=[state.draft.start,d.naturalDay].sort();state.awaitingEnd=false;
    apply({mode:'day',year:Number(dates[0].slice(0,4)),start:dates[0],end:dates[1]});
   }
  }
 },{signal:events.signal});
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();trigger.focus({preventScroll:true})}},{signal:events.signal});
 panel.addEventListener('toggle',()=>{
  const open=panel.matches(':popover-open');trigger.setAttribute('aria-expanded',String(open));floating?.abort();floating=null;
  if(open){floating=new AbortController();window.addEventListener('resize',position,{signal:floating.signal});document.addEventListener('scroll',position,{capture:true,signal:floating.signal})}
 },{signal:events.signal});
 return {destroy(){close();events.abort()}};
}
