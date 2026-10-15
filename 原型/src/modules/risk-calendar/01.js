// 快捷日期即时应用；手选范围在选完结束日后应用，未选完时关闭不改变筛选。
const riskCalendar={panel:null,start:'',end:'',anchor:'',month:'',preset:'',focusDate:''};
function riskCalendarCount(){return innerWidth<=700?1:2}
function riskCalendarFirst(end){return riskMonthShift(end.slice(0,7),1-riskCalendarCount())}
function riskMonthShift(month,step){const [y,m]=month.split('-').map(Number);return iso(new Date(Date.UTC(y,m-1+step,1))).slice(0,7)}
function riskPresetRange(key){
  const end=DATA_CUTOFF,date=new Date(end+'T00:00:00Z'),offset=(date.getUTCDay()+6)%7,month=end.slice(0,7);
  if(key==='today')return[end,end];
  if(key==='yesterday')return[shiftDate(end,-1),shiftDate(end,-1)];
  if(['7','15','30'].includes(key))return[shiftDate(end,1-Number(key)),end];
  if(key==='week')return[shiftDate(end,-offset),end];
  if(key==='lastweek')return[shiftDate(end,-offset-7),shiftDate(end,-offset-1)];
  if(key==='month')return[month+'-01',end];
  const previous=riskMonthShift(month,-1);return[previous+'-01',shiftDate(month+'-01',-1)];
}
const riskDatePresets=[['today','今日'],['yesterday','昨日'],['7','近7日'],['15','近15日'],['30','近30日'],['week','本周'],['lastweek','上周'],['month','本月'],['lastmonth','上月']];
function riskCalendarMonth(month){
  const [year,m]=month.split('-').map(Number),first=month+'-01',offset=(new Date(first+'T00:00:00Z').getUTCDay()+6)%7;
  const start=shiftDate(first,-offset),focus=riskCalendar.focusDate||riskCalendar.start;
  return `<section class="risk-calendar-month"><h3>${year}年 ${m}月</h3><div class="risk-calendar-week">${['一','二','三','四','五','六','日'].map(n=>`<span>${n}</span>`).join('')}</div><div class="risk-calendar-grid" role="grid" aria-label="${year}年${m}月">${Array.from({length:42},(_,i)=>{
    const day=shiftDate(start,i),outside=day.slice(0,7)!==month,disabled=outside||day<riskDateMin||day>DATA_CUTOFF;
    const edge=day===riskCalendar.start||day===riskCalendar.end,inside=day>=riskCalendar.start&&day<=riskCalendar.end;
    return `<button type="button" role="gridcell" data-risk-date="${day}" aria-label="${day}" aria-selected="${inside}" tabindex="${day===focus&&!disabled?0:-1}" class="${outside?'outside ':''}${inside?'in-range ':''}${edge?'range-edge ':''}${day===riskCalendar.start?'range-start ':''}${day===riskCalendar.end?'range-end':''}" ${disabled?'disabled':''}>${Number(day.slice(8))}</button>`;
  }).join('')}</div></section>`;
}
function positionRiskCalendar(){
  const panel=riskCalendar.panel,trigger=$('#risk-date-trigger');if(!panel||!trigger)return;
  const r=trigger.getBoundingClientRect(),w=panel.offsetWidth,h=panel.offsetHeight;
  panel.style.left=Math.max(12,Math.min(innerWidth-w-12,r.right-w))+'px';
  panel.style.top=Math.max(12,Math.min(innerHeight-h-12,r.bottom+8))+'px';
}
function renderRiskCalendar(){
  const panel=riskCalendar.panel;if(!panel)return;
  panel.innerHTML=`<div class="risk-calendar-body"><nav class="risk-calendar-presets" aria-label="快捷日期">${riskDatePresets.map(([key,name])=>`<button type="button" data-risk-preset="${key}" aria-pressed="${riskCalendar.preset===key}">${name}</button>`).join('')}</nav><div class="risk-calendar-months"><div class="risk-calendar-nav"><button type="button" data-risk-month="-1" aria-label="上一月" ${riskCalendar.month<=riskDateMin.slice(0,7)?'disabled':''}>‹</button><button type="button" data-risk-month="1" aria-label="下一月" ${riskMonthShift(riskCalendar.month,riskCalendarCount()-1)>=DATA_CUTOFF.slice(0,7)?'disabled':''}>›</button></div>${riskCalendarMonth(riskCalendar.month)}${riskCalendarCount()===2?riskCalendarMonth(riskMonthShift(riskCalendar.month,1)):''}</div></div>`;
  positionRiskCalendar();
}
function closeRiskCalendar(focus=true){
  riskCalendar.panel?.remove();riskCalendar.panel=null;
  const trigger=$('#risk-date-trigger');trigger?.setAttribute('aria-expanded','false');
  if(focus)trigger?.focus({preventScroll:true});
}
function openRiskCalendar(){
  if(riskCalendar.panel){closeRiskCalendar();return}
  const p=periodFor('risk');Object.assign(riskCalendar,{start:p.start,end:p.end,anchor:'',month:riskCalendarFirst(p.end),focusDate:p.start,preset:''});
  riskCalendar.preset=riskDatePresets.find(([key])=>{const range=riskPresetRange(key);return range[0]===p.start&&range[1]===p.end})?.[0]||'';
  const panel=document.createElement('div');panel.id='risk-date-popover';panel.className='risk-date-popover';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','选择风险回看日期');document.body.append(panel);riskCalendar.panel=panel;
  $('#risk-date-trigger').setAttribute('aria-expanded','true');renderRiskCalendar();
  panel.querySelector(`[data-risk-preset="${riskCalendar.preset}"]`)?.focus({preventScroll:true});
  if(!riskCalendar.preset)(panel.querySelector('[tabindex="0"]')||panel.querySelector('button:not(:disabled)')).focus({preventScroll:true});
}
document.addEventListener('click',event=>{
  if(event.target.closest('#risk-date-trigger'))return openRiskCalendar();
  const button=event.target.closest('#risk-date-popover button');if(!button)return;
  if(button.dataset.riskPreset){
    const [start,end]=riskPresetRange(button.dataset.riskPreset);
    if(riskApplyRange(start,end))closeRiskCalendar();
  }else if(button.dataset.riskMonth){riskCalendar.month=riskMonthShift(riskCalendar.month,Number(button.dataset.riskMonth));renderRiskCalendar();riskCalendar.panel.querySelector(`[data-risk-month="${button.dataset.riskMonth}"]`).focus({preventScroll:true})}
  else if(button.dataset.riskDate){
    const day=button.dataset.riskDate;riskCalendar.preset='';riskCalendar.focusDate=day;
    if(!riskCalendar.anchor){riskCalendar.anchor=day;riskCalendar.start=riskCalendar.end=day}
    else{
      const [start,end]=[riskCalendar.anchor,day].sort();
      if(riskApplyRange(start,end))closeRiskCalendar();
      return;
    }
    renderRiskCalendar();riskCalendar.panel.querySelector(`[data-risk-date="${day}"]:not(:disabled)`)?.focus({preventScroll:true});
  }
});
document.addEventListener('pointerdown',event=>{if(riskCalendar.panel&&!event.target.closest('#risk-date-popover,#risk-date-trigger'))closeRiskCalendar(false)});
document.addEventListener('keydown',event=>{
  if(!riskCalendar.panel)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeRiskCalendar();return}
  if(event.key==='Tab'){
    const controls=[...riskCalendar.panel.querySelectorAll('button:not(:disabled)')].filter(n=>n.checkVisibility()&&n.tabIndex>=0),first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
  const date=event.target.dataset.riskDate;if(!date)return;
  const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(offsets[event.key]===undefined)return;
  event.preventDefault();const next=shiftDate(date,offsets[event.key]);if(next<riskDateMin||next>DATA_CUTOFF)return;
  riskCalendar.focusDate=next;
  if(next.slice(0,7)<riskCalendar.month)riskCalendar.month=next.slice(0,7);
  if(next.slice(0,7)>riskMonthShift(riskCalendar.month,riskCalendarCount()-1))riskCalendar.month=riskCalendarFirst(next);
  renderRiskCalendar();riskCalendar.panel.querySelector(`[data-risk-date="${next}"]:not(:disabled)`)?.focus({preventScroll:true});
});
window.addEventListener('resize',()=>{if(riskCalendar.panel){riskCalendar.month=riskCalendarFirst(riskCalendar.end);renderRiskCalendar()}});
// 点击远处卡片后返回日期按钮可能触发延迟滚动；可见时跟随定位，不误关弹层。
window.addEventListener('scroll',event=>{if(!riskCalendar.panel||riskCalendar.panel.contains(event.target))return;const r=$('#risk-date-trigger')?.getBoundingClientRect();if(!r||r.bottom<0||r.top>innerHeight)closeRiskCalendar(false);else positionRiskCalendar()},true);
