// 类目、品牌和SPU列表共用库存快照；数量、金额先汇总，再计算比率。
// 库存独立保留五类；沿用原五类样例映射，正式分类以产品主数据为准。
const ipStockCategories=Object.freeze(['个护类','环境类','清洁类','厨电类','健康类']);
function ipStockCategory(record){
 if(ipStockCategories.includes(record.category))return record.category;
 if(record.chain===3)return /润眼|眼镜|按摩/.test(record.name||'')?'健康类':'个护类';
 return {0:'清洁类',1:'厨电类',2:'环境类'}[record.chain]||null;
}
function ipStockRecords(ledger){
 return upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>ledger.map(record=>{
  const row={...record,...upStockFacts(record),category:ipStockCategory(record),brandName:brands[record.brand],deliveryOn:record.monthOn,deliveryDue:record.monthDue};
  return {...row,...ipStockSum([row])};
 }));
}
function ipStockSum(records){
 const fields=['warehouse','warehouseValueCents','factory','factoryValueCents','totalUnits','goodsValueCents','staleUnits','staleValueCents','cost','avg','deliveryOn','deliveryDue'];
 const total=Object.fromEntries(fields.map(key=>[key,targetSum(records.map(row=>row[key]||0))]));
 // 天数先汇总近15日均净销量，再用库存相除；缺失分母不补零。
 const dailyNet15=records.length&&records.every(row=>Number.isFinite(row.dailyNet15))?targetSum(records.map(row=>row.dailyNet15)):null;
 const refurb=ipRefurbSummary(records,records.find(row=>row.refurbEnd)?.refurbEnd||DATA_CUTOFF);
 return {...total,dailyNet15,...upStockCoverage(total.warehouse,total.totalUnits,dailyNet15),turn:total.avg?total.cost/total.avg:null,delivery:total.deliveryDue?total.deliveryOn/total.deliveryDue*100:null,
  staleRatio:total.totalUnits?total.staleUnits/total.totalUnits*100:null,
  staleValueRatio:total.goodsValueCents?total.staleValueCents/total.goodsValueCents*100:null,
  refurb,refurbRate:refurb.rate,count:records.length};
}
function ipStockGroups(records,dimension){
 const names=dimension==='category'?ipStockCategories:brands;
 const rows=names.map((name,index)=>({name,index,...ipStockSum(records.filter(row=>dimension==='category'?row.category===name:row.brand===index))}));
 return dimension==='brand'?rows.sort((a,b)=>b.warehouseValueCents-a.warehouseValueCents||a.index-b.index):rows;
}
