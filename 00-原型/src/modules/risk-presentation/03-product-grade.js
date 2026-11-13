// 完整榜单按统计截止日最近的完整自然月汇总全平台 GSV。
const rpGradeCache=boundedCache(4);
function rpRankingGradeMonth(cutoff){
 const month=cutoff.slice(0,7),monthEnd=shiftDate(dateRangeMonthShift(month,1)+'-01',-1);
 return kpmGradeWindow(cutoff===monthEnd?cutoff:shiftDate(month+'-01',-1),'month');
}
function rpRankingGrade(record){
 const identity=upIdentity(record);
 if(!identity)return 'unrated';
 const cutoff=riskRange().end,{start,end}=rpRankingGradeMonth(cutoff<DATA_CUTOFF?cutoff:DATA_CUTOFF),key=end+'|'+upRuleRevision;
 let rows=rpGradeCache.get(key);if(!rows){rows=new Map();rpGradeCache.set(key,rows)}
 const id=identity.spuId;
 if(!rows.has(id)){
  const launch=upProduct(identity).actualLaunch;
  rows.set(id,!launch||launch>start?'pending':kpmGradeAssessment(identity,end,'all','month',start).level||'unrated');
 }
 return rows.get(id);
}
function rpRankingGradeMarkup(record){
 const grade=rpRankingGrade(record),pending=grade==='pending';
 return grade==='unrated'?'':`<span class="rp-product-grade ${pending?'unrated':grade}" data-rp-grade="${grade}">${pending?'待分级':grade}</span>`;
}

window.dashboardRankingGradeSnapshot=()=>rpWithListPeriod(()=>{
 const host=document.querySelector('.rp-list-table');if(!host)return null;const k=Number(host.dataset.rpKind),filters=rpSavedFilters(k);
 return {kind:k,filters:{...filters},rows:rpFilterRows(k,rpListRows(k),filters).map(r=>({spuId:upIdentity(rpProduct(r)||r).spuId,grade:rpRankingSupportsGrade(k)?rpRankingGrade(r):null}))};
});
