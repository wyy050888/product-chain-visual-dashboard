// 演示夹具只补入榜历史；指标仍取上方风险榜样例，依据中标明模拟日期。
// 每个版本只应用一次；保留用户已处理的记录。
const rpWarningSampleVersion='new-high-risk-listed-dates-v3';
const rpWarningAppearanceSamples=[
 {key:'0|SPU-SOURCE-015|抖音',daysAgo:0,previousDays:null},
 {key:'6|SPU-SOURCE-013|快手',daysAgo:2,previousDays:15},
 {key:'1|DEMO-SHOP-013|抖音',daysAgo:5,previousDays:null},
 {key:'4|KJ-QJ-CZXCQ-2628-SKU01|all',daysAgo:5,previousDays:20},
 {key:'3|KJ-GH-BMQ-1916-SKU03|all',daysAgo:9,previousDays:null},
 {key:'2|SPU-SOURCE-002|快手',daysAgo:14,previousDays:15}
];
function rpSeedWarningAppearanceSamples(rows,date){
 if(rpWarningSamplesVersion===rpWarningSampleVersion||date!==DATA_CUTOFF)return false;
 const active=new Map(rows.map(row=>[row.key,row])),used=new Set(),selected=[];
 for(const sample of rpWarningAppearanceSamples){
  const kind=Number(sample.key.split('|')[0]);
  const available=row=>!used.has(row.key)&&!rpWarningAppearances[row.key]?.handledAt;
  const preferred=active.get(sample.key),source=preferred&&available(preferred)?preferred:rows.find(row=>row.kind===kind&&available(row))||rows.find(row=>row.kind===0&&available(row));
  if(!source)continue;used.add(source.key);selected.push({...sample,key:source.key});
 }
 if(!selected.length)return false;
 const priorDate=days=>new Date(Date.parse(date+'T00:00:00Z')-days*86400000).toISOString().slice(0,10);
 const sampleObservedDates=Array.from({length:45},(_,days)=>priorDate(days));
 for(const sample of selected){
  const [kind,objectId,platform]=sample.key.split('|'),listedAt=priorDate(sample.daysAgo);
  rpWarningAppearances[sample.key]={id:'demo-warning|'+sample.key,kind:Number(kind),objectId,platform,baseline:false,sample:true,sampleVersion:rpWarningSampleVersion,sampleListedAt:listedAt,
   sampleObservedDates,appearances:rpWarningDates([...(sample.previousDays?[priorDate(sample.daysAgo+sample.previousDays)]:[]),listedAt])};
 }
 rpWarningSamplesVersion=rpWarningSampleVersion;rpSaveWarningAppearances();return true;
}
