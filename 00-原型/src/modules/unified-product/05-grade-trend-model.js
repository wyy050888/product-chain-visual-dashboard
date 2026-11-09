// 曲线、提示及SABC使用同一自然期间；门槛由季度规则换算。
const upGradeTrendModes={month:{step:1,count:12,label:'月'},quarter:{step:3,count:8,label:'季'},year:{step:12,count:3,label:'年'}};
function upGradeTrendRows(product,selectedEnd,mode='month'){
 const config=upGradeTrendModes[mode]||upGradeTrendModes.month,end=selectedEnd<DATA_CUTOFF?selectedEnd:DATA_CUTOFF;
 const year=Number(end.slice(0,4)),month=Number(end.slice(5,7))-1,anchor=year*12+month-month%config.step;
 const launch=upProduct(product).actualLaunch,rows=[];
 for(let i=config.count-1;i>=0;i--){
  const index=anchor-i*config.step,y=Math.floor(index/12),m=index%12;
  const start=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10),next=new Date(Date.UTC(y,m+config.step,1)).toISOString().slice(0,10);
  const periodEnd=shiftDate(next,-1),cutoff=periodEnd<end?periodEnd:end;
  const label=mode==='year'?String(y):mode==='quarter'?y+'/Q'+(Math.floor(m/3)+1):y+'/'+String(m+1).padStart(2,'0'),range={label,periodStart:start,periodEnd:cutoff};
  // 保留完整时间轴；上市前只留空位，不补零值或虚构等级。
  if(launch&&cutoff<launch){rows.push({...range,start,end:cutoff,level:null,gsvCents:null,profitRate:null,sales:null,profitCents:null,returnRate:null,receivedRate:null,periodGsvCents:null,periodProfitRate:null});continue}
  const fact=kpmGradeAssessment(product,cutoff,'all',mode,start),period=fact;
  rows.push({...fact,...range,periodGsvCents:period.gsvCents,periodProfitRate:period.profitRate});
 }
 return rows;
}
window.dashboardProductGradeTrend=(spuId,mode='month',end=DATA_CUTOFF)=>{
 const product=upSpus.get(spuId);return product?upGradeTrendRows(product,end,mode):[];
};
