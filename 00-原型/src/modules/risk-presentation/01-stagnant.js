// 呆滞预警看去化压力，不以库龄判断；不沿用缺货榜状态排除。
const rpStagnantLimits={coverageDays:60};
const rpStagnantMetricLabels={
 staleUnits:['库存','呆滞库存'],staleValue:['货值','呆滞货值'],age:['最高库龄','呆滞最高库龄'],
 responsibleChannel:['责任渠道','用我司可售库存判定责任渠道，当出现产品呆滞预警时，判断当前我司可售天数最高的虚拟仓']
};
// 总仓是汇总项。库存权重仅供原型分配，不作为正式分仓规则。
const rpStagnantVirtualWarehouses=[
 ['抖音仓',50],['快手仓',12],['视频号仓',8],['一类仓',26],['经销渠道虚拟仓',4]
];
function rpStagnantResponsibility(warehouses){
 let responsible=null,maxDays=0;
 for(const {name,warehouse,netSales15} of warehouses){
  if(!Number.isFinite(warehouse)||warehouse<=0||!Number.isFinite(netSales15)||netSales15<0)continue;
  // 参照产品库存页，有库存且零动销的仓记作999天；同天数按虚拟仓顺序取首项。
  const days=netSales15===0?999:warehouse/(netSales15/15);
  if(days>maxDays){responsible=name;maxDays=days}
 }
 return responsible;
}
function rpStagnantWarehouseSamples(row){
 const end=row.snapshotDate;
 const product=upIdentity(row);
 if(!end||!product||!Number.isFinite(row.warehouse)||!Number.isFinite(row.dailyNet15))return [];
 const start=shiftDate(end,-14);
 const netWeight=platform=>{
  const {sales,returned}=upSummary(product,start,end,platform);
  return Math.max(0,sales-returned);
 };
 // 原型无分仓台账，沿用同期间经营样例的动销结构，其余渠道仅在样例中分给一类仓和经销仓。
 const other=netWeight(['天猫','京东','拼多多']);
 const weights=[netWeight('抖音'),netWeight('快手'),netWeight('视频号'),other*.95,other*.05];
 const netSales=splitTarget(Math.round(row.dailyNet15*15),weights);
 const units=splitTarget(row.warehouse,rpStagnantVirtualWarehouses.map(([,weight])=>weight));
 return rpStagnantVirtualWarehouses.map(([name],index)=>({name,warehouse:units[index],netSales15:netSales[index]}));
}
function rpStagnantSkuChannel(row){
 return rpStagnantResponsibility(rpStagnantWarehouseSamples(row));
}
function rpStagnantRule(){return ['入榜条件','按SKU、公司库存口径统计；按已保存的且／或条件判断','• '+brcResultText('stock-stagnant-warning'),'可售库存＝'+rpSellableInventoryFormula,'可售天数＝'+rpSellableDaysFormula,'','排序规则','1. 可售天数降序','2. 呆滞货值降序','3. 近15日均净销量升序'].join('\n')}
function rpStagnantEligible(row){return brcResultMatch('stock-stagnant-warning',brcStockWarningMetrics(row))}
function rpStagnantTone(row){return rpStagnantEligible(row)?'rp-quality-red':'rp-quality-gray'}
function rpStagnantSellableDays(row){return brcStockWarningMetrics(row).sellableCoverage15}
function rpStagnantCompare(a,b){
 return rpStockNumericCompare(a,b,[[rpStagnantSellableDays,-1],['staleValueCents',-1],['dailyNet15',1]]);
}
function rpStagnantRows(){return rpStockSkuRank(rpStockSkuRows().filter(rpStagnantEligible).map(row=>({...row,level:'P1'})),rpStagnantCompare)}
window.stagnantRankingSnapshot=()=>({rule:rpCardRuleSummary(4),rows:rpStagnantRows().map(row=>({id:row.id,spuId:row.spuId,skuId:row.skuId,skuCode:row.skuCode,name:row.name,attribute:row.attribute,seasonRank:row.seasonRank,warehouse:row.warehouse,transit:row.transit,factoryAvailable:row.factoryAvailable,sellableUnits:brcStockSellableUnits(row),sellableValueCents:row.sellableValueCents,dailyNet15:row.dailyNet15,coverage15:row.coverage15,sellableCoverage15:rpStagnantSellableDays(row),totalCoverage15:row.totalCoverage15,staleUnits:row.staleUnits,staleValueCents:row.staleValueCents,staleMaxAgeDays:row.staleMaxAgeDays,responsibleChannel:rpStagnantSkuChannel(row),tone:rpStagnantTone(row)}))});
