const ppHeaders=['产品名称','项目红绿灯','项目状态','计划上线日期','实际上线日期','延期天数','卡点阶段','责任部门','根因分析','责任链主','目标成本','最终产品报价','目标售价','立项日期','类目','品牌','操作'];
function ppSelect(key,label,values,selected=ppState[key]){
 const allLabel={category:'全部类目',type:'全部项目类型'}[key]||'全部';
 return `<label class="unified-filter-field"><span>${label}</span><select id="pp-filter-${key}" data-pp-filter="${key}" aria-label="项目${label}" multiple data-pf-multiple data-pf-label="${label}"><option value="all" ${!selected.length?'selected':''}>${allLabel}</option>${values.map(value=>`<option value="${esc(value)}" ${selected.includes(value)?'selected':''}>${esc(value)}</option>`).join('')}</select></label>`;
}
function ppDateFilter(key,label,hint=''){
 return `<div class="pp-plan"><button type="button" class="pp-plan-trigger" aria-label="${label}筛选" aria-haspopup="dialog" aria-expanded="false" aria-controls="pp-${key}-panel"><span>${label}${hint?ppHelp(label,hint):''}</span><span>${esc(ppDateSelectionLabel(ppState[key]))}</span><i>⌄</i></button><button type="button" data-pp-plan-clear="${key}" aria-label="清空${label}" ${ppState[key]?'':'hidden'}>×</button><div id="pp-${key}-panel" class="nsp-launch-panel nsp-period-panel" popover="auto" role="dialog" aria-label="选择项目${label}期间"></div></div>`;
}
function ppToolbar(rows){
 return `<div class="pp-filter-row"><label class="ui-search-field"><input type="search" data-pp-search aria-label="项目名称搜索" placeholder="搜索项目名称" value="${esc(ppState.query)}"></label>
 <label class="ui-search-field"><input type="search" data-pp-owner-search aria-label="责任链主搜索" placeholder="搜索责任链主" value="${esc(ppState.owner)}"></label>
 ${ppDateFilter('plan','计划上线日期','项目的计划量产/完成日期')}${ppDateFilter('actual','实际上线日期')}${ppDateFilter('started','立项日期')}
 ${ppSelect('brand','品牌',ppValues(rows.map(p=>p.brand)))}${ppSelect('light','项目红绿灯',['高危红灯','红灯','黄灯','绿灯'])}${ppSelect('projectState','项目状态',ppProjectStates)}${ppSelect('department','责任部门',ppDepartments)}${ppStageCascader()}
 </div><button type="button" class="link pp-reset" data-pp-reset>重置</button>`;
}
// 多个任务保留在同一风险单内；仅展示名称，不展开成重复风险记录。
function ppTaskNames(r){return r.taskNames?.length?r.taskNames.map(name=>`<span class="pp-task-name">${esc(name)}</span>`).join(''):'未填写'}
function ppLedger(p){
 const heads=['序号','任务名称','风险单红绿灯','问题类别','问题描述','根因分析','纠正措施','责任链主','整改期限'];
 return `<div class="pp-ledger" id="pp-ledger-${p.id}"><div class="pp-card-head"><h4>${esc(p.name)} · 风险台账</h4><span>共 ${p.ledger.length} 条</span></div><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${p.ledger.length?p.ledger.map((r,i)=>`<tr><td>${i+1}</td><td>${ppTaskNames(r)}</td><td>${ppTraffic(r.light)}</td>${[r.category,r.description,r.rootCause,r.action,r.owner,r.deadline].map(v=>`<td>${esc(v==null||v===''?'未填写':String(v))}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="9" class="pp-empty-ledger">暂无风险台账，请在项目中维护。</td></tr>'}</tbody></table></div>`;
}
function ppPriceCell(p,key){const lines=ppQuoteLines(p,key);if(!lines.length)return '<span class="muted">—</span>';return `<span class="pp-wrap" title="${esc(lines.join('\n'))}">${lines.map(esc).join('<br>')}</span>`}
function ppProjectTraffic(p){return ppTraffic(ppHighRisk(p)?'高危红灯':p.status)}
function ppProductCell(p){return `<button type="button" class="pp-product" data-pp-project="${p.id}">${p.image?`<img src="${esc(p.image)}" alt="">`:'<span class="pp-placeholder">项</span>'}<span><b>${esc(p.name)}</b><small>${esc(p.type)}</small></span></button>`}
function ppPlanDates(p){return `<span class="pp-plan-dates"><span>${esc(p.plan||'—')}</span><small class="${p.revisedPlan?'orange':'muted'}">延期 ${esc(p.revisedPlan||'—')}</small></span>`}
function ppDelayText(p){return p.delay==null?'—':`<span class="${p.delay>15?'pp-high-risk pp-delay-high':p.delay>0?'orange':'muted'}">${p.delay}天</span>`}
function ppProjectRow(p){
 const reasons=ppValues(p.ledger.map(r=>r.rootCause||r.description)),stage=p.stages.length?p.stages.join('、'):'待核对';
 const cells=[
  ppProductCell(p),
  ppProjectTraffic(p),esc(p.projectState||'—'),ppPlanDates(p),p.actual||'<span class="muted">'+(p.projectState==='已完成'?'待补录':'—')+'</span>',
  ppDelayText(p),
  `<span class="pp-wrap" title="${esc(p.stage||'未提供阶段')}">${esc(stage)}</span>`,
  esc(p.departments.join('、')||'待补充'),
  `<button type="button" class="pp-root-cause ${p.ledger.length?'':'muted'}" data-pp-ledger="${p.id}" aria-expanded="false" aria-controls="pp-ledger-popover" aria-haspopup="dialog"><span class="pp-wrap">${esc(reasons.join('；')||'暂无风险台账')}</span><small>${p.ledger.length?'共 '+p.ledger.length+' 条 · ':''}查看更多</small></button>`,
  esc(p.responsible.join('、')||'—'),ppPriceCell(p,'targetCosts'),ppPriceCell(p,'finalQuotes'),ppPriceCell(p,'targetPrices'),esc(p.started||'—'),esc(p.category||'—'),esc(p.brand||'—'),
  `<button type="button" class="link" data-pp-view="${p.id}">查看</button>`
 ];
 return `<tr data-pp-row="${p.id}">${cells.map((v,i)=>`<td data-label="${ppHeaders[i]}">${v}</td>`).join('')}</tr>`;
}
function ppTable(rows){
 ppHideLedger();
 const filtered=ppFiltered(rows),pages=Math.max(1,Math.ceil(filtered.length/10));ppState.page=Math.min(ppState.page,pages);
 const body=$('#pp-table-scroll'),scroll=body.scrollLeft;
 body.innerHTML=`<table class="pp-table"><colgroup>${[274,112,120,132,132,96,180,130,240,140,210,210,190,130,110,100,88].map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${ppHeaders.map(ppTableHeader).join('')}</tr></thead><tbody>${filtered.length?filtered.slice((ppState.page-1)*10,ppState.page*10).map(ppProjectRow).join(''):'<tr><td colspan="17"><div class="empty">暂无匹配项目，请调整筛选条件。</div></td></tr>'}</tbody></table>`;
 body.scrollLeft=scroll;
 $('#pp-pages').innerHTML=listPager(filtered.length,ppState.page,10,{attr:'data-pp-page'});
 $('#pp-ai').innerHTML=ppAI(ppAnalysisRows());
 return filtered;
}

function ppSortButton(key,label){
 const active=ppState.sort.key===key,direction=active?ppState.sort.direction:'',next=direction==='asc'?'降序':'升序';
 return `<button type="button" class="rp-sort-header" data-pp-sort="${key}" data-direction="${direction}" aria-label="${label}：点击${next}">${label}<span class="rp-sort-arrows" aria-hidden="true"></span></button>`;
}
function ppTableHeader(label){
 const key={'计划上线日期':'plan','实际上线日期':'actual','延期天数':'delay','立项日期':'started'}[label];
 const active=ppState.sort.key===key;
 const sort=active?(ppState.sort.direction==='asc'?'ascending':'descending'):'none';
 return `<th${key?` aria-sort="${sort}"`:''}>${key?ppSortButton(key,label):label}</th>`;
}
