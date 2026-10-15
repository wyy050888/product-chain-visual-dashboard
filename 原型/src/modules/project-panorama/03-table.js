const ppHeaders=['产品名称','项目红绿灯','项目状态','计划上线日期','实际上线日期','延期天数','卡点阶段','卡点部门','根因分析','责任人','目标成本','最终产品报价','目标售价','立项日期','类目','品牌'];
function ppSelect(key,label,values,selected=ppState[key]){
 const allLabel={category:'全部类目',type:'全部项目类型'}[key]||'全部';
 return `<label class="unified-filter-field"><span>${label}</span><select id="pp-filter-${key}" data-pp-filter="${key}" aria-label="项目${label}" multiple data-pf-multiple data-pf-label="${label}"><option value="all" ${!selected.length?'selected':''}>${allLabel}</option>${values.map(value=>`<option value="${esc(value)}" ${selected.includes(value)?'selected':''}>${esc(value)}</option>`).join('')}</select></label>`;
}
function ppToolbar(rows){
 return `<div class="pp-filter-row"><label class="ui-search-field"><input type="search" data-pp-search aria-label="项目名称搜索" placeholder="搜索项目名称" value="${esc(ppState.query)}"></label>
 <label class="ui-search-field"><input type="search" data-pp-owner-search aria-label="责任人搜索" placeholder="搜索责任人" value="${esc(ppState.owner)}"></label>
 <div class="pp-plan"><button type="button" class="pp-plan-trigger" aria-label="计划上线日期筛选" aria-haspopup="dialog" aria-expanded="false" aria-controls="pp-plan-panel"><span>计划上线日期${ppHelp('计划上线日期','项目的计划量产/完成日期')}</span><span>${esc(nspLaunchLabel(ppState.plan))}</span><i>⌄</i></button><button type="button" data-pp-plan-clear aria-label="清空计划上线日期" ${ppState.plan?'':'hidden'}>×</button><div id="pp-plan-panel" class="nsp-launch-panel nsp-period-panel" popover="auto" role="dialog" aria-label="选择项目计划上线期间"></div></div>
 </div><div class="pp-filter-row">${ppSelect('brand','品牌',ppValues(rows.map(p=>p.brand)))}${ppSelect('light','项目红绿灯',['红灯','黄灯','绿灯'])}${ppSelect('projectState','项目状态',ppProjectStates)}${ppSelect('department','卡点部门',ppDepartments)}${ppStageCascader()}
 <button type="button" class="link pp-reset" data-pp-reset>重置</button></div>`;
}
function ppLedger(p){
 const heads=['序号','问题类别','问题描述','纠正措施','责任链主','整改期限'];
 return `<div class="pp-ledger" id="pp-ledger-${p.id}"><div class="pp-card-head"><h4>${esc(p.name)} · 风险台账</h4><span>共 ${p.ledger.length} 条${p.ledger.some(r=>r.sample)?' · 演示台账':''}</span></div><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${p.ledger.length?p.ledger.map((r,i)=>`<tr>${[i+1,r.category,r.description,r.action,r.owner,r.deadline].map(v=>`<td>${esc(v==null||v===''?'未填写':String(v))}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="6" class="pp-empty-ledger">暂无风险台账，请在项目中维护。</td></tr>'}</tbody></table></div>`;
}
function ppPriceCell(p,key){const lines=ppQuoteLines(p,key);if(!lines.length)return '<span class="muted">—</span>';return `<span class="pp-wrap" title="${esc((p.sampleFields?.includes(key)?'演示报价\n':'')+lines.join('\n'))}">${lines.map(esc).join('<br>')}</span>`}
function ppProjectRow(p){
 const reasons=ppValues(p.ledger.map(r=>r.rootCause||r.description)),stage=p.stages.length?p.stages.join('、'):'待核对';
 const cells=[
  `<button type="button" class="pp-product" data-pp-project="${p.id}">${p.image?`<img src="${esc(p.image)}" alt="">`:'<span class="pp-placeholder">项</span>'}<span><b>${esc(p.name)}</b><small>${esc(p.type)}</small></span></button>`,
  traffic(p.status),esc(p.projectState||'—'),esc(p.plan||'—'),p.actual||'<span class="muted">'+(p.projectState==='已完成'?'待补录':'—')+'</span>',
  p.delay===null?'—':`<span class="${p.delay?'orange':''}">${p.delay}天</span>`,
  `<span class="pp-wrap" title="${esc(p.stage||'未提供阶段')}">${esc(stage)}</span>`,
  esc(p.departments.join('、')||'待补充'),
  `<button type="button" class="pp-root-cause ${p.ledger.length?'':'muted'}" data-pp-ledger="${p.id}" aria-expanded="false" aria-controls="pp-ledger-popover" aria-haspopup="dialog"><span class="pp-wrap">${esc(reasons.join('；')||'暂无风险台账')}</span><small>${p.ledger.length?'共 '+p.ledger.length+' 条 · ':''}查看更多</small></button>`,
  esc(p.responsible.join('、')||'—'),ppPriceCell(p,'targetCosts'),ppPriceCell(p,'finalQuotes'),ppPriceCell(p,'targetPrices'),esc(p.started||'—'),esc(p.category||'—'),esc(p.brand||'—')
 ];
 return `<tr data-pp-row="${p.id}">${cells.map((v,i)=>`<td data-label="${ppHeaders[i]}">${v}</td>`).join('')}</tr>`;
}
function ppTable(rows){
 ppHideLedger();
 const filtered=ppFiltered(rows),pages=Math.max(1,Math.ceil(filtered.length/10));ppState.page=Math.min(ppState.page,pages);
 const body=$('#pp-table-scroll'),scroll=body.scrollLeft;
 body.innerHTML=`<table class="pp-table"><colgroup>${[274,112,120,132,132,96,180,130,240,140,210,210,190,130,110,100].map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${ppHeaders.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${filtered.length?filtered.slice((ppState.page-1)*10,ppState.page*10).map(ppProjectRow).join(''):'<tr><td colspan="16"><div class="empty">暂无匹配项目，请调整筛选条件。</div></td></tr>'}</tbody></table>`;
 body.scrollLeft=scroll;
 $('#pp-pages').innerHTML=listPager(filtered.length,ppState.page,10,{attr:'data-pp-page'});
 $('#pp-ai').innerHTML=ppAI(filtered);
 return filtered;
}
