function ltSummaryCell(values){
 const meta=ltAggregate(values);
 return meta.state==='complete'?`<span class="lt-amount">${fmt(meta.value)}</span>`:'<span class="lt-unconfigured">—</span>';
}
const ltEditorChevron='<span class="ui-dropdown-icon" aria-hidden="true"></span>';
const ltBrandPlanIndexes=ltPlans.flatMap(({stage},index)=>stage===ltInnovationStage?[]:[index]);
function ltQuarterCell(value,plan,quarter,brand){
 const name=[ltPlans[plan].name,brand,'Q'+(quarter+1)].filter(Boolean).join(' ');
 return `<input type="number" min="0" max="${ltTargetLimit(ltEditor.category,brand)}" step="1" value="${esc(value??'')}" data-lt-number="${plan}:${quarter}" data-lt-year="${ltEditor.year}" data-lt-category-index="${ltEditor.category}" data-lt-brand-name="${esc(brand)}" aria-label="${esc(name)}目标数" class="lt-target-input${value===null?' lt-input-empty':''}">`;
}
function ltQuarterRow(label,values,plan,brand=''){
 return `<tr${brand?` data-lt-brand-row="${plan}"`:''}><th scope="row">${label}</th>${values.map((value,q)=>`<td>${ltQuarterCell(value,plan,q,brand)}</td>`).join('')}<td data-lt-row-total="${plan}">${ltSummaryCell(values)}</td></tr>`;
}
function ltQuarterTable(){
 const {year,category,expandedPlans}=ltEditor,grid=ltTargetRows(year,category);
 const brands=ltBrandsFor(year,category);
 const allExpanded=ltBrandPlanIndexes.every(plan=>expandedPlans.has(plan));
 const rows=ltPlans.map(({name,stage},plan)=>{
  if(stage===ltInnovationStage)return ltQuarterRow(`<span class="lt-plan-label">${esc(name)}</span>`,grid[plan],plan);
  const expanded=expandedPlans.has(plan);
  const label=`<button type="button" class="lt-plan-toggle ui-icon-label ui-disclosure" data-lt-plan-toggle="${plan}" aria-expanded="${expanded}" aria-label="${expanded?'收起':'展开'}${esc(name)}的品牌">${ltEditorChevron}<span>${esc(name)}</span></button>`;
  const parent=ltQuarterRow(label,grid[plan],plan);
  if(!expanded)return parent;
  return parent+brands.map(brand=>ltQuarterRow(esc(brand),ltTargetRows(year,category,brand)[plan],plan,brand)).join('');
 });
 const head=`<div class="lt-plan-column"><span>计划</span><button type="button" class="lt-plan-bulk ui-icon-label" data-lt-plan-bulk aria-expanded="${allExpanded}"><span>${allExpanded?'收起品牌':'展开品牌'}</span>${ltEditorChevron}</button></div>`;
 return `<table class="lt-quarter-table"><thead><tr><th scope="col">${head}</th>${[1,2,3,4].map(q=>`<th scope="col">Q${q}</th>`).join('')}<th scope="col">年度目标</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
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
