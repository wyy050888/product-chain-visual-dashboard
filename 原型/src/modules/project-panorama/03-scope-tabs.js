// 两组筛选各忽略自身条件计数；类型复用原多选状态，灯色保留高危子集口径。
function ppScopeTabMarkup(options,selected,attribute,count){
 return options.map(([value,label])=>{
  const active=value==='all'?!selected.length:selected.includes(value);
  return `<button type="button" class="${active?'active':''}" ${attribute}="${esc(value)}" aria-pressed="${active}">${esc(label)}<span>${count(value)}</span></button>`;
 }).join('');
}
// 进行中项目作为统一分母；卡片忽略自身灯色，保留当前其他筛选条件。
function ppLightSummary(rows){return ppCounts(ppFiltered(rows,{...ppState,light:[]}).filter(p=>p.projectState==='进行中'))}
function ppLightTabs(rows,c=ppLightSummary(rows)){
 const cards=[['all','进行中项目',c.total,c.red+c.yellow,'红黄灯率','all'],
  ['高危红灯','高危红灯项目',c.high,c.high,'占比','high'],
  ['红灯','红灯项目',c.red,c.red,'占比','red'],['黄灯','黄灯项目',c.yellow,c.yellow,'占比','yellow']];
 return cards.map(([value,label,count,numerator,rateLabel,tone])=>{
  const active=value==='all'?!ppState.light.length||ppLightActive('红黄灯'):ppLightActive(value);
  return `<button type="button" class="pp-summary-card pp-summary-${tone} ${active?'active':''}" data-pp-light-tab="${value}" aria-pressed="${active}" aria-label="${label} ${count}个，${rateLabel} ${c.rate(numerator)}">
   <span class="pp-summary-label">${value==='all'?'':'<i aria-hidden="true"></i>'}${label}</span><span class="pp-summary-rate-label">${rateLabel}</span>
   <span class="pp-summary-count"><b data-pp-card-count>${count}</b><span class="pp-summary-unit">个</span></span><b class="pp-summary-rate" data-pp-card-rate>${c.rate(numerator)}</b>
  </button>`;
 }).join('');
}
// 高危从红灯总数中拆出；四段互斥，不随灯色卡选中而缩小分母。
function ppLightDistribution(c){
 const parts=[['high','高危',c.high],['red','红灯',Math.max(0,c.red-c.high)],['yellow','黄灯',c.yellow],['green','绿灯',c.green]];
 const missing=Math.max(0,c.total-c.green-c.yellow-c.red);
 if(missing)parts.push(['unknown','未标灯',missing]);
 const description=([tone,label,count])=>label+' '+count+'个'+(tone==='red'?'（不含高危）':'')+'，占比 '+c.rate(count);
 const summary=c.total?'进行中项目灯色分布：'+parts.map(description).join('；'):'暂无进行中项目';
 const segments=parts.map(part=>{
  const [tone,,count]=part,share=c.total?count/c.total*100:0;
  return `<span class="pp-light-segment pp-${tone}" data-pp-light-share="${tone}" data-count="${count}" data-share="${share}" style="width:${share}%"></span>`;
 }).join('');
 return `<div class="pp-light-distribution" role="img" aria-label="${esc(summary)}" data-total="${c.total}">${segments}</div>`;
}
function ppTypeTabs(rows){
 const state={...ppState,type:[]},candidates=ppDetailRows(ppScope(rows,state),state),options=[['all','全部'],...Object.keys(ppStages).map(value=>[value,value])];
 return '<span class="pp-scope-label">项目类型</span>'+ppScopeTabMarkup(options,ppState.type,'data-pp-type-tab',value=>value==='all'?candidates.length:candidates.filter(p=>p.type===value).length);
}
function ppCategoryTabs(rows){
 const state={...ppState,category:[]},candidates=ppDetailRows(ppScope(rows,state),state),options=[['all','全部'],...pfCategories.map(value=>[value,value])];
 return '<span class="pp-scope-label">链群</span>'+ppScopeTabMarkup(options,ppState.category,'data-pp-category-tab',value=>value==='all'?candidates.length:candidates.filter(p=>p.category===value).length);
}
function ppApplyScopeTab(button,key){
 const value=button.getAttribute('data-pp-'+key+'-tab');
 ppState[key]=pfSelected(pfToggleChoice(ppState[key],value));
 // 顶部范围筛选不改变两张图当前的分组Tab。
 ppState.link=null;ppState.stage=[];ppState.page=1;
 renderProjects();$('#pp-'+key+'-tabs [data-pp-'+key+'-tab="'+value+'"]')?.focus({preventScroll:true});
}
function ppScopeTabKeydown(event){
 const tab=event.target.closest('[data-pp-light-tab],[data-pp-type-tab],[data-pp-category-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();event.stopPropagation();
 const tabs=[...tab.parentElement.querySelectorAll('button')],index=tabs.indexOf(tab),next=tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length];
 // 多选类型、类目仅移动焦点，Enter/Space确认；灯色方向键直接切换。
 if(tab.hasAttribute('data-pp-light-tab'))next.click();else next.focus({preventScroll:true});
}
