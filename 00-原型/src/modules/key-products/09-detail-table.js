// 首列复用新品产品身份组件；经营退货率显示目标偏差，其余经营指标显示环比，库存保持最新快照。
function kpmMetricCell(key,field){
 const valueClass=key==='gsv'?'kpm-value-gsv':key==='profit'?'kpm-value-profit':'';
 const markup=rpListCell({key:key==='returns'?'return':key,tone:'',...field}).replace('class="rp-value ',`class="${valueClass} rp-value `);
 return `<div class="kpm-metric kpm-metric-${key}" data-kpm-metric="${key}">${markup}</div>`;
}
function kpmTableMetrics(p){
 const c=p.facts,b=p.previous;
 return [
  kpmMetricCell('guidePrice',{value:Number.isFinite(p.guidePriceCents)?fmt(p.guidePriceCents/100,2)+'元':'—'}),
  kpmMetricCell('gsv',{value:upMoney(c.gsvCents),...nspComparison(c.gsvCents,b.gsvCents)}),
  kpmMetricCell('units',{value:formatSalesQuantity(c.netSales),...nspComparison(c.netSales,b.netSales)}),
  kpmMetricCell('profit',{value:upPercent(c.profitRate),...nspComparison(c.profitRate,b.profitRate,{margin:true})}),
  kpmMetricCell('returns',{value:upPercent(c.returnRate),...rpQualityReturnRule(c.returnRate,p.returnTarget)}),
  kpmMetricCell('received',{value:upPercent(c.receivedRate),...rpQualityReturnRule(c.receivedRate,p.receivedTarget,'received')}),
  kpmMetricCell('unreceived',{value:upPercent(upUnreceivedRate(c)),...rpRiskRateComparison(upUnreceivedRate(c),upUnreceivedRate(b))}),
  kpmMetricCell('warehouse',{value:stockQuantity(p.stock?.warehouse),target:'货值 '+(Number.isFinite(p.stock?.warehouseValueCents)?upMoney(p.stock.warehouseValueCents):'—')}),
  kpmMetricCell('total',{value:stockQuantity(p.stock?.totalUnits),target:'总可售天数 '+(Number.isFinite(p.stock?.totalCoverage15)?fmt(p.stock.totalCoverage15,1)+'天':'—')})
 ];
}
function kpmTable(rows){
 const headers=['SPU信息','等级变动',kpmHeader('guidePrice','指导价'),kpmHeader('sales','GSV'),kpmHeader('units','销量'),kpmHeader('profit','利润率'),
  kpmHeader('returns','总退'),kpmHeader('received','已收退'),kpmHeader('unreceived','未收退'),kpmHeader('warehouse','我司可售库存'),kpmHeader('total','总库存'),kpmHeader('days','上线时长'),'操作'];
 return rows.length?table(headers,rows.map(p=>[
  titleProduct(p,{showBrand:false,gradeMarkup:kpmGradeBadge(p)}),kpmChangeMarkup(p),...kpmTableMetrics(p),Number.isFinite(p.days)?fmt(p.days)+'天':'—',
  `<button type="button" class="link" data-kpm-detail="${p.spuId}">查看</button>`
 ])):'<div class="kpm-empty">暂无符合条件的产品，请调整搜索或筛选</div>';
}

// 数据区显示六行半；按真实第七行中点测量，兼容列宽及名称换行。
function kpmFitTableViewport(host){
 dashboardQueueLayout(host,kpmMeasureTableViewport);
}
function kpmMeasureTableViewport(host){
 const table=host.querySelector('table');
 if(!table)return ()=>host.style.removeProperty('--kpm-table-max-height');
 if(!table.getClientRects().length)return;
 const partial=table.tBodies[0]?.rows[6];
 if(!partial)return ()=>host.style.removeProperty('--kpm-table-max-height');
 const row=partial.getBoundingClientRect(),contentHeight=row.top-table.getBoundingClientRect().top+row.height/2;
 const scrollbar=host.offsetHeight-host.clientHeight;
 const height=Math.ceil(contentHeight+scrollbar)+'px';
 if(host.style.getPropertyValue('--kpm-table-max-height')!==height)return ()=>host.style.setProperty('--kpm-table-max-height',height);
}
const kpmTableViewportObserver=new ResizeObserver(entries=>{
 for(const {target} of entries){const host=target.closest('#matrix.kpm-main #matrixtable');if(host)kpmFitTableViewport(host)}
});
function kpmObserveTableViewport(host){
 kpmTableViewportObserver.disconnect();kpmFitTableViewport(host);dashboardQueueLayout(host,dashboardMeasureResetScroll);
 const table=host.querySelector('table');if(table)kpmTableViewportObserver.observe(table);
}
