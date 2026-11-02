// 呆滞预警看去化压力，不以库龄判断；不沿用缺货榜状态排除。
const rpStagnantLimits={coverageDays:60};
function rpStagnantRule(){return ['入榜条件','按SKU、公司库存口径统计；按已保存的且／或条件判断','• '+brcResultText('stock-stagnant-warning'),'','排序规则','1. '+brcStockWarningPrimary('stock.warning.coverageDays',{}).name+'降序','2. 呆滞货值降序','3. 近15日均净销量升序'].join('\n')}
function rpStagnantEligible(row){return brcResultMatch('stock-stagnant-warning',brcStockWarningMetrics(row))}
function rpStagnantTone(row){return rpStagnantEligible(row)?'rp-quality-red':'rp-quality-gray'}
function rpStagnantCompare(a,b){
 return rpStockNumericCompare(a,b,[[row=>brcStockWarningPrimary('stock.warning.coverageDays',row).value,-1],['staleValueCents',-1],['dailyNet15',1]]);
}
function rpStagnantRows(){return rpStockSkuRank(rpStockSkuRows().filter(rpStagnantEligible).map(row=>({...row,level:'P1'})),rpStagnantCompare)}
window.stagnantRankingSnapshot=()=>({rule:rpCardRuleSummary(4),rows:rpStagnantRows().map(row=>({id:row.id,spuId:row.spuId,skuId:row.skuId,skuCode:row.skuCode,name:row.name,attribute:row.attribute,seasonRank:row.seasonRank,warehouse:row.warehouse,dailyNet15:row.dailyNet15,coverage15:row.coverage15,sellableCoverage15:row.sellableCoverage15,totalCoverage15:row.totalCoverage15,staleUnits:row.staleUnits,staleValueCents:row.staleValueCents,staleMaxAgeDays:row.staleMaxAgeDays,tone:rpStagnantTone(row)}))});
