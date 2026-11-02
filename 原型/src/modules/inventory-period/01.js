// 请购单样例按交付月份归档，报价和发起时间可跨月；单据不随查询粒度或SKU数量变化。
function ipRefurbSampleOrders(record,index,month){
 const spuId=String(record.spuId||record.model||record.id),start=month+'-01';
 return Array.from({length:2+index%2},(_,i)=>{
  const completedAt=shiftDate(start,(index+i*7)%18),days=[12,20,32,39,40,44,45,59,60,72][(index+i)%10];
  const quotedAt=shiftDate(completedAt,-days),initiatedAt=shiftDate(quotedAt,-2);
  return {requisitionId:'REF-'+spuId+'-'+month+'-'+(i+1),spuId,initiatedAt,quotedAt,completedAt:(index+i)%7===0?null:completedAt};
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
  // 保留原未翻新SKU样例及占比，不能用未完成请购单数量替代。
  const unrefurbishedSkus=active?upStockSkus(r).map((sku,j)=>({skuId:sku.skuId,pending:(i*4+j)%11===10})):[];
  return{...r,refurbOrders,unrefurbishedSkus,monthOn:month?.on||0,monthDue:month?.due||0,monthlyDelivery:month?.due?month.on/month.due*100:null};
 });
};
const ipBaseSum=inventoryProductSum;
inventoryProductSum=function(rows){const base=ipBaseSum(rows),monthOn=targetSum(rows.map(r=>r.monthOn||0)),monthDue=targetSum(rows.map(r=>r.monthDue||0));return{...base,monthOn,monthDue,monthlyDelivery:monthDue?monthOn/monthDue*100:null}};
