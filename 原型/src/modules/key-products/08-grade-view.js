function kpmGradeRange(fact){return fact.start.replaceAll('-','/')+' — '+fact.end.replaceAll('-','/')}
function kpmChangeText(assessment){
 const {current,previous}=assessment;
 return (previous.level||'待分级')+' → '+(current.level||'待分级');
}
function kpmChangeButton(p){return `<button type="button" class="kpm-change ${p.assessment.change}" data-kpm-history="${p.spuId}"><b>${kpmChangeText(p.assessment)}</b><small>${kpmChanges[p.assessment.change]}</small></button>`}
function kpmRenderChangeTabs(rows){
 const scope=kpmFilterRows(rows,true,false),host=$('#kpm-change-tabs');
 const options=[['all','全部变动',scope.length],...Object.entries(kpmChanges).filter(([key])=>!['new','uncompared'].includes(key)||kpmSelectedChange===key||scope.some(p=>p.assessment.change===key)).map(([key,label])=>[key,label,scope.filter(p=>p.assessment.change===key).length])];
 host.innerHTML=options.map(([key,label,count])=>`<button type="button" data-kpm-change="${key}" class="${key} ${kpmSelectedChange===key?'active':''}" aria-pressed="${kpmSelectedChange===key}">${label}<span>${count}</span></button>`).join('');
}
function kpmHistoryComparisonMarkup(assessment){
 const {current,previous}=assessment;
 const card=(fact,label)=>`<section class="kpm-history-period"><small>${label}</small><time>${kpmGradeRange(fact)}</time>${kpmGradeBadge({level:fact.level})}<div><span>GSV<strong class="kpm-value-gsv">${upMoney(fact.gsvCents)}</strong></span><span>单品利润率<strong class="kpm-value-profit ${fact.profitRate<0?'red':''}">${upPercent(fact.profitRate)}</strong></span></div></section>`;
 return card(previous,'上期')+'<span aria-hidden="true">→</span>'+card(current,'本期');
}
function kpmHistoryMarkup(p,history){
 return `<article class="kpm-grade-history"><header class="kpm-history-product">${riskThumbnail(p.name)}<div><button type="button" class="link" data-kpm-history-product="${p.spuId}">${esc(p.name)}</button><small>${esc(p.spuCode)}</small></div><button type="button" class="btn small" data-kpm-history-product="${p.spuId}">产品详情</button></header><div class="kpm-history-compare">${kpmHistoryComparisonMarkup(history[0])}</div><div class="kpm-history-toolbar"><h3>历史记录</h3><label>变动<select data-kpm-history-filter aria-label="历史等级变动"><option value="all">全部</option><option value="changed">等级升降</option><option value="same">等级保持</option><option value="pending">待分级</option></select></label></div><div class="kpm-history-table" data-kpm-history-table></div></article>`;
}
function kpmOpenGradeHistory(spuId){withPeriod('matrix',()=>{
 kpmHidePointTooltip();const p=kpmRows().find(p=>p.spuId===spuId);if(!p)return;
 const history=kpmGradeHistory(upIdentity(p),upWindow().end);
 openModal('等级变动记录',kpmHistoryMarkup(p,history));
 const root=$('.kpm-grade-history'),select=root.querySelector('[data-kpm-history-filter]'),host=root.querySelector('[data-kpm-history-table]');
 let selected=history[0];
 const compare=root.querySelector('.kpm-history-compare');
 const showComparison=()=>{
  compare.innerHTML=kpmHistoryComparisonMarkup(selected);root.dataset.gradeStart=selected.current.start;root.dataset.gradeEnd=selected.current.end;
 };
 const fill=()=>{
  const rows=history.filter(r=>select.value==='all'||(select.value==='changed'?['up','down'].includes(r.change):select.value===r.change));
  compare.hidden=!rows.length;if(rows.length){if(!rows.includes(selected))selected=rows[0];showComparison()}
  host.innerHTML=rows.length?table(['考核周期','等级','GSV','单品利润率','等级变动','操作'],rows.map(r=>[
   `<time>${kpmGradeRange(r.current)}</time>`,kpmGradeBadge({level:r.current.level}),`<span class="kpm-value-gsv">${upMoney(r.current.gsvCents)}</span>`,`<span class="kpm-value-profit ${r.current.profitRate<0?'red':''}">${upPercent(r.current.profitRate)}</span>`,`<span class="kpm-history-change ${r.change}">${kpmChangeText(r)}<small>${kpmChanges[r.change]}</small></span>`,`<button type="button" class="link" data-kpm-history-pick="${history.indexOf(r)}" aria-pressed="${selected===r}">查看</button>`
  ])):'<div class="kpm-empty">暂无对应变动记录</div>';
  host.querySelectorAll('th').forEach(th=>th.setAttribute('data-up-basic','true'));
 };
 select.onchange=fill;
 host.onclick=e=>{const button=e.target.closest('[data-kpm-history-pick]');if(button){selected=history[Number(button.dataset.kpmHistoryPick)];fill()}};
 fill();
});}
document.addEventListener('click',e=>{
 const change=e.target.closest('#matrix.kpm-main [data-kpm-change]');
 if(change){kpmSelectedChange=kpmSelectedChange===change.dataset.kpmChange?'all':change.dataset.kpmChange;kpmPage.value=1;kpmRender();return}
 const history=e.target.closest('#matrix.kpm-main [data-kpm-history]');if(history){kpmOpenGradeHistory(history.dataset.kpmHistory);return}
 const product=e.target.closest('.kpm-grade-history [data-kpm-history-product]');if(product){const root=product.closest('.kpm-grade-history');kpmOpenDetail(product.dataset.kpmHistoryProduct,{start:root.dataset.gradeStart,end:root.dataset.gradeEnd})}
});
