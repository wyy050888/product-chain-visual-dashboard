// 有日期评分仅取截止日前最新快照，绝不平均或读取未来；旧演示基准保持不变。
function sbShopScoreAt(shop,end){
 const keys=['score','productScore','logisticsScore','serviceScore'];
 if(Array.isArray(shop.scoreHistory)&&shop.scoreHistory.length){
  const record=shop.scoreHistory.filter(row=>row.date<=end).sort((a,b)=>b.date.localeCompare(a.date))[0];
  return {...Object.fromEntries(keys.map(key=>[key,Number.isFinite(record?.[key])?record[key]:null])),scoreDate:record?.date||null,scoreAsOf:end,scoreSource:'dated-snapshot'};
 }
 return {score:shop.referenceScore??shop.score??null,productScore:shop.productScore??null,logisticsScore:shop.logisticsScore??null,serviceScore:shop.serviceScore??null,scoreDate:end,scoreAsOf:end,scoreSource:'demo-baseline'};
}
