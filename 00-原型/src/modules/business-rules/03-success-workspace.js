// 查看选择与新增草稿分开；季度和年度各自记住查看的方案。
const brcSuccessView={kind:'quarter',selected:{quarter:null,year:null},goalDraft:null,error:''};
function brcSuccessSelected(){
 const rows=brcSuccessVisibleRules(brcSuccessView.kind),selected=rows.find(row=>row.from===brcSuccessView.selected[brcSuccessView.kind]);
 return selected||rows.find(row=>row.status==='current');
}
function brcSuccessWorkspace(){
 const kind=brcSuccessView.kind,rows=brcSuccessVisibleRules(kind),row=brcSuccessSelected();
 const choices=['current','pending','history'].map(status=>{const list=rows.filter(item=>item.status===status);return list.length?`<optgroup label="${brcSuccessRuleStatus(status)}">${list.map(item=>`<option value="${item.from}" ${item.from===row.from?'selected':''}>${brcSuccessPeriodText(kind,item.from)}</option>`).join('')}</optgroup>`:''}).join('');
 const groups=[['四季品',kind==='year'?'success-year':'success-quarter'],['夏季品／冬季品','success-season']];
 return `<section class="brcs-target"><label>新品销售成功率目标 <input type="number" min="0" max="100" step="0.01" data-brcs-target value="${esc(brcSuccessView.goalDraft??brcNumber('new.successRate'))}" aria-label="新品销售成功率目标">%</label><button type="button" class="btn primary" data-brcs-target-save>保存目标</button><small>仅用于成功率目标对照，不改变单品成功判定。</small></section>
 <section class="brcs-workspace"><div class="brcs-toolbar"><div class="period-segment" role="group" aria-label="考核类型">${[['quarter','季度考核'],['year','年度考核']].map(([value,label])=>`<button type="button" data-brcs-kind="${value}" aria-pressed="${kind===value}">${label}</button>`).join('')}</div><button type="button" class="btn primary" data-brcs-create>新增规则</button></div>
 <div class="brcs-selector"><label>查看规则 <span class="brcs-choice"><select data-brcs-record aria-label="查看成功规则">${choices}</select><span class="brcs-choice-display" aria-hidden="true"><span class="brcs-status ${row.status}">${brcSuccessRuleStatus(row.status)}</span> · ${esc(brcSuccessPeriodText(kind,row.from))}</span><span class="brcs-choice-arrow" aria-hidden="true">⌄</span></span></label><button type="button" class="link" data-brcs-edit>编辑</button>${row.status==='pending'?'<button type="button" class="link" data-brcs-delete>删除</button>':''}</div>
 <table class="cec-table brcs-readonly-table" aria-label="成功规则条件"><thead><tr><th>产品类型</th><th>成功条件</th></tr></thead><tbody>${groups.map(([label,id])=>`<tr><td>${label}</td><td>${esc(brcResultText(id,row.conditions))}</td></tr>`).join('')}</tbody></table>
 <p class="brcs-page-error" role="alert">${esc(brcSuccessView.error)}</p></section>`;
}
function brcSuccessPaintWorkspace(){
 const host=brcPage.querySelector('[data-brc-new-section="success"] .brc-new-body');if(host)host.innerHTML=brcSuccessWorkspace();
}
