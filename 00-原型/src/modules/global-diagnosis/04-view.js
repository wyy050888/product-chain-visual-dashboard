function gdTimeControls(period=gdState.period){
 // 复用高危预警期间组件及公共日历，仅替换事件命名以隔离筛选状态。
 return drawerWithPeriod(period,()=>periodControls('risk'))
  .replace('data-time-scope="risk"','data-gd-period').replaceAll('高危预警','总诊断')
  .replaceAll('data-time-mode','data-gd-mode').replaceAll('data-risk-day','data-gd-mode="day"')
  .replaceAll('data-time-year','data-gd-year').replaceAll('data-time-value','data-gd-value')
  .replace('id="risk-date-trigger"','id="gd-date-trigger"').replace('选择风险回看日期','选择诊断日期')
  .replace('aria-controls="risk-date-popover"','aria-controls="up-date-popover"')
  .replace(/<button class="follow-time[^>]*>[^<]*<\/button>/,'');
}

function gdMountHeader(section){
 const header=section.querySelector(':scope>.sectionhead');let tools=header.querySelector('[data-gd-header-tools]');
 if(!tools){tools=document.createElement('div');tools.className='gd-header-tools';tools.dataset.gdHeaderTools='';const period=document.createElement('div');period.className='gd-header-period';period.dataset.gdHeaderPeriod='';tools.append(period,$('#refreshai'));header.append(tools)}
 const task=gdState.part==='tasks',period=task?gdTaskCurrentPeriod():gdState.period;
 tools.querySelector('[data-gd-header-period]').innerHTML=(gdState.part==='tasks'?'<span class="gd-date-caption">登记日期</span>':'')+gdTimeControls(period);
 const host=tools.querySelector('[data-gd-period]'),year=host.querySelector('[data-gd-year]'),value=host.querySelector('[data-gd-value]');
 if(year){for(const option of [...year.options])if(+option.value<+aiCoverageStart.slice(0,4)||+option.value>+DATA_CUTOFF.slice(0,4))option.remove()}
 if(value){for(const option of value.options){const range=uiNaturalPeriodRange({...period,value:+option.value},DATA_CUTOFF);option.disabled=!range||range.end<aiCoverageStart}}
 const trigger=host.querySelector('#gd-date-trigger');
 if(trigger&&task){
  trigger.setAttribute('aria-label','选择任务登记日期');
  if(!gdState.taskPeriod){host.querySelectorAll('[data-gd-mode]').forEach(button=>button.setAttribute('aria-pressed','false'));trigger.innerHTML='<span class="is-placeholder">请选择</span><i class="ui-dropdown-icon" aria-hidden="true"></i>'}
  trigger.onclick=()=>openDateRangePicker(trigger,gdTaskRegistrationRange(),(start,end)=>!start&&!end?gdClearTaskRegistration():gdApplyTaskPeriod(drawerPeriodFromRange({start,end})),{id:'gd-task-registration-popover',label:'选择任务登记日期',min:riskDateMin,max:dashboardSyncDate,clearable:true});
 }else if(trigger)trigger.onclick=()=>upOpenCalendar(trigger,gdDayRange,(start,end)=>gdApplyPeriod(drawerPeriodFromRange({start,end})),{min:riskDateMin,max:dashboardSyncDate,label:'选择诊断日期'});
 if(task){
  // 清空按钮定位在末尾日期控件内部，悬浮时覆盖原箭头。
  const control=trigger||value||year,field=document.createElement('span');field.className='gd-registration-field';
  control.before(field);field.append(control);
  if(gdState.taskPeriod)field.insertAdjacentHTML('beforeend','<button type="button" class="gd-registration-clear" data-gd-registration-clear aria-label="清空登记日期">×</button>');
 }
 $('#ai-inline-controls').replaceChildren();$('#ai-inline-controls').hidden=true;
}
