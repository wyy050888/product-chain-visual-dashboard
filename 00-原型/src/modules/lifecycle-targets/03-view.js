function ltSummaryCell(values){
 const meta=ltAggregate(values);
 return meta.state==='complete'?`<span class="lt-amount">${fmt(meta.value)}</span>`:'<span class="lt-unconfigured">—</span>';
}
function ltQuarterCell(value,plan,quarter){
 const valid=value===null||ltNumeric(value),name=ltPlans[plan].name+' Q'+(quarter+1);
 return `<input type="number" min="0" max="${ltEditor.category===3?199998:99999}" step="1" value="${esc(value??'')}" data-lt-number="${plan}:${quarter}" data-lt-year="${ltEditor.year}" data-lt-category-index="${ltEditor.category}" aria-label="${name}目标数" class="lt-target-input${value===null?' lt-input-empty':''}" ${valid?'':'aria-invalid="true"'}>`;
}
function ltQuarterTable(){
 const grid=ltYearValues(ltEditor.year)[ltEditor.category];
 return `<table class="lt-quarter-table"><thead><tr><th scope="col">计划</th>${[1,2,3,4].map(q=>`<th scope="col">Q${q}</th>`).join('')}<th scope="col">年度目标</th></tr></thead><tbody>${ltPlans.map((plan,p)=>`<tr><th scope="row">${plan.name}</th>${grid[p].map((value,q)=>`<td>${ltQuarterCell(value,p,q)}</td>`).join('')}<td data-lt-row-total="${p}">${ltSummaryCell(grid[p])}</td></tr>`).join('')}</tbody></table>`;
}
function ltRenderFeedback(){
 $('#lt-error').textContent=ltEditor.error;
}
function ltRenderPage(){
 $('#lt-year').value=String(ltEditor.year);
 $('#lt-categories').innerHTML=ltCategories.map((name,c)=>`<button type="button" role="tab" data-lt-category="${c}" aria-selected="${c===ltEditor.category}" class="${c===ltEditor.category?'active':''}">${name}</button>`).join('');
 $('#lt-table').innerHTML=ltQuarterTable();
 ltRenderFeedback();
}
