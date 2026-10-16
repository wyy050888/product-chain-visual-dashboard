function ltStatusCell(value){
 const meta=ltAggregate([value]);
 return meta.state==='complete'?`<span class="lt-amount">${fmt(value)}</span>`:`<span class="lt-status lt-status-${meta.state}">${meta.label}</span>`;
}
function ltSummaryCell(values){const meta=ltAggregate(values);return meta.state==='complete'?`<b class="lt-amount">${fmt(meta.value)}</b>`:`<span class="lt-status lt-status-${meta.state}">${meta.value===null?meta.label:fmt(meta.value)+' · '+meta.label}</span>`}
function ltQuarterCell(value,plan,quarter){
 const numeric=value!==null&&value!=='none'&&value!=='draft',valid=!numeric||ltNumeric(value),name=ltPlans[plan].name+' Q'+(quarter+1);
 return `<div class="lt-cell-editor"><select data-lt-state="${plan}:${quarter}" aria-label="${name}目标状态">${[['target','目标'],['missing','未配置'],['none','无考核'],['draft','制定中']].map(([key,label])=>`<option value="${key}" ${key===(numeric?'target':value===null?'missing':value)?'selected':''}>${label}</option>`).join('')}</select>${numeric?`<input type="number" min="0" max="99999" step="1" required value="${esc(value)}" data-lt-number="${plan}:${quarter}" aria-label="${name}目标数" ${valid?'':'aria-invalid="true"'}>`:''}</div>`;
}
function ltQuarterTable(){
 const grid=ltDraft()[ltEditor.category];
 return `<table class="lt-quarter-table"><thead><tr><th scope="col">计划</th>${[1,2,3,4].map(q=>`<th scope="col">Q${q}<span>${(q-1)*3+1}—${q*3}月</span></th>`).join('')}<th scope="col">年度目标</th></tr></thead><tbody>${ltPlans.map((plan,p)=>`<tr><th scope="row">${plan.name}</th>${grid[p].map((value,q)=>`<td>${ltQuarterCell(value,p,q)}</td>`).join('')}<td data-lt-row-total="${p}">${ltSummaryCell(grid[p])}</td></tr>`).join('')}</tbody></table>`;
}
function ltMonthTable(){
 const grid=ltDraft()[ltEditor.category];
 return `<table class="lt-month-table"><thead><tr><th scope="col">计划</th>${Array.from({length:12},(_,m)=>`<th scope="col">${m+1}月</th>`).join('')}<th scope="col">年度目标</th></tr></thead><tbody>${ltPlans.map((plan,p)=>`<tr><th scope="row">${plan.name}</th>${Array.from({length:12},(_,m)=>`<td>${ltStatusCell(ltMonthValue(grid[p][Math.floor(m/3)],m+1))}</td>`).join('')}<td>${ltSummaryCell(grid[p])}</td></tr>`).join('')}</tbody></table>`;
}
function ltAnnualTable(){
 const grid=ltDraft();
 return `<table class="lt-annual-table"><thead><tr><th scope="col">计划</th>${ltCategories.map(c=>`<th scope="col">${c}</th>`).join('')}<th scope="col">公司合计</th></tr></thead><tbody>${ltPlans.map((plan,p)=>`<tr><th scope="row">${plan.name}</th>${grid.map(c=>`<td>${ltSummaryCell(c[p])}</td>`).join('')}<td>${ltSummaryCell(grid.flatMap(c=>c[p]))}</td></tr>`).join('')}</tbody></table>`;
}
function ltRenderFeedback(){
 $('#lt-error').textContent=ltEditor.error;
 $('#lt-dirty').textContent=ltEditor.dirty.size?'未保存更改':'';
 $('#lt-save').disabled=$('#lt-discard').disabled=!ltEditor.dirty.size;
 const at=ltStore.years[ltEditor.year]?.updatedAt;
 $('#lt-updated').textContent=at?'最近保存 '+new Date(at).toLocaleString('zh-CN',{hour12:false}):'';
}
function ltRenderPage(){
 $('#lt-year').value=String(ltEditor.year);
 $$('#lt-view [data-lt-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ltView===ltEditor.view)));
 $('#lt-categories').hidden=ltEditor.view==='annual';
 $('#lt-categories').innerHTML=ltCategories.map((name,c)=>`<button type="button" role="tab" data-lt-category="${c}" aria-selected="${c===ltEditor.category}" class="${c===ltEditor.category?'active':''}">${name}</button>`).join('');
 $('#lt-table').innerHTML=ltEditor.view==='quarter'?ltQuarterTable():ltEditor.view==='month'?ltMonthTable():ltAnnualTable();
 ltRenderFeedback();
}
