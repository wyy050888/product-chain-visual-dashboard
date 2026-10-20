function gdTag(text,tone=''){return `<span class="tag ${tone}">${esc(text)}</span>`}
function gdPriority(row){return `<span class="gd-priority ${row.priority||'yellow'}" aria-label="${row.priority==='red'?'优先处理':'关注'}"></span>`}
function gdButton(action,id,label,taskStatus=''){const tone=taskStatus?(taskStatus==='suggested'?'gd-task-dispatch':'gd-task-follow'):'';return `<button type="button" class="link ${tone?'gd-task-action '+tone:''}" data-gd-action="${action}" data-gd-id="${esc(id)}">${label}</button>`}
function gdSectionRows(data,part=gdState.part,tab=gdState.tabs[part]){
 let rows=part==='execution'?(tab==='reports'?data.reports:data.focus):part==='closure'?data.tasks:data[part];
 const filter=gdTableFilters(part,tab);rows=rows.filter(row=>gdMatch(row,part,tab));
 if(part==='execution'&&tab==='reports'&&filter.reportType!=='all')rows=rows.filter(r=>r.type===filter.reportType);
 if(part==='closure'&&tab!=='all')rows=rows.filter(r=>tab==='overdue'?r.overdue:tab==='done'?r.task.status==='done':r.task.status===tab);
 if(['coordination','resource'].includes(part)&&tab!=='all')rows=rows.filter(r=>r.kind===tab);
 return gdRowSort(rows,filter);
}
function gdCardCounts(data){return [
 {count:data.reports.length+data.focus.filter(r=>r.task.status!=='done').length,label:'项待核对',stats:[['日志待核对',data.reports.length],['工作聚焦',data.focus.filter(r=>r.task.status!=='done').length]]},
 {count:data.tasks.filter(r=>r.task.status!=='done'&&r.task.status!=='suggested').length,label:'项待闭环',stats:[['已逾期',data.tasks.filter(r=>r.overdue).length],['已完成',data.tasks.filter(r=>r.task.status==='done').length]]},
 {count:data.coordination.filter(r=>r.task.status!=='done').length,label:'项待协调',stats:[['协同卡点',data.coordination.filter(r=>r.kind==='block'&&r.task.status!=='done').length],['待决策',data.coordination.filter(r=>r.kind==='decision'&&r.task.status!=='done').length]]},
 {count:data.resource.filter(r=>r.task.status!=='done').length,label:'项待跟进',stats:[['资源缺口',data.resource.filter(r=>r.kind==='capacity'&&r.task.status!=='done').length],['排期冲突',data.resource.filter(r=>r.kind==='conflict'&&r.task.status!=='done').length]]}
 ]}
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
function gdTableControls(){
 const filter=gdTableFilters(),spec=gdSearchSpecs[gdFilterKey()],logs=gdFilterKey()==='execution/reports';
 const issueType=gdFilterKey()!=='execution/focus'?'':`<label>事项类型<select data-gd-issue-type aria-label="事项类型"><option value="all">全部</option>${gdIssueTypeOptions().map(([key,type])=>`<option value="${key}" ${pfOptionSelected(filter.issueType,key)?'selected':''}>${type.label}</option>`).join('')}</select></label>`;
 const status=gdState.part==='closure'?'':`<label>状态<select data-gd-status aria-label="总诊断状态"><option value="all">全部</option>${gdStatusOptions().map(([key,label])=>`<option value="${key}" ${filter.status===key?'selected':''}>${label}</option>`).join('')}</select></label>`;
 const select=(field,label,values)=>`<label>${label}<select ${field==='category'?'multiple data-pf-multiple data-pf-label="类目"':''} data-gd-filter="${field}" aria-label="总诊断${label}"><option value="all">全部</option>${values.map(v=>`<option value="${esc(v)}" ${pfOptionSelected(filter[field],v)?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
 return `<div class="gd-filters ui-business-filters" data-gd-table-filters="${gdFilterKey()}"><label class="ui-search-field"><input type="search" data-gd-search aria-label="${spec.label}" placeholder="${spec.placeholder}" value="${esc(filter.query)}"></label>${logs?`<label>日志类型<select data-gd-report-type aria-label="日志类型"><option value="all">全部</option>${['日报','周报','月报'].map(type=>`<option ${filter.reportType===type?'selected':''}>${type}</option>`).join('')}</select></label>`:''}${issueType}${status}${select('category','类目',[...pfCategories,'全公司'])}${select('department',logs?'提交部门':'负责部门',upTodoDepartments)}<button type="button" class="link" data-gd-reset>重置</button></div>`;
}
function gdMountHeader(section){
 const header=section.querySelector(':scope>.sectionhead');let tools=header.querySelector('[data-gd-header-tools]');
 if(!tools){tools=document.createElement('div');tools.className='gd-header-tools';tools.dataset.gdHeaderTools='';const period=document.createElement('div');period.className='gd-header-period';period.dataset.gdHeaderPeriod='';tools.append(period,$('#refreshai'));header.append(tools)}
 tools.querySelector('[data-gd-header-period]').innerHTML=gdTimeControls();
 const host=tools.querySelector('[data-gd-period]'),year=host.querySelector('[data-gd-year]'),value=host.querySelector('[data-gd-value]');
 if(year){for(const option of [...year.options])if(+option.value<+aiCoverageStart.slice(0,4)||+option.value>+DATA_CUTOFF.slice(0,4))option.remove()}
 if(value){for(const option of value.options){const range=uiNaturalPeriodRange({...gdState.period,value:+option.value},DATA_CUTOFF);option.disabled=!range||range.end<aiCoverageStart}}
 const trigger=host.querySelector('#gd-date-trigger');
 if(trigger)trigger.onclick=()=>upOpenCalendar(trigger,gdDayRange,(start,end)=>gdApplyPeriod(drawerPeriodFromRange({start,end})),{min:riskDateMin,max:dashboardSyncDate,label:'选择诊断日期'});
 $('#ai-inline-controls').replaceChildren();$('#ai-inline-controls').hidden=true;
}
function gdRowCells(row){
 const report=row.kind==='report',task=row.kind==='task',focus=row.kind==='focus';
 const title=`<div class="gd-subject">${gdPriority(row)}<div><strong title="${esc(row.title)}">${esc(row.title)}</strong><div class="gd-row-note" title="${esc(task?upTodoDescriptionText(row.task):row.problem)}">${esc(task?upTodoDescriptionText(row.task):row.problem)}</div></div></div>`;
 const object=`<b title="${esc(row.objectName)}">${esc(row.objectName)}</b><small title="${esc(row.sourceName)} · ${esc(row.category)}">${esc(row.sourceName)} · ${esc(row.category)}</small>`;
 const owner=`${esc(row.owner)}<small>${esc(row.department)}</small>`;
 const time=report?`${row.date}<small>应交 ${row.due}</small>`:focus?`${row.date}<small>观察自 ${row.focusEvidence.window.start}</small>`:task?`${esc(row.due||'—')}<small ${row.overdue?'class="red"':''}>${row.overdue?'已逾期':'截止日期'}</small>`:`${row.date}<small>期望 ${row.due}</small>`;
 const tone=report?(row.missing?'red':row.incomplete?'orange':row.late?'orange':'green'):row.status==='已完成'?'green':row.overdue?'red':'',status=gdTag(row.status,tone);
 let actions=gdButton('evidence',row.id,'查看依据');
 if(!report)actions+=gdButton(task?'task-detail':'task',row.id,row.task.status==='suggested'?'下发任务':'跟进任务',row.task.status);

 return [title,object,owner,time,status,`<div class="gd-row-actions">${actions}</div>`];
}
function gdTable(headers,rows,attrs=''){return `<div class="gd-table-scroll"><table ${attrs}><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map((cell,i)=>`<td data-label="${headers[i]}">${cell}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="gd-empty">暂无符合条件的记录</td></tr>`}</tbody></table></div>`}
function gdRender(){
 const section=$('#ai');if(!section)return;section.classList.add('gd-workspace');const data=gdDataset(),counts=gdCardCounts(data),part=gdState.part;
 $('#aitime').textContent='业务数据截至 '+DATA_CUTOFF;gdMountHeader(section);
 $('#aigrid').innerHTML=gdParts.map(([key,label],i)=>`<button type="button" class="gd-card ${part===key?'selected':''}" data-gd-part="${key}" aria-pressed="${part===key}" aria-controls="ai-inline-details"><div class="gd-card-head"><h3>${label}</h3><span class="gd-card-arrow">↗</span></div><div class="gd-card-number">${counts[i].count}<span>${counts[i].label}</span></div><div class="gd-card-stats">${counts[i].stats.map(([label,value])=>`<span>${label}<b>${value}</b></span>`).join('')}</div></button>`).join('');
 $('#ai-inline-summary').innerHTML='';$('#ai-inline-summary').hidden=true;$('#ai-inline-foot').textContent='';
 const filter=gdTableFilters(),tabs=gdTabs[part],rows=gdSectionRows(data),pageKey=part+'|'+gdState.tabs[part],pages=Math.max(1,Math.ceil(rows.length/8)),page=Math.min(gdState.pages[pageKey]||1,pages);gdState.pages[pageKey]=page;
 $('#ai-inline-details').innerHTML=`<div class="gd-panel"><div class="gd-panel-heading"><div class="tabs" role="tablist" aria-label="${gdParts.find(([key])=>key===part)[1]}">${tabs.map(([key,label])=>`<button type="button" role="tab" data-gd-tab="${key}" aria-selected="${gdState.tabs[part]===key}" class="${gdState.tabs[part]===key?'active':''}">${label}<span>${gdSectionRows(data,part,key).length}</span></button>`).join('')}</div><div class="gd-panel-actions"><select data-gd-sort aria-label="诊断排序"><option value="priority" ${filter.sort==='priority'?'selected':''}>优先级排序</option><option value="due" ${filter.sort==='due'?'selected':''}>截止日期排序</option><option value="date" ${filter.sort==='date'?'selected':''}>最新记录优先</option></select></div></div>${gdTableControls()}${gdTable(['事项','业务关联','责任人','日期','状态','操作'],rows.slice((page-1)*8,page*8).map(gdRowCells),'data-gd-table')}<div class="gd-pagination" id="gd-pager"></div></div>`;
 $('#gd-pager').innerHTML=listPager(rows.length,page,8);bindListPager($('#gd-pager'),next=>{gdState.pages[pageKey]=next;gdRender();$('#gd-pager [aria-current="page"]')?.focus({preventScroll:true})});
 decorateFilterFields(section.querySelector('.gd-filters'));
 $('#refreshai').onclick=()=>{gdRender();toast('诊断已刷新')};
}
// 只替换总看板入口，保留部门工作台原有独立诊断上下文。
const gdPreviousInline=renderInlineAI;
renderInlineAI=function(){if(dpState.view==='director'&&!dxRendering)return gdRender();return gdPreviousInline()};
renderAI=renderInlineAI;
