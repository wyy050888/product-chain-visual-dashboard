function ppTraffic(light){
 if(!['红灯','黄灯','绿灯','高危红灯'].includes(light))return '<span class="muted">—</span>';
 const tone={'红灯':'red','黄灯':'yellow','绿灯':'green','高危红灯':'high'}[light];
 return `<span class="pp-traffic pp-traffic-${tone}" role="img" aria-label="${light}" title="${light}" data-light="${light}"><i class="pp-traffic-pill" aria-hidden="true"></i><span class="pp-traffic-label">${light}</span></span>`;
}
function ppRiskStateTag(value,verification=false){
 const tone=verification?({'待验证':'pending','已验证':'done'})[value]:({'待整改':'muted','整改中':'working','已整改':'done'})[value];
 return tone?`<span class="pp-risk-state pp-risk-state-${tone}">${esc(value)}</span>`:'—';
}
function ppRiskSortButton(key,label){
 const direction=ppRiskDetailState.sort.key===key?ppRiskDetailState.sort.direction:'';
 return `<button type="button" class="rp-sort-header" data-pp-risk-sort="${key}" data-direction="${direction}" aria-label="${label}：点击${direction==='asc'?'降序':'升序'}">${label}<span class="rp-sort-arrows" aria-hidden="true"></span></button>`;
}
function ppRiskDetailCell(entry,key){
 const {project:p,risk:r}=entry,value=v=>esc(v==null||v===''?'—':String(v));
 switch(key){
  case 'name':return ppProductCell(p);
  case 'projectLight':return ppProjectTraffic(p);
  case 'projectState':return ppProjectStateTag(p.projectState);
  case 'plan':return ppPlanDates(p);
  case 'delay':return ppDelayText(p);
  case 'taskNames':return ppTaskNames(r);
  case 'light':return ppTraffic(r.light);
  case 'rectificationStatus':return ppRiskStateTag(r.rectificationStatus);
  case 'verificationStatus':return ppRiskStateTag(r.verificationStatus,true);
  case 'operation':return `<button type="button" class="link" data-pp-analysis-view="${p.id}">查看</button>`;
  default:return value(r[key]);
 }
}
function ppRiskFilterForm(){
 const select=(key,label,values)=>`<label class="pp-risk-filter"><span>${label}</span><select id="pp-risk-filter-${key}" name="${key}" aria-label="${label}" multiple data-pf-multiple data-pf-label="${label}"><option value="all" selected>全部</option>${values.map(value=>`<option value="${value}">${value}</option>`).join('')}</select></label>`;
 return `<form id="pp-risk-filters" class="pp-risk-filters" role="search" aria-label="风险台账查询"><input type="search" name="query" aria-label="搜索产品名称/项目任务/根因分析/责任链主" placeholder="搜索产品名称/项目任务/根因分析/责任链主" autocomplete="off">
 ${select('light','风险单红绿灯',['红灯','黄灯','绿灯'])}${select('rectificationStatus','当前状态',['待整改','整改中','已整改'])}${select('verificationStatus','闭环验证',['待验证','已验证'])}
 <div class="pp-risk-filter-actions"><button type="button" class="btn" data-pp-risk-reset>重置</button></div></form>`;
}
function ppQueryRiskDetail(reset=false){
 const state=ppRiskDetailState,form=$('#pp-risk-filters');if(!state||!form)return;
 if(reset){form.reset();for(const select of form.querySelectorAll('select[multiple]'))pfControlSet(select,[])}
 const fields=new FormData(form);
 state.filters={query:String(fields.get('query')||'').trim(),...Object.fromEntries(['light','rectificationStatus','verificationStatus'].map(key=>[key,pfSelected(fields.getAll(key))]))};
 state.page=1;ppRenderRiskDetail({resetScroll:true});
}

function ppRenderRiskDetail({resetScroll=false}={}){
 const state=ppRiskDetailState,container=$('#pp-risk-detail-table');if(!state||!container)return;
 const scroll=container.scrollLeft,records=ppRiskSorted(ppRiskFiltered(state.records,state.filters),state.sort);
 state.page=Math.max(1,Math.min(state.page,Math.max(1,Math.ceil(records.length/DRAWER_PAGE_SIZE))));
 const start=(state.page-1)*DRAWER_PAGE_SIZE,visible=records.slice(start,start+DRAWER_PAGE_SIZE);
 container.innerHTML=`<table class="pp-risk-detail-table" style="width:${ppRiskColumns.reduce((sum,[,,width])=>sum+width,0)}px"><colgroup>${ppRiskColumns.map(([, ,width])=>`<col style="width:${width}px">`).join('')}</colgroup><thead><tr>${ppRiskColumns.map(([key,label])=>{
  const sortable=ppRiskDateKeys.includes(key)||key==='delay',active=state.sort.key===key;
  return `<th${sortable?` aria-sort="${active?(state.sort.direction==='asc'?'ascending':'descending'):'none'}"`:''}>${sortable?ppRiskSortButton(key,label):label}</th>`;
 }).join('')}</tr></thead><tbody>${records.length?visible.map(({project,risk},index)=>`<tr data-pp-risk-row="${start+index}" data-risk-id="${esc(risk.id||start+index)}">${ppRiskColumns.map(([key,label])=>`<td data-field="${key}" data-label="${label}">${ppRiskDetailCell({project,risk},key)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${ppRiskColumns.length}" class="pp-analysis-empty">${esc(state.records.length?'暂无符合条件的风险记录':state.emptyText)}</td></tr>`}</tbody></table>`;
 container.scrollLeft=scroll;if(resetScroll)container.scrollTop=0;
 mountListPager($('#pp-risk-detail-pages'),records.length,state.page,page=>{
  state.page=page;ppRenderRiskDetail({resetScroll:true});
  $('#pp-risk-detail-pages [aria-current="page"]')?.focus({preventScroll:true});
 });
}
function ppOpenRiskDetail(title,records,{conclusion=null,prefix='',emptyText='暂无相关记录'}={}){
 ppRiskDetailState={records,filters:ppRiskEmptyFilters(),sort:{key:'deadline',direction:'asc'},page:1,emptyText};
 openModal(title,`<div class="pp-analysis-detail pp-risk-detail">${conclusion?`<div class="pp-analysis-conclusion"><h3>${esc(conclusion.title)}</h3><p>${esc(conclusion.summary||conclusion.title)}</p></div>`:''}${ppRiskFilterForm()}<div class="pp-analysis-table" id="pp-risk-detail-table" tabindex="0" aria-label="项目风险明细，可横向滚动"></div><div id="pp-risk-detail-pages"></div></div>`,true,prefix);
 pfMultiMount($('#pp-risk-filters'));ppRenderRiskDetail();
}
document.addEventListener('submit',e=>{if(e.target.matches('#pp-risk-filters')){e.preventDefault();ppQueryRiskDetail()}});
document.addEventListener('input',e=>{if(e.target.matches('#pp-risk-filters input[name="query"]'))ppQueryRiskDetail()});
document.addEventListener('change',e=>{if(e.target.matches('#pp-risk-filters select'))ppQueryRiskDetail()});
document.addEventListener('click',e=>{
 if(e.target.closest('#pp-risk-filters [data-pp-risk-reset]')){ppQueryRiskDetail(true);return}
 const sort=e.target.closest('#pp-risk-detail-table [data-pp-risk-sort]');
 if(sort){const key=sort.dataset.ppRiskSort;ppRiskDetailState.sort={key,direction:ppRiskDetailState.sort.key===key&&ppRiskDetailState.sort.direction==='asc'?'desc':'asc'};ppRiskDetailState.page=1;ppRenderRiskDetail({resetScroll:true});$('#pp-risk-detail-table [data-pp-risk-sort="'+key+'"]')?.focus({preventScroll:true});return}
 const project=e.target.closest('#pp-risk-detail-table [data-pp-project]');if(project)toast('点击跳转项目详情页-风险管理');
});
window.projectRiskDetailAudit=()=>ppRiskDetailState?{sort:{...ppRiskDetailState.sort},page:ppRiskDetailState.page,pageSize:DRAWER_PAGE_SIZE,total:ppRiskDetailState.records.length,filters:{...ppRiskDetailState.filters},records:ppRiskSorted(ppRiskFiltered(ppRiskDetailState.records,ppRiskDetailState.filters),ppRiskDetailState.sort)}:null;
