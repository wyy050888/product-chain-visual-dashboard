// SKU级库存演示台账：按整数拆分SPU余额，保证数量、货值与上方汇总一致。
// 总可售与我司可售共用近15日均净销量；清仓为人工销售状态，不参与自动风险判定。
function upSellableStock(product,warehouse,end,totalUnits=null){
 const recent=upSummary(upIdentity(product),shiftDate(end,-14),end,'all');
 const dailyNet15=(recent.sales-recent.returned)/15;
 return {warehouse,dailyNet15,...upStockCoverage(warehouse,totalUnits,dailyNet15)};
}
function upStockCoverageDays(units,dailyNet15){
 return Number.isFinite(units)&&units>=0&&Number.isFinite(dailyNet15)&&dailyNet15>0?units/dailyNet15:null;
}
function upStockCoverage(warehouse,totalUnits,dailyNet15){
 return {coverage15:upStockCoverageDays(warehouse,dailyNet15),totalCoverage15:upStockCoverageDays(totalUnits,dailyNet15)};
}
// 库存与翻新台账共用SKU身份；颜色为演示属性，编码与库存拆分保持一一对应。
function upStockSkus(product){
 return ['白色','黑色','灰色','蓝色'].map((color,index)=>{const suffix=String(index+1).padStart(2,'0'),code=product.spuCode+'-SKU'+suffix;return {skuId:code,code,name:product.name+' '+color}});
}
const upSkuSalesWeights=[50,30,20,0];
function upSkuNetSalesSample(summary){return splitTarget(summary.sales-summary.returned,upSkuSalesWeights)}
function upStockModel(m,state,metrics=null){
 const stock=m.stock;if(!stock)return null;
 const end=m.stockEnd||state.end,recent=upSummary(m.product,shiftDate(end,-14),end,'all');
 const weights=[48,29,16,7];
 const warehouse=splitTarget(stock.warehouse,weights),factory=splitTarget(stock.factory,[20,40,25,15]),undelivered=splitTarget(stock.undelivered,weights);
 const factoryAvailable=splitTarget(stock.factoryAvailable,factory),warehouseValue=splitTarget(stock.warehouseValueCents,weights);
 const transitTotal=Number.isFinite(stock.transit)?stock.transit:Math.max(0,stock.sellableUnits-stock.warehouse-stock.factoryAvailable);
 const transit=splitTarget(transitTotal,undelivered);
 const sellableUnits=weights.map((_,i)=>warehouse[i]+factoryAvailable[i]+transit[i]);
 const goodsValues=splitTarget(stock.goodsValueCents,weights.map((_,i)=>warehouse[i]+factory[i]+undelivered[i]));
 const net15=upSkuNetSalesSample(recent),periodCost=metrics?metrics.cost:stock.cost,periodAverage=metrics?metrics.avg:stock.avg;
 const cost=Number.isFinite(periodCost)?splitTarget(Math.round(periodCost*100),upSkuSalesWeights):weights.map(()=>null),average=Number.isFinite(periodAverage)?splitTarget(Math.round(periodAverage*100),weights):weights.map(()=>null);
 const splitKnown=(value,basis)=>Number.isFinite(value)?splitTarget(value,basis):weights.map(()=>null);
 const factoryAvailableValues=splitKnown(stock.factoryAvailableValueCents,factoryAvailable),transitValues=splitKnown(stock.transitValueCents,transit);
 // 组成金额齐全且与可售总货值一致时逐SKU汇总；独立提供的总货值仍保留原值。
 const hasComponentValues=Number.isFinite(stock.warehouseValueCents)&&Number.isFinite(stock.factoryAvailableValueCents)&&Number.isFinite(stock.transitValueCents);
 const sellableValues=hasComponentValues&&stock.sellableValueCents===stock.warehouseValueCents+stock.factoryAvailableValueCents+stock.transitValueCents?
  weights.map((_,i)=>warehouseValue[i]+factoryAvailableValues[i]+transitValues[i]):splitKnown(stock.sellableValueCents,sellableUnits);
 const staleUnits=splitKnown(stock.staleUnits,warehouse),staleValues=splitKnown(stock.staleValueCents,warehouseValue);
 const oldestUnits=splitKnown(stock.staleOldestSellableUnits,staleUnits.map(value=>value??0));
 const rows=upStockSkus(m.product).map((sku,i)=>{
  // 分类样例拆分我司库存，不引入一类、二类的业务判定规则。
  const warehouseClass1=Math.round(warehouse[i]*([.72,.65,.81,.58][i]));
  const warehouseClass2=warehouse[i]-warehouseClass1;
  const totalUnits=warehouse[i]+factory[i]+undelivered[i],netSales15=net15[i],dailyNet15=netSales15/15;
  return {...sku,totalUnits,goodsValueCents:goodsValues[i],
   staleUnits:staleUnits[i],staleValueCents:staleValues[i],staleOldestSellableUnits:oldestUnits[i],staleMaxAgeDays:oldestUnits[i]>0?stock.staleMaxAgeDays:null,
   sellableUnits:sellableUnits[i],sellableCoverage15:upStockCoverageDays(sellableUnits[i],dailyNet15),sellableValueCents:sellableValues[i],transit:transit[i],transitValueCents:transitValues[i],factoryAvailableValueCents:factoryAvailableValues[i],
   warehouse:warehouse[i],warehouseClass1,warehouseClass2,warehouseValueCents:warehouseValue[i],...upStockCoverage(warehouse[i],totalUnits,dailyNet15),
   factory:factory[i],factoryAvailable:factoryAvailable[i],netSales15,dailyNet15,turn:Number.isFinite(cost[i])&&average[i]>0?cost[i]/average[i]:null};
 });
 const sum=key=>rows.reduce((n,row)=>n+row[key],0),sellable=upSellableStock(m.product,stock.warehouse,end,sum('totalUnits'));
 const sellableTotal=sum('sellableUnits');
 const season=pfIdentity(m.product).attribute,seasons=filterCatalog.seasons.map(label=>({label,units:label===season?stock.sellableUnits:0,valueCents:label===season?stock.sellableValueCents:0}));
 return {...stock,end,seasons,rows,totalUnits:sum('totalUnits'),goodsValueCents:sum('goodsValueCents'),warehouse:sum('warehouse'),warehouseClass1:sum('warehouseClass1'),warehouseClass2:sum('warehouseClass2'),warehouseValueCents:sum('warehouseValueCents'),
  sellableUnits:sellableTotal,sellableValueCents:Number.isFinite(stock.sellableValueCents)?sum('sellableValueCents'):null,
  sellableCoverage15:upStockCoverageDays(sellableTotal,sellable.dailyNet15),transit:sum('transit'),factory:sum('factory'),factoryAvailable:sum('factoryAvailable'),
  ...sellable,turn:metrics?metrics.turn:Number.isFinite(stock.turn)?stock.turn:null,delivery:metrics?.delivery??null,name:m.product.name,refurb:metrics?.refurb??null,refurbRate:metrics?.refurbRate??null};
}
const upStockDaysText=value=>Number.isFinite(value)?fmt(value,1)+'天':'—';
const upStockColumns=[
 ['totalUnits','总库存',stockQuantity],['totalCoverage15','总可售天数',upStockDaysText],
 ['sellableUnits','可售库存',stockQuantity],['sellableCoverage15','可售天数',upStockDaysText],
 ['warehouse','我司可售库存',stockQuantity],['coverage15','我司可售天数',upStockDaysText],
 ['netSales15','近15日净销量',value=>formatSalesQuantity(value,'件')],['turn','库存周转率',v=>Number.isFinite(v)?fmt(v,1)+'次':'—']
];

// 风险直接读取库存指标，避免静态标签与样例余额矛盾；无净销量时不计算有限天数。
function upStockRiskTags(model){
 if(!model)return [];
 return [brcStockRuleMatch('stock.shortDays',model)?'shortage':null,
  brcStockRuleMatch('stock.transferDays',model)?'transfer':null,
  brcStockStagnant(model)?'stagnant':null].filter(Boolean);
}
