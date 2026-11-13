function ppTrafficTone(light){return {'红灯':'red','黄灯':'yellow','绿灯':'green'}[light]||'unknown'}
function ppTraffic(light){
 light=ppNormalizeProjectLight(light);
 if(!ppProjectLights.includes(light))return '<span class="muted">—</span>';
 const tone=ppTrafficTone(light);
 // 灯色通过 aria-label 提供可访问名称，避免隐藏文字误触发表格截断提示。
 return `<span class="pp-traffic pp-traffic-${tone}" role="img" aria-label="${light}" data-light="${light}"><i class="pp-traffic-pill" aria-hidden="true"></i></span>`;
}
function ppRiskStateTag(value,verification=false){
 const tone=verification?({'待验证':'pending','已验证':'done'})[value]:({'待整改':'muted','整改中':'working','已整改':'done'})[value];
 return tone?`<span class="pp-risk-state pp-risk-state-${tone}">${esc(value)}</span>`:'—';
}
function ppRiskSortButton(key,label,sort,attribute){
 const direction=sort.key===key?sort.direction:'';
 return `<button type="button" class="rp-sort-header" ${attribute}="${key}" data-direction="${direction}" aria-label="${label}：点击${direction==='asc'?'降序':'升序'}">${label}<span class="rp-sort-arrows" aria-hidden="true"></span></button>`;
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
// 部门内嵌台账的筛选表单；状态由当前台账调用方管理。
function ppRiskFilterForm({id,filters,resetAttribute,allowedLights}){
 const prefix=id;
 const select=(key,label,values)=>`<label class="pp-risk-filter"><span>${label}</span><select id="${prefix}-${key}" name="${key}" aria-label="${label}" multiple data-pf-multiple data-pf-label="${label}"><option value="all" ${filters[key].length?'':'selected'}>全部</option>${values.map(value=>`<option value="${value}" ${filters[key].includes(value)?'selected':''}>${value}</option>`).join('')}</select></label>`;
 return `<form id="${id}" class="pp-risk-filters" role="search" aria-label="风险台账查询"><input type="search" name="query" value="${esc(filters.query)}" aria-label="搜索产品名称/项目任务/根因分析/责任链主" placeholder="搜索产品名称/项目任务/根因分析/责任链主" autocomplete="off">
 ${select('light','风险单红绿灯',allowedLights)}${select('rectificationStatus','当前状态',['待整改','整改中','已整改'])}${select('verificationStatus','闭环验证',['待验证','已验证'])}
 <div class="pp-risk-filter-actions"><button type="button" class="btn" ${resetAttribute}>重置</button></div></form>`;
}
// 仅渲染完整字段；入口自行负责范围、筛选、排序与分页。
function ppRiskTableMarkup(visible,sort,{start=0,sortAttribute,rowAttribute,emptyText='暂无相关记录'}){
 return `<table class="pp-risk-detail-table" style="width:${ppRiskColumns.reduce((sum,[,,width])=>sum+width,0)}px"><colgroup>${ppRiskColumns.map(([, ,width])=>`<col style="width:${width}px">`).join('')}</colgroup><thead><tr>${ppRiskColumns.map(([key,label])=>{
  const sortable=ppRiskDateKeys.includes(key)||key==='delay',active=sort.key===key;
  return `<th${sortable?` aria-sort="${active?(sort.direction==='asc'?'ascending':'descending'):'none'}"`:''}>${sortable?ppRiskSortButton(key,label,sort,sortAttribute):label}</th>`;
 }).join('')}</tr></thead><tbody>${visible.length?visible.map(({project,risk},index)=>`<tr ${rowAttribute}="${start+index}" data-risk-id="${esc(risk.id||start+index)}">${ppRiskColumns.map(([key,label])=>`<td data-field="${key}" data-label="${label}">${ppRiskDetailCell({project,risk},key)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${ppRiskColumns.length}" class="pp-analysis-empty">${esc(emptyText)}</td></tr>`}</tbody></table>`;
}
