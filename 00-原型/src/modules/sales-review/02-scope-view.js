// 公司与链群使用同一组指标、双表及顺序；此处不持有选择或Tab状态。
function msScopeMetric(key,label,value,raw,auxiliary='',tone=''){
 const number=key==='sku'&&Number.isFinite(raw)?fmt(raw):value,unit=key==='sku'&&Number.isFinite(raw)?'<span class="unit">个</span>':'';
 return `<div class="ms-scope-metric" data-ms-metric="${key}" data-value="${Number.isFinite(raw)?raw:''}"><span class="ms-scope-label">${label}</span><div class="ms-scope-number"><strong class="${tone}">${esc(number)}</strong>${unit}</div><small>${auxiliary||'&nbsp;'}</small></div>`;
}
function msScopeCards(row){
 const gsv=[
  msScopeMetric('sale','GSV',msMoney(row.sale),row.sale,msDeltaContent('差额',msMoney(row.gap,true),msTone(row.gsvDeviation))),
  msScopeMetric('target','目标GSV',msMoney(row.target),row.target,msDeltaContent('偏差',msDeviation(row.gsvDeviation),msTone(row.gsvDeviation)))
 ].join('');
 const margin=[
  msScopeMetric('actualMargin','利润率',msPercent(row.actualMargin),row.actualMargin,msDeltaContent('差额',msDeviation(row.marginGap),msTone(row.marginGap))),
  msScopeMetric('targetMargin','目标利润率',msPercent(row.targetMargin),row.targetMargin)
 ].join('');
 const scale=msScopeMetric('scaleRate','规模达成率',msPercent(row.scaleRate),row.scaleRate,msDeltaContent('偏差',msDeviation(row.scaleDeviation),msTone(row.scaleDeviation)),msTone(row.scaleDeviation));
 return `<div class="ms-scope-metrics"><article class="ms-summary-card ms-summary-pair" data-ms-group="gsv" aria-label="GSV与目标">${gsv}</article><article class="ms-summary-card ms-summary-pair" data-ms-group="margin" aria-label="利润率与目标">${margin}</article><article class="ms-summary-card ms-summary-scale" data-ms-group="scale" aria-label="规模达成">${scale}<div class="ms-summary-progress"><span>时间进度 ${msPercent(row.progress)}</span>${msScaleProgress(row)}</div></article><article class="ms-summary-card" data-ms-group="sku" aria-label="SKU总数">${msScopeMetric('sku','SKU总数','--',row.sku)}</article></div>`;
}
function msScopeIcon(index){
 const shapes=index<0?'<path d="M5 20V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v15M3 20h18M9 8h1m4 0h1M9 12h1m4 0h1M10 20v-4h4v4"/>':'<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 6h6a3 3 0 0 1 3 3v6M15 18H9a3 3 0 0 1-3-3V9"/>';
 return '<span class="ms-scope-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+shapes+'</svg></span>';
}
function msScopeSection(section){
 const {index,summary}=section,id='ms-scope-heading-'+(index+1);
 const panels=['brand','platform'].map(view=>`<section class="ms-scope-breakdown" data-ms-breakdown-view="${view}" aria-label="${esc(summary.name)}${view==='brand'?'分品牌':'分平台'}"><h4>${view==='brand'?'分品牌':'分平台'}</h4>${msBreakdownTable(section[view],view,summary.name)}</section>`).join('');
 return `<section class="salescard ms-scope-section ${index<0?'company':''}" data-ms-section="${index}" aria-labelledby="${id}"><header class="ms-scope-heading">${msScopeIcon(index)}<h3 id="${id}">${esc(summary.name)}</h3></header>${msScopeCards(summary)}<div class="ms-scope-tables">${panels}</div></section>`;
}
function msSectionsMarkup(sections){
 return `<div class="ms-sections-host" role="region" aria-label="公司与链群销售达成明细"><div class="ms-sections">${sections.map(msScopeSection).join('')}</div></div>`;
}
