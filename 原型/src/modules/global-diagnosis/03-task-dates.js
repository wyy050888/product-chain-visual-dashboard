// 右上角筛下发日，计划日为可清空的附加条件；两者取交集。
function gdTaskDatesMatch(task,issued=gdRange()){
 const date=upTodoDate(task.assignedAt),due=gdState.taskDueRange;
 if(!uiPeriodValidDate(date)||date<issued.start||date>issued.end)return false;
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
