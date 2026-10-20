// 首列复用新品产品身份组件；指标复用统一环比、退货偏差和库存快照。
function kpmMetricCell(key,field){
 const valueClass=key==='gsv'?'kpm-value-gsv':key==='profit'?'kpm-value-profit':'';
 const markup=rpListCell({tone:'',...field}).replace('class="rp-value ',`class="${valueClass} rp-value `);
 return `<div class="kpm-metric kpm-metric-${key}" data-kpm-metric="${key}">${markup}</div>`;
}
function kpmTableMetrics(p){
 const c=p.facts,b=p.previous;
 return [
  kpmMetricCell('gsv',{value:upMoney(c.gsvCents),...nspComparison(c.gsvCents,b.gsvCents)}),
  kpmMetricCell('units',{value:fmt(c.sales),...nspComparison(c.sales,b.sales)}),
  kpmMetricCell('profit',{value:upPercent(c.profitRate),...nspComparison(c.profitRate,b.profitRate,true)}),
  kpmMetricCell('returns',{value:upPercent(c.returnRate),...rpQualityReturnRule(c.returnRate,p.returnTarget)}),
  kpmMetricCell('received',{value:upPercent(c.receivedRate),...rpQualityReturnRule(c.receivedRate,8)}),
  kpmMetricCell('warehouse',{value:Number.isFinite(p.stock?.warehouse)?fmt(p.stock.warehouse):'—',target:'我司可售货值 '+(Number.isFinite(p.stock?.warehouseValueCents)?upMoney(p.stock.warehouseValueCents):'—')}),
  kpmMetricCell('total',{value:Number.isFinite(p.stock?.totalUnits)?fmt(p.stock.totalUnits):'—',target:'总可售天数 '+(Number.isFinite(p.stock?.totalCoverage15)?fmt(p.stock.totalCoverage15,1)+'天':'—')})
 ];
}
function kpmTable(rows){
 const headers=['SPU信息','产品分级','等级变动',kpmHeader('sales','GSV'),kpmHeader('units','销量'),kpmHeader('profit','利润率'),
  kpmHeader('returns','总退'),kpmHeader('received','已收退'),kpmHeader('warehouse','我司可售库存'),kpmHeader('total','总库存'),'类目','季品','操作'];
 return rows.length?table(headers,rows.map(p=>[
  titleProduct(p,{showBrand:false}),kpmGradeBadge(p),kpmChangeButton(p),...kpmTableMetrics(p),esc(p.category||'—'),esc(p.season||'—'),
  `<button type="button" class="link" data-kpm-detail="${p.spuId}">查看</button>`
 ])):'<div class="kpm-empty">暂无符合条件的产品，请调整搜索或筛选</div>';
}

// 按实际行高容纳十条，避免长名称换行或窄屏时固定高度截断第十条。
function kpmFitTableViewport(host){
 const table=host.querySelector('table');
 if(!table){host.style.removeProperty('--kpm-table-max-height');return}
 if(!table.getClientRects().length)return;
 const rows=[...(table.tBodies[0]?.rows||[])],last=rows[Math.min(10,rows.length)-1];
 if(!last)return;
 const contentHeight=last.getBoundingClientRect().bottom-table.getBoundingClientRect().top;
 const scrollbar=host.offsetHeight-host.clientHeight;
 host.style.setProperty('--kpm-table-max-height',Math.ceil(contentHeight+scrollbar)+'px');
}
const kpmTableViewportObserver=new ResizeObserver(entries=>{
 for(const {target} of entries){const host=target.closest('#matrix.kpm-main #matrixtable');if(host)kpmFitTableViewport(host)}
});
function kpmObserveTableViewport(host){
 kpmTableViewportObserver.disconnect();kpmFitTableViewport(host);
 const table=host.querySelector('table');if(table)kpmTableViewportObserver.observe(table);
}
