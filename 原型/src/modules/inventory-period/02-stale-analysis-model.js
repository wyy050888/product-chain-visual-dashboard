// 分布按批次统计，趋势先汇总分子分母再算金额占比；缺失快照不补零。
const ipStaleAgeBands=[{label:'60–90天',min:60,max:90},{label:'90–120天',min:90,max:120},{label:'120–150天',min:120,max:150},{label:'150天及以上',min:150,max:Infinity}];
function ipStaleSeasonRows(){return filterCatalog.seasons.map((label,index)=>({label,index,units:0,valueCents:0}))}
function ipSnapshotRows(snapshot,selection=ipSeasonSelection){return(snapshot?.rows||[]).filter(row=>pfIncludes(selection,row.season))}
function ipStaleDistribution(snapshot,selection=ipSeasonSelection){
 const seasons=ipStaleSeasonRows(),bands=ipStaleAgeBands.map(band=>({...band,seasons:ipStaleSeasonRows(),units:0,valueCents:0})),other={units:0,valueCents:0,seasons:ipStaleSeasonRows()},unknown={units:0,valueCents:0,seasons:ipStaleSeasonRows()};
 let units=0,valueCents=0,totalUnits=0,totalValueCents=0;
 for(const row of ipSnapshotRows(snapshot,selection)){
  totalUnits+=row.totalUnits;totalValueCents+=row.totalValueCents;
  units+=row.staleUnits;valueCents+=row.staleValueCents;
  const season=seasons.find(item=>item.label===row.season);season.units+=row.staleUnits;season.valueCents+=row.staleValueCents;
  let knownUnits=0,knownValue=0;
  for(const batch of row.batches){
   const age=aiFlowDayDiff(batch.receivedDate,snapshot.date),band=bands.find(item=>age>=item.min&&age<item.max),target=band||other;
   target.units+=batch.units;target.valueCents+=batch.valueCents??0;knownUnits+=batch.units;knownValue+=batch.valueCents??0;
   const part=target.seasons.find(item=>item.label===row.season);part.units+=batch.units;part.valueCents+=batch.valueCents??0;
  }
  unknown.units+=row.staleUnits-knownUnits;unknown.valueCents+=row.staleValueCents-knownValue;
  const pending=unknown.seasons.find(item=>item.label===row.season);pending.units+=row.staleUnits-knownUnits;pending.valueCents+=row.staleValueCents-knownValue;
 }
 return {date:snapshot?.date??null,seasons,bands,other,unknown,units,valueCents,totalUnits,totalValueCents,knownUnits:units-unknown.units,knownValueCents:valueCents-unknown.valueCents};
}
function ipStaleTrendPeriods(mode,end){
 const step={month:1,quarter:3,year:12}[mode],d=new Date(end+'T00:00:00Z'),year=d.getUTCFullYear(),month=d.getUTCMonth(),last=mode==='quarter'?Math.floor(month/3)*3:mode==='year'?0:month;
 const count={month:12,quarter:8,year:5}[mode],periods=[];
 for(let index=count-1;index>=0;index--){
  const start=new Date(Date.UTC(year,last-index*step,1)),finish=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+step,0));
  if(start.getUTCFullYear()<2025)continue;
  const startDate=iso(start),endDate=iso(finish),y=start.getUTCFullYear(),m=start.getUTCMonth()+1;
  periods.push({start:startDate,end:endDate>end?end:endDate,label:mode==='month'?String(y).slice(-2)+'/'+String(m).padStart(2,'0'):mode==='quarter'?String(y).slice(-2)+' Q'+Math.ceil(m/3):String(y)+'年'});
 }
 return periods;
}
function ipStaleTrend(snapshots,mode,end,selection=ipSeasonSelection){
 return ipStaleTrendPeriods(mode,end).map(period=>{
  const snapshot=snapshots.filter(item=>item.date>=period.start&&item.date<=period.end).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(!snapshot)return {...period,date:null,totalValueCents:null,staleValueCents:null,ratio:null};
  const rows=ipSnapshotRows(snapshot,selection),totalValueCents=targetSum(rows.map(row=>row.totalValueCents)),staleValueCents=targetSum(rows.map(row=>row.staleValueCents));
  return {...period,date:snapshot.date,totalValueCents,staleValueCents,ratio:totalValueCents>0?staleValueCents/totalValueCents*100:null};
 });
}
function ipStaleAnalysisModel(){
 const latest=ipStaleSnapshots.filter(item=>item.date<=DATA_CUTOFF).sort((a,b)=>b.date.localeCompare(a.date))[0];
 return {distribution:ipStaleDistribution(latest),trend:ipStaleTrend(ipStaleSnapshots,ipMetricPeriod.mode,bounds(ipMetricPeriod).cutoff),metrics:['units','valueCents'],mode:ipMetricPeriod.mode};
}
window.inventoryStaleAnalysisAudit=()=>JSON.parse(JSON.stringify({...ipStaleAnalysisModel(),snapshots:ipStaleSnapshots,saveFailed:ipSnapshotSaveFailed}));
