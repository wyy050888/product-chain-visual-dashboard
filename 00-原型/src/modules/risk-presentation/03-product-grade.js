// 五个产品榜单统一展示公司产品分级；平台仅筛风险事实，分级与产品详情一致。
const rpGradeCache=boundedCache(4);
function rpRankingGrade(record){
 const range=riskRange(),end=range.cutoff||range.end,period=periodFor('risk'),mode=['recent30','month','quarter','year'].includes(period.mode)?period.mode:'month',start=period.mode==='day'?kpmGradeWindow(end,'month').start:range.start,identity=upIdentity(rpProduct(record)||record),key=mode+'|'+start+'|'+end+'|'+upRuleRevision;
 let rows=rpGradeCache.get(key);if(!rows){rows=new Map();rpGradeCache.set(key,rows)}
 const id=identity.spuId;if(!rows.has(id))rows.set(id,kpmGradeAssessment(identity,end,'all',mode,start).level||'unrated');
 return rows.get(id);
}
function rpRankingGradeMarkup(record){
 const grade=rpRankingGrade(record);return `<span class="rp-product-grade ${grade}" data-rp-grade="${grade}">${grade==='unrated'?'待分级':grade}</span>`;
}

window.dashboardRankingGradeSnapshot=()=>rpWithListPeriod(()=>{
 const host=document.querySelector('.rp-list-table');if(!host)return null;const k=Number(host.dataset.rpKind),filters=rpSavedFilters(k);
 return {kind:k,filters:{...filters},rows:rpFilterRows(k,rpListRows(k),filters).map(r=>({spuId:upIdentity(rpProduct(r)||r).spuId,grade:k===1?null:rpRankingGrade(r)}))};
});
