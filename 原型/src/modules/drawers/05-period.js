// 抽屉复用外侧日/月/季/年控件，隔离事件和状态，不回写外侧期间。
function drawerWithPeriod(period,run){
 const prior=localPeriods.risk;localPeriods.risk=period;
 try{return withPeriod('risk',run)}finally{if(prior)localPeriods.risk=prior;else delete localPeriods.risk}
}
function drawerPeriodFromRange(range){return {mode:'day',year:+range.end.slice(0,4),value:+range.end.slice(5,7),start:range.start,end:range.end}}
function drawerMountPeriod(host,initial,onChange,triggerId){
 let period={...initial},dayRange=upWindow(period);
 function render(){
  host.innerHTML=drawerWithPeriod(period,()=>periodControls('risk'))
   .replaceAll('data-time-','data-drawer-time-').replaceAll('data-risk-day','data-drawer-time-day')
   .replace('id="risk-date-trigger"','id="'+triggerId+'"').replace('aria-controls="risk-date-popover"','aria-controls="up-date-popover"');
  host.querySelector('.follow-time')?.remove();
  host.querySelector('.period-segment').setAttribute('aria-label','抽屉时间粒度');
  const picker=host.querySelector('.period-picker');picker.onclick=handleClick;picker.onchange=handleChange;
  const trigger=host.querySelector('.risk-date-trigger');
  if(trigger){trigger.setAttribute('aria-label','选择抽屉日期');trigger.onclick=()=>upOpenCalendar(trigger,dayRange,(start,end)=>{dayRange={start,end};apply(drawerPeriodFromRange(dayRange))})}
 }
 function apply(next){upCalendarClose?.(false);period=next;render();onChange({...period},upWindow(period))}
 function handleClick(e){
  const button=e.target.closest('[data-drawer-time-mode],[data-drawer-time-day]');if(!button)return;
  if(button.hasAttribute('data-drawer-time-day')){apply(drawerPeriodFromRange(dayRange));return}
  const mode=button.dataset.drawerTimeMode,range=upWindow(period);
  const month=period.mode==='day'?+range.end.slice(5,7):period.mode==='month'?period.value:period.mode==='quarter'?period.value*3:12;
  apply(normalizePeriod({mode,year:period.year,value:mode==='month'?month:mode==='quarter'?Math.ceil(month/3):1}));
 };
 function handleChange(e){
  if(!e.target.matches('[data-drawer-time-year],[data-drawer-time-value]'))return;
  const next={...period};next[e.target.hasAttribute('data-drawer-time-year')?'year':'value']=+e.target.value;apply(normalizePeriod(next));
 };
 render();
}
