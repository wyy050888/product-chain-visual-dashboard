// 亏损榜字段：经营指标跟随所选期间/平台，库存保持公司最新快照。
const rpLossCardKeys=['loss','margin','gsv','return','received','total'];
const rpLossListKeys=['loss','margin','gsv','sales','netSales','return','received','total','totalCoverage15','season','productType'];
let rpLossMarginHint='净利润率＝所选期间利润率－10%。';
// 表头使用本榜计算口径，随全局扣减规则同步，不套用通用经营利润说明。
function rpLossAmountHint(){
 return '亏损金额＝所选期间、所选平台的GSV×净利润率。\n'+rpLossMarginHint+'亏损金额以负数展示。\n默认按亏损金额从小到大排序，亏损越大越靠前（如－10万排在－5万前）。';
}
const rpLossStocks=boundedCache(2);
function rpLossStock(product){
 let snapshot=rpLossStocks.get(DATA_CUTOFF);
 if(!snapshot){
  snapshot=upWithRange({start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF},()=>new Map(inventoryProductLedger().map(r=>[r.spuId,upStockFacts(r)])));
  rpLossStocks.set(DATA_CUTOFF,snapshot);
 }
 return snapshot.get(product.spuId)||null;
}
function rpLossReturnTarget(product,platform,start,end){
 if(platform!=='all'&&!Array.isArray(platform))return qrbTarget(upProduct(product),platform);
 // 汇总退货率分母为销量，因此公司目标也按同期各平台销量加权。
 let sales=0,weighted=0,complete=true;
 for(const channel of upChannels(platform)){const n=upSummary(product,start,end,channel).sales;if(n>0){const target=qrbTarget(upProduct(product),channel);sales+=n;if(Number.isFinite(target))weighted+=n*target;else complete=false}}
 return complete&&sales?weighted/sales:null;
}
function rpLossMarginComparison(now,before,{reverse=false}={}){
 const raw=periodRateGrowth(now,before);
 return {target:'环比 '+periodRateGrowthText(raw),targetTone:rpComparisonTone(raw,reverse)};
}
// 净利润率独立判色；负值改善仍为上涨，不使用10%灰色区间。
function rpNetMarginComparison(now,before){
 return rpProfitRateComparison(now,before);
}
// 亏损金额独立判色，不使用普通经营环比的10%灰色区间。
function rpLossAmountComparison(now,before){
 const current=Number.isFinite(now)?Math.abs(now):null,previous=Number.isFinite(before)?Math.abs(before):null;
 const change=current===null||previous===null?null:current===previous?0:previous===0?null:(current-previous)/previous*100;
 const tone=!Number.isFinite(change)||Math.round(Math.abs(change)*10)===0?'gray':change>0?'red':'green';
 return {target:rpComparisonText(change),targetTone:'rp-quality-'+tone};
}
function rpLossFields(record,current,previous){
 const product=upIdentity(record),w=upWindow(),platform=record.metricPlatform||'all',stock=rpLossStock(product);
 const now=upNetEstimate(current),before=upNetEstimate(previous),fields=[];
 const add=(key,name,value,raw,tone='rp-quality-normal',target='',targetTone='',hint='')=>fields.push({...rpField(key,name,value,tone,hint,target),sortValue:raw,targetTone});
 const compareHint='环比取紧邻等长区间；'+rpComparisonRuleText();
 for(const [key,name,value,old] of [['gsv','GSV',current.gsvCents,previous.gsvCents],['sales','销量',current.sales,previous.sales],['netSales','销量',current.sales-current.returned,previous.sales-previous.returned]]){
  add(key,name,key==='gsv'?rpQualityMoney(value/100):formatSalesQuantity(value),value,'rp-quality-normal',rpQualityChange(value,old),rpQualityChangeTone(value,old),compareHint);
 }
 const marginChange=rpNetMarginComparison(now.profitRate,before.profitRate);
 add('margin','净利润率',upPercent(now.profitRate),now.profitRate,'rp-quality-normal',marginChange.target,marginChange.targetTone,rpLossMarginHint+'环比增长率＝（本期净利润率－上期净利润率）÷上期净利润率绝对值×100%。涨绿降红，不设10%灰色区间；持平和无可比数据灰色。');
 const loss=Math.min(0,now.profitCents),previousLoss=Math.min(0,before.profitCents);
 // 主值保留负号；环比比较亏损绝对值，减亏为下降，增亏为上涨。
 const lossChange=rpLossAmountComparison(current.gsvCents>0?loss:null,previous.gsvCents>0?previousLoss:null);
 add('loss','亏损金额',rpQualityMoney(loss/100),loss,'rp-quality-red',lossChange.target,lossChange.targetTone,'亏损金额主值保留负号；环比＝（本期亏损金额绝对值－上期亏损金额绝对值）÷上期亏损金额绝对值。减亏显示↓，增亏显示↑；上期取紧邻等长区间。涨红降绿，不设10%灰色区间；持平和无可比数据灰色。');
 // 单平台与汇总均使用各自目标；汇总目标按同期原始销量加权。
 const {returnTarget:totalTarget,receivedTarget}=upReturnTargets({product},{...w,platform});
 for(const [key,name,actual,target] of [['return','总退',current.returnRate,totalTarget],['received','已收退',current.receivedRate,receivedTarget]]){
  const rule=rpQualityReturnRule(actual,target,key);
  const hint=Number.isFinite(target)?'偏差＝实际退货率－目标。目标 '+upPercent(target)+'；'+rpReturnDeviationHint(key):'未配置对应退货率目标，不显示偏差。';
  add(key,name,upPercent(actual),actual,rule.tone,rule.target,rule.targetTone,hint);
 }
 add('total','总库存',stockQuantity(stock?.totalUnits),stock?.totalUnits??null,'rp-quality-normal','','','公司最新快照 '+DATA_CUTOFF+'：仓内＋工厂＋新机未交付；不按平台拆分。');
 // 卡片与抽屉总库存共用数量/货值两行，货值取同一公司库存快照。
 const total=fields.find(field=>field.key==='total');
 total.cardTarget='货值 '+(Number.isFinite(stock?.goodsValueCents)?rpQualityMoney(stock.goodsValueCents/100):'—');total.cardTargetTone='rp-quality-normal';
 total.target=total.cardTarget;total.targetTone=total.cardTargetTone;
 const totalDays=Number.isFinite(stock?.totalCoverage15)?stock.totalCoverage15:null;
 add('totalCoverage15','总可售天数',totalDays===null?'—':fmt(totalDays,1)+'天',totalDays,'rp-quality-normal','','','公司最新快照 '+DATA_CUTOFF+'：总库存÷近15日均净销量；公司全平台口径，不随经营平台或期间拆分。');
 add('value','货值（总库存）',stock?rpQualityMoney(stock.goodsValueCents/100):'—',stock?.goodsValueCents??null,'rp-quality-normal','','','公司总库存×含税含品牌财务价；快照 '+DATA_CUTOFF+'。');
 return [...fields,...rpQualityProductFields(record)];
}
