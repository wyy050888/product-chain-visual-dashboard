// 每行一个类目、三级类目与品牌组合；按全年准入关系和供应商身份去重。
function scpMaterialFlatRows(range){
 return scpCategories.flatMap(category=>scpBrands.map(([brand])=>({brand,category,stats:scpMaterialStats(brand,category.id,range)})));
}
function scpMaterialCells(scope,stats,range,materials=scpMaterials){
 return materials.map(material=>{
  const target=stats.targets[material];if(!Number.isFinite(target))return '<td class="scp-material-component-cell"><span class="muted">无目标</span></td>';
  const actual=scpCount({...scope,material},'newAdmitted',stats[material],range,{threshold:target,tag:false,unit:false});
  return `<td class="scp-material-component-cell" data-scp-detail-material="${esc(material)}"><span class="scp-admission-pair">${actual}<span class="scp-admission-divider">/</span><span class="scp-admission-target">${scpValue(target)}</span></span></td>`;
 }).join('');
}
// 首页按一级类目、品牌、核心件去重计数；不显示或汇总目标。
function scpMaterialGrid(){
 const range=scpRange(scpState.materialPeriod),sort=scpState.sorts.materialSummary;
 const head='<tr><th data-up-basic>类目</th><th data-up-basic>品牌</th>'+scpMaterials.map(material=>scpSortHead(material,material,sort,scpDefaultSort('materialSummary'))).join('')+'<th data-up-basic>操作</th>';
 const body=scpCategoryNames.map(category=>{
  const rows=scpBrands.map(([brand])=>({brand,counts:Object.fromEntries(scpMaterials.map(material=>[material,range.future?null:scpMembers({kind:'material',category,brand,material},'newAdmitted',range).length]))}));
  return scpSort(rows,sort,(row,key)=>row.counts[key]).map(({brand,counts},i)=>`<tr data-scp-material-summary="${esc(category)}" data-scp-summary-brand="${esc(brand)}">${i?'':`<td class="scp-material-summary-category" rowspan="${rows.length}">${esc(category)}</td>`}<td class="scp-material-summary-brand">${esc(brand)}</td>${scpMaterials.map(material=>`<td data-scp-summary-material="${material}">${range.future?'—':scpValue(counts[material])+'<span class="scp-summary-count-unit">家</span>'}</td>`).join('')}${i?'':`<td class="scp-material-summary-operation" rowspan="${rows.length}"><button type="button" class="link" data-scp-material-view="${esc(category)}" aria-label="查看${esc(category)}核心物料供应商准入储备">查看</button></td>`}</tr>`).join('');
 }).join('');
 return `<div class="scp-material-scroll" id="scp-material-merged-scroll"><table class="scp-table scp-material-summary-table" data-column-key="scp-material-category-brand-count-v5"><colgroup><col style="width:12%"><col style="width:12%">${scpMaterials.map(()=>'<col style="width:11%">').join('')}<col style="width:10%"></colgroup><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
function scpMaterialCard(){
 return `<section class="scp-card scp-material-card" aria-label="核心物料供应商准入储备"><div class="scp-chart-heading scp-material-table-heading"><h4 class="scp-panel-title">核心物料供应商准入储备</h4></div>${scpMaterialGrid()}</section>`;
}
function scpMaterialTable(){
 return `<div class="scp-section-heading scp-material-section-heading"><h3 class="scp-material-title">二级供应商</h3><div class="scp-section-actions">${scpPeriodControl('material',scpState.materialPeriod)}</div></div><div class="scp-material-layout">${scpCoverageChart()}${scpMaterialCard()}</div>`;
}
