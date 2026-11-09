const scpMetricLabels={reserved:'意向储备',newReserved:'新增意向储备',admitted:'准入储备',newAdmitted:'新增准入',cooperated:'已合作',newCooperation:'新增合作'};
function scpPeriodControl(key,period){
 const label={category:'类目准入',material:'二级供应商','category-list':'三级类目',resource:'核心战略合作供应商'}[key];
 return '<div class="scp-period period-picker ui-business-filters" data-scp-period="'+key+'"><select aria-label="'+label+'年份" data-scp-year>'+[...stYears].reverse().map(year=>'<option value="'+year+'" '+(period.year===year?'selected':'')+'>'+year+'年</option>').join('')+'</select></div>';
}

function scpCount(scope,metric,value,range,{threshold=null,tone='',tag=true,unit=true}={}){
 const color=range.future?'':tone||(threshold!==null?(value<threshold?'red':'green'):''),classes='scp-count '+color+' '+(tag?numberSignalClass(color):'');
 const text=range.future?'—':scpValue(value)+(unit&&Number.isFinite(value)?'<span class="scp-count-unit">家</span>':''),destination=range.future?null:scpCountDestination(scope,metric,range);
 if(!destination)return `<span class="${classes}">${text}</span>`;
 return `<button type="button" class="${classes}" data-scp-jump="${esc(JSON.stringify(destination))}" data-jump-toast="${esc(scpCountDestinationText(destination))}" aria-label="${esc('跳转'+destination.path)}">${text}</button>`;
}

function scpRateCell(value,{tag=true}={}){return `<span class="scp-rate ${value===null?'':value>=100?'green':'red'} ${value===null||!tag?'':numberSignalClass(value>=100?'green':'red')}">${value===null?'—':fmt(value,1)+'%'}</span>`}
function scpTable(headers,body,klass=''){const count=[...(headers.split('</tr>')[0]).matchAll(/<th(?:\s[^>]*)?>/g)].reduce((sum,match)=>sum+Number(match[0].match(/colspan="(\d+)"/)?.[1]||1),0);return `<table class="scp-table ${klass}"><thead>${headers}</thead><tbody>${body||`<tr><td class="empty" colspan="${count||1}">暂无数据</td></tr>`}</tbody></table>`}
function scpSortControl(key,label,sort,defaults=null){return rpSortHeader(key,label,sort,undefined,defaults).replaceAll('榜单排序','默认顺序').replace(/ title="[^"]*"/,'')}
function scpSortHead(key,label,sort,defaults=null){return `<th data-up-basic>${scpSortControl(key,label,sort,defaults)}</th>`}
// 用数量与年度门槛展示缺口，下钻仍使用原数量。
function scpReadiness(scope,metric,value,range,minimum){
 const configured=Number.isFinite(minimum),state=range.future||!configured?'':value<minimum?'is-short':'is-ready';
 return `<div class="scp-readiness ${state}"><div>${scpCount(scope,metric,value,range,{threshold:configured?minimum:null,tag:false,unit:false})}<span class="scp-readiness-standard">/ ${configured?minimum:'—'}</span></div></div>`;
}
function scpProjectCard(){
 const range=scpRange({year:+DATA_CUTOFF.slice(0,4),mode:'year',value:1}),query=scpState.projectQuery.trim().toLowerCase(),minimum=stStandards(+DATA_CUTOFF.slice(0,4));
 let rows=scpProjectFacts().map(row=>({...row,stats:scpStats({kind:'project',id:row.project.id},range)})).filter(row=>(row.stats.reserved<minimum.projectReserved||row.stats.admitted<minimum.projectAdmitted)&&(scpState.projectType==='all'||row.project.type.startsWith(scpState.projectType))&&[row.project.name,row.project.model].join(' ').toLowerCase().includes(query));
 rows=scpSort(rows,scpState.sorts.projects,(row,key)=>row.stats[key]);
 return `<article class="scp-card scp-project-card"><header><h4 class="scp-panel-title">产品寻源预警<button type="button" class="metric-help scp-sourcing-help" data-scp-sourcing-help="true" data-metric-rule="该列表包含自研、自选项目，仅展示意向储备数量＜${minimum.projectReserved} 或 准入储备数量＜${minimum.projectAdmitted}的项目" aria-label="查看产品寻源预警规则"></button></h4><span class="scp-pane-total">${rows.length}项</span></header><div class="scp-card-search scp-project-tools ui-business-filters"><div class="period-segment scp-project-types" role="group" aria-label="寻源项目类型">${[['all','全部'],['自研','自研'],['自选','自选']].map(([value,label])=>`<button type="button" data-scp-project-type="${value}" aria-pressed="${scpState.projectType===value}">${label}</button>`).join('')}</div><label class="ui-search-field unified-input-group"><input type="search" data-scp-query="project" placeholder="搜索项目 / 型号" aria-label="搜索寻源项目" value="${esc(scpState.projectQuery)}"></label></div><div class="scp-card-scroll">${scpTable(`<tr><th data-up-basic>产品名称</th><th data-up-basic>采购链主</th>${scpSortHead('reserved','意向储备',scpState.sorts.projects,scpDefaultSort('projects'))}${scpSortHead('admitted','准入储备',scpState.sorts.projects,scpDefaultSort('projects'))}</tr>`,rows.map(row=>{const scope={kind:'project',id:row.project.id};return `<tr><td><button type="button" class="scp-project-link" data-project="${row.project.id}">${titleProduct(row.project,{subtitle:row.project.type})}</button></td><td class="scp-procurement-lead">${esc(row.procurementLead||'—')}</td><td>${scpReadiness(scope,'reserved',row.stats.reserved,range,minimum.projectReserved)}</td><td>${scpReadiness(scope,'admitted',row.stats.admitted,range,minimum.projectAdmitted)}</td></tr>`}).join(''),'scp-project-table')}</div></article>`;
}
function scpRenderSourcingHelp(host,category=false,year=+DATA_CUTOFF.slice(0,4)){
 const minimum=stStandards(year);
 const rules=category?[['年度新增准入','＜'+minimum.categoryAdmitted],['年度新增合作','＜'+minimum.categoryCooperation]]:[['意向储备数量','＜'+minimum.projectReserved],['准入储备数量','＜'+minimum.projectAdmitted]];
 scpRenderCompactRules(host,category?'按所选年度统计，任一项不足即预警':'自研、自选项目满足任一条件即预警',rules.map(([label,condition])=>({label,condition})));
}
function scpCategoryCard(){
 const range=scpRange(scpState.categoryPeriod),q=scpState.categoryQuery.trim(),sort=scpState.sorts.categories,targets=stStandards(scpState.categoryPeriod.year);
 let rows=scpCategories.map(category=>({category,stats:scpStats({kind:'machine',categoryId:category.id},range)})).filter(row=>!range.future&&(row.stats.newAdmitted<targets.categoryAdmitted||row.stats.newCooperation<targets.categoryCooperation)&&row.category.path.includes(q));
 rows=scpSort(rows,sort,(row,key)=>row.stats[key]);
 const body=rows.map(({category,stats})=>{const scope={kind:'machine',categoryId:category.id};return `<tr data-scp-leaf="${category.id}"><td><span>${esc(category.name)}</span><small>${esc(category.category+' / '+category.group)}</small></td>${['reserved','admitted','cooperated'].map(key=>`<td>${scpCount(scope,key,stats[key],range)}</td>`).join('')}<td>${scpReadiness(scope,'newAdmitted',stats.newAdmitted,range,targets.categoryAdmitted)}</td><td>${scpReadiness(scope,'newCooperation',stats.newCooperation,range,targets.categoryCooperation)}</td></tr>`}).join('');
 const year=String(range.start).slice(2,4),headers=[['reserved','意向储备（总）'],['admitted','准入储备（总）'],['cooperated','已合作（总）'],['newAdmitted',year+'年新增准入'],['newCooperation',year+'年新增合作']];
 return `<article class="scp-card scp-category-card"><header><div class="scp-category-title"><h4 class="scp-panel-title">类目准入储备<button type="button" class="metric-help scp-sourcing-help" data-scp-category-help="true" data-metric-rule="类目准入储备规则" data-scp-rule-year="${scpState.categoryPeriod.year}" aria-label="查看类目准入储备规则"></button></h4><span class="scp-pane-count">${rows.length}项</span><button type="button" class="link" data-scp-all-categories>查看全部 ${scpCategories.length}</button></div>${scpPeriodControl('category',scpState.categoryPeriod)}</header><div class="scp-card-search ui-business-filters"><label class="ui-search-field unified-input-group"><input type="search" data-scp-query="category" placeholder="搜索三级类目" aria-label="搜索三级类目" value="${esc(scpState.categoryQuery)}"></label></div><div class="scp-card-scroll">${scpTable('<tr><th data-up-basic>三级类目</th>'+headers.map(([key,label])=>scpSortHead(key,label,sort,scpDefaultSort('categories'))).join('')+'</tr>',body,'scp-category-table')}</div></article>`;
}

// 固定四季卡片，不提供排序；实际数保留原业务跳转，目标保持只读。
function scpResourceQuarterCards(){
 return scpQuarterRows(scpState.resourceYear).map(row=>`<section class="scp-quarter-card" data-scp-resource-quarter="${row.quarter}" aria-label="${scpState.resourceYear}年Q${row.quarter}新增合作"><h5 data-up-basic>Q${row.quarter} 新增合作</h5><div class="scp-quarter-value">${scpReadiness({kind:'resource',quarter:row.quarter},'newCooperation',row.newCooperation,row.range,row.target)}</div><span class="scp-quarter-caption" data-up-basic>实际 / 目标</span></section>`).join('');
}
function scpResourceCard(){
 const annual=scpAnnual(scpState.resourceYear),yearNew=String(scpState.resourceYear).slice(-2)+'年新增合作';
 const overview=`<section class="scp-resource-summary" data-scp-annual-group="cooperated" aria-label="核心战略合作供应商年度概览"><div class="scp-resource-summary-main" data-scp-annual-metric="rate"><span data-up-basic>年度达成率</span><div class="scp-resource-summary-value">${scpRateCell(annual.rate,{tag:false})}</div></div><div class="scp-resource-summary-footer"><div data-scp-annual-metric="cooperated"><span data-up-basic>已合作（总）</span><strong>${scpCount({kind:'resource'},'cooperated',annual.cooperated,annual.range)}</strong></div><div class="scp-resource-summary-new" data-scp-annual-metric="newCooperation"><span data-up-basic>${yearNew}</span>${scpReadiness({kind:'resource'},'newCooperation',annual.newCooperation,annual.range,annual.target)}<small data-up-basic>实际 / 目标</small></div></div></section>`;
 return `<article class="scp-card scp-resource-card"><header><div class="scp-resource-heading"><h4 class="scp-panel-title">核心战略合作供应商<button type="button" class="metric-help" data-scp-resource-help="true" data-scp-rule-year="${scpState.resourceYear}" data-metric-rule="${esc(scpStrategicRuleText())}" aria-label="查看核心战略合作供应商认定规则"></button></h4><button type="button" class="btn" data-scp-import-strategic="primary">导入数据</button></div>${scpPeriodControl('resource',{year:scpState.resourceYear})}</header><div class="scp-cooperation-cards">${overview}${scpResourceQuarterCards()}</div></article>`;
}
function scpRender(scope=null){
 const grid=$('#suppliergrid'),parts={resources:['.scp-resource-card',scpResourceCard],projects:['.scp-project-card',scpProjectCard],categories:['.scp-category-card',scpCategoryCard],materialSummary:['.scp-material-card',scpMaterialCard]},part=parts[scope];
 let host=grid;
 if(part&&grid.querySelector(part[0])){grid.querySelector(part[0]).outerHTML=part[1]();host=grid.querySelector(part[0])}
 else{grid.className='suppliergrid scp-workspace';grid.innerHTML=`<section class="scp-machine-section" aria-label="一级供应商"><div class="scp-section-heading scp-machine-heading"><h3>一级供应商</h3></div><div class="scp-machine-grid">${scpResourceCard()}${scpProjectCard()}${scpCategoryCard()}</div></section>${scpMaterialTable()}`}
 host.querySelectorAll('.scp-project-card [data-rp-sort]').forEach(b=>b.dataset.scpSort='projects');host.querySelectorAll('.scp-category-table [data-rp-sort]').forEach(b=>b.dataset.scpSort='categories');host.querySelectorAll('.scp-material-summary-table [data-rp-sort]').forEach(b=>b.dataset.scpSort='materialSummary');
 for(const [key,sort] of Object.entries(scpState.sorts)){
  const buttons=[...host.querySelectorAll(`[data-scp-sort="${key}"]`)];
  for(const head of new Set(buttons.map(button=>button.closest('th')))){
   const active=buttons.some(button=>button.closest('th')===head&&button.dataset.rpSort===sort.key);
   head.setAttribute('aria-sort',active?(sort.direction==='asc'?'ascending':'descending'):'none');
  }
 }
}
