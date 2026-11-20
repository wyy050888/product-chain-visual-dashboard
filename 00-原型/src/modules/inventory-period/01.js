// 采购单样例按下单月份归档；到厂和翻新完成可跨月。
const ipSampleTransitDays=[2,3,4,5,6],ipSampleRefurbDays=[5,12,20,29,30,35,45,59,60,72];
function ipRefurbSampleOrders(record,index,month){
 const spuId=String(record.spuId||record.model||record.id),start=month+'-01';
 const skus=upStockSkus(record);
 return Array.from({length:2+index%2},(_,i)=>{
  const orderedAt=shiftDate(start,(index+Math.floor(i/2)*7)%18);
  const arrivedAt=(index+i)%11===0?null:shiftDate(orderedAt,ipSampleTransitDays[(index+i)%ipSampleTransitDays.length]);
  const days=ipSampleRefurbDays[(index+i)%ipSampleRefurbDays.length];
  const completedAt=arrivedAt&&(index+i)%7!==0?shiftDate(arrivedAt,days):null;
  return {requisitionId:'REF-'+spuId+'-'+month+'-'+(1+Math.floor(i/2)),skuId:skus[i].skuId,spuId,orderedAt,arrivedAt,completedAt};
 });
}


// Inventory balances retain the original ledger; service metrics share dated facts.
function ipPeriod(){const p=periodFor(),b=bounds(p),monthStart=b.cutoff.slice(0,7)+'-01';const factor=months(p).reduce((n,m)=>{const last=new Date(Date.UTC(p.year,m,0)).getUTCDate(),elapsed=`${p.year}-${String(m).padStart(2,'0')}`===b.cutoff.slice(0,7)?+b.cutoff.slice(8):last;return n+elapsed/last},0);return{...b,monthStart,monthLabel:b.cutoff.slice(0,7),factor,unit:{recent30:'30天',month:'月',quarter:'季',year:'年'}[p.mode]}}
const ipBaseLedger=inventoryProductLedger;
inventoryProductLedger=function(){
 const scope=ipPeriod(),rows=ipBaseLedger(),key='inventory-month-service',previous=localPeriods[key];let monthly=[];
 if(scope.start<=scope.cutoff){localPeriods[key]={year:+scope.cutoff.slice(0,4),mode:'month',value:+scope.cutoff.slice(5,7)};try{monthly=withPeriod(key,()=>ipBaseLedger())}finally{if(previous)localPeriods[key]=previous;else delete localPeriods[key]}}
 const monthlyMap=new Map(monthly.map(r=>[r.id,r]));
 return rows.map((r,i)=>{const month=monthlyMap.get(r.id),active=scope.start<=scope.cutoff&&r.refDue>0;
  const refurbOrders=active?ipRefurbSampleOrders(r,i,scope.monthLabel):[];
  // 本地样例模拟人工导入的新机库存；不随历史考核期间回拨。
  const latestNewMachineInventory=Object.hasOwn(r,'latestNewMachineInventory')?r.latestNewMachineInventory:20+r.sourceRow%5*15;
  return{...r,refurbOrders,latestNewMachineInventory,monthOn:month?.on||0,monthDue:month?.due||0,monthlyDelivery:month?.due?month.on/month.due*100:null};
 });
};
const ipBaseSum=inventoryProductSum;
inventoryProductSum=function(rows){const base=ipBaseSum(rows),monthOn=targetSum(rows.map(r=>r.monthOn||0)),monthDue=targetSum(rows.map(r=>r.monthDue||0));return{...base,monthOn,monthDue,monthlyDelivery:monthDue?monthOn/monthDue*100:null}};
