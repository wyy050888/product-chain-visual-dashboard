// 任务登记日期独立于其他诊断期间，默认不限；计划日期与登记日期取交集。
const gdTaskDayRange={...gdDayRange};
function gdTaskCurrentPeriod(){return gdState.taskPeriod||drawerPeriodFromRange(gdTaskDayRange)}
function gdTaskRegistrationRange(){return gdState.taskPeriod?uiNaturalPeriodRange(gdState.taskPeriod,DATA_CUTOFF):{start:'',end:''}}
function gdApplyTaskPeriod(period){
 const range=uiNaturalPeriodRange(period,DATA_CUTOFF);if(!range)return false;
 upCalendarClose?.(false);gdState.taskPeriod={...period};if(period.mode==='day')Object.assign(gdTaskDayRange,range);gdRefreshFilters(true);return true;
}
function gdClearTaskRegistration(){gdState.taskPeriod=null;gdRefreshFilters(true)}

function gdTaskDatesMatch(task,issued=gdTaskRegistrationRange()){
 const date=task.registrationDate||upTodoDate(task.assignedAt),due=gdState.taskDueRange;
 if(issued.start&&(!uiPeriodValidDate(date)||date<issued.start||date>issued.end))return false;
 return !due.start||uiPeriodValidDate(task.due)&&task.due>=due.start&&task.due<=due.end;
}
function gdTaskDueFilterMarkup(){
 const range=gdState.taskDueRange,label=range.start?range.start.slice(2).replaceAll('-','/')+' — '+range.end.slice(2).replaceAll('-','/'):'请选择';
 return `<div class="gd-task-due-filter ui-business-filters"><button type="button" class="unified-input-group gd-task-due-trigger" data-gd-due-range aria-label="选择任务计划完成日期范围" aria-haspopup="dialog" aria-expanded="false" aria-controls="gd-task-due-popover"><span class="unified-field-name">计划完成日期</span><span data-gd-due-value class="${range.start?'':'is-placeholder'}">${esc(label)}</span><i class="ui-dropdown-icon" aria-hidden="true"></i></button><button type="button" class="gd-task-due-clear" data-gd-due-clear aria-label="清空计划完成日期" ${range.start?'':'hidden'}>×</button></div>`;
}
function gdApplyTaskDueRange(start,end){
 if((start||end)&&(!uiPeriodValidDate(start)||!uiPeriodValidDate(end)||start>end))return false;
 gdState.taskDueRange={start,end};gdRefreshFilters(true);return true;
}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-gd-registration-clear]')){gdClearTaskRegistration();return}
 const clear=event.target.closest('[data-gd-due-clear]');
 if(clear){
  if(dateRangeActive?.panel.id==='gd-task-due-popover')dateRangeActive.close();
  gdApplyTaskDueRange('','');document.querySelector('[data-gd-due-range]')?.focus({preventScroll:true});return;
 }
 const trigger=event.target.closest('[data-gd-due-range]');if(!trigger)return;
 if(dateRangeActive?.panel.id==='gd-task-due-popover'){dateRangeActive.close();return}
 openDateRangePicker(trigger,gdState.taskDueRange,gdApplyTaskDueRange,{
  id:'gd-task-due-popover',label:'选择任务计划完成日期范围',min:riskDateMin,max:'9999-12-31',clearable:true
 });
});
