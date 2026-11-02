// 产品违规榜只计四类品质处罚；按SPU全平台次数和近30天GSV排序。
const qfViolationTypes=['资金冻结','罚款','下架','掉权'];
function qfViolationCounts(monthly){
 const keys=['frozenCount','fineCount','offShelf','dropCount'];
 return qfViolationTypes.map((type,i)=>Array.isArray(monthly.events)?monthly.events.filter(event=>event.type===type&&event.reasonType==='quality').length:Number.isFinite(monthly[keys[i]])?monthly[keys[i]]:0);
}
function qfViolationRisks(monthly){
 const counts=qfViolationCounts(monthly);
 return ['资金冻结','平台罚款','链接下架','链接掉权'].filter((_,i)=>counts[i]>0);
}
function qfViolationSortFacts(record){
 if(record.violationRanking)return record.violationRanking;
 const [frozenCount,fineCount,offShelfCount,dropCount]=qfViolationCounts(record.monthly),risks=qfViolationRisks(record.monthly);
 return {priority:risks.length?['资金冻结','平台罚款','链接下架','链接掉权'].indexOf(risks[0]):4,frozenCount,fineCount,offShelfCount,dropCount,
  totalCount:frozenCount+fineCount+offShelfCount+dropCount,gsv30:Number.isFinite(record.spuGsv30Cents)?record.spuGsv30Cents:null};
}
function qfViolationCompare(a,b){
 const x=qfViolationSortFacts(a),y=qfViolationSortFacts(b);
 for(const key of ['totalCount','gsv30']){
  const xv=x[key],yv=y[key],knownX=Number.isFinite(xv),knownY=Number.isFinite(yv);
  if(knownX!==knownY)return knownX?-1:1;
  if(knownX&&xv!==yv)return yv-xv;
 }
 // 完全并列时以稳定身份兜底，不加入金额、处罚类型或退货指标。
 return String(a.spuId||a.id).localeCompare(String(b.spuId||b.id),undefined,{numeric:true})||String(a.platform||'').localeCompare(String(b.platform||''));
}
