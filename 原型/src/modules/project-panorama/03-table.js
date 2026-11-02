const ppHeaders=['产品名称','项目红绿灯','计划上线日期','延期天数','卡点阶段','责任部门','根因分析','立项日期','目标成本','目标售价','最终产品报价','操作'];
function ppSelect(key,label,values,selected=ppState[key]){
 const allLabel='全部';
 return `<label class="unified-filter-field"><span>${label}</span><select id="pp-filter-${key}" data-pp-filter="${key}" aria-label="项目${label}" multiple data-pf-multiple data-pf-label="${label}"><option value="all" ${!selected.length?'selected':''}>${allLabel}</option>${values.map(value=>`<option value="${esc(value)}" ${selected.includes(value)?'selected':''}>${esc(key==='light'&&value==='高危红灯'?'高危':value)}</option>`).join('')}</select></label>`;
}
function ppDateFilter(key,label,hint=''){
 return `<div class="pp-plan"><button type="button" class="pp-plan-trigger" aria-label="${label}筛选" aria-haspopup="dialog" aria-expanded="false" aria-controls="pp-${key}-panel"><span>${label}${hint?ppHelp(label,hint):''}</span><span>${esc(ppDateSelectionLabel(ppState[key]))}</span><i class="ui-dropdown-icon" aria-hidden="true"></i></button><button type="button" data-pp-plan-clear="${key}" aria-label="清空${label}" ${ppState[key]?'':'hidden'}>×</button><div id="pp-${key}-panel" class="nsp-launch-panel nsp-period-panel" popover="auto" role="dialog" aria-label="选择项目${label}期间"></div></div>`;
}
function ppToolbar(rows){
 return `<div class="pp-filter-row"><label class="ui-search-field"><input type="search" data-pp-search aria-label="搜索项目名称/根因分析/责任链主" placeholder="搜索项目名称/根因分析/责任链主" value="${esc(ppState.query)}"></label>
 ${ppDateFilter('plan','计划上线日期','项目的计划量产/完成日期')}${ppDateFilter('started','立项日期')}
 ${ppSelect('brand','品牌',ppValues(rows.map(p=>p.brand)))}${ppSelect('department','责任部门',ppDepartments)}${ppSelect('riskLight','风险单红绿灯',ppRiskLights)}
 </div><button type="button" class="link pp-reset" data-pp-reset>重置</button>`;
}
// 多个任务保留在同一风险单内；仅展示名称，不展开成重复风险记录。
function ppTaskNames(r){return r.taskNames?.length?r.taskNames.map(name=>`<span class="pp-task-name">${esc(name)}</span>`).join(''):'未填写'}
function ppLedger(p){
 const ledger=ppSelectedRisks(p);
 const heads=['序号','任务名称','风险单红绿灯','问题类别','问题描述','根因分析','纠正措施','责任链主','整改期限'];
 return `<div class="pp-ledger" id="pp-ledger-${p.id}"><div class="pp-card-head"><h4>${esc(p.name)} · 风险台账</h4><span>共 ${ledger.length} 条</span></div><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${ledger.length?ledger.map((r,i)=>`<tr><td>${i+1}</td><td>${ppTaskNames(r)}</td><td>${ppTraffic(r.light)}</td>${[r.category,r.description,r.rootCause,r.action,r.owner,r.deadline].map(v=>`<td>${esc(v==null||v===''?'未填写':String(v))}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="9" class="pp-empty-ledger">暂无风险台账，请在项目中维护。</td></tr>'}</tbody></table></div>`;
}
// 主表长文字最多两行，完整值保留供通用悬浮查看。
function ppCellText(value){return `<span class="pp-cell-lines" title="${esc(value)}">${esc(value)}</span>`}
function ppPriceCell(p,key){if(!ppQuoteApplicable(p,key))return '<span class="muted">--</span>';const lines=ppQuoteLines(p,key);if(!lines.length)return '<span class="muted">—</span>';return `<span class="pp-wrap" title="${esc(lines.join('\n'))}">${lines.map(esc).join('<br>')}</span>`}
function ppProjectDisplayLight(p){return ppHighRisk(p)?'高危红灯':p.status}
function ppProjectTraffic(p){return ppTraffic(ppProjectDisplayLight(p))}
function ppProjectStateTag(value){
 const tone={'进行中':'active','已完成':'done','已暂停':'muted','已取消':'muted','已暂停/取消':'muted','未开始':'muted'}[value];
 return tone?`<span class="pp-project-state pp-project-state-${tone}">${esc(value)}</span>`:esc(value||'—');
}
function ppProductCell(p){return `<button type="button" class="pp-product" data-pp-project="${p.id}">${p.image?`<img src="${esc(p.image)}" alt="">`:'<span class="pp-placeholder" role="img" aria-label="暂无产品图片" title="暂无产品图片"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg></span>'}<span><b title="${esc(p.name)}">${esc(p.name)}</b><small>${esc(p.type)}</small></span></button>`}
function ppPlanDates(p){return `<span class="pp-plan-dates"><span>${esc(p.plan||'—')}</span>${p.revisedPlan?`<small class="muted">延期至 <span class="pp-revised-date pp-traffic-${ppTrafficTone(ppProjectDisplayLight(p))}">${esc(p.revisedPlan)}</span></small>`:''}</span>`}
function ppDelayText(p){return p.delay==null?'—':`<span class="pp-delay-days pp-traffic-${ppTrafficTone(ppProjectDisplayLight(p))}${ppHighRisk(p)?' pp-delay-high':''}">${p.delay}天</span>`}
// 同一风险单提供部门与责任人的对应关系；同部门聚合去重，不按姓名推测归属。
function ppResponsibilityText(ledger){
 const values=value=>ppValues(value).flatMap(v=>String(v).split(/[\/、,，;；\n]+/)).map(v=>v.trim()).filter(v=>v&&!['—','-','未填写','待补充'].includes(v));
 const groups=new Map();
 for(const risk of ledger){
  const departments=[...new Set(values(risk.department))],owners=values(risk.owner);
  if(!departments.length&&!owners.length)continue;
  // 多部门共用一份责任人时保留联合部门，不将人员任意分配到各部门。
  const department=departments.join('/')||'部门待补充';
  if(!groups.has(department))groups.set(department,new Set());
  for(const owner of owners)groups.get(department).add(owner);
 }
 return [...groups].map(([department,owners])=>department+'-'+([...owners].join('/')||'待补充')).join('、')||'待补充';
}
function ppProjectRow(p){
 const ledger=ppSelectedRisks(p);
 const reasons=ppValues(ledger.map(r=>r.rootCause||r.description)),stage=p.stages.length?p.stages.join('、'):'待核对';
 const cells=[
  ppProductCell(p),
  ppProjectTraffic(p),ppPlanDates(p),
  ppDelayText(p),
  `<span class="pp-wrap" title="${esc(stage)}">${esc(stage)}</span>`,
  ppCellText(ppResponsibilityText(ledger)),
  `<button type="button" class="pp-root-cause ${ledger.length?'':'muted'}" data-pp-ledger="${p.id}" aria-expanded="false" aria-controls="pp-ledger-popover" aria-haspopup="dialog"><span class="pp-wrap">${esc(reasons.join('；')||'暂无风险台账')}</span><small>${ledger.length?'共 '+ledger.length+' 条 · ':''}查看更多</small></button>`,
  ppCellText(p.started||'—'),ppPriceCell(p,'targetCosts'),ppPriceCell(p,'targetPrices'),ppPriceCell(p,'finalQuotes'),
  `<button type="button" class="link" data-pp-view="${p.id}">查看</button>`
 ];
 return `<tr data-pp-row="${p.id}">${cells.map((v,i)=>`<td data-label="${ppHeaders[i]}">${v}</td>`).join('')}</tr>`;
}
// 按第七行中点限制主表视口，列宽变化或内容换行时仍准确展示六行半。
function ppFitTableViewport(host){
 dashboardQueueLayout(host,ppMeasureTableViewport);
}
function ppMeasureTableViewport(host){
 const table=host.querySelector('.pp-table');if(!table?.getClientRects().length)return;
 const partial=table.tBodies[0]?.rows[6];
 if(!partial)return ()=>host.style.removeProperty('--pp-table-max-height');
 const row=partial.getBoundingClientRect(),content=row.top-table.getBoundingClientRect().top+row.height/2;
 const height=Math.ceil(content+host.offsetHeight-host.clientHeight)+'px';
 if(host.style.getPropertyValue('--pp-table-max-height')!==height)return ()=>host.style.setProperty('--pp-table-max-height',height);
}
const ppTableViewportObserver=new ResizeObserver(entries=>{
 for(const {target} of entries){const host=target.closest('#pp-table-scroll');if(host)ppFitTableViewport(host)}
});
function ppObserveTableViewport(host){
 ppTableViewportObserver.disconnect();ppFitTableViewport(host);dashboardQueueLayout(host,dashboardMeasureResetScroll);
 const table=host.querySelector('.pp-table');if(table)ppTableViewportObserver.observe(table);
}
function ppTable(rows){
 ppHideLedger();
 const lightSummary=ppLightSummary(rows);
 $('#pp-light-tabs').innerHTML=ppLightTabs(rows,lightSummary);
 $('#pp-light-distribution').innerHTML=ppLightDistribution(lightSummary);
 $('#pp-type-tabs').innerHTML=ppTypeTabs(ppRows());
 $('#pp-category-tabs').innerHTML=ppCategoryTabs(ppRows());
 const filtered=ppDetailRows(rows),pages=Math.max(1,Math.ceil(filtered.length/listPageSize('pp-projects',10)));ppState.page=Math.max(1,Math.min(ppState.page,pages));
 const body=$('#pp-table-scroll'),scroll=body.querySelector('table')?body.scrollLeft:0;
 body.innerHTML=`<table class="pp-table"><colgroup>${[320,112,132,96,180,260,240,130,210,190,210,88].map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${ppHeaders.map(ppTableHeader).join('')}</tr></thead><tbody>${filtered.length?filtered.slice((ppState.page-1)*listPageSize('pp-projects',10),ppState.page*listPageSize('pp-projects',10)).map(ppProjectRow).join(''):`<tr><td colspan="${ppHeaders.length}"><div class="empty">暂无匹配项目，请调整筛选条件。</div></td></tr>`}</tbody></table>`;
 if(scroll)body.scrollLeft=scroll;ppObserveTableViewport(body);
 $('#pp-pages').innerHTML=listPager(filtered.length,ppState.page,listPageSize('pp-projects',10),{sizeKey:'pp-projects',attr:'data-pp-page'});
 $('#pp-ai').innerHTML=ppAI(ppAnalysisRows());ppMountAnalysisFilters();
 return filtered;
}

function ppSortButton(key,label){
 const active=ppState.sort.key===key,direction=active?ppState.sort.direction:'',next=direction==='asc'?'降序':'升序';
 return `<button type="button" class="rp-sort-header" data-pp-sort="${key}" data-direction="${direction}" aria-label="${label}：点击${next}">${label}<span class="rp-sort-arrows" aria-hidden="true"></span></button>`;
}
function ppTableHeader(label){
 const key={'计划上线日期':'plan','延期天数':'delay','立项日期':'started'}[label];
 const active=ppState.sort.key===key;
 const sort=active?(ppState.sort.direction==='asc'?'ascending':'descending'):'none';
 return `<th${key?` aria-sort="${sort}"`:''}>${key?ppSortButton(key,label):label}</th>`;
}
