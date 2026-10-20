function ipGroups(ledger,dimension){return(dimension==='chain'?chains:brands).map((name,index)=>({name,index,...inventoryProductSum(ledger.filter(r=>dimension==='chain'?r.chain===index:r.brand===index))}))}
function ipSummaryCards(total,klass='ipd-metrics'){
 const fields=[['num',fmt(total.num)+' 件'],['amount',fmt(total.amountCents/100,2)+' 万元'],['turn',ipIndicator('turn',total.turn)],['stale',fmt(total.staleCents/100,2)+' 万元'],['delivery',ipIndicator('delivery',total.delivery)],['refurb',ipIndicator('refurb',total.refurbDelay)]];
 return `<div class="${klass}">${fields.map(([key,value])=>`<div><small>${ipHeading(key)}</small><strong>${value}</strong></div>`).join('')}</div>`;
}
// 首页两表独立保存排序，品牌先取货值TOP5再按所选指标排序
const ipDefaultGroupSort=()=>({key:'warehouse',direction:'desc'});
const ipGroupSorts={category:ipDefaultGroupSort(),brand:ipDefaultGroupSort()};
function ipGroupRows(records,dimension){
 const groups=ipStockGroups(records,dimension),rows=dimension==='brand'?groups.slice(0,5):groups;
 return rpSortRows(rows,ipGroupSorts[dimension],(row,key)=>row[key]);
}
function ipGroupTable(base,dimension){
 const period=ipMetricPeriods[dimension],records=ipMetricRecords(base,period),rows=ipGroupRows(records,dimension),label=dimension==='category'?'类目库存':'品牌库存 TOP5';
 return ipWithMetricPeriod(period,()=>`<section class="ip-group-panel" data-ip-dimension="${dimension}"><div class="ip-group-heading"><h3><span class="ip-group-title" data-up-basic>${label}${ipSummaryHelp(dimension)}</span></h3><div data-ip-period-host>${ipMetricPeriodMarkup(period)}</div></div><div class="ip-group-scroll">${ipStockTable(rows,{dimension,sort:ipGroupSorts[dimension]})}</div></section>`);
}
function ipMountGroupPeriod(dimension,base){
 const panel=$(`#inventory .ip-group-panel[data-ip-dimension="${dimension}"]`),sort=ipGroupSorts[dimension];
 rpApplySortAria(panel,sort);
 panel.onclick=event=>{
  const button=event.target.closest('[data-rp-sort]');if(!button)return;
  rpSortCycle(sort,button.dataset.rpSort);
  if(!sort.key)Object.assign(sort,ipDefaultGroupSort());
  const host=panel.querySelector('.ip-group-scroll'),scrollLeft=host.scrollLeft;
  host.innerHTML=ipWithMetricPeriod(ipMetricPeriods[dimension],()=>ipStockTable(ipGroupRows(ipMetricRecords(base,ipMetricPeriods[dimension]),dimension),{dimension,sort}));
  rpApplySortAria(host,sort);host.scrollLeft=scrollLeft;
  host.querySelector(`[data-rp-sort="${button.dataset.rpSort}"]`)?.focus({preventScroll:true});
 };
 ipMountMetricPeriod(panel.querySelector('[data-ip-period-host]'),ipMetricPeriods[dimension],next=>{
  ipMetricPeriods[dimension]=next;panel.replaceWith(document.createRange().createContextualFragment(ipGroupTable(base,dimension)));ipMountGroupPeriod(dimension,base);
 });
}
renderInventory=bindRender('inventory',function(){
 const ledger=inventoryProductLedger(),records=ipStockRecords(ledger);
 $('#inventorymetrics').innerHTML=upStockBalanceCards(upStockBalanceSummary(ledger));
 $('#inventorytable').innerHTML=ipGroupTable(records,'category')+ipGroupTable(records,'brand');
 for(const dimension of ['category','brand'])ipMountGroupPeriod(dimension,records);
});
document.addEventListener('click',event=>{
 const button=event.target.closest('#inventory [data-ip-stock]');if(!button)return;
 ipOpenStockDrawer(button.dataset.ipDimension,+button.dataset.ipStock);
});
window.inventoryControlAudit=()=>withPeriod('inventory',()=>{
 const records=inventoryProductLedger(),base=ipStockRecords(records),stockRecords=ipMetricRecords(base,ipMetricPeriods.category),brandStockRecords=ipMetricRecords(base,ipMetricPeriods.brand);
 return {period:periodFor(),metricPeriods:{category:{...ipMetricPeriods.category},brand:{...ipMetricPeriods.brand}},snapshot:DATA_CUTOFF,total:inventoryProductSum(records),balance:upStockBalanceSummary(records),records,
  chain:ipGroups(records,'chain'),brand:ipStockGroups(brandStockRecords,'brand'),category:ipStockGroups(stockRecords,'category'),stockRecords,brandStockRecords,stockTotal:ipStockSum(stockRecords)};
});
