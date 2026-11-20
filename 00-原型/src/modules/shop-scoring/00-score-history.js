// 平台直接提供的近30天比率，按记录日期取值。
const sbWechatIndicators=[
 {key:'qualityReturnRate30',name:'近30天品质退货率',targetKey:'qualityReturnIndustry30'},
 {key:'negativeReviewRate30',name:'近30天差评率',targetKey:'negativeReviewIndustry30'},
 {key:'disputeRate30',name:'近30天纠纷发起率',targetKey:'disputeIndustry30'}
];
function sbWechatTone(actual,target){
 if(!Number.isFinite(actual)||!Number.isFinite(target)||actual<0||target<0)return 'gray';
 return actual>target?'red':actual<target?'green':'yellow';
}
function sbWechatFacts(shop){
 return sbWechatIndicators.map(metric=>({...metric,actual:shop[metric.key],target:shop[metric.targetKey],tone:sbWechatTone(shop[metric.key],shop[metric.targetKey])}));
}
function sbWechatPercent(value){return Number.isFinite(value)&&value>=0?fmt(value,2)+'%':'—'}
function sbWechatAssessment(shop){
 const facts=sbWechatFacts(shop);
 return ['red','yellow','gray','green'].find(tone=>facts.some(metric=>metric.tone===tone));
}
function sbWechatSnapshot(shop,end){
 const record=(shop.governanceHistory||[]).filter(row=>row.date<=end).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const fields=sbWechatIndicators.flatMap(({key,targetKey})=>[key,targetKey]);
 return {...Object.fromEntries(fields.map(key=>[key,Number.isFinite(record?.[key])?record[key]:null])),
  governanceDate:record?.date||null,governanceAsOf:end,governanceSource:record?.source||null};
}
// 有日期评分仅取截止日前最新快照，绝不平均或读取未来。
function sbShopScoreAt(shop,end){
 const keys=['score','productScore','logisticsScore','serviceScore'];
 if(shop.channel==='视频号'){
  const snapshot=sbWechatSnapshot(shop,end);
  return {...Object.fromEntries(keys.map(key=>[key,null])),...snapshot,scoreDate:snapshot.governanceDate,scoreAsOf:end,scoreSource:'governance-record'};
 }
 if(Array.isArray(shop.scoreHistory)&&shop.scoreHistory.length){
  const record=shop.scoreHistory.filter(row=>row.date<=end).sort((a,b)=>b.date.localeCompare(a.date))[0];
  return {...Object.fromEntries(keys.map(key=>[key,Number.isFinite(record?.[key])?record[key]:null])),scoreDate:record?.date||null,scoreAsOf:end,scoreSource:'dated-snapshot'};
 }
 return {score:shop.referenceScore??shop.score??null,productScore:shop.productScore??null,logisticsScore:shop.logisticsScore??null,serviceScore:shop.serviceScore??null,scoreDate:end,scoreAsOf:end,scoreSource:'demo-baseline'};
}
