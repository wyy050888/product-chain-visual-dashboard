// 公司与链群共用汇总指标。链群用环形图展示品牌构成。
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
const msBrandGsvColors=['#e6905c','#8876d8','#4a80e8','#51aaca','#38a88d','#aeb9cb'];
function msBrandGsvArc(start,share){
 const point=percent=>{
  const angle=(percent/100-.25)*2*Math.PI;
  return (96+77*Math.cos(angle))+','+(96+77*Math.sin(angle));
 };
 // 两段弧也能绘制单品牌占 100% 的完整圆环。
 return `M${point(start)} A77,77 0 0,1 ${point(start+share/2)} A77,77 0 0,1 ${point(start+share)}`;
}
function msBrandGsvChart(data,name){
 const {total,rows}=msBrandGsvShares(data),arcs=[],gsvLabel=msPeriodText()+' GSV';
 let offset=0;
 const legend=rows.map(({name:brand,sale,share},index)=>{
  const color=msBrandGsvColors[index],amount=msMoney(sale),percent=msPercent(share);
  if(share>0){
   const hint=[brand,gsvLabel+'：'+fmt(sale,2)+' 万元','占比：'+percent];
   arcs.push(`<path class="ms-brand-share-arc" d="${msBrandGsvArc(offset,share)}" stroke="${color}" tabindex="0" role="img" aria-label="${esc(hint.join('，'))}" data-metric-rule="${esc(hint.join('\n'))}" data-ms-brand-arc="${esc(brand)}"/>`);
   offset+=share;
  }
  return `<div class="ms-brand-share-row" role="row" data-ms-brand-share="${esc(brand)}" data-value="${sale}" data-share="${share??''}"><span class="ms-brand-share-name" role="cell"><i style="background:${color}" aria-hidden="true"></i>${msBrandLabel(brand)}</span><span role="cell">${esc(amount)}</span><strong role="cell">${percent}</strong></div>`;
 }).join('');
 const ring=`<div class="ms-brand-share-ring"><svg viewBox="0 0 192 192" role="group" aria-label="${esc(name+'品牌 GSV 占比，合计 '+msMoney(total))}"><circle class="ms-brand-share-track" cx="96" cy="96" r="77" aria-hidden="true"/>${arcs.join('')}</svg><span class="ms-brand-share-center" aria-hidden="true">GSV占比</span></div>`;
 return `<div class="ms-brand-share" data-ms-brand-total="${total}" data-ms-brand-gsv-label="${esc(gsvLabel)}">${ring}<div class="ms-brand-share-legend" role="table" aria-label="${esc(name+'品牌 GSV 明细')}"><div class="ms-brand-share-row ms-brand-share-head" role="row"><span role="columnheader">品牌</span><span role="columnheader">${esc(gsvLabel)}</span><span role="columnheader">占比</span></div>${legend}</div>${arcs.length?'':'<p class="ms-brand-share-empty">暂无可用占比</p>'}</div>`;
}
function msRenderBrandShareTooltip(host,arc){
 const chart=arc.closest('.ms-brand-share'),name=arc.dataset.msBrandArc;
 const row=[...chart.querySelectorAll('[data-ms-brand-share]')].find(node=>node.dataset.msBrandShare===name);
 if(!row)return;
 renderBrandShareTooltip(host,name,arc.getAttribute('stroke'),[
  [chart.dataset.msBrandGsvLabel,fmt(Number(row.dataset.value),2),'万元'],
  ['占比',msPercent(Number(row.dataset.share))]
 ]);
}
function msScopeSection(section){
 const {index,summary}=section,id='ms-scope-heading-'+(index+1);
 const panels=['brand','platform'].map(view=>{
  const chart=view==='brand'&&index>=0;
  const label=view==='brand'?'分品牌':'分平台';
  const content=chart?msBrandGsvChart(section.brand,summary.name):msBreakdownTable(section[view],view,summary.name);
  return `<section class="ms-scope-breakdown" data-ms-breakdown-view="${view}" aria-label="${esc(summary.name+label)}"><h4>${label}</h4>${content}</section>`;
 }).join('');
 return `<section class="salescard ms-scope-section ${index<0?'company':''}" data-ms-section="${index}" aria-labelledby="${id}"><header class="ms-scope-heading">${msScopeIcon(index)}<h3 id="${id}">${esc(summary.name)}</h3></header>${msScopeCards(summary)}<div class="ms-scope-tables">${panels}</div></section>`;
}
function msSectionsMarkup(sections){
 return `<div class="ms-sections-host" role="region" aria-label="公司与链群销售达成明细"><div class="ms-sections">${sections.map(msScopeSection).join('')}</div></div>`;
}
