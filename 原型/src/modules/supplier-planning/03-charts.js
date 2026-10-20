// 图表只呈现既有去重台账；目标、储备门槛和日期均复用供应商模型。
function scpQuarterChart(){
 const rows=scpQuarterRows(scpState.resourceYear),max=Math.max(1,...rows.flatMap(row=>[row.target,row.range.future?0:row.newCooperation]));
 return `<section class="scp-quarter-chart" aria-label="季度新增合作与目标合作对比"><div class="scp-chart-heading"><h5>季度新增合作</h5><div class="scp-chart-legend"><span class="actual">新增合作</span><span class="target">目标合作</span></div></div><div class="scp-quarter-plot"><div class="scp-chart-scale"><span>${max}</span><span>0</span></div>${rows.map(row=>{
  const action={scope:{kind:'resource'},metric:'newCooperation',period:{start:row.range.start,end:row.range.end,cutoff:row.range.cutoff,future:row.range.future}},value=row.range.future?'—':row.newCooperation;
  return `<div class="scp-quarter-column" data-scp-chart-quarter="${row.quarter}"><div class="scp-quarter-bars"><button type="button" class="scp-quarter-actual" data-scp-members="${esc(JSON.stringify(action))}" data-value="${value}" style="--bar-height:${row.range.future?0:row.newCooperation/max*100}%" aria-label="Q${row.quarter}新增合作${value}，查看供应商" ${row.range.future?'disabled':''}><b>${value}</b><i></i></button><div class="scp-quarter-target" data-value="${row.target}" style="--bar-height:${row.target/max*100}%"><b>${row.target>0?row.target:'—'}</b><i></i></div></div><span>Q${row.quarter}</span></div>`;
 }).join('')}</div></section>`;
}
function scpCoverageRows(){
 const range=scpRange(scpState.materialPeriod),minimum=stStandards(scpState.materialPeriod.year).materialAdmitted;
 return scpBrands.flatMap(([brand])=>scpMaterials.map(material=>{
  const categories=pfCategories.map(category=>({category,count:scpMembers({kind:'material',brand,material,category},'admitted',range).length}));
  return {brand,material,categories,minimum,covered:range.future?null:categories.filter(row=>row.count>=minimum).length,range};
 }));
}
function scpCoverageChart(){
 const rows=scpCoverageRows();
 return `<section class="scp-coverage-chart" aria-label="核心零部件准入覆盖热力图"><div class="scp-chart-heading"><h5>核心零部件准入覆盖</h5><span class="scp-chart-caption">达标类目 / 5</span></div><div class="scp-coverage-matrix"><span></span>${scpMaterials.map(material=>`<span class="scp-coverage-axis">${material}</span>`).join('')}${scpBrands.map(([brand])=>`<span class="scp-coverage-brand">${brand}</span>${rows.filter(row=>row.brand===brand).map(row=>`<button type="button" class="scp-coverage-cell scp-coverage-${row.covered??'none'}" data-scp-coverage="${esc(JSON.stringify({brand,material:row.material}))}" data-covered="${row.covered??''}" aria-label="${brand} · ${row.material}：${row.covered===null?'暂无数据':'达标'+row.covered+'/5个类目'}，查看类目储备">${row.covered===null?'—':row.covered+'/5'}</button>`).join('')}`).join('')}</div><div class="scp-coverage-legend"><span>覆盖</span><span>0</span><i></i><span>5</span></div></section>`;
}
function scpOpenCoverage(brand,material){
 const row=scpCoverageRows().find(row=>row.brand===brand&&row.material===material);if(!row)return;
 openModal(brand+' · '+material+'储备',`<article class="scp-drawer" data-scp-drawer="coverage"><div class="scp-member-results">${scpTable('<tr><th data-up-basic>类目</th><th data-up-basic>已准入</th><th data-up-basic>储备状态</th></tr>',row.categories.map(item=>`<tr><td>${item.category}</td><td>${scpCount({kind:'material',brand,material,category:item.category},'admitted',item.count,row.range,{threshold:row.minimum})}</td><td><span class="${row.range.future?'muted':item.count>=row.minimum?'green':'red'}">${row.range.future?'—':item.count>=row.minimum?'达标':'不足'}</span></td></tr>`).join(''),'scp-coverage-table')}</div></article>`,false,row.range.start+' — '+row.range.cutoff);
}

function scpCategoryChart(){
 const range=scpRange(scpState.categoryPeriod),rows=pfCategories.map(category=>({category,stats:scpStats({kind:'machine',category},range)})),max=Math.max(1,...rows.map(row=>row.stats.admitted));
 return `<section class="scp-category-chart" aria-label="一级类目已准入与新增准入对比"><div class="scp-chart-heading"><h5>一级类目准入</h5><div class="scp-chart-legend"><span>已准入</span><span class="scp-legend-new">新增准入</span></div></div><div class="scp-category-plot">${rows.map(({category,stats})=>`<div class="scp-category-column" data-scp-category-chart="${category}"><div class="scp-quarter-bars">${['admitted','newAdmitted'].map(metric=>{const value=range.future?'—':stats[metric],action={scope:{kind:'machine',category},metric,period:{start:range.start,end:range.end,cutoff:range.cutoff,future:range.future}};return `<button type="button" class="scp-quarter-actual ${metric==='newAdmitted'?'scp-category-new':''}" data-scp-members="${esc(JSON.stringify(action))}" data-value="${value}" style="--bar-height:${range.future?0:stats[metric]/max*100}%" aria-label="${category}${scpMetricLabels[metric]}${value}，查看供应商" ${range.future?'disabled':''}><b>${value}</b><i></i></button>`}).join('')}</div><span>${category}</span></div>`).join('')}</div></section>`;
}
