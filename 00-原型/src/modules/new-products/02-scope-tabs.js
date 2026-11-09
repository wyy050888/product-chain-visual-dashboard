// 类目复用原有多选状态与隔离工作台适配，Tab 仅替换可见交互。
function nspScopeTabMarkup(options,selected,rows,key){
 return options.map(([value,label])=>{
  const active=value==='all'?!selected.length:selected.includes(value);
  const count=value==='all'?rows.length:rows.filter(p=>p[key]===value).length;
  return `<button type="button" class="${active?'active':''}" data-nsp-${key}="${esc(value)}" aria-pressed="${active}">${esc(label)}<span>${count}</span></button>`;
 }).join('');
}
// 各组计数忽略自身，保留其他筛选；等级保持单选，与分布图共用状态。
function nspScopeRows(){
 const rows=nspRows(),categories=pfSelected(pfControlValue($('#newchain')));
 const categoryRows=rows.filter(p=>pfIncludes(categories,p.category)),seasonRows=rows.filter(p=>pfIncludes(nspFilters.season,p.season));
 $('#nsp-season-tabs').innerHTML='<span class="nsp-tab-label">季品</span>'+nspScopeTabMarkup([['all','全部'],['夏季品','夏季品'],['冬季品','冬季品'],['四季品','四季品']],pfSelected(nspFilters.season),nspVisibleRows(categoryRows),'season');
 $('#nsp-category-tabs').innerHTML='<span class="nsp-tab-label">链群</span>'+nspScopeTabMarkup([['all','全部'],...pfCategories.map(value=>[value,value])],categories,nspVisibleRows(seasonRows),'category');
 const scopedRows=categoryRows.filter(p=>pfIncludes(nspFilters.season,p.season));
 const gradeRows=nspFilterRows(scopedRows,{...nspFilters,grade:'all'}).filter(p=>p.inNewPool);
 $('#nsp-grade-tabs').innerHTML='<span class="nsp-tab-label">产品等级</span>'+nspScopeTabMarkup([['all','全部'],...nspGrades.map(value=>[value,value])],pfSelected(nspFilters.grade),gradeRows,'grade');
 return scopedRows;
}
function nspSwitchScopeTab(tab,key){
 const value=tab.dataset[key==='season'?'nspSeason':key==='grade'?'nspGrade':'nspCategory'];
 if(key==='season'||key==='grade')nspFilters[key]=value;
 else pfControlSet($('#newchain'),pfToggleChoice(pfControlValue($('#newchain')),value));
 newProductSelection.page=1;renderNew();
 $('#nsp-'+key+'-tabs [data-nsp-'+key+'="'+value+'"]')?.focus({preventScroll:true});
}
for(const key of ['season','category','grade']){
 const host=$('#nsp-'+key+'-tabs'),selector='[data-nsp-'+key+']';
 host.onclick=e=>{const tab=e.target.closest(selector);if(tab)nspSwitchScopeTab(tab,key)};
 host.onkeydown=e=>{
  const tab=e.target.closest(selector);if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();const tabs=[...host.querySelectorAll(selector)],index=tabs.indexOf(tab);
  const next=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length];
  // 多选类目用方向键移动焦点，空格或回车确认；季品维持方向键切换。
  if(key==='category')next.focus({preventScroll:true});else next.click();
 };
}
