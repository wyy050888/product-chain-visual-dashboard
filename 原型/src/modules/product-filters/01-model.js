// 品牌、类目、季品及产品类型只读主数据；缺失标记不当作老品或清仓品。
function pfDefaults(){return {brand:'all',chain:'all',attribute:'all',productType:'all'}}
function pfIdentity(record){
 const source=upIdentity(record)||sampleSpus.find(p=>p.spuId===record.spuId||p.spuCode===record.spuCode)||sampleSpuByName(record.name);
 const brand=source?.brand||(typeof record.brand==='number'?brands[record.brand]:record.brand),cohort=source?.cohort||record.cohort;
 return {brand,chain:source?.chain??record.chain,category:pfCategory(source||record),attribute:record.attribute||source?.attribute||(source?srAttribute(source.name):null),
  isNew:typeof record.isNew==='boolean'?record.isNew:cohort==='new'?true:cohort==='old'?false:null,
  clearance:typeof record.clearance==='boolean'?record.clearance:typeof source?.clearance==='boolean'?source.clearance:null};
}
function pfMatches(record,filters){const p=pfIdentity(record);return ['brand','chain','attribute','productType'].every(key=>{
 const value=filters[key]??'all';if(!pfSelected(value).length)return true;
 if(key==='productType')return pfSelected(value).some(v=>v==='new'?p.isNew===true:v==='old'?p.isNew===false:v==='clearance'?p.clearance===true:false);
 return pfSelected(value).some(v=>key==='chain'&&pfCategories.includes(v)?p.category===v:String(p[key])===v);
})}
function pfOptions(options,value,allLabel='全部'){return [{value:'all',label:allLabel},...options.map(x=>typeof x==='string'?{value:x,label:x}:x)].map(x=>`<option value="${esc(x.value)}" ${pfOptionSelected(value,x.value)?'selected':''}>${esc(x.label)}</option>`).join('')}
function pfFields(filters,keys=['brand','chain','attribute','productType'],attr='data-pf-filter',multiple=false){
 const choices={brand:[...new Set(sampleSpus.map(p=>p.brand))],chain:pfCategories,attribute:filterCatalog.seasons,productType:filterCatalog.productTypes};
 const labels={brand:'品牌',chain:'类目',attribute:'季品',productType:'属性'};
 const field=key=>`<label>${labels[key]}<select ${attr}="${key}" ${['brand','chain'].includes(key)?'multiple data-pf-multiple':''} aria-label="${labels[key]}">${pfOptions(choices[key],filters[key])}</select></label>`;
 const properties=keys.filter(k=>['attribute','productType'].includes(k));
 return keys.filter(k=>!properties.includes(k)).map(field).join('')+(properties.length?pfAttributeField(filters,properties,attr,choices,labels,'产品类型',multiple):'');
}
function pfMount(bar,filters,refresh,keys){
 if(!bar)return;bar.classList.add('pf-tools');bar.insertAdjacentHTML('beforeend',pfFields(filters,keys));
 for(const input of bar.querySelectorAll('[data-pf-filter]'))input.onchange=()=>{filters[input.dataset.pfFilter]=pfControlValue(input);refresh()};
 uiArrangeBusinessFilters(bar.parentElement);
}
