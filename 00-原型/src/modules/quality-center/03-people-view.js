const qcPeopleState={view:'ratings',group:'pqm'};
const qcRatingState={week:'',page:1};
const qcPeopleRatingContext={
 state:qcRatingState,pager:'qc-people-ratings-pager',daily:()=>null,
 data(){
  const week=qcRatingState.week||qcRatingWeek;
  const report=pcDepartmentWeeklyRows(qcPreviousWeeklyRows(),'quality',qcWeeklyAiReports).find(row=>row.monday===week);
  const people=report?.reports.quality?qcRoster.filter(person=>person.name!=='刘炜'||week>=shiftDate(qcRatingWeek,7)).map(person=>qcRatingPerson(person,week)):[];
  return {week,report,people};
 }
};

function qcMetricTable(group){
 const groups=qcMetricGroups[group];
 const metrics=groups.flatMap(([,items])=>items.map(item=>item.split('|')));
 const groupHeads=groups.map(([label,items])=>`<th scope="colgroup" colspan="${items.length}">${esc(label)}</th>`).join('');
 const metricHeads=metrics.map(([label])=>`<th scope="col">${esc(label)}</th>`).join('');
 const people=qcRoster.filter(person=>person.group===group);
 const bodies=qcMetricRoster(group).map(([chain,members])=>`<tbody>${members.map((person,index)=>{
  const chainCell=index===0?`<th scope="rowgroup" rowspan="${members.length}" class="qc-fixed-chain">${esc(chain)}</th>`:'';
  const values=metrics.map(([label,unit],metricIndex)=>`<td>${qcMetricDemo(label,unit,people.indexOf(person),metricIndex)}</td>`).join('');
  return `<tr><th scope="row" class="qc-fixed-person">${esc(person.name)}</th>${chainCell}${values}</tr>`;
 }).join('')}</tbody>`).join('');
 const columns=`<col class="qc-person-width"><col class="qc-chain-width">${metrics.map(()=>'<col>').join('')}`;
 const headers=`<tr><th scope="col" rowspan="2" class="qc-fixed-person">人员</th><th scope="col" rowspan="2" class="qc-fixed-chain">链群</th>${groupHeads}</tr><tr>${metricHeads}</tr>`;
 return `<div class="pc-data-scroll qc-metrics-scroll" tabindex="0" role="region" aria-label="岗位指标明细" aria-description="指标数值为样例" data-preserve-terms data-metric-help-disabled><table class="pc-data-table qc-metrics-table" style="--qc-metric-count:${metrics.length}"><colgroup>${columns}</colgroup><thead>${headers}</thead>${bodies}</table></div>`;
}

function qcMeasureMetricHeader(section,stickyTop){
 if(qcPeopleState.view!=='metrics')return;
 const table=section.querySelector('#qc-metric-'+qcPeopleState.group+' .qc-metrics-table');
 if(!table?.checkVisibility())return;
 // 表格容器只用于横向滚动，表头的纵向位置跟随外层页面。
 const titleHeight=section.querySelector('.sectionhead').getBoundingClientRect().height;
 const tableBounds=table.getBoundingClientRect();
 const maxOffset=tableBounds.height-table.tHead.getBoundingClientRect().height;
 const offset=Math.max(0,Math.min(maxOffset,stickyTop+titleHeight-tableBounds.top))+'px';
 if(table.style.getPropertyValue('--qc-metrics-header-offset')!==offset)
  return ()=>table.style.setProperty('--qc-metrics-header-offset',offset);
}

function qcCreatePeopleSection(){
 const rating=qcCan('rating'),metrics=qcCan('people-metrics');
 if(qcPeopleState.view==='ratings'&&!rating)qcPeopleState.view='metrics';
 if(qcPeopleState.view==='metrics'&&!metrics)qcPeopleState.view='ratings';
 const section=document.createElement('section');section.id='qc-management';section.className='section pc-personnel';section.dataset.moduleSticky='';
 section.innerHTML=`<div class="sectionhead"><div class="titlegroup"><h2>人员管理</h2>
  <div class="pc-people-view-tools"><div class="rp-group-navigation pc-people-tabs" role="tablist" aria-label="人员管理">
   ${rating?'<button type="button" role="tab" id="qc-people-tab-ratings" data-qc-people-view="ratings" aria-controls="qc-people-ratings"><span class="ai-logo ai-logo--icon" aria-hidden="true"></span>人员评分</button>':''}
   ${metrics?'<button type="button" role="tab" id="qc-people-tab-metrics" data-qc-people-view="metrics" aria-controls="qc-people-metrics">人员指标大盘</button>':''}
  </div></div></div><div class="module-header-time pc-rating-period"><span class="period-mode-current">周</span>${dateRangeWeekTrigger('qc-rating-week-popover','选择人员评分所在周','data-pc-rating-week')}</div></div>
  <div class="pc-people-ratings" id="qc-people-ratings" role="tabpanel" aria-labelledby="qc-people-tab-ratings"></div>
  ${metrics?`<div id="qc-people-metrics" role="tabpanel" aria-labelledby="qc-people-tab-metrics" hidden><div class="pc-people-toolbar">
   <div class="rp-group-navigation" role="tablist" aria-label="岗位指标">${qcRoles.map(([key,label])=>`<button type="button" role="tab" id="qc-metric-tab-${key}" data-qc-metric="${key}" aria-controls="qc-metric-${key}">${esc(label)}</button>`).join('')}</div>
  </div>${qcRoles.map(([key])=>`<div id="qc-metric-${key}" role="tabpanel" aria-labelledby="qc-metric-tab-${key}" hidden>${qcMetricTable(key)}</div>`).join('')}</div>`:''}`;
 const paint=()=>{
  const ratings=qcPeopleState.view==='ratings';
  section.querySelector('.pc-rating-period').hidden=!ratings;
  for(const button of section.querySelectorAll('[data-qc-people-view],[data-qc-metric]')){
   const active=button.dataset.qcPeopleView===qcPeopleState.view||button.dataset.qcMetric===qcPeopleState.group;
   pcSetPersonnelTab(button,active);
   section.querySelector('#'+button.getAttribute('aria-controls')).hidden=!active;
  }
  if(ratings)pcPaintPeopleRatings(section,qcPeopleRatingContext);
  else qcQueueNavigation();
 };
 section.addEventListener('click',event=>{
  const tab=event.target.closest('[data-qc-people-view],[data-qc-metric]');
  const person=event.target.closest('[data-pc-rating-person]');
  if(tab){
   if(tab.dataset.qcPeopleView)qcPeopleState.view=tab.dataset.qcPeopleView;
   else qcPeopleState.group=tab.dataset.qcMetric;
   paint();
  }else if(person)pcOpenPeopleScore(person.dataset.pcRatingPerson,qcPeopleRatingContext);
 });
 section.addEventListener('keydown',qcTabKeys);
 return {section,paint};
}
