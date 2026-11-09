// 日期区间的公共模型；边界、参考日及快捷项由调用方传入。
const dateRangePresets=[['today','今日'],['yesterday','昨日'],['7','近7日'],['15','近15日'],['30','近30日'],['week','本周'],['lastweek','上周'],['month','本月'],['lastmonth','上月'],['year','本年']];
function dateRangeMonthShift(month,step){const [y,m]=month.split('-').map(Number);return iso(new Date(Date.UTC(y,m-1+step,1))).slice(0,7)}
// 保留经营台账的旧月份入口，统一调用公共月份算法。
function riskMonthShift(month,step){return dateRangeMonthShift(month,step)}
function dateRangePreset(key,reference=dashboardSyncDate()){
 const offset=(new Date(reference+'T00:00:00Z').getUTCDay()+6)%7,month=reference.slice(0,7);
 if(key==='today')return[reference,reference];
 if(key==='yesterday')return[shiftDate(reference,-1),shiftDate(reference,-1)];
 if(['7','15','30'].includes(key))return[shiftDate(reference,1-Number(key)),reference];
 if(key==='week')return[shiftDate(reference,-offset),reference];
 if(key==='lastweek')return[shiftDate(reference,-offset-7),shiftDate(reference,-offset-1)];
 if(key==='month')return[month+'-01',reference];
 if(key==='year')return[reference.slice(0,4)+'-01-01',reference];
 return[dateRangeMonthShift(month,-1)+'-01',shiftDate(month+'-01',-1)];
}
function dateRangeClamp(value,min,max){return value<min?min:value>max?max:value}
function dateRangeMonthMarkup(month,state,{min,max}){
 const [year,m]=month.split('-').map(Number),first=month+'-01',offset=(new Date(first+'T00:00:00Z').getUTCDay()+6)%7,start=shiftDate(first,-offset);
 return `<section class="risk-calendar-month"><h3>${year}年 ${m}月</h3><div class="risk-calendar-week">${['一','二','三','四','五','六','日'].map(n=>`<span>${n}</span>`).join('')}</div><div class="risk-calendar-grid" role="grid" aria-label="${year}年${m}月">${Array.from({length:42},(_,i)=>{
  const day=shiftDate(start,i),outside=day.slice(0,7)!==month,disabled=outside||day<min||day>max;
  const edge=day===state.start||day===state.end,inside=!!(state.start&&state.end)&&day>=state.start&&day<=state.end;
  return `<button type="button" role="gridcell" data-range-date="${day}" aria-label="${day}" aria-selected="${inside}" tabindex="${day===state.focusDate&&!disabled?0:-1}" class="${outside?'outside ':''}${inside?'in-range ':''}${edge?'range-edge ':''}${day===state.start?'range-start ':''}${day===state.end?'range-end':''}" ${disabled?'disabled':''}>${Number(day.slice(8))}</button>`;
 }).join('')}</div></section>`;
}
