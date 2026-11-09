// 抽屉与业务日期仅传入期间及边界，不单独维护选区或弹层事件。
let upCalendarClose=null;
function upOpenCalendar(trigger,range,apply,options={}){
 const handle=openDateRangePicker(trigger,range,apply,{
  min:riskDateMin,max:dashboardSyncDate,label:'选择产品详情日期',...options,id:'up-date-popover',onClose:()=>{upCalendarClose=null;options.onClose?.()}
 });
 upCalendarClose=handle.close;
}
