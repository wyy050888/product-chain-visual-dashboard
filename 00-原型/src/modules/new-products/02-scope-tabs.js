// 链群多选，季品和项目类型单选。
function nspRenderScopeTabs(options,selected,rows,key,label){
 const host=$('#nsp-'+key+'-tabs');
 if(!host.querySelector('button'))host.innerHTML=`<span class="nsp-tab-label">${esc(label)}</span>`+options.map(([value,name])=>`<button type="button" data-nsp-${key}="${esc(value)}">${esc(name)}<span></span></button>`).join('');
 const field=key==='project'?'developmentType':key;
 const counts=new Map();
 for(const row of rows)counts.set(row[field],(counts.get(row[field])||0)+1);
 for(const button of host.querySelectorAll('button')){
  const value=button.getAttribute('data-nsp-'+key);
  const active=value==='all'?!selected.length:selected.includes(value);
  const count=String(value==='all'?rows.length:counts.get(value)||0);
  if(button.getAttribute('aria-pressed')!==String(active)){
   button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  const badge=button.lastElementChild;if(badge.textContent!==count)badge.textContent=count;
 }
}
// 各组计数忽略自身，保留其他筛选。
function nspScopeRows(){
 const rows=nspRows(),categories=pfSelected(pfControlValue($('#newchain')));
 const categoryRows=rows.filter(p=>pfIncludes(categories,p.category)),seasonRows=rows.filter(p=>pfIncludes(nspFilters.season,p.season));
 nspRenderScopeTabs([['all','全部'],['夏季品','夏季品'],['冬季品','冬季品'],['四季品','四季品']],pfSelected(nspFilters.season),nspVisibleRows(categoryRows),'season','季品');
 nspRenderScopeTabs([['all','全部'],...pfCategories.map(value=>[value,value])],categories,nspVisibleRows(seasonRows),'category','链群');
 const scopedRows=categoryRows.filter(p=>pfIncludes(nspFilters.season,p.season));
 const projectRows=nspFilterRows(scopedRows,{...nspFilters,developmentType:'all'}).filter(p=>p.inNewPool);
 nspRenderScopeTabs([['all','全部'],...nspProjectTypes.map(value=>[value,value])],pfSelected(nspFilters.developmentType),projectRows,'project','项目类型');
 return scopedRows;
}
function nspSwitchScopeTab(tab,key){
 const value=tab.getAttribute('data-nsp-'+key);
 if(key!=='category')nspFilters[key==='project'?'developmentType':key]=value;
 else pfControlSet($('#newchain'),pfToggleChoice(pfControlValue($('#newchain')),value));
 newProductSelection.page=1;nspRefreshResults();
}
for(const key of ['season','category','project']){
 const host=$('#nsp-'+key+'-tabs'),selector='[data-nsp-'+key+']';
 host.onclick=e=>{const tab=e.target.closest(selector);if(tab)nspSwitchScopeTab(tab,key)};
 host.onkeydown=e=>{
  const tab=e.target.closest(selector);if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();const tabs=[...host.querySelectorAll(selector)],index=tabs.indexOf(tab);
  const next=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length];
  // 多选类目用方向键移动焦点，空格或回车确认；季品维持方向键切换。
  next.focus({preventScroll:true});if(key!=='category')next.click();
 };
}
