// 风险所选范围：库存余额取截止日，周转和任务按月度样例分摊；仅适配风险模块。
function riskInventorySlices(p){
  const slices=[];
  for(let month=p.start.slice(0,7);month<=p.end.slice(0,7);month=riskMonthShift(month,1)){
    const [year,value]=month.split('-').map(Number),days=new Date(Date.UTC(year,value,0)).getUTCDate();
    const start=month===p.start.slice(0,7)?Number(p.start.slice(8)):1;
    const end=month===p.end.slice(0,7)?Number(p.end.slice(8)):days;
    slices.push({year,value,days,count:end-start+1});
  }
  return slices;
}
const riskInventoryPeriod=ipPeriod;
ipPeriod=function(){
  const period=periodFor();if(activeModule!=='risk')return riskInventoryPeriod();
  const b=bounds(period),p={start:b.start,end:b.cutoff};return {...b,monthStart:p.end.slice(0,7)+'-01',monthLabel:p.end.slice(0,7),
    factor:riskInventorySlices(p).reduce((sum,s)=>sum+s.count/s.days,0),unit:'期间'};
};
const riskInventoryRows=inventoryRows;
inventoryRows=function(){
  if(activeModule!=='risk')return riskInventoryRows();
  const b=bounds(),p={start:b.start,end:b.cutoff};
  const key='risk-inventory-fixture',previous=localPeriods[key],slices=riskInventorySlices(p),groups=[],view=invView;
  invView='chain';
  try{
    for(const s of slices){
      localPeriods[key]={mode:'month',year:s.year,value:s.value};
      groups.push(withPeriod(key,()=>riskInventoryRows()));
    }
  }finally{invView=view;if(previous)localPeriods[key]=previous;else delete localPeriods[key]}
  const count=slices.reduce((sum,s)=>sum+s.count,0);
  const canonical=groups.at(-1).map((snapshot,index)=>{
    let cost=0,avg=0,due=0,on=0,refDue=0,refOn=0;
    slices.forEach((s,i)=>{
      const r=groups[i][index],fraction=s.count/s.days;
      // 原版9月仅统计16日，先恢复整月基数，再分摊所选天数。
      const sourceFraction=s.year===2026&&s.value===9?16/s.days:1;
      cost+=r.cost/sourceFraction*fraction;avg+=r.avg*s.count/count;
      due+=r.due*fraction;on+=r.on*fraction;refDue+=r.refDue*fraction;refOn+=r.refOn*fraction;
    });
    [due,on,refDue,refOn]=[due,on,refDue,refOn].map(Math.round);
    return {...snapshot,cost,avg,due,on,refDue,refOn,turn:avg?cost/avg:null,
      delivery:due?on/due*100:null,refurb:refDue?refOn/refDue*100:null};
  });
  if(view==='chain')return canonical;
  return inventorySpuGroups(canonical);
};
