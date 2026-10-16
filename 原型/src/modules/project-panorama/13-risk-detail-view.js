function ppTraffic(light){
 if(!['红灯','黄灯','绿灯','高危红灯'].includes(light))return '<span class="muted">—</span>';
 const tone={'红灯':'red','黄灯':'yellow','绿灯':'green','高危红灯':'high'}[light];
 return `<span class="pp-traffic pp-traffic-${tone}" role="img" aria-label="${light}" title="${light}" data-light="${light}"><i class="pp-traffic-radio" aria-hidden="true"></i><i class="pp-traffic-pill" aria-hidden="true"></i><span class="pp-traffic-label">${light}</span></span>`;
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
  case 'projectState':return value(p.projectState);
  case 'plan':return ppPlanDates(p);
  case 'delay':return ppDelayText(p);
  case 'stage':return value(ppValues(r.stage?.length?r.stage:p.stages).join('、'));
  case 'taskNames':return ppTaskNames(r);
  case 'light':return ppTraffic(r.light);
  case 'rectificationStatus':return ppRiskStateTag(r.rectificationStatus);
  case 'verificationStatus':return ppRiskStateTag(r.verificationStatus,true);
  case 'operation':return `<button type="button" class="link" data-pp-analysis-view="${p.id}">查看</button>`;
  default:return value(r[key]);
 }
}
function ppRenderRiskDetail(){
 const state=ppRiskDetailState,container=$('#pp-risk-detail-table');if(!state||!container)return;
 const scroll=container.scrollLeft,records=ppRiskSorted(state.records,state.sort);
 container.innerHTML=`<table class="pp-risk-detail-table" style="width:${ppRiskColumns.reduce((sum,[,,width])=>sum+width,0)}px"><colgroup>${ppRiskColumns.map(([, ,width])=>`<col style="width:${width}px">`).join('')}</colgroup><thead><tr>${ppRiskColumns.map(([key,label])=>{
  const sortable=ppRiskDateKeys.includes(key)||key==='delay',active=state.sort.key===key;
  return `<th${sortable?` aria-sort="${active?(state.sort.direction==='asc'?'ascending':'descending'):'none'}"`:''}>${sortable?ppRiskSortButton(key,label):label}</th>`;
 }).join('')}</tr></thead><tbody>${records.length?records.map(({project,risk},index)=>`<tr data-pp-risk-row="${index}" data-risk-id="${esc(risk.id||index)}">${ppRiskColumns.map(([key,label])=>`<td data-field="${key}" data-label="${label}">${ppRiskDetailCell({project,risk},key)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${ppRiskColumns.length}" class="pp-analysis-empty">${esc(state.emptyText)}</td></tr>`}</tbody></table>`;
 container.scrollLeft=scroll;
}
function ppOpenRiskDetail(title,records,{conclusion=null,prefix='',emptyText='暂无相关记录'}={}){
 ppRiskDetailState={records,sort:{key:'deadline',direction:'asc'},emptyText};
 const projects=new Set(records.map(entry=>entry.project.id));
 openModal(title,`<div class="pp-analysis-detail pp-risk-detail">${conclusion?`<div class="pp-analysis-conclusion"><h3>${esc(conclusion.title)}</h3><p>${esc(conclusion.summary||conclusion.title)}</p></div>`:''}<div class="pp-analysis-total">${prefix?esc(prefix)+' · ':''}${projects.size} 个项目 · ${records.length} 条风险</div><div class="pp-analysis-table" id="pp-risk-detail-table" tabindex="0" aria-label="项目风险明细，可横向滚动"></div></div>`,true);
 ppRenderRiskDetail();
}
document.addEventListener('click',e=>{
 const sort=e.target.closest('#pp-risk-detail-table [data-pp-risk-sort]');
 if(sort){const key=sort.dataset.ppRiskSort;ppRiskDetailState.sort={key,direction:ppRiskDetailState.sort.key===key&&ppRiskDetailState.sort.direction==='asc'?'desc':'asc'};ppRenderRiskDetail();$('#pp-risk-detail-table [data-pp-risk-sort="'+key+'"]')?.focus({preventScroll:true});return}
 const project=e.target.closest('#pp-risk-detail-table [data-pp-project]');if(project)toast('点击跳转项目详情页-风险管理');
});
window.projectRiskDetailAudit=()=>ppRiskDetailState?{sort:{...ppRiskDetailState.sort},records:ppRiskSorted(ppRiskDetailState.records,ppRiskDetailState.sort)}:null;
