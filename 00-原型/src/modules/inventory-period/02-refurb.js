const IP_REFURB_STANDARD_DAYS=30;
const ipRefurbBuckets=[
 {key:'within30',label:'≤30天',hit:days=>days<=IP_REFURB_STANDARD_DAYS},
 {key:'under45',label:'>30且<45天',hit:days=>days>IP_REFURB_STANDARD_DAYS&&days<45},
 {key:'under60',label:'≥45且<60天',hit:days=>days>=45&&days<60},
 {key:'from60',label:'≥60天',hit:days=>days>=60}
];
function ipRefurbDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value}
function ipRefurbPeriodOrders(records,start,end){
 const selected=new Map();
 for(const row of records){
  if(!row.requisitionId||!row.spuId||!ipRefurbDate(row.orderedAt)||row.orderedAt<start||row.orderedAt>end)continue;
  if(!selected.has(row.requisitionId))selected.set(row.requisitionId,row);
 }
 return [...selected.values()];
}
function ipRefurbCycleDays(row){
 if(!ipRefurbDate(row.arrivedAt)||row.arrivedAt<row.orderedAt||row.completedAt<row.arrivedAt)return null;
 return aiFlowDayDiff(row.arrivedAt,row.completedAt);
}
function ipRefurbSummary(records,end){
 const orders=new Map();
 for(const row of records.flatMap(record=>record.refurbOrders||[])){
  if(!row.requisitionId||!row.spuId||!ipRefurbDate(row.orderedAt)||row.orderedAt>end)continue;
  if(!orders.has(row.requisitionId))orders.set(row.requisitionId,row);
 }
 const buckets=ipRefurbBuckets.map(({key,label})=>({key,label,count:0}));let completed=0,unknown=0;
 for(const row of orders.values()){
  if(!row.completedAt)continue;
  if(!ipRefurbDate(row.completedAt)){unknown++;continue}
  if(row.completedAt>end)continue;
  completed++;
  const days=ipRefurbCycleDays(row);
  if(!Number.isFinite(days)){unknown++;continue}
  buckets[ipRefurbBuckets.findIndex(bucket=>bucket.hit(days))].count++;
 }
 const total=orders.size,onTime=buckets[0].count;
 return {total,onTime,completed,unknown,buckets,rate:total&&!unknown?onTime/total*100:null,end};
}
// 数值悬停/聚焦查看同范围请购单天数分布；问号继续提供指标口径。
function ipRefurbRateCell(row){
 return `<button type="button" class="ip-refurb-rate" aria-label="查看${esc(row.name)}翻新天数分布" aria-expanded="false" aria-controls="ip-refurb-distribution" data-ip-refurb-name="${esc(row.name)}" data-ip-refurb-summary="${esc(JSON.stringify(row.refurb))}">${Number.isFinite(row.refurbRate)?fmt(row.refurbRate,1)+'%':'—'}<span class="ip-refurb-arrow" aria-hidden="true">›</span></button>`;
}
// 未翻新数沿用原SKU计数，与请购单闭环率分别统计。
function ipUnrefurbishedSummary(records){
 if(records.some(record=>!Array.isArray(record.unrefurbishedSkus)))return {total:null,pending:null,share:null};
 const skus=new Map();
 for(const row of records.flatMap(record=>record.unrefurbishedSkus||[]))if(row.skuId)skus.set(row.skuId,row);
 const total=skus.size,pending=[...skus.values()].filter(row=>row.pending).length;
 return {total,pending,share:total?pending/total*100:null};
}
function ipRefurbCard(model,unrefurbished){
 const pendingShare=unrefurbished.share;
 return `<article class="up-stock-card stock-balance-card stock-summary-card stock-refurb-card" data-stock-card="refurb"><div class="stock-card-head"><h4>翻新闭环率${ipOverviewHelp('refurb')}</h4><span class="stock-summary-label" data-up-basic>未翻新数</span></div><div class="stock-refurb-main"><strong data-stock-refurb-rate="${model.rate??''}">${ipRefurbRateCell({name:'当前筛选合计',refurb:model,refurbRate:model.rate})}</strong><span class="stock-refurb-pending" aria-label="未翻新SKU数量及占比"><span><b data-stock-refurb-pending>${Number.isFinite(unrefurbished.pending)?fmt(unrefurbished.pending):'—'}</b><small class="stock-card-share">（${pendingShare===null?'—':fmt(pendingShare,1)+'%'}）</small></span></span></div></article>`;
}
