// 日筛选控制风险回看范围与截止日；各榜单保留自身业务统计口径。
const riskDateMin='2025-01-01';
const riskDayRange={start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF};
localPeriods.risk={mode:'day',year:+DATA_CUTOFF.slice(0,4),value:+DATA_CUTOFF.slice(5,7),...riskDayRange};
const riskDateControls=periodControls,riskDateChange=changePeriod;
periodControls=function(id){
  if(id!=='risk')return riskDateControls(id);
  const p=periodFor(id);
  if(p.mode!=='day')return riskDateControls(id).replace(/(<div class="period-segment"[^>]*>)/,'$1<button type="button" data-risk-day aria-pressed="false">日</button>');
  return `<div class="period-picker" data-time-scope="risk"><div class="period-segment" role="group" aria-label="高危预警时间粒度"><button type="button" data-risk-day aria-pressed="true">日</button>${[['month','月'],['quarter','季'],['year','年']].map(([key,name])=>`<button type="button" data-time-mode="${key}" aria-pressed="false">${name}</button>`).join('')}</div><button type="button" id="risk-date-trigger" class="risk-date-trigger" aria-label="选择风险回看日期" aria-haspopup="dialog" aria-expanded="false" aria-controls="risk-date-popover"><span>${p.start} — ${p.end}</span><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14"/></svg></button></div>`;
};
changePeriod=function(id,field,value){
  if(id==='risk'&&field==='mode'&&periodFor(id).mode==='day'){
    const end=periodFor(id).end;
    localPeriods.risk={mode:'month',year:+end.slice(0,4),value:+end.slice(5,7)};
  }
  return riskDateChange(id,field,value);
};
function riskValidDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&iso(new Date(value+'T00:00:00Z'))===value}
function riskApplyRange(start,end){
  if(!riskValidDate(start)||!riskValidDate(end)||start<riskDateMin||end>DATA_CUTOFF||start>end)return false;
  Object.assign(riskDayRange,{start,end});
  localPeriods.risk={mode:'day',year:+end.slice(0,4),value:+end.slice(5,7),start,end};
  renderTimeControls();renderRisks();return true;
}
const riskDateDescription=periodDescription;
periodDescription=function(id){return id==='risk'&&periodFor(id).mode==='day'?'':riskDateDescription(id)};
document.addEventListener('click',event=>{
  if(event.target.closest('[data-risk-day]'))riskApplyRange(riskDayRange.start,riskDayRange.end);
});
