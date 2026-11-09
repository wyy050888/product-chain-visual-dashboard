function ipGroups(ledger,dimension){return(dimension==='chain'?chains:brands).map((name,index)=>({name,index,...inventoryProductSum(ledger.filter(r=>dimension==='chain'?r.chain===index:r.brand===index))}))}
function ipSummaryCards(total,klass='ipd-metrics'){
 const fields=[['num',fmt(total.num)+' 件'],['amount',fmt(total.amountCents/100,2)+' 万元'],['turn',ipIndicator('turn',total.turn)],['stale',fmt(total.staleCents/100,2)+' 万元'],['delivery',ipIndicator('delivery',total.delivery)]];
 return `<div class="${klass}">${fields.map(([key,value])=>`<div><small>${ipHeading(key)}</small><strong>${value}</strong></div>`).join('')}</div>`;
}
// 首页两表独立保存排序；品牌固定复用销售达成的五个品牌，不参与TOP筛选。
const ipDefaultGroupSort=()=>({key:'warehouse',direction:'desc'});
const ipGroupSorts={category:ipDefaultGroupSort(),brand:ipDefaultGroupSort()};
function ipGroupRows(records,dimension){
 const groups=ipStockGroups(records,dimension),rows=dimension==='brand'?groups.filter(row=>filterCatalog.dashboardBrands.includes(row.name)):groups;
 return rpSortRows(rows,ipGroupSorts[dimension],(row,key)=>row[key]);
}
function ipGroupTable(records,dimension){
 const period=ipMetricPeriod,rows=ipGroupRows(records,dimension),label=dimension==='category'?'类目库存':'品牌库存';
 return ipWithMetricPeriod(period,()=>`<section class="ip-group-panel" data-ip-dimension="${dimension}"><div class="ip-group-heading"><h3><span class="ip-group-title" data-up-basic>${label}</span></h3></div><div class="ip-group-scroll tablewrap">${ipStockTable(rows,{dimension,sort:ipGroupSorts[dimension]})}</div></section>`);
}
function ipMountGroupSort(dimension,records){
 const panel=$(`#inventory .ip-group-panel[data-ip-dimension="${dimension}"]`),sort=ipGroupSorts[dimension];
 rpApplySortAria(panel,sort);
 panel.onclick=event=>{
  const button=event.target.closest('[data-rp-sort]');if(!button)return;
  rpSortCycle(sort,button.dataset.rpSort);
  if(!sort.key)Object.assign(sort,ipDefaultGroupSort());
  const host=panel.querySelector('.ip-group-scroll'),scrollLeft=host.scrollLeft;
  host.innerHTML=ipWithMetricPeriod(ipMetricPeriod,()=>ipStockTable(ipGroupRows(records,dimension),{dimension,sort}));
  rpApplySortAria(host,sort);host.scrollLeft=scrollLeft;
  host.querySelector(`[data-rp-sort="${button.dataset.rpSort}"]`)?.focus({preventScroll:true});
 };
}
function ipInventoryView(){
 const all=ipStockRecords(inventoryProductLedger());ipCaptureSnapshot(all);
 const base=ipSeasonLedger(all),stockRecords=ipMetricRecords(base,ipMetricPeriod),balance=upStockBalanceSummary(base);
 return {base,stockRecords,balance,overview:ipOverviewSummary(stockRecords,balance)};
}
renderInventory=bindRender('inventory',function(){
 ipHideRefurbDistribution();
 const {stockRecords:records,balance,overview}=ipInventoryView();
 const title=$('#inventory>.sectionhead>.titlegroup');
 if(!title.querySelector('[data-ip-summary-help]'))title.querySelector('h2').insertAdjacentHTML('afterend',ipSummaryHelp());
 ipMountSeasonFilter();
 $('#inventorymetrics').innerHTML=ipOverviewCards(overview,balance);
 ipRenderStaleAnalysis();
 $('#inventory-brand-shares').innerHTML=ipBrandShareCharts(records);
 $('#inventorytable').innerHTML=ipGroupTable(records,'category')+ipGroupTable(records,'brand');
 for(const dimension of ['category','brand'])ipMountGroupSort(dimension,records);
 ipMountStagnantTop();
 const area=headerTimeArea($('#inventory'));let host=area.querySelector('[data-ip-period-host]');
 if(!host){host=document.createElement('div');host.dataset.ipPeriodHost='overview';area.append(host)}
 host.innerHTML=ipMetricPeriodMarkup(ipMetricPeriod);
 ipMountMetricPeriod(host,ipMetricPeriod,next=>{ipMetricPeriod=next;renderInventory()});
});
window.inventoryControlAudit=()=>withPeriod('inventory',()=>{
 const {stockRecords,balance,overview}=ipInventoryView(),records=ipSeasonLedger(inventoryProductLedger());
 return {period:periodFor(),season:pfSelected(ipSeasonSelection),metricPeriod:{...ipMetricPeriod},snapshot:DATA_CUTOFF,stagnantTop:ipStagnantTopModel(),total:inventoryProductSum(records),balance,overview,records,
  chain:ipGroups(records,'chain'),brand:ipStockGroups(stockRecords,'brand'),category:ipStockGroups(stockRecords,'category'),stockRecords,brandStockRecords:stockRecords,stockTotal:ipStockSum(stockRecords),brandShares:{total:ipBrandShareModel(stockRecords,'goodsValueCents'),warehouse:ipBrandShareModel(stockRecords,'warehouseValueCents')}};
});
