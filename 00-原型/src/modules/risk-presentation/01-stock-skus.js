// 统一使用产品库存详情的SKU台账；不在公共取数层排除状态或判定风险。
const rpSellableInventoryFormula='我司可售库存＋在途库存＋工厂可售库存';
const rpSellableDaysFormula='可售库存÷近15日均净销量';
function rpStockSkuRows(){
 const operating=upWindow(),previousEnd=shiftDate(operating.start,-1),previousStart=shiftDate(operating.start,-aiFlowDayDiff(operating.start,operating.end)-1);
 return upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF,platform:'all'},()=>inventoryProductLedger().flatMap((record,index)=>{
  const product=upProduct(upIdentity(record)),stock=upPlatformStockFacts(record,'all'),identity=pfIdentity(record);
  const model=upStockModel({product,stock,stockEnd:DATA_CUTOFF},{end:DATA_CUTOFF});
  const current=new Map(upSkuOperatingRows(product,operating.start,operating.end).map(row=>[row.skuId,row]));
  const previous=new Map(upSkuOperatingRows(product,previousStart,previousEnd).map(row=>[row.skuId,row]));
  const own=(value,fallback)=>Number.isFinite(value)?value:Number.isFinite(fallback)?fallback:null;
  return model.rows.map((sku,skuIndex)=>({...stock,...sku,skuGsvCents:own(sku.gsvCents,current.get(sku.skuId)?.gsvCents),skuNetSales:own(sku.netSales,current.get(sku.skuId)?.netSales),
   skuPreviousGsvCents:own(sku.previousGsvCents,previous.get(sku.skuId)?.gsvCents),skuPreviousNetSales:own(sku.previousNetSales,previous.get(sku.skuId)?.netSales),skuProfitRate:own(sku.profitRate,current.get(sku.skuId)?.profitRate),skuPreviousProfitRate:own(sku.previousProfitRate,previous.get(sku.skuId)?.profitRate),id:1000+index*100+skuIndex,ledgerId:record.id,spuId:record.spuId,skuCode:sku.skuCode||sku.code||sku.skuId,
   brand:identity.brand,brandIndex:record.brand,attribute:sku.attribute||identity.attribute||srAttribute(record.name),snapshotDate:DATA_CUTOFF,
   clearance:sku.clearance??identity.clearance,state:sku.salesState||sku.state||product.state,productClearance:identity.clearance,productState:product.state}));
 }));
}
function rpStockSkuRank(rows,compare){return rows.slice().sort(compare).map((row,index)=>({...row,seasonRank:index+1}))}
// 三个库存榜各自传入排序键；缺失值置后，完全同值按SKU码稳定排序。
function rpStockNumericCompare(a,b,keys){
 for(const [key,direction] of keys){
  const x=typeof key==='function'?key(a):a[key],y=typeof key==='function'?key(b):b[key],knownX=Number.isFinite(x),knownY=Number.isFinite(y);
  if(knownX!==knownY)return knownX?-1:1;if(knownX&&x!==y)return (x-y)*direction;
 }
 return String(a.skuCode||a.skuId||'').localeCompare(String(b.skuCode||b.skuId||''),undefined,{numeric:true});
}
