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
 if(tasks)return gdLedgerControls(data,base,filter);
 const placeholders=tasks?'搜索业务对象 / 问题描述 / 执行事项 / 负责人':work?'搜索业务对象 / 问题描述 / 行动建议 / 涉及人员':part==='coordination'||tasks?'搜索业务对象 / 问题描述 / 行动建议 / 负责人':part==='execution'?'搜索人员 / 报告内容':'搜索业务对象 / 诊断结论 / 行动建议 / 人员';
 const reportDepartments=part==='execution'?Object.keys(gdReportProfileCatalog):upTodoDepartments;
 const department=gdFilterGroup(work||tasks||part==='coordination'?'责任部门':'部门','department',[['all','全部'],...reportDepartments.map(d=>[d,d])],base,filter);
 const priority=work||tasks?gdFilterGroup('优先级','priority',[['all','全部'],...Object.keys(upTodoPriorities).map(p=>[p,p])],base,filter):'';
 const type=part==='execution'&&tab!=='missing'?gdFilterGroup('报告','reportType',[['all','全部'],['日报','日报'],['周报','周报'],['月报','月报']],base,filter):'';
 const category=part==='execution'?'':gdFilterGroup('链群','category',[['all','全部'],...pfCategories.map(value=>[value,value])],base,filter);
 return `<div class="gd-filters gd-redesigned-filters"><div class="gd-filter-toolbar">${gdScopeTabs(data)}<div class="gd-filter-search "><label class="ui-search-field"><input type="search" data-gd-search aria-label="搜索诊断内容" placeholder="${placeholders}" value="${esc(filter.query)}"></label></div>${work||part==='coordination'?gdFollowFilterMarkup():''}</div><div class="gd-filter-groups gd-panel-navigation ${category?'gd-has-category':''}">${category}${department}${priority}${type}</div></div>`;
}
let gdRenderedData=null;
// 卡片身份保持不变，点击后无需重新创建焦点节点及其全部子树。
function gdRenderCards(data,counts){
 const host=$('#aigrid');
 if(host.querySelectorAll(':scope>[data-gd-part]').length!==gdParts.length)host.innerHTML=gdParts.map(([key,label])=>`<button type="button" class="gd-card" data-gd-part="${key}" aria-controls="ai-inline-details"><div class="gd-card-head"><h3>${esc(label)}</h3></div><div class="gd-card-number"></div><div class="gd-card-stats"></div></button>`).join('');
 gdParts.forEach(([key,label],index)=>{
  const card=host.querySelector('[data-gd-part="'+key+'"]'),active=gdState.part===key;
  card.classList.toggle('selected',active);card.setAttribute('aria-pressed',String(active));
  for(const [selector,text] of [['h3',data.partLabels?.[key]||label],['.gd-card-number',String(counts[index].count)]]){const node=card.querySelector(selector);if(node.textContent!==text)node.textContent=text}
  dashboardRenderMarkup(card.querySelector('.gd-card-stats'),counts[index].stats.map(([name,n])=>`<span>${name}<b>${n}</b></span>`).join(''));
 });
}
function gdRender({reuseData=false}={}){
 if(!gdParts.some(([key])=>key===gdState.part))gdState.part=gdParts[0][0];
 const section=$('#ai');if(!section)return;section.classList.add('gd-workspace');const data=reuseData&&gdRenderedData?gdRenderedData:gdDataset(),counts=gdCardCounts(data),part=gdState.part,tab=gdState.tabs[part];gdRenderedData=data;
 $('#aitime').textContent='业务数据截至 '+DATA_CUTOFF+(data.historyStatus?.failure?' · 更新失败，保留'+data.historyStatus.businessDate+'结果':'')+(data.historyStatus?.storageError?' · '+data.historyStatus.storageError:'');gdMountHeader(section);
 gdRenderCards(data,counts);
 $('#ai-inline-summary').innerHTML='';$('#ai-inline-summary').hidden=true;$('#ai-inline-foot').textContent='';
 const rows=gdSectionRows(data),items=part==='tasks'?gdTableEntries(rows):part==='resource'?rpSortRows(rows,{key:'priority',direction:gdTableFilters().sortDirection||'asc'},row=>upTodoPriorityRank(row.priority)):part==='coordination'?gdKeyWorkSorted(rows):rows,pageKey=part+'|'+tab,pages=Math.max(1,Math.ceil(items.length/listPageSize('gd-pager',10))),page=Math.min(gdState.pages[pageKey]||1,pages);gdState.pages[pageKey]=page;
 const slice=items.slice((page-1)*listPageSize('gd-pager',10),page*listPageSize('gd-pager',10)),body=part==='tasks'?gdActionTable(slice):part==='resource'?gdDeviationTable(slice):part==='coordination'?gdKeyWorkTable(slice,tab):gdReportsTable(slice,tab==='missing');
 $('#ai-inline-details').innerHTML=`<div class="gd-panel">${gdTableControls(data)}${body}<div class="gd-pagination" id="gd-pager"></div></div>`;
 gdMountAnalysisColumns(section);gdMountTaskPreviews(section);gdBindLedgerDepartments(section);
 $('#gd-pager').innerHTML=listPager(items.length,page,listPageSize('gd-pager',10));bindListPager($('#gd-pager'),next=>{gdState.pages[pageKey]=next;gdRender({reuseData:true})});
 $('#refreshai').onclick=()=>{gdRender();toast('诊断已刷新')};
}
const gdPreviousInline=renderInlineAI;
renderInlineAI=function(){if((dpState.view==='director'||pcIsActive())&&!dxRendering)return gdRender();return gdPreviousInline()};
renderAI=renderInlineAI;

function gdLedgerControls(data,base,filter){
 const fixed=['产品中心','项目部','品质中心','研发中心','采购部'],others=gdLedgerValues('department').filter(d=>!fixed.includes(d));
 const departments=gdFilterGroup('所属部门','department',[['all','全部'],...fixed.map(d=>[d,d])],base,filter);
 const otherCount=base.filter(row=>others.includes(row.department)&&gdAnalysisMatches(row,{...filter,department:'all'})).length;
 const otherActive=others.includes(filter.department),other=others.length?'<button type="button" class="gd-filter-option gd-ledger-other '+(otherActive?'active':'')+'" data-gd-other-departments aria-haspopup="dialog" aria-expanded="false" aria-controls="gd-ledger-other-menu"><span class="gd-filter-label">其他</span><span class="gd-filter-count">'+otherCount+'</span><i class="gd-ledger-other-arrow" aria-hidden="true"></i></button><div id="gd-ledger-other-menu" class="gd-ledger-other-menu" role="dialog" popover="auto" aria-label="其他部门">'+gdFilterGroup('其他部门','department',others.map(d=>[d,d]),base,filter)+'</div>':'';
 return `<div class="gd-filters gd-redesigned-filters"><div class="gd-filter-toolbar">${gdScopeTabs(data)}<div class="gd-filter-search"><label class="ui-search-field"><input type="search" data-gd-search aria-label="搜索任务类型、任务、目标/交付物、最新进展、提需人、责任人、第二负责人" placeholder="搜索任务类型 / 任务 / 目标/交付物 / 最新进展 / 责任人" value="${esc(filter.query)}"></label></div>${gdTaskDueFilterMarkup()}${gdTaskManagementMarkup()}</div><div class="gd-filter-groups gd-panel-navigation">${gdFilterGroup('链群','category',[['all','全部'],...gdLedgerChains.map(d=>[d,d])],base,filter)}<div class="gd-ledger-departments">${departments}${other}</div>${gdFilterGroup('优先级','priority',[['all','全部'],...Object.entries(upTodoPriorities)],base,filter)}</div></div>`;
}
