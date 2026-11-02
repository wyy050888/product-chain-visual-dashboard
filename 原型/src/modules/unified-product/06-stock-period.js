// 产品库存单独保存月/季/年；公司SPU期间指标复用库存总览，余额仍取最新记录。
function upStockPeriodMetrics(m,state){
 const period=state.stockPeriod||(state.stockPeriod=ipDefaultMetricPeriod()),range=bounds(period);
 const record=ipWithMetricPeriod(period,()=>upWithRange({start:range.start,end:range.cutoff},()=>inventoryProductLedger().find(row=>row.spuId===state.spuId)));
 return record?ipMetricRecords([record],period)[0]:{cost:null,avg:null,turn:null,delivery:null,refurb:ipRefurbSummary([],range.cutoff),refurbRate:null};
}
function upMountStockPeriod(root,m,state){
 const host=root.querySelector('[data-up-stock-period]');if(!host)return;
 host.innerHTML=ipMetricPeriodMarkup(state.stockPeriod||(state.stockPeriod=ipDefaultMetricPeriod()));
 host.hidden=root.dataset.upTab!=='stock';
 ipMountMetricPeriod(host,state.stockPeriod,next=>{
  ipHideRefurbDistribution();state.stockPeriod=next;
  root.querySelector('[data-up-panel="stock"]').innerHTML=upStockView(m,state);
  upMountStock(root,m,state);upMountStockPeriod(root,m,state);drawerQueueRefresh();
 });
}
