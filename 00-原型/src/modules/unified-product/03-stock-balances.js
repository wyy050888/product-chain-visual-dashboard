const upTotalStockParts=[['warehouse','我司可售库存'],['transit','在途库存'],['factoryAvailable','工厂可售库存'],['unproducedOrders','未产订单'],['unrefurbishedUnits','未翻新']];
const upTotalStockFormula=upTotalStockParts.map(([,label])=>label).join('＋');
// 本地样例从旧余额拆出五项；正式组成按台账的件数取值。
function upStockBalanceFacts(record,stock){
 const source=record.inventoryBalance||{},read=(key,fallback)=>Number.isFinite(source[key])?source[key]:fallback;
 const parts=splitTarget(stock.factory,[20,40,25,15]),seed=upIdentity(record).sourceRow;
 const available=parts.reduce((n,count,i)=>n+Math.floor(count*(.72+(seed+i)%4*.05)),0);
 const factoryAvailable=read('factoryAvailable',available),rest=Math.max(0,stock.factory-factoryAvailable);
 const transit=read('transit',Math.round(stock.undelivered*.4));
 const unproducedOrders=read('unproducedOrders',read('purchaseOpen',Math.max(0,stock.undelivered-transit)));
 const unrefurbishedUnits=read('unrefurbishedUnits',read('factoryUnrefurbished',splitTarget(rest,[80,20])[1]));
 const amount=units=>units*stock.financePriceCents;
 const sellableUnits=stock.warehouse+factoryAvailable+transit;
 const warehouseValueCents=read('warehouseValueCents',amount(stock.warehouse)),factoryAvailableValueCents=read('factoryAvailableValueCents',amount(factoryAvailable)),transitValueCents=read('transitValueCents',amount(transit));
 const unproducedValueCents=read('unproducedValueCents',amount(unproducedOrders)),unrefurbishedValueCents=read('unrefurbishedValueCents',amount(unrefurbishedUnits));
 return {warehouseValueCents,factoryAvailable,factoryAvailableValueCents,factoryValueCents:read('factoryValueCents',amount(stock.factory)),
  transit,transitValueCents,unproducedOrders,unproducedValueCents,unrefurbishedUnits,unrefurbishedValueCents,sellableUnits,
  totalUnits:sellableUnits+unproducedOrders+unrefurbishedUnits,
  goodsValueCents:warehouseValueCents+factoryAvailableValueCents+transitValueCents+unproducedValueCents+unrefurbishedValueCents,
  sellableValueCents:read('sellableValueCents',warehouseValueCents+factoryAvailableValueCents+transitValueCents)};
}
function upStockBalanceSummary(records,end=DATA_CUTOFF){
 const fields=['totalUnits','goodsValueCents','warehouse','warehouseValueCents','factory','factoryAvailable','factoryAvailableValueCents','factoryValueCents','transit','transitValueCents','unproducedOrders','unproducedValueCents','unrefurbishedUnits','unrefurbishedValueCents','sellableUnits','sellableValueCents','dailyNet15'];
 const total=Object.fromEntries(fields.map(key=>[key,0]));
 const seasons=filterCatalog.seasons.map(label=>({label,units:0,valueCents:0}));
 upWithRange({start:shiftDate(end,-29),end},()=>{for(const record of records){
  const stock=upStockFacts(record);for(const key of fields)total[key]+=stock[key]||0;
  const season=seasons.find(row=>row.label===pfIdentity(record).attribute);if(season){season.units+=stock.sellableUnits;season.valueCents+=stock.sellableValueCents}
 }});
 return {...total,...upStockCoverage(total.warehouse,total.totalUnits,total.dailyNet15),seasons,end};
}
