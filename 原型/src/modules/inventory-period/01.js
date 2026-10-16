

// Inventory balances retain the original ledger; service metrics share dated facts.
function ipPeriod(){const p=periodFor(),b=bounds(p),monthStart=b.cutoff.slice(0,7)+'-01';const factor=months(p).reduce((n,m)=>{const last=new Date(Date.UTC(p.year,m,0)).getUTCDate(),elapsed=`${p.year}-${String(m).padStart(2,'0')}`===b.cutoff.slice(0,7)?+b.cutoff.slice(8):last;return n+elapsed/last},0);return{...b,monthStart,monthLabel:b.cutoff.slice(0,7),factor,unit:{month:'月',quarter:'季',year:'年'}[p.mode]}}
const ipBaseLedger=inventoryProductLedger;
inventoryProductLedger=function(){
 const scope=ipPeriod(),rows=ipBaseLedger(),key='inventory-month-service',previous=localPeriods[key];let monthly=[];
 if(scope.start<=scope.cutoff){localPeriods[key]={year:+scope.cutoff.slice(0,4),mode:'month',value:+scope.cutoff.slice(5,7)};try{monthly=withPeriod(key,()=>ipBaseLedger())}finally{if(previous)localPeriods[key]=previous;else delete localPeriods[key]}}
 const monthlyMap=new Map(monthly.map(r=>[r.id,r]));
 return rows.map((r,i)=>{const month=monthlyMap.get(r.id),active=scope.start<=scope.cutoff&&r.refDue>0;
  // 固定翻新日期样例：有提前、临界和超期场景，按日期差判灯。
  const sampleDays=[-20,-15,-12,-10,-5,3],refurbReturn=active?shiftDate(scope.cutoff,-70-i%10):null;
  const refurbReported=active?shiftDate(refurbReturn,45+sampleDays[i%sampleDays.length]):null;
  const refurbDelay=active?aiFlowDayDiff(refurbReturn,refurbReported)-45:null;
  return{...r,monthOn:month?.on||0,monthDue:month?.due||0,monthlyDelivery:month?.due?month.on/month.due*100:null,refurbReturn,refurbReported,refurbDelay,refurbTaskId:active?'REF-'+r.id:null};
 });
};
const ipBaseSum=inventoryProductSum;
inventoryProductSum=function(rows){const base=ipBaseSum(rows),monthOn=targetSum(rows.map(r=>r.monthOn||0)),monthDue=targetSum(rows.map(r=>r.monthDue||0)),delays=rows.map(r=>r.refurbDelay).filter(Number.isFinite);return{...base,monthOn,monthDue,monthlyDelivery:monthDue?monthOn/monthDue*100:null,refurbDelay:delays.length?Math.max(...delays):null}};
