function gdScopeHelp(part,key){
 const label=gdTabs[part].find(([value])=>value===key)?.[1];
 const standard=part==='coordination'?gdKeyWorkStandards.find(([name])=>name===label):part==='resource'&&gdDeviationStandards[key]?[label,gdDeviationStandards[key]]:null;
 if(!standard)return '';
 return `<span class="metric-help gd-core-help card-metric-help" tabindex="0" role="button" aria-label="${esc(label)}判定标准" data-gd-tab-help="${part}|${key}" ${part==='coordination'?`data-gd-key-help="${key}"`:`data-gd-deviation-help="${key}"`} data-metric-rule="${esc(standard.join('\n'))}"></span>`;
}
// 二级页签复用公共规则浮层的标题与列表外观。
function gdRenderScopeTooltip(target,help){
 const [label,...points]=help.dataset.metricRule.split('\n');
 const section=document.createElement('section');section.className='metric-rule-section';
 const heading=document.createElement('h4');heading.textContent=label;section.append(heading);
 const list=document.createElement('ul');
 for(const point of points.filter(Boolean)){const item=document.createElement('li');item.textContent=point.replace(/^•\s*/,'');list.append(item)}
 section.append(list);target.append(section);
}
function gdScopeTabs(data){
 const part=gdState.part,filter=gdTableFilters();
 if(part==='tasks')return gdTaskStatusTabs(data.tasks,filter);
 if(!gdTabs[part].length)return '';
 const tabs=gdTabs[part].map(([key,label])=>{
  const count=gdSectionRows(data,part,key,filter).length,active=gdState.tabs[part]===key;
  const button=`<button type="button" role="tab" data-gd-tab="${key}" aria-selected="${active}" class="${active?'active':''}">${label}<span>${count}</span></button>`;
  const help=gdScopeHelp(part,key);
  return help?`<span class="gd-core-tab">${button}${help}</span>`:button;
 }).join('');
 const generated=part==='coordination'?gdGeneratedTasks(data).length:0;
 return `<div class="gd-tab-navigation"><div class="tabs gd-scope-tabs" role="tablist" aria-label="诊断分类">${tabs}</div>${generated?`<button type="button" class="link" data-gd-generated>已生成任务 ${generated}</button>`:''}</div>`;
}

function gdFilterGroup(label,field,options,base,filter){
 const count=key=>base.filter(r=>gdAnalysisMatches(r,{...filter,[field]:key})).length;
 const chosen=key=>field==='status'?(key==='all'?!pfSelected(filter.status).length:pfSelected(filter.status).includes(key)):filter[field]===key;
 return `<div class="gd-tag-filter gd-${field}-filter"><span>${label}</span><div class="gd-filter-options" role="group" aria-label="${label}">${options.map(([key,text])=>`<button type="button" data-gd-${field==='reportType'?'report-type':field}="${esc(key)}" aria-pressed="${chosen(key)}" class="gd-filter-option ${chosen(key)?'active':''}"><span class="gd-filter-label">${field==='priority'&&key!=='all'?gdPriority({priority:key}):esc(text)}</span>${key==='all'?'':`<span class="gd-filter-count">${count(key)}</span>`}</button>`).join('')}</div></div>`;
}
function gdTableControls(data){
 const part=gdState.part,tab=gdState.tabs[part],filter=gdTableFilters(),base=gdAnalysisRows(data),work=part==='resource',tasks=part==='tasks';
 const placeholders=tasks?'搜索业务对象 / 问题描述 / 执行事项 / 负责人':work?'搜索业务对象 / 问题描述 / 行动建议 / 涉及人员':part==='coordination'||tasks?'搜索业务对象 / 问题描述 / 行动建议 / 负责人':part==='execution'?'搜索人员 / 报告内容':'搜索业务对象 / 诊断结论 / 行动建议 / 人员';
 const reportDepartments=part==='execution'?Object.keys(gdReportProfileCatalog):upTodoDepartments;
 const department=gdFilterGroup(work||tasks||part==='coordination'?'责任部门':'部门','department',[['all','全部'],...reportDepartments.map(d=>[d,d])],base,filter);
 const priority=work||tasks||part==='coordination'?gdFilterGroup('优先级','priority',[['all','全部'],...Object.keys(upTodoPriorities).map(p=>[p,p])],base,filter):'';
 const type=part==='execution'?gdFilterGroup('报告','reportType',[['all','全部'],['日报','日报'],['周报','周报'],['月报','月报']],base,filter):'';
 const category=part==='execution'?'':gdFilterGroup('链群','category',[['all','全部'],...pfCategories.map(value=>[value,value])],base,filter);
 return `<div class="gd-filters gd-redesigned-filters"><div class="gd-filter-toolbar">${gdScopeTabs(data)}<div class="gd-filter-search "><label class="ui-search-field"><input type="search" data-gd-search aria-label="搜索诊断内容" placeholder="${placeholders}" value="${esc(filter.query)}"></label></div>${tasks?gdTaskDueFilterMarkup()+gdTaskManagementMarkup():''}</div><div class="gd-filter-groups gd-panel-navigation ${category?'gd-has-category':''}">${category}${department}${priority}${type}</div></div>`;
}
let gdRenderedData=null;
function gdRender(){
 if(!gdParts.some(([key])=>key===gdState.part))gdState.part=gdParts[0][0];
 const section=$('#ai');if(!section)return;section.classList.add('gd-workspace');const data=gdDataset(),counts=gdCardCounts(data),part=gdState.part,tab=gdState.tabs[part];gdRenderedData=data;
 $('#aitime').textContent='业务数据截至 '+DATA_CUTOFF;gdMountHeader(section);
 $('#aigrid').innerHTML=gdParts.map(([key,label],i)=>`<button type="button" class="gd-card ${part===key?'selected':''}" data-gd-part="${key}" aria-pressed="${part===key}" aria-controls="ai-inline-details"><div class="gd-card-head"><h3>${esc(data.partLabels?.[key]||label)}</h3></div><div class="gd-card-number">${counts[i].count}</div><div class="gd-card-stats">${counts[i].stats.map(([name,n])=>`<span>${name}<b>${n}</b></span>`).join('')}</div></button>`).join('');
 $('#ai-inline-summary').innerHTML='';$('#ai-inline-summary').hidden=true;$('#ai-inline-foot').textContent='';
 const rows=gdSectionRows(data),items=part==='tasks'?gdTableEntries(rows):part==='resource'?rpSortRows(rows,{key:'priority',direction:gdTableFilters().sortDirection||'asc'},row=>upTodoPriorityRank(row.priority)):part==='coordination'?gdKeyWorkSorted(rows):rows,pageKey=part+'|'+tab,pages=Math.max(1,Math.ceil(items.length/listPageSize('gd-pager',10))),page=Math.min(gdState.pages[pageKey]||1,pages);gdState.pages[pageKey]=page;
 const slice=items.slice((page-1)*listPageSize('gd-pager',10),page*listPageSize('gd-pager',10)),body=part==='tasks'?gdActionTable(slice):part==='resource'?gdDeviationTable(slice):part==='coordination'?gdKeyWorkTable(slice,tab):gdReportsTable(slice,tab==='missing');
 $('#ai-inline-details').innerHTML=`<div class="gd-panel">${gdTableControls(data)}${body}<div class="gd-pagination" id="gd-pager"></div></div>`;
 gdMountTaskPreviews(section);
 $('#gd-pager').innerHTML=listPager(items.length,page,listPageSize('gd-pager',10));bindListPager($('#gd-pager'),next=>{gdState.pages[pageKey]=next;gdRender()});
 $('#refreshai').onclick=()=>{gdRender();toast('诊断已刷新')};
}
const gdPreviousInline=renderInlineAI;
renderInlineAI=function(){if((dpState.view==='director'||pcIsActive())&&!dxRendering)return gdRender();return gdPreviousInline()};
renderAI=renderInlineAI;
