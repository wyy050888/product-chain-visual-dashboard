// 风险榜共享区间；期间流量累加，余额和评分取结束日快照。
function riskRange(start=bounds(periodFor('risk')).start,end=bounds(periodFor('risk')).cutoff){
 const days=Math.max(1,Math.round((Date.parse(end)-Date.parse(start))/86400000)+1),previousEnd=shiftDate(start,-1);
 const period=periodFor('risk'),explicit=period.comparisonMode&&period.start===start&&period.end===end;
 return {start,end,days,previousStart:explicit?period.previousStart:shiftDate(start,-days),previousEnd:explicit?period.previousEnd:previousEnd};
}
function riskRangeText(){const w=riskRange();return w.start+' — '+w.end}
function riskDailyRows(start,end,make){const rows=[];for(let date=start;date<=end;date=shiftDate(date,1))rows.push({date,...make(date)});return rows}
function riskMonthDays(date){const [year,month]=date.split('-').map(Number);return new Date(Date.UTC(year,month,0)).getUTCDate()}
function riskDailyWeight(date,id){return 1+.18*Math.sin((Math.floor(Date.parse(date)/86400000)+id*13)*.31)}
function riskShopPeriod(r,w=riskRange()){
 const referenceStart=DATA_CUTOFF.slice(0,7)+'-01';
 const referenceWeight=riskDailyRows(referenceStart,DATA_CUTOFF,d=>({weight:riskDailyWeight(d,r.id)})).reduce((s,p)=>s+p.weight,0);
 const perDay=(r.referenceGsv??(4+r.id*.27)*10)/referenceWeight;
 const points=riskDailyRows(w.start,w.end,d=>({gsv:perDay*riskDailyWeight(d,r.id)}));
 // 罚款是离散事件，不按天数比例分摊。
 const events=[];for(let month=w.start.slice(0,7);month<=w.end.slice(0,7);month=riskMonthShift(month,1)){
  const date=month+'-'+String(5+r.id%5).padStart(2,'0');if((r.sourceQualityFine??r.qualityFine)>0&&date>=w.start&&date<=w.end)events.push({date,amount:r.sourceQualityFine??r.qualityFine});
 }
 return {...w,points,gsv:points.reduce((s,p)=>s+p.gsv,0),target:(4+r.id*.27)*w.days,fine:events.reduce((s,e)=>s+e.amount,0),events};
}
function riskLossPeriod(r){
 const w=riskRange(),baseFactor=snapshotFactor();
 const points=riskDailyRows(w.start,w.end,date=>{
  const day=Number(date.slice(8)),month=date.slice(0,7),days=riskMonthDays(date),factor=.70+(Number(date.slice(0,4))-2025)*.12+Number(date.slice(5,7))*.02;
  const weights=Array.from({length:days},(_,i)=>riskDailyWeight(month+'-'+String(i+1).padStart(2,'0'),r.id));
  const share=weights[day-1]/weights.reduce((s,n)=>s+n,0),monthlySalesUnits=Math.round((1680-r.id*81+2*43)*factor);
  const before=weights.slice(0,day-1).reduce((s,n)=>s+n,0)/weights.reduce((s,n)=>s+n,0),after=before+share;
  const sales=Math.round(monthlySalesUnits*after)-Math.round(monthlySalesUnits*before),returned=Math.round(sales*(.046+r.id%3*.001));
  return {sales,returns:returned,rate:qrRate(returned,sales),gmv:(r.sourceMonthlySales??r.monthlySales)*share,loss:(r.sourceLoss??r.loss)*factor/baseFactor*share};
 });
 const sales=qrSum(points,'sales'),returned=qrSum(points,'returns'),gmv=qrSum(points,'gmv'),loss=qrSum(points,'loss'),rate=qrRate(returned,sales),received=Math.floor(returned*[.78,.85,.92][r.id%3]);
 return {...w,points,sales,returned,rate,received,receivedRate:qrRate(received,sales),gmv,gsv:gmv*(1-rate/100),loss};
}
function riskInventorySeries(r){
 const w=riskRange();return {name:'销量',color:'#7885f5',points:riskDailyRows(w.start,w.end,date=>{
  const day=Math.floor(Date.parse(date)/86400000),volume=r.slow||r.ledgerId!==undefined?((r.id+day)%7===0?2:(r.id+day)%5===0?1:0):Math.round(12+(r.id%13)*2+6*Math.sin(day*.5+r.id));return {volume};
 })};
}
function riskTrendBuckets(points){
 const size=Math.max(1,Math.ceil(points.length/6)),groups=[];
 for(let i=0;i<points.length;i+=size){const group=points.slice(i,i+size),sales=qrSum(group,'sales'),returns=qrSum(group,'returns');groups.push({date:group.at(-1).date,sales,returns,rate:qrRate(returns,sales)})}return groups;
}
const riskRangePreviousObservation=riskObservation;
riskObservation=function(k,r){
 if(activeModule!=='risk'||![1,2,3,4].includes(k))return riskRangePreviousObservation(k,r);
 const w=riskRange();let daily;
 if(k===2)daily=riskLossPeriod(r).points;
 else if(k===3||k===4)daily=riskInventorySeries(r).points.map(p=>({...p,sales:p.volume,returns:0}));
 else daily=riskDailyRows(w.start,w.end,date=>{const sales=Math.round((35+r.id*4)*riskDailyWeight(date,r.id));return {sales,returns:Math.round(sales*.095)}});
 const shipped=qrSum(daily,'sales'),returned=qrSum(daily,'returns');return {start:w.start,cutoff:w.end,shipped,returned,rate:qrRate(returned,shipped),unsold:false,points:riskTrendBuckets(daily)};
};
