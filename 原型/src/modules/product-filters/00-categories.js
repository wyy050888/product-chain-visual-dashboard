// 五类产品字典与四链财务样例分开。个护/健康暂按产品名称演示映射，正式分类由主数据提供。
const pfCategories=['个护类','环境类','清洁类','厨电类','健康类'];
function pfCategory(record){
 if(pfCategories.includes(record.category))return record.category;
 if(record.chain===3)return /润眼|眼镜|按摩/.test(record.name||'')?'健康类':'个护类';
 return {0:'清洁类',1:'厨电类',2:'环境类'}[record.chain]||null;
}
function pfAttributeField(filters,keys,attr,choices,labels,title='产品类型',multiple=false){
 const selected=keys.filter(k=>pfSelected(filters[k]).length).map(k=>labels[k]+':'+pfSelected(filters[k]).map(value=>{const option=choices[k].find(x=>typeof x==='string'?x===value:x.value===value);return typeof option==='string'?option:option?.label||value}).join('、'));
 return '<details class="pf-attribute"><summary class="unified-input-group"><span class="unified-field-name">'+esc(title)+'</span><span class="pf-attribute-value">'+esc(selected.join(' / ')||'全部')+'</span><span aria-hidden="true">⌄</span></summary><div class="pf-attribute-menu">'+keys.map(key=>{
  const options=[{value:'all',label:'全部'},...choices[key].map(x=>typeof x==='string'?{value:x,label:x}:x)];
  return '<div class="pf-attribute-row"><b>'+labels[key]+'</b><select hidden '+(multiple?'multiple ':'')+'tabindex="-1" '+attr+'="'+key+'" aria-label="'+labels[key]+'">'+pfOptions(choices[key],filters[key])+'</select><div role="'+(multiple?'group':'radiogroup')+'" aria-label="'+labels[key]+'">'+options.map(x=>'<button type="button" role="'+(multiple?'checkbox':'radio')+'" aria-checked="'+pfOptionSelected(filters[key]||'all',x.value)+'" data-pf-attribute-choice="'+x.value+'" data-pf-attribute-key="'+key+'"><i></i>'+esc(x.label)+'</button>').join('')+'</div></div>';
 }).join('')+'</div></details>';
}
// 从实际控件值同步摘要及选中态，筛选重置后不保留旧显示。
function pfAttributeSync(root){for(const menu of root.querySelectorAll('.pf-attribute')){
 for(const select of menu.querySelectorAll('.pf-attribute-row select'))for(const radio of select.parentElement.querySelectorAll('[data-pf-attribute-choice]'))radio.setAttribute('aria-checked',String(pfOptionSelected(pfControlValue(select),radio.dataset.pfAttributeChoice)));
 menu.querySelector('.pf-attribute-value').textContent=[...menu.querySelectorAll('select')].filter(s=>pfSelected(pfControlValue(s)).length).map(s=>s.getAttribute('aria-label')+':'+[...s.selectedOptions].filter(o=>o.value!=='all').map(o=>o.textContent).join('、')).join(' / ')||'全部';
}}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-pf-attribute-choice]');
 if(!b){for(const menu of document.querySelectorAll('.pf-attribute[open]'))if(!menu.contains(e.target))menu.open=false;return}
 const menu=b.closest('.pf-attribute'),select=b.closest('.pf-attribute-row').querySelector('select'),bar=menu.parentElement;
 const value=b.dataset.pfAttributeChoice,selected=pfSelected(pfControlValue(select));
 pfControlSet(select,pfToggleChoice(selected,value,select.multiple));
 pfAttributeSync(bar);
 select.dispatchEvent(new Event('change',{bubbles:true}));
 queueMicrotask(()=>{const next=bar.isConnected?bar:document.querySelector('#dialogbody .rp-list-tools');if(next?.querySelector('.pf-attribute'))next.querySelector('.pf-attribute').open=true});
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const menu of document.querySelectorAll('.pf-attribute[open]')){menu.open=false;e.stopImmediatePropagation();e.preventDefault()}},true);

