// 期间模型只依赖显式筛选值；卡片、部门、指标明细都从同一台账聚合。
function ccGroups(period){
 const month=period.mode==='month'?period.value:period.mode==='quarter'?period.value*3:12;
 const labels={month:month+'月',quarter:'Q'+Math.ceil(month/3),year:String(period.year).slice(-2)+'年'};
 return (period.mode==='month'?['month','quarter','year']:period.mode==='quarter'?['quarter','year']:['year']).map(mode=>({mode,label:labels[mode]}));
}
function ccRange(period,mode){
 const anchor=period.mode==='month'?period.value:period.mode==='quarter'?period.value*3:12;
 const first=mode==='month'?anchor:mode==='quarter'?Math.floor((anchor-1)/3)*3+1:1,last=mode==='month'?anchor:mode==='quarter'?Math.floor((anchor-1)/3)*3+3:12;
 const date=m=>period.year+'-'+String(m).padStart(2,'0'),selectedEnd=bounds(period).end;
 return {first:date(first),last:date(last),cutoff:selectedEnd<DATA_CUTOFF?selectedEnd:DATA_CUTOFF};
}
// 每张卡按自己的自然月/季/年计算时间进度，截止日沿用当前筛选，而非系统当天。
function ccTimeProgress(period,mode){
 const range=ccRange(period,mode),start=range.first+'-01',end=iso(new Date(Date.UTC(period.year,+range.last.slice(5,7),0))),days=aiFlowDayDiff(start,end)+1;
 const elapsed=range.cutoff<start?0:Math.min(days,aiFlowDayDiff(start,range.cutoff)+1);
 return elapsed/days*100;
}
function ccTotals(metrics,period,mode){
 const metricIds=new Set(metrics.map(metric=>metric.id)),ids=new Set(ccItems.filter(item=>metricIds.has(item.id)).map(item=>item.id)),range=ccRange(period,mode);let target=null,actual=null;
 // 未填报不能充当0；期间仅汇总已知值，整段无值时保留null。
 for(const row of ccLedger){
  if(!ids.has(row.itemId)||row.month<range.first||row.month>range.last)continue;
  if(Number.isFinite(row.targetCents))target=(target??0)+row.targetCents;
  if(!row.actualMissing)for(const event of row.confirmations)if(event.date<=range.cutoff&&Number.isFinite(event.cents))actual=(actual??0)+event.cents;
 }
 const comparable=Number.isFinite(target)&&Number.isFinite(actual);
 return {target,actual,gap:comparable?actual-target:null,rate:comparable&&target!==0?(actual===0?0:actual/target*100):null};
}
function ccRows(period,metrics=ccMetrics){return ccDepartments.filter(dept=>metrics.some(metric=>metric.department===dept.id)).map(dept=>({id:dept.id,name:dept.name,values:Object.fromEntries(ccGroups(period).map(({mode})=>[mode,ccTotals(metrics.filter(metric=>metric.department===dept.id),period,mode)]))}))}
// 金额按分、比率按未格式化原值排序；公共排序将缺失值固定置后。
function ccSortedDepartmentRows(rows,sort){
 const match=/^(month|quarter|year)-(target|actual|rate|gap)$/.exec(sort.key||'');
 return match?rpSortRows(rows,sort,row=>row.values[match[1]]?.[match[2]]):rows;
}
function ccMoney(cents){return Number.isFinite(cents)?fmt(cents===0?0:cents/1000000,2):'--'}
function ccRate(rate){return Number.isFinite(rate)?fmt(rate===0?0:rate,1)+'%':'--'}
// 降本金额统一使用w；未导入显示--，显式零值正常显示，卡片和内外表格共用。
function ccAmount(value){return ccMoney(value)+(Number.isFinite(value)?'<span class="cc-money-unit">w</span>':'')}
function ccGap(value){return `<span class="${value<0?'red':value>0?'green':'muted'}">${value>0?'+':''}${ccAmount(value)}</span>`}
function ccLegacyCosts(){return ccRows(periodFor('cost')).map(row=>{const current=row.values[periodFor('cost').mode],annual=row.values.year;const wan=value=>Number.isFinite(value)?value/1000000:null;return {name:row.name,t:wan(current.target),a:wan(current.actual),yt:wan(annual.target),ya:wan(annual.actual)}})}
window.costControlAudit=period=>{period||=periodFor('cost');return {period,departments:ccDepartments,metrics:ccMetrics,items:ccItems,ledger:ccLedger,rows:ccRows(period),totals:Object.fromEntries(ccGroups(period).map(({mode})=>[mode,ccTotals(ccMetrics,period,mode)]))}};
