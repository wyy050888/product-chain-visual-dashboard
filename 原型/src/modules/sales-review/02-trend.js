// 保留历史经营数据核对接口；销售页面不再渲染趋势或注册趋势交互。
function msDailySeries(index,p=periodFor('sales'),range=null){
 const b=bounds(p);range||={start:b.start,end:b.cutoff};
 const values=new Map(),selected=index<0?[0,1,2,3]:[index];
 for(let monthKey=range.start.slice(0,7);monthKey<=range.end.slice(0,7);monthKey=riskMonthShift(monthKey,1)){
  const year=Number(monthKey.slice(0,4)),month=Number(monthKey.slice(5,7));
  const start=monthKey+'-01',end=iso(new Date(Date.UTC(year,month,0))),last=end<DATA_CUTOFF?end:DATA_CUTOFF;
  if(last<start)continue;
  const dates=Array.from({length:aiFlowDayDiff(start,last)+1},(_,i)=>shiftDate(start,i));
  for(const chain of selected){
   const weights=dates.map((_,i)=>100+((i*7+chain*11+month*3)%19)-9);
   const amounts=splitTarget(Math.round(salesMonthActual(chain,month,year)*100),weights);
   const margin=baseSales[chain].profit+(month-9)*.08;
   const offsets=dates.map((_,i)=>Math.sin((i+chain*2+month)*.7)*.8+Math.cos(i*.31+chain)*.35);
   const total=amounts.reduce((sum,value)=>sum+value,0),weightedOffset=total?offsets.reduce((sum,value,i)=>sum+value*amounts[i],0)/total:0;
   dates.forEach((date,i)=>{
    const row=values.get(date)||{value:0,gross:0},sale=amounts[i]/100;
    row.value+=sale;row.gross+=sale*(margin+offsets[i]-weightedOffset)/100;values.set(date,row);
   });
  }
 }
 return [...values].filter(([date])=>date>=range.start&&date<=range.end).map(([date,row])=>({date,...row,margin:row.value?row.gross/row.value*100:null}));
}
function msTrendDailySeries(index,p=periodFor('sales')){
 const b=bounds(p),range=recentTrendRange(b.start,b.cutoff,{quarter:'week',year:'month'}[p.mode]);
 return msDailySeries(index,p,range);
}
// 季度看近24个自然周，年度看近24个自然月，利润率按累计利润/GSV计算。
function msTrendBuckets(rows,mode){
 const groups=new Map();
 for(const row of rows){
  const weekday=new Date(row.date+'T00:00:00Z').getUTCDay();
  const key=mode==='year'?row.date.slice(0,7):mode==='quarter'?shiftDate(row.date,-((weekday+6)%7)):row.date;
  const group=groups.get(key)||{date:row.date,end:row.date,value:0,gross:0};
  group.end=row.date;group.value+=row.value;group.gross+=row.gross;groups.set(key,group);
 }
 return [...groups.values()].map(row=>({...row,margin:row.value?row.gross/row.value*100:null,
  label:mode==='year'?row.date.slice(0,4)+'年'+Number(row.date.slice(5,7))+'月':mode==='quarter'?row.date+' — '+row.end+'（周）':row.date,
  axisLabel:mode==='year'?row.date.slice(0,7):row.date}));
}
window.dashboardSalesTrendSnapshot=(index,daily=false)=>daily?msTrendDailySeries(index):msTrendBuckets(msTrendDailySeries(index),periodFor('sales').mode);
