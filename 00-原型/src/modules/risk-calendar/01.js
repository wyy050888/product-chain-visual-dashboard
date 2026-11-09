// 风险首页只负责读写本模块期间，日历交互全部交给公共组件。
let riskCalendarHandle=null;
function closeRiskCalendar(focus=true){riskCalendarHandle?.close(focus)}
function openRiskCalendar(){
 if(riskCalendarHandle){closeRiskCalendar();return}
 const trigger=$('#risk-date-trigger'),period=periodFor('risk');
 riskCalendarHandle=openDateRangePicker(trigger,period,riskApplyRange,{
  id:'risk-date-popover',label:'选择风险回看日期',min:riskDateMin,max:dashboardSyncDate,onClose:()=>{riskCalendarHandle=null}
 });
}
document.addEventListener('click',event=>{if(event.target.closest('#risk-date-trigger'))openRiskCalendar()});
