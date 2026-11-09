// API可直接提供inventoryBalance各组成；本地样例拆分只细化旧余额，不增加库存总量。
function upStockBalanceFacts(record,stock){
 const source=record.inventoryBalance||{},read=(key,fallback)=>Number.isFinite(source[key])?source[key]:fallback;
 const parts=splitTarget(stock.factory,[20,40,25,15]),seed=upIdentity(record).sourceRow;
 const available=parts.reduce((n,count,i)=>n+Math.floor(count*(.72+(seed+i)%4*.05)),0);
 const factoryAvailable=read('factoryAvailable',available),rest=Math.max(0,stock.factory-factoryAvailable),states=splitTarget(rest,[45,35,20]);
 const transit=read('transit',Math.round(stock.undelivered*.4)),purchaseOpen=read('purchaseOpen',stock.undelivered-transit);
 const amount=units=>units*stock.financePriceCents;
 const sellableUnits=stock.warehouse+factoryAvailable+transit;
 const warehouseValueCents=read('warehouseValueCents',amount(stock.warehouse)),factoryAvailableValueCents=read('factoryAvailableValueCents',amount(factoryAvailable)),transitValueCents=read('transitValueCents',amount(transit));
 return {warehouseValueCents,factoryAvailable,factoryAvailableValueCents,factoryValueCents:read('factoryValueCents',amount(stock.factory)),
  factoryInspection:read('factoryInspection',states[0]),factoryDefective:read('factoryDefective',states[1]),factoryUnrefurbished:read('factoryUnrefurbished',states[2]),
  transit,purchaseOpen,transitValueCents,sellableUnits,
  sellableValueCents:read('sellableValueCents',warehouseValueCents+factoryAvailableValueCents+transitValueCents)};
}
function upStockBalanceSummary(records,end=DATA_CUTOFF){
 const fields=['totalUnits','goodsValueCents','warehouse','warehouseValueCents','factory','factoryAvailable','factoryAvailableValueCents','factoryValueCents','transit','transitValueCents','purchaseOpen','factoryInspection','factoryDefective','factoryUnrefurbished','sellableUnits','sellableValueCents','dailyNet15'];
 const total=Object.fromEntries(fields.map(key=>[key,0]));
 const seasons=filterCatalog.seasons.map(label=>({label,units:0,valueCents:0}));
 upWithRange({start:shiftDate(end,-29),end},()=>{for(const record of records){
  const stock=upStockFacts(record);for(const key of fields)total[key]+=stock[key]||0;
  const season=seasons.find(row=>row.label===pfIdentity(record).attribute);if(season){season.units+=stock.sellableUnits;season.valueCents+=stock.sellableValueCents}
 }});
 return {...total,...upStockCoverage(total.warehouse,total.totalUnits,total.dailyNet15),seasons,end};
}
