// 缺货榜使用产品库存详情同一SKU台账，完整条件复用后台库存预警规则。
const rpShortageLimits={sellableDays:15,totalDays:45};
function rpShortageRule(){
 const first=brcStockWarningRuleText('stock.shortage.sellableDays'),second=brcStockWarningRuleText('stock.shortage.totalDays'),active=key=>brcResultKeyActive('stock-shortage-days',key);
 const priority=active('stock.shortage.sellableDays')&&active('stock.shortage.totalDays')?first+'优先于仅'+second+'；同时命中归第一类':active('stock.shortage.sellableDays')?first:active('stock.shortage.totalDays')?second:'按缺货预警条件入榜';
 return ['入榜条件','按SKU、公司库存口径统计；按已保存的且／或条件判断','• '+brcResultText('stock-shortage-warning'),'可售库存＝我司可售库存＋在途库存＋工厂可售库存','可售天数＝可售库存÷近15日均净销量','总可售天数＝总库存÷近15日均净销量','','排序规则','1. '+priority,'2. 按命中天数条件的首项指标升序；未命中天数条件的记录排后','3. 近15日均净销量降序','4. 总库存货值降序'].join('\n');
}
function rpShortageExcluded(record,product={}){
 const states=[record.salesState,record.state,record.productState,product.salesState,product.state];
 return pfIdentity(record).clearance===true||record.clearance===true||record.productClearance===true||product.clearance===true||states.some(state=>['清仓','清仓品','下架','下架品'].includes(state));
}
function rpShortageSellableDays(row){
 return [row.warehouse,row.transit,row.factoryAvailable].every(value=>Number.isFinite(value)&&value>=0)&&Number.isFinite(row.dailyNet15)&&row.dailyNet15>0?(row.warehouse+row.transit+row.factoryAvailable)/row.dailyNet15:null;
}
function rpShortageType(row){
 const metrics=brcStockWarningMetrics(row,rpShortageExcluded(row));
 for(const [type,key] of [[1,'stock.shortage.sellableDays'],[2,'stock.shortage.totalDays']])if(brcResultKeyActive('stock-shortage-days',key)&&brcMatch(key,metrics[brcMetricConfig(key).default],metrics))return type;
 return null;
}
function rpShortageTypeLabel(row){const type=rpShortageType(row);return type?brcStockWarningRuleText(type===1?'stock.shortage.sellableDays':'stock.shortage.totalDays'):rpShortageEligible(row)?'缺货预警条件':'—'}
function rpShortageEligible(row){return brcResultMatch('stock-shortage-warning',brcStockWarningMetrics(row,rpShortageExcluded(row)))}
function rpShortageTone(row){return !rpShortageEligible(row)?'rp-quality-gray':rpShortageType(row)===1?'rp-quality-red':'rp-quality-yellow'}
function rpShortageCompare(a,b){
 const typeA=rpShortageType(a),typeB=rpShortageType(b);
 if(typeA!==typeB)return (typeA??3)-(typeB??3);
 const key=typeA===1?'stock.shortage.sellableDays':typeA===2?'stock.shortage.totalDays':null,days=key?[[row=>brcStockWarningPrimary(key,row).value,1]]:[];
 return rpStockNumericCompare(a,b,[...days,['dailyNet15',-1],['goodsValueCents',-1]]);
}
function rpShortageRankSeasons(rows){return rpStockSkuRank(rows,rpShortageCompare)}
function rpShortageRows(){
 return rpShortageRankSeasons(rpStockSkuRows().filter(rpShortageEligible).map(row=>({...row,sellableCoverage15:rpShortageSellableDays(row),shortageType:rpShortageType(row)??3,reasons:[{priority:rpShortageType(row)??3,label:rpShortageTypeLabel(row),platforms:[]}],level:rpShortageType(row)===1?'P1':'P2'})));
}
// 后台只读验证；不修改库存模型或页面状态。
window.shortageRankingSnapshot=()=>({rule:rpCardRuleSummary(3),rows:rpShortageRows().map(row=>({id:row.id,spuId:row.spuId,skuId:row.skuId,skuCode:row.skuCode,name:row.name,attribute:row.attribute,seasonRank:row.seasonRank,totalUnits:row.totalUnits,warehouse:row.warehouse,transit:row.transit,factoryAvailable:row.factoryAvailable,goodsValueCents:row.goodsValueCents,dailyNet15:row.dailyNet15,totalCoverage15:row.totalCoverage15,sellableCoverage15:row.sellableCoverage15,shortageType:row.shortageType,riskType:rpShortageTypeLabel(row),tone:rpShortageTone(row),state:row.state,clearance:row.clearance}))});
