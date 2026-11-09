// 数量忽略本组及列表异动条件；放大图同样忽略外层等级卡。
function kpmScopeGroup(rows,key,label,values,filters=kpmFilters,scope='main'){
 const selected=pfSelected(filters[key]),candidates=kpmFilterRows(rows,scope!=='zoom',false,{...filters,[key]:'all'});
 return `<div class="kpm-scope-group" role="group" aria-label="关键产品${label}筛选"><span class="kpm-scope-label">${label}</span>${[['all','全部'],...values.map(value=>[value,value])].map(([value,text])=>{
  const active=value==='all'?!selected.length:selected.includes(value),count=value==='all'?candidates.length:candidates.filter(row=>row[key]===value).length;
  return `<button type="button" data-${scope==='zoom'?'kpm-zoom-scope':'kpm-scope'}-filter="${key}" data-kpm-scope-value="${esc(value)}" aria-pressed="${active}" class="${active?'active':''}">${esc(text)}<span>${count}</span></button>`;
 }).join('')}</div>`;
}
function kpmRenderScopeTabs(section,rows){
 let host=section.querySelector('.kpm-scope-tabs');
 if(!host){host=document.createElement('div');host.className='kpm-scope-tabs';host.setAttribute('role','group');host.setAttribute('aria-label','关键产品季品与链群筛选');section.querySelector('.matrixlayout').before(host)}
 host.innerHTML=kpmScopeGroup(rows,'season','季品',filterCatalog.seasons)+kpmScopeGroup(rows,'category','链群',pfCategories);
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#matrix.kpm-main [data-kpm-scope-filter]');if(!button)return;
 const key=button.dataset.kpmScopeFilter,value=button.dataset.kpmScopeValue;
 const selected=pfSelected(pfToggleChoice(kpmFilters[key],value));
 kpmFilters[key]=selected.length?selected:'all';kpmPage.value=1;kpmRender();
 $('#matrix [data-kpm-scope-filter="'+key+'"][data-kpm-scope-value="'+CSS.escape(value)+'"]')?.focus({preventScroll:true});
});
document.addEventListener('keydown',event=>{
 const button=event.target.closest('#matrix.kpm-main :is([data-kpm-scope-filter],[data-kpm-zoom-scope-filter])');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();event.stopPropagation();
 const options=[...button.parentElement.querySelectorAll('button')],index=options.indexOf(button),next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowLeft'?-1:1)+options.length)%options.length;
 options[next].focus({preventScroll:true});
});
