// 日期区间的公共模型；边界、参考日及快捷项由调用方传入。
const dateRangePresets=[['today','今日'],['yesterday','昨日'],['7','近7日'],['15','近15日'],['30','近30日'],['week','本周'],['lastweek','上周'],['month','本月'],['lastmonth','上月'],['year','本年']];
function dateRangeMonthShift(month,step){const [y,m]=month.split('-').map(Number);return iso(new Date(Date.UTC(y,m-1+step,1))).slice(0,7)}
// 保留经营台账的旧月份入口，统一调用公共月份算法。
function riskMonthShift(month,step){return dateRangeMonthShift(month,step)}
function dateRangeWeek(date){
 const weekday=(new Date(date+'T00:00:00Z').getUTCDay()+6)%7,start=shiftDate(date,-weekday);
 return {start,end:shiftDate(start,6)};
}
function dateRangePreset(key,reference=dashboardSyncDate()){
 const month=reference.slice(0,7);
 if(key==='today')return[reference,reference];
 if(key==='yesterday')return[shiftDate(reference,-1),shiftDate(reference,-1)];
 if(['7','15','30'].includes(key))return[shiftDate(reference,1-Number(key)),reference];
 if(key==='week')return[dateRangeWeek(reference).start,reference];
 if(key==='lastweek'){const {start,end}=dateRangeWeek(shiftDate(reference,-7));return[start,end]}
 if(key==='month')return[month+'-01',reference];
 if(key==='year')return[reference.slice(0,4)+'-01-01',reference];
 return[dateRangeMonthShift(month,-1)+'-01',shiftDate(month+'-01',-1)];
}
function dateRangeClamp(value,min,max){return value<min?min:value>max?max:value}
function dateRangeWeekRows(month,state,{min,max},first,monthEnd){
 const starts=Array.from({length:6},(_,index)=>shiftDate(first,index*7)).filter(start=>start<=monthEnd);
 const weeks=starts.map(start=>({start,end:shiftDate(start,6)}));
 const available=weeks.filter(({start,end})=>end>=min&&start<=max);
 const focus=available.find(({start,end})=>state.focusDate>=start&&state.focusDate<=end)||available[0];
 return weeks.map(({start,end})=>{
  const disabled=end<min||start>max,selected=!!state.start&&state.start>=start&&state.start<=end;
  const days=Array.from({length:7},(_,index)=>{
   const day=shiftDate(start,index),muted=day.slice(0,7)!==month||day<min||day>max;
   return `<span data-week-day="${day}"${muted?' class="is-muted"':''}>${Number(day.slice(8))}</span>`;
  }).join('');
  return `<button type="button" role="gridcell" data-range-date="${start}" class="risk-calendar-week-row" aria-label="${start} 至 ${end}" aria-selected="${selected}" tabindex="${start===focus?.start?0:-1}" ${disabled?'disabled':''}>${days}</button>`;
 }).join('');
}
function dateRangeMonthMarkup(month,state,{min,max,week=false}){
 const [year,m]=month.split('-').map(Number),first=month+'-01',start=dateRangeWeek(first).start;
 const cells=week?dateRangeWeekRows(month,state,{min,max},start,shiftDate(dateRangeMonthShift(month,1)+'-01',-1)):
  Array.from({length:42},(_,i)=>{
   const day=shiftDate(start,i),outside=day.slice(0,7)!==month,disabled=outside||day<min||day>max;
   const edge=day===state.start||day===state.end,inside=!!(state.start&&state.end)&&day>=state.start&&day<=state.end;
   return `<button type="button" role="gridcell" data-range-date="${day}" aria-label="${day}" aria-selected="${inside}" tabindex="${day===state.focusDate&&!disabled?0:-1}" class="${outside?'outside ':''}${inside?'in-range ':''}${edge?'range-edge ':''}${day===state.start?'range-start ':''}${day===state.end?'range-end':''}" ${disabled?'disabled':''}>${Number(day.slice(8))}</button>`;
  }).join('');
 return `<section class="risk-calendar-month"><h3>${year}年 ${m}月</h3><div class="risk-calendar-week">${['一','二','三','四','五','六','日'].map(n=>`<span>${n}</span>`).join('')}</div><div class="risk-calendar-grid" role="grid" aria-label="${year}年${m}月">${cells}</div></section>`;
}
