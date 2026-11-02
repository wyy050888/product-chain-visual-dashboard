function gdTimeControls(){
 // 复用高危预警期间组件及公共日历，仅替换事件命名以隔离筛选状态。
 return drawerWithPeriod(gdState.period,()=>periodControls('risk'))
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
 tools.querySelector('[data-gd-header-period]').innerHTML=(gdState.part==='tasks'?'<span class="gd-date-caption">下发日期</span>':'')+gdTimeControls();
 const host=tools.querySelector('[data-gd-period]'),year=host.querySelector('[data-gd-year]'),value=host.querySelector('[data-gd-value]');
 if(year){for(const option of [...year.options])if(+option.value<+aiCoverageStart.slice(0,4)||+option.value>+DATA_CUTOFF.slice(0,4))option.remove()}
 if(value){for(const option of value.options){const range=uiNaturalPeriodRange({...gdState.period,value:+option.value},DATA_CUTOFF);option.disabled=!range||range.end<aiCoverageStart}}
 const trigger=host.querySelector('#gd-date-trigger');
 if(trigger&&gdState.part==='tasks')trigger.setAttribute('aria-label','选择任务下发日期');
 if(trigger)trigger.onclick=()=>upOpenCalendar(trigger,gdDayRange,(start,end)=>gdApplyPeriod(drawerPeriodFromRange({start,end})),{min:riskDateMin,max:dashboardSyncDate,label:'选择诊断日期'});
 $('#ai-inline-controls').replaceChildren();$('#ai-inline-controls').hidden=true;
}
