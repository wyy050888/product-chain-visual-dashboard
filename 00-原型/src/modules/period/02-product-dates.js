// 新品与关键产品各自记忆日范围；日历、快捷项和关闭行为复用公共组件。
const productDateScopes=['new','matrix'];
const productDayRanges=Object.fromEntries(productDateScopes.map(id=>[id,{start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF}]));
const productOriginalControls=periodControls,productOriginalChange=changePeriod,productOriginalDescription=periodDescription;
let productCalendarHandle=null;
periodControls=function(id,options={}){
 if(!productDateScopes.includes(id))return productOriginalControls(id,options);
 const p=options.period||periodFor(id);if(p.mode!=='day')return productOriginalControls(id,options);
 const label=moduleNames[id],triggerId='product-date-trigger-'+id;
 return `<div class="period-picker" data-time-scope="${id}"><div class="period-segment" role="group" aria-label="${label}时间粒度">${[['day','日'],['month','月'],['quarter','季'],['year','年']].map(([mode,name])=>`<button type="button" data-time-mode="${mode}" aria-pressed="${mode==='day'}">${name}</button>`).join('')}</div><button type="button" id="${triggerId}" class="risk-date-trigger" data-product-date="${id}" aria-label="选择${label}日期" aria-haspopup="dialog" aria-expanded="false" aria-controls="product-date-popover"><span>${p.start} — ${p.end}</span><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14"/></svg></button></div>`;
};
periodDescription=function(id){return productDateScopes.includes(id)&&periodFor(id).mode==='day'?'':productOriginalDescription(id)};
function productApplyDateRange(id,start,end){
 dashboardSyncDate();
 if(!productDateScopes.includes(id)||!riskValidDate(start)||!riskValidDate(end)||start<riskDateMin||end>DATA_CUTOFF||start>end)return false;
 productDayRanges[id]={start,end};
 localPeriods[id]={mode:'day',year:+end.slice(0,4),value:+end.slice(5,7),start,end};
 renderTimeControls(id);renderModule(id);return true;
}
changePeriod=function(id,field,value){
 if(!productDateScopes.includes(id))return productOriginalChange(id,field,value);
 if(field==='mode'&&value==='day'){
  if(periodFor(id).mode==='day')return;
  const {start,end}=productDayRanges[id];return productApplyDateRange(id,start,end);
 }
 if(field==='mode'&&periodFor(id).mode==='day'){
  const {end}=periodFor(id);localPeriods[id]={mode:'month',year:+end.slice(0,4),value:+end.slice(5,7)};
 }
 return productOriginalChange(id,field,value);
};
document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-product-date]');if(!trigger)return;
 if(productCalendarHandle?.trigger===trigger){productCalendarHandle.close();return}
 const id=trigger.dataset.productDate;
 const handle=openDateRangePicker(trigger,periodFor(id),(start,end)=>productApplyDateRange(id,start,end),{
  id:'product-date-popover',label:'选择'+moduleNames[id]+'日期',min:riskDateMin,max:dashboardSyncDate,
  onClose:()=>{productCalendarHandle=null}
 });
 productCalendarHandle={...handle,trigger};
});
