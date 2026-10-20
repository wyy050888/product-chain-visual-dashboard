// SKU级库存演示台账：按整数拆分SPU余额，保证数量、货值与上方汇总一致。
// 总可售与我司可售共用近15日均净销量；清仓为人工销售状态，不参与自动风险判定。
function upSellableStock(product,warehouse,end,totalUnits=null){
 const recent=upSummary(upIdentity(product),shiftDate(end,-14),end,'all');
 const dailyNet15=(recent.sales-recent.returned)/15;
 return {warehouse,dailyNet15,...upStockCoverage(warehouse,totalUnits,dailyNet15)};
}
function upStockCoverage(warehouse,totalUnits,dailyNet15){
 const days=units=>Number.isFinite(units)&&units>=0&&Number.isFinite(dailyNet15)&&dailyNet15>0?units/dailyNet15:null;
 return {coverage15:days(warehouse),totalCoverage15:days(totalUnits)};
}
function upStockModel(m,state){
 const stock=m.stock;if(!stock)return null;
 const end=m.stockEnd||state.end,recent=upSummary(m.product,shiftDate(end,-14),end,'all');
 const weights=[48,29,16,7],salesWeights=[50,30,20,0];
 const warehouse=splitTarget(stock.warehouse,weights),factory=splitTarget(stock.factory,[20,40,25,15]),undelivered=splitTarget(stock.undelivered,weights);
 const factoryAvailable=splitTarget(stock.factoryAvailable,factory),warehouseValue=splitTarget(stock.warehouseValueCents,weights);
 const transitTotal=Number.isFinite(stock.transit)?stock.transit:Math.max(0,stock.sellableUnits-stock.warehouse-stock.factoryAvailable);
 const transit=splitTarget(transitTotal,undelivered);
 const sellableUnits=weights.map((_,i)=>warehouse[i]+factoryAvailable[i]+transit[i]);
 const sellableValues=splitTarget(stock.sellableValueCents,sellableUnits);
 const goodsValues=splitTarget(stock.goodsValueCents,weights.map((_,i)=>warehouse[i]+factory[i]+undelivered[i]));
 const net15=splitTarget(recent.sales-recent.returned,salesWeights),cost=splitTarget(Math.round((stock.cost||0)*100),salesWeights),average=splitTarget(Math.round((stock.avg||0)*100),weights);
 const rows=weights.map((_,i)=>{
  // 分类样例拆分我司库存，不引入一类、二类的业务判定规则。
  const warehouseClass1=Math.round(warehouse[i]*([.72,.65,.81,.58][i]));
  const warehouseClass2=warehouse[i]-warehouseClass1;
  const totalUnits=warehouse[i]+factory[i]+undelivered[i],dailyNet15=net15[i]/15,code=m.product.spuCode+'-SKU'+String(i+1).padStart(2,'0');
  return {name:m.product.name+' · 规格'+String(i+1).padStart(2,'0'),code,totalUnits,goodsValueCents:goodsValues[i],
   sellableUnits:sellableUnits[i],sellableValueCents:sellableValues[i],transit:transit[i],
   warehouse:warehouse[i],warehouseClass1,warehouseClass2,warehouseValueCents:warehouseValue[i],...upStockCoverage(warehouse[i],totalUnits,dailyNet15),
   factory:factory[i],factoryAvailable:factoryAvailable[i],dailyNet15,turn:average[i]>0?cost[i]/average[i]:null};
 });
 const sum=key=>rows.reduce((n,row)=>n+row[key],0),sellable=upSellableStock(m.product,stock.warehouse,end,sum('totalUnits'));
 const season=pfIdentity(m.product).attribute,seasons=filterCatalog.seasons.map(label=>({label,units:label===season?stock.sellableUnits:0,valueCents:label===season?stock.sellableValueCents:0}));
 return {...stock,end,seasons,rows,totalUnits:sum('totalUnits'),goodsValueCents:sum('goodsValueCents'),warehouse:sum('warehouse'),warehouseClass1:sum('warehouseClass1'),warehouseClass2:sum('warehouseClass2'),warehouseValueCents:sum('warehouseValueCents'),
  sellableUnits:sum('sellableUnits'),sellableValueCents:sum('sellableValueCents'),transit:sum('transit'),factory:sum('factory'),factoryAvailable:sum('factoryAvailable'),...sellable,turn:Number.isFinite(stock.turn)?stock.turn:null};
}
const upStockColumns=[
 ['totalUnits','总库存',v=>fmt(v)],['goodsValueCents','货值（总库存）',upMoney],
 ['sellableUnits','可售库存',v=>fmt(v)],['sellableValueCents','货值（可售库存）',upMoney],
 ['warehouse','我司可售库存',v=>fmt(v)],['warehouseValueCents','货值（我司可售）',upMoney],['coverage15','我司可售天数',v=>Number.isFinite(v)?fmt(v,1)+'天':'—'],
 ['warehouseClass1','一类我司库存',v=>fmt(v)],['warehouseClass2','二类我司库存',v=>fmt(v)],
 ['factory','工厂总库存',v=>fmt(v)],['factoryAvailable','工厂可售库存',v=>fmt(v)],
 ['transit','在途库存',v=>fmt(v)],['dailyNet15','近15日均净销量',v=>fmt(Math.round(v))],['turn','近30日库存周转率',v=>Number.isFinite(v)?fmt(v,1)+'次':'—']
];

// 风险直接读取库存指标，避免静态标签与样例余额矛盾；无净销量时不计算有限天数。
function upStockRiskTags(model){
 if(!model)return [];
 return [Number.isFinite(model.totalCoverage15)&&model.totalCoverage15<30?'shortage':null,
  Number.isFinite(model.coverage15)&&model.coverage15<=7?'transfer':null,
  model.warehouse>0&&Number.isFinite(model.coverage15)&&model.coverage15>=60?'stagnant':null].filter(Boolean);
}
