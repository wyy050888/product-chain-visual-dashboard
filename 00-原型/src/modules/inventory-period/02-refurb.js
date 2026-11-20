const IP_REFURB_STANDARD_DAYS=33;
const ipRefurbBuckets=[
 {key:'within33',label:'≤33天',hit:days=>days<=IP_REFURB_STANDARD_DAYS},
 {key:'under45',label:'>33且<45天',hit:days=>days>IP_REFURB_STANDARD_DAYS&&days<45},
 {key:'under60',label:'≥45且<60天',hit:days=>days>=45&&days<60},
 {key:'from60',label:'≥60天',hit:days=>days>=60}
];
function ipRefurbDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value}
function ipRefurbPeriodOrders(records,start,end){
 const selected=new Map();
 for(const row of records){
  if(!row.requisitionId||!row.skuId||!ipRefurbDate(row.orderedAt)||row.orderedAt<start||row.orderedAt>end)continue;
  const key=JSON.stringify([row.requisitionId,row.skuId]);
  if(!selected.has(key))selected.set(key,row);
 }
 return [...selected.values()];
}
function ipRefurbCycleDays(row){
 if(row.completedAt<row.orderedAt)return null;
 return aiFlowDayDiff(row.orderedAt,row.completedAt);
}
function ipRefurbSummary(records,end){
 const orders=ipRefurbPeriodOrders(records.flatMap(record=>record.refurbOrders||[]),'',end);
 const buckets=ipRefurbBuckets.map(({key,label})=>({key,label,count:0}));let completed=0,unknown=0;
 for(const row of orders){
  if(!row.completedAt)continue;
  if(!ipRefurbDate(row.completedAt)){unknown++;continue}
  if(row.completedAt>end)continue;
  completed++;
  const days=ipRefurbCycleDays(row);
  if(!Number.isFinite(days)){unknown++;continue}
  buckets[ipRefurbBuckets.findIndex(bucket=>bucket.hit(days))].count++;
 }
 const total=orders.length,onTime=buckets[0].count;
 return {total,onTime,completed,unknown,buckets,rate:total&&!unknown?onTime/total*100:null,end};
}
// 数值悬停/聚焦查看同范围请购单天数分布；问号继续提供指标口径。
function ipRefurbRateCell(row){
 return `<button type="button" class="ip-refurb-rate" aria-label="查看${esc(row.name)}翻新天数分布" aria-expanded="false" aria-controls="ip-refurb-distribution" data-ip-refurb-name="${esc(row.name)}" data-ip-refurb-summary="${esc(JSON.stringify(row.refurb))}">${Number.isFinite(row.refurbRate)?fmt(row.refurbRate,1)+'%':'—'}<span class="ip-refurb-arrow ui-chevron-right" aria-hidden="true"></span></button>`;
}
function ipRefurbCard(model,units){
 return `<article class="up-stock-card stock-balance-card stock-summary-card stock-refurb-card" data-stock-card="refurb"><div class="stock-card-head"><h4>翻新闭环率${ipOverviewHelp('refurb')}</h4><span class="stock-summary-label" data-up-basic>未翻新件数${upBalanceHelp('unrefurbishedUnits','未翻新件数')}</span></div><div class="stock-refurb-main"><strong data-stock-refurb-rate="${model.rate??''}">${ipRefurbRateCell({name:'当前筛选合计',refurb:model,refurbRate:model.rate})}</strong><span class="stock-refurb-pending" aria-label="未翻新件数"><span><b data-stock-refurb-pending>${stockQuantity(units)}</b></span></span></div></article>`;
}
