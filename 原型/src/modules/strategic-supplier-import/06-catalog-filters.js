// 原型复用已有完整类目目录及产品档案品牌样例；正式来源按PRD接产品档案类目和全量品牌库。
function ssiArchiveBrands(){return [...new Set(brands)].sort((a,b)=>a.localeCompare(b,'zh-CN'))}
function ssiCategoryIds(value=ssiViewState().category){return [...new Set((Array.isArray(value)?value:[value]).filter(id=>id&&id!=='all'))]}
function ssiMatchesCatalog(row,state){
 const ids=ssiCategoryIds(state.category),paths=scpCategories.filter(item=>ids.includes(item.id)).map(item=>item.path),secondary=row.tier==='secondary';
 const path=secondary?row.admissionCategory:row.categoryPath,brand=secondary?row.availableBrand:row.brand;
 return (!ids.length||paths.includes(path))&&pfIncludes(state.brand,brand)&&(!secondary||pfIncludes(state.material||'all',row.admissionMaterial));
}
function ssiCatalogFilterNames(){return ssiState.tier==='secondary'?{category:'准入类目',brand:'可合作品牌'}:{category:'合作类目',brand:'合作品牌'}}
function ssiCatalogFiltersMarkup(){
 const names=ssiCatalogFilterNames();
 return `<div class="ssi-category-filter"><button type="button" class="unified-input-group ssi-category-trigger" data-ssi-category-trigger aria-haspopup="dialog" aria-expanded="false" aria-controls="ssi-category-panel"><span class="unified-field-name">${names.category}</span><span data-ssi-category-label>请选择</span><i class="ui-dropdown-icon" aria-hidden="true"></i></button><button type="button" class="ssi-category-clear" data-ssi-category-clear aria-label="清空类目" hidden>×</button><div id="ssi-category-panel" class="ssi-category-panel" popover="auto" role="dialog" aria-label="选择供应商类目"><div class="ssi-category-menu"></div></div></div><div id="ssi-material-field" hidden><label class="unified-input-group"><span class="unified-field-name">准入核心零部件</span><select id="ssi-material" aria-label="准入核心零部件" data-pf-multiple data-pf-label="准入核心零部件"><option value="all">全部</option>${scpCooperationMaterials.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></label></div><label class="unified-input-group"><span class="unified-field-name">${names.brand}</span><select id="ssi-brand" aria-label="${names.brand}" data-pf-multiple data-pf-label="${names.brand}"><option value="all">全部</option>${ssiArchiveBrands().map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></label>`;
}
function ssiSyncCatalogFilters(){
 const state=ssiViewState(),ids=ssiCategoryIds(),categories=scpCategories.filter(item=>ids.includes(item.id)),label=categories.length>1?'已选'+categories.length+'项':categories[0]?.path||'请选择',trigger=$('[data-ssi-category-trigger]'),names=ssiCatalogFilterNames(),select=$('#ssi-brand');
 const material=$('#ssi-material');$('#ssi-material-field').hidden=ssiState.tier!=='secondary';pfControlSet(material,state.material||'all');
 if(ssiState.tier!=='secondary'&&material.closest('.pf-multi'))pfMultiClose(material.closest('.pf-multi'));
 pfControlSet(select,state.brand);trigger.querySelector('.unified-field-name').textContent=names.category;trigger.querySelector('[data-ssi-category-label]').textContent=label;trigger.querySelector('[data-ssi-category-label]').classList.toggle('is-placeholder',!ids.length);trigger.title=categories.map(item=>item.path).join('；');trigger.setAttribute('aria-label',names.category+'：'+label);$('[data-ssi-category-clear]').hidden=!ids.length;
 $('#ssi-category-panel').setAttribute('aria-label','选择'+names.category);
 select.dataset.pfLabel=names.brand;select.setAttribute('aria-label',names.brand);
 const field=select.closest('.pf-multi')||select.parentElement;field.querySelector('.unified-field-name').textContent=names.brand;
 ssiCategoryCheckSync();
 const summary=field.querySelector('summary');if(summary){field.dataset.pfMultiLabel=names.brand;summary.setAttribute('aria-label',names.brand+'多选');field.querySelector('.pf-multi-menu').setAttribute('aria-label',names.brand+'选项')}
}
