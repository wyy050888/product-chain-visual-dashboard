// 类目、品牌和SPU列表共用库存快照；数量、金额先汇总，再计算比率。
function ipStockRecords(ledger){
 return upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>ledger.map(record=>{
  const row={...record,...upStockFacts(record),category:pfCategory(record),brandName:brands[record.brand],deliveryOn:record.monthOn,deliveryDue:record.monthDue};
  return {...row,...ipStockSum([row])};
 }));
}
function ipStockSum(records){
 const fields=['warehouse','warehouseValueCents','factory','factoryValueCents','totalUnits','goodsValueCents','staleUnits','staleValueCents','cost','avg','deliveryOn','deliveryDue'];
 const total=Object.fromEntries(fields.map(key=>[key,records.reduce((sum,row)=>sum+(Number.isFinite(row[key])?row[key]:0),0)]));
 const delays=records.map(row=>row.refurbDelay).filter(Number.isFinite);
 return {...total,turn:total.avg?total.cost/total.avg:null,delivery:total.deliveryDue?total.deliveryOn/total.deliveryDue*100:null,
  staleRatio:total.totalUnits?total.staleUnits/total.totalUnits*100:null,
  staleValueRatio:total.goodsValueCents?total.staleValueCents/total.goodsValueCents*100:null,
  refurbDelay:delays.length?Math.max(...delays):null,count:records.length};
}
function ipStockGroups(records,dimension){
 const names=dimension==='category'?pfCategories:brands;
 const rows=names.map((name,index)=>({name,index,...ipStockSum(records.filter(row=>dimension==='category'?row.category===name:row.brand===index))}));
 return dimension==='brand'?rows.sort((a,b)=>b.warehouseValueCents-a.warehouseValueCents||a.index-b.index):rows;
}
