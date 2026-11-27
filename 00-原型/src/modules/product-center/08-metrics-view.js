function pcMetricHeading([text,description]){return `<th scope="col">${esc(text)}${description?ppHelp(text,description):''}</th>`}
function pcMetricTable(label,headers,rows,summary,renderHeading,renderValue){
 const metrics=headers.slice(2);
 const renderRow=(row,chainCell)=>`<tr><th scope="row">${esc(row.name)}</th>${chainCell}${metrics.map(metric=>`<td>${renderValue(row,metric)}</td>`).join('')}</tr>`;
 const groups=pcMetricRowsByChain(rows,row=>row.chain);
 const body=[...groups].map(([chain,people])=>{
  const chainCell=`<th scope="rowgroup" rowspan="${people.length}">${esc(chain)}</th>`;
  return `<tbody data-pc-metric-chain="${esc(chain)}">${people.map((row,index)=>renderRow(row,index===0?chainCell:'')).join('')}</tbody>`;
 }).join('');
 return `<div class="pc-data-scroll" tabindex="0" role="region" aria-label="${esc(label)}"><table class="pc-data-table" aria-label="${esc(label)}">
  <thead><tr>${headers.map(renderHeading).join('')}</tr></thead>
  ${summary?`<tbody class="pc-data-total">${renderRow(summary,`<td>${esc(summary.chain)}</td>`)}</tbody>`:''}
  ${body||`<tbody><tr><td colspan="${headers.length}" class="empty">暂无匹配记录</td></tr></tbody>`}</table></div>`;
}
const pcProjectSlash='<span class="ms-value-divider">/</span>';
function pcProjectMetricValue(value){
 return Array.isArray(value)?value.map(number=>esc(fmt(number))).join(` ${pcProjectSlash} `):esc(Number.isFinite(value)?fmt(value):null);
}
function pcProjectManagementTable({rows,summary,salesPeriod,quarter,gradeRange,riskPeriod}){
 const labelMarkup=label=>esc(label).replaceAll('/',pcProjectSlash);
 const date=value=>value.slice(2).replaceAll('-','/'),riskDates=`${date(riskPeriod.start)}-${date(riskPeriod.end)}`;
 const riskHelp={
  lights:`统计截至 ${date(riskPeriod.end).slice(3)} 23:59:59 仍在进行的红灯项目数。黄灯、绿灯项目同理。`,
  newLights:`统计 ${riskDates} 新增的红灯/黄灯风险数`,
  closedLights:`统计 ${riskDates} 闭环的红灯/黄灯风险数`
 };
 const columns=pcMetricHeading(['人员'])+pcMetricHeading(['链群'])+pcProjectMetrics.map(([key,label,description])=>{
  return riskHelp[key]?`<th scope="col" class="pc-project-risk-head"><span class="pc-project-head-label"><span>${labelMarkup(label)}</span>${ppHelp(label,riskHelp[key])}</span></th>`:pcMetricHeading([label,description]);
 }).join('');
 const salesColumns=msSalesMetricHeaders(salesPeriod).map((label,index)=>`<th scope="col" class="pc-project-sales-head${index===2?' pc-project-scale-head':''}">${labelMarkup(label)}</th>`).join('');
 const help=ppHelp('SABC数量',`统计日期：${date(gradeRange.start)}-${date(gradeRange.end)}`);
 const renderSharedCells=({sales,success,deliveryRate,grades},span)=>`<td class="pc-project-success" rowspan="${span}"${success.example?' title="含示例考核数据"':''}><strong>${msPercent(success.rate)}</strong></td>
  <td class="pc-project-delivery" rowspan="${span}">${deliveryRate===null?'<span class="pc-data-pending">—</span>':`<strong title="大货交付样例数据">${msPercent(deliveryRate)}</strong>`}</td>
  <td rowspan="${span}"><span class="pc-project-grades">${kpmGradeOrder.map((level,index)=>`<span class="kpm-grade ${level}">${level} <b${grades[index]===0?' class="pc-project-grade-zero"':''}>${esc(fmt(grades[index]))}</b></span>`).join(' ')}</span></td>
  ${msGsvCell(sales,span)}${msMarginCell(sales,span)}${msScaleCell(sales,span)}`;
 const renderRow=(firstCells,values,shared,span=1)=>`<tr>${firstCells}
  ${pcProjectMetrics.map(([key])=>{
   const metric=`data-pc-project-metric="${key}"`;
   if(pcChainProjectMetrics.has(key))return shared?`<td ${metric} rowspan="${span}">${pcProjectMetricValue(shared.values[key])}</td>`:'';
   const value=values[key];
   if(value==null)return `<td ${metric} class="pc-data-pending">—</td>`;
   if(!riskHelp[key])return `<td ${metric}>${pcProjectMetricValue(value)}</td>`;
   const [red,yellow]=value;
   return `<td ${metric}><span class="red">${esc(fmt(red))}</span> ${pcProjectSlash} <span class="orange">${esc(fmt(yellow))}</span></td>`;
  }).join('')}${shared?renderSharedCells(shared,span):''}</tr>`;
 const total=renderRow(`<th scope="row">汇总</th><td>${esc(summary.name)}</td>`,summary.values,summary);
 const body=rows.map(row=>{
  const span=Math.max(1,row.people.length),chainCell=`<th scope="rowgroup" rowspan="${span}">${esc(row.name)}</th>`;
  const details=row.people.map(({name,values},index)=>{
   const person=`<th scope="row">${esc(name)}</th>`;
   return renderRow(person+(index===0?chainCell:''),values,index===0?row:null,span);
  }).join('');
  return `<tbody data-pc-project-chain="${esc(row.name)}">${details||renderRow('<td class="pc-data-pending">—</td>'+chainCell,{},row)}</tbody>`;
 }).join('');
 return `<div class="pc-data-scroll" tabindex="0" role="region" aria-label="项目管理指标"><table class="pc-data-table pc-project-metrics" aria-label="项目管理指标">
  <thead><tr>${columns}<th scope="col" class="pc-project-success-head">${esc(quarter)}新品成功率</th><th scope="col" class="pc-project-delivery-head" data-preserve-terms>${esc(quarter)} 新品上线及时率</th><th scope="col" class="pc-project-grade-head"><span class="pc-project-head-label">SABC数量 ${help}</span></th>${salesColumns}</tr></thead>
  <tbody class="pc-data-total">${total}</tbody>${body}</table></div>`;
}
function pcPersonnelPage(rows,page,key){
 const size=listPageSize(key,10);
 const current=Math.min(page,Math.max(1,Math.ceil(rows.length/size)));
 const start=(current-1)*size;
 return {current,rows:rows.slice(start,start+size),pager:listPager(rows.length,current,size)};
}
function pcBindPersonnelPager(host,key,onPage){
 bindListPager(host,page=>{
  onPage(page);
  pcScrollToModule('management');
  host.querySelector('.pc-data-scroll').focus({preventScroll:true});
 },key);
}
const pcMetricPersonWidthObserver=new ResizeObserver(([{target,borderBoxSize}])=>{
 const width=borderBoxSize[0].inlineSize,style=target.closest('table').style;
 if(width&&style.getPropertyValue('--pc-metric-person-width')!==width+'px')style.setProperty('--pc-metric-person-width',width+'px');
});
function pcObserveMetricPersonWidth(table){
 pcMetricPersonWidthObserver.disconnect();
 pcMetricPersonWidthObserver.observe(table.tHead.rows[0].cells[0],{box:'border-box'});
}
function pcMeasureProjectColumnMinimums(table){
 const minimums=[...table.tHead.rows[0].cells].map(cell=>parseFloat(getComputedStyle(cell).getPropertyValue('--pc-project-column-min')));
 return ()=>{table.dataset.columnMinimums=JSON.stringify(minimums)};
}
function pcBindMetricRowHover(table){
 let activeRow=null;
 function clear(){
  activeRow?.classList.remove('pc-metric-row-hover');
  activeRow=null;
 }
 function highlight(event){
  if(event.pointerType==='touch')return;
  const cell=event.target.closest('td,th'),body=cell?.closest('tbody');
  if(!body||body.classList.contains('pc-data-total')||cell.colSpan>1){clear();return}
  // 合并单元格在 DOM 中属于首行，按指针实际位置确认人员行。
  const row=cell.rowSpan===1?cell.parentElement:[...body.rows].find(candidate=>{
   const {top,bottom}=candidate.getBoundingClientRect();
   return event.clientY>=top&&event.clientY<bottom;
  });
  if(row===activeRow)return;
  clear();
  if(!row)return;
  row.classList.add('pc-metric-row-hover');
  activeRow=row;
 }
 table.addEventListener('pointerover',highlight);
 table.addEventListener('pointermove',highlight);
 table.addEventListener('pointerleave',clear);
}
function pcPaintMetricGroup(group,key,rows,renderTable){
 const host=group.querySelector('.pc-people-content');
 const pagerKey=key==='projects'?'pc-people-metrics-pager':`pc-people-${key}-pager`;
 const page=pcPersonnelPage(rows,pcPeopleState.pages[key]??1,pagerKey);
 pcPeopleState.pages[key]=page.current;
 host.innerHTML=renderTable(page.rows)+page.pager;
 const table=host.querySelector('.pc-data-table');
 if(key==='projects')dashboardQueueLayout(table,pcMeasureProjectColumnMinimums);
 if(group.classList.contains('pc-metric-active'))pcObserveMetricPersonWidth(table);
 pcBindMetricRowHover(table);
 bindListPager(host,next=>{
  pcPeopleState.pages[key]=next;
  pcPaintMetricGroup(group,key,rows,renderTable);
  pcScrollToModule('management');
  host.querySelector('.pc-data-scroll').focus({preventScroll:true});
 },pagerKey);
}
function pcPaintProjectMetrics(group){
 const scrollLeft=group.querySelector('.pc-data-scroll')?.scrollLeft??0;
 const project=pcProjectDashboard();
 pcPaintMetricGroup(group,'projects',project.rows,rows=>pcProjectManagementTable({...project,rows}));
 if(scrollLeft)group.querySelector('.pc-data-scroll').scrollLeft=scrollLeft;
}
function pcPaintSampleMetrics(group,[key,label,metrics],{rows,summary}){
 const columns=[['name','人员'],['chain','链群'],...metrics];
 const {defaultSort}=pcPersonnelSamples[key];
 const sort=pcPeopleState.sorts[key]??={key:'',direction:'',...defaultSort};
 const display=(row,[field,,,format])=>{
  const value=row[field];
  if(!Number.isFinite(value))return '<span class="pc-data-pending">—</span>';
  const text=esc(format==='percent'?fmt(value,1)+'%':fmt(value));
  if(field!=='archive'||!row.missing?.length)return text;
  return `<button type="button" class="link" aria-haspopup="dialog" data-pc-archive-person="${esc(row.name)}" data-pc-archive-chain="${esc(row.chain)}">${text}</button>`;
 };
 const heading=([field,text,description])=>{
  const direction=sort.key!==field?'none':sort.direction==='desc'?'descending':'ascending';
  const button=rpSortHeader(field,text,sort,undefined,defaultSort).replaceAll('恢复榜单排序','恢复默认排序');
  return `<th scope="col" aria-sort="${direction}">${button}${description?ppHelp(text,description):''}</th>`;
 };
 const scrollLeft=group.querySelector('.pc-data-scroll')?.scrollLeft??0;
 pcPaintMetricGroup(group,key,pcOrderPersonnelMetricRows(rows,sort),pageRows=>
  pcMetricTable(label+'人员指标',columns,pageRows,summary,heading,display));
 if(scrollLeft)group.querySelector('.pc-data-scroll').scrollLeft=scrollLeft;
 group.querySelector('.pc-people-content').onclick=event=>{
  const archive=event.target.closest('[data-pc-archive-person]');
  if(archive){
   const {pcArchivePerson:name,pcArchiveChain:chain}=archive.dataset;
   const row=name==='汇总'?summary:rows.find(row=>row.name===name&&row.chain===chain);
   if(row?.missing?.length)pcOpenArchiveReview(row,pcPeopleRange());
   return;
  }
  const button=event.target.closest('[data-rp-sort]');if(!button)return;
  const field=button.dataset.rpSort;
  rpSortCycle(sort,field,defaultSort);
  pcPeopleState.pages[key]=1;
  pcPaintSampleMetrics(group,[key,label,metrics],{rows,summary});
  group.querySelector(`[data-rp-sort="${field}"]`).focus({preventScroll:true});
 };
}
function pcMountPeoplePeriod(host){
 function paint(focus){
  const period=pcPeoplePeriod(),weekly=period.mode==='week';
  // 沿用页面的周期选择器，隔离事件避免回写其他模块的期间。
  host.innerHTML=periodControls('people',{period,label:'人员指标',follow:false}).replaceAll('data-time-','data-pc-people-');
  const controls=host.firstElementChild,segment=controls.querySelector('.period-segment');
  segment.insertAdjacentHTML('afterbegin',`<button type="button" data-pc-people-mode="week" aria-pressed="${weekly}">周</button>`);
  if(weekly){
   controls.querySelectorAll('select').forEach(select=>select.remove());
   const {start,end}=pcPeopleRange();
   controls.insertAdjacentHTML('beforeend',dateRangeWeekTrigger('pc-people-week-popover','选择人员指标所在周','data-pc-people-week',start+' — '+end));
  }
  if(focus)host.querySelector(focus)?.focus({preventScroll:true});
 }
 function refresh(focus){
  pcPeopleState.pages={};
  paint(focus);pcPaintPersonnel(host.closest('.pc-personnel'));pcQueueNavigation();
 }
 host.addEventListener('click',event=>{
  const mode=event.target.closest('[data-pc-people-mode]')?.dataset.pcPeopleMode;
  if(mode&&mode!==pcPeopleState.mode){
   pcPeopleState.mode=mode;refresh(`[data-pc-people-mode="${mode}"]`);return;
  }
  const trigger=event.target.closest('[data-pc-people-week]');if(!trigger)return;
  openDateWeekPicker(trigger,pcPeopleRange(),(start,end)=>{
   pcPeopleState.date=dateRangeClamp(end,riskDateMin,dashboardSyncDate());refresh('[data-pc-people-week]');
  },{min:riskDateMin,max:dashboardSyncDate});
 });
 host.addEventListener('change',event=>{
  const field=event.target,period=pcPeoplePeriod();
  if(field.matches('[data-pc-people-year]'))period.year=+field.value;
  else if(field.matches('[data-pc-people-value]'))period.value=+field.value;
  else return;
  pcPeopleState.date=bounds(normalizePeriod(period)).cutoff;
  refresh(field.matches('[data-pc-people-year]')?'[data-pc-people-year]':'[data-pc-people-value]');
 });
 paint();
}
function pcPersonnelSection(){
 const section=document.createElement('section');section.id='dp-management';section.className='section pc-personnel';
 section.innerHTML=`<div class="sectionhead"><div class="titlegroup"><h2>人员管理</h2>
  <div class="pc-people-view-tools">
   <div class="rp-group-navigation pc-people-tabs" role="tablist" aria-label="人员管理">
    <button type="button" role="tab" id="pc-people-tab-ratings" data-pc-people-view="ratings" aria-controls="pc-people-ratings"><span class="ai-logo ai-logo--icon" aria-hidden="true"></span>人员评分</button>
    <button type="button" role="tab" id="pc-people-tab-metrics" data-pc-people-view="metrics" aria-controls="pc-people-metrics">关键指标大盘</button>
   </div>
  </div></div>
  <div class="module-header-time pc-rating-period"><span class="period-segment"><span class="period-mode-current">周</span></span>${dateRangeWeekTrigger('pc-rating-week-popover','选择人员评分所在周','data-pc-rating-week')}</div>
  <div class="module-header-time pc-people-period"></div></div>
  <div id="pc-people-ratings" class="pc-people-ratings" role="tabpanel" aria-labelledby="pc-people-tab-ratings"></div>
  <div id="pc-people-metrics" role="tabpanel" aria-labelledby="pc-people-tab-metrics">
   <div class="pc-people-toolbar">
    <div class="rp-group-navigation" role="tablist" aria-label="人员指标分组">${pcMetricGroups.map(([key,label])=>
     `<button type="button" role="tab" id="pc-metrics-tab-${key}" data-pc-people-group="${key}" aria-controls="pc-metrics-${key}">${esc(label)}</button>`).join('')}</div>
   </div>
   ${pcMetricGroups.map(([key])=>`<section id="pc-metrics-${key}" role="tabpanel" aria-labelledby="pc-metrics-tab-${key}">
    <div class="pc-people-content"></div>
   </section>`).join('')}
  </div>`;
 pcMountPeoplePeriod(section.querySelector('.pc-people-period'));return section;
}
function pcSetPersonnelTab(button,active){
 const selected=String(active);
 if(button.getAttribute('aria-selected')===selected)return;
 button.setAttribute('aria-selected',selected);button.classList.toggle('is-current',active);button.tabIndex=active?0:-1;
}
const pcMetricGroupInputs=new WeakMap();
function pcPaintPeopleMetrics(panel){
 const activeKey=pcPeopleState.group,chain=pcChain();
 for(const button of panel.querySelectorAll('[data-pc-people-group]')){
  const active=button.dataset.pcPeopleGroup===activeKey;
  pcSetPersonnelTab(button,active);
  panel.querySelector('#'+button.getAttribute('aria-controls')).classList.toggle('pc-metric-active',active);
 }
 const commonInputs=[pcPeopleState.mode,pcPeopleState.date,pcPeopleState.pages,DATA_CUTOFF,chain];
 let roster,range;
 // 同一范围在一批里更新四张表，切换时保留表格、分页、列宽和滚动位置。
 for(const definition of pcMetricGroups){
  const [key]=definition,group=panel.querySelector(`#pc-metrics-${key}`);
  const inputs=key==='projects'?[...commonInputs,dpStore,salesTargetStore,brcSaved,upRuleRevision,nspApprovalRevision]:commonInputs;
  const previous=pcMetricGroupInputs.get(group);
  if(previous&&inputs.every((value,index)=>value===previous[index])){
   if(key===activeKey)pcObserveMetricPersonWidth(group.querySelector('.pc-data-table'));
   continue;
  }
  if(key==='projects')pcPaintProjectMetrics(group);
  else{
   roster??=pcRoster(chain);range??=pcPeopleRange();
   const data=key==='system'?pcPersonnelArchiveData(roster,chain,range):pcPersonnelSampleData(roster,chain,range,pcPersonnelSamples[key]);
   pcPaintSampleMetrics(group,definition,data);
  }
  pcMetricGroupInputs.set(group,inputs);
 }
}
function pcPaintPersonnel(section=$('#dp-management')){
 if(!section||!pcIsActive())return;
 const showRatings=pcPeopleState.view==='ratings';
 for(const button of section.querySelectorAll('[data-pc-people-view]'))pcSetPersonnelTab(button,button.dataset.pcPeopleView===pcPeopleState.view);
 section.querySelector('.pc-rating-period').hidden=!showRatings;
 section.querySelector('.pc-people-ratings').hidden=!showRatings;
 section.querySelector('.pc-people-period').hidden=showRatings;
 const panel=section.querySelector('#pc-people-metrics');
 panel.hidden=showRatings;
 if(showRatings){pcPaintPeopleRatings(section);return}
 pcPaintPeopleMetrics(panel);
}
dpView.addEventListener('click',event=>{
 const tab=event.target.closest('[data-pc-people-view]');
 if(tab&&tab.dataset.pcPeopleView!==pcPeopleState.view){
  pcPeopleState.view=tab.dataset.pcPeopleView;pcPaintPersonnel();pcQueueNavigation();return;
 }
 const group=event.target.closest('[data-pc-people-group]');
 if(group&&group.dataset.pcPeopleGroup!==pcPeopleState.group){
  pcPeopleState.group=group.dataset.pcPeopleGroup;pcPaintPeopleMetrics(group.closest('#pc-people-metrics'));pcQueueNavigation();return;
 }
 const rating=event.target.closest('[data-pc-rating-person]');
 if(rating)pcOpenPeopleScore(rating.dataset.pcRatingPerson);
});
dpView.addEventListener('keydown',event=>{
 const tab=event.target.closest('[data-pc-people-view],[data-pc-people-group]');
 if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const tabs=[...tab.parentElement.children];
 const offset=event.key==='ArrowRight'?1:-1;
 const target=event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(tabs.indexOf(tab)+offset+tabs.length)%tabs.length];
 event.preventDefault();target.click();target.focus();
});
