// 亏损榜字段：经营指标跟随所选期间/平台，库存保持公司最新快照。
const rpLossCardKeys=['gsv','margin','loss','return','total'];
const rpLossListKeys=['gsv','sales','netSales','margin','loss','return','received','total','value','season','productType'];
const rpLossMarginHint='净利润率＝所选期间利润率－10个百分点。';
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
 let sales=0,weighted=0;
 for(const channel of upChannels(platform)){const n=upSummary(product,start,end,channel).sales;if(n>0){sales+=n;weighted+=n*qrbTarget(upProduct(product),channel)}}
 return sales?weighted/sales:null;
}
function rpLossMarginComparison(now,before){
 const raw=!Number.isFinite(now)||!Number.isFinite(before)?null:now===before?0:before===0?null:(now-before)/Math.abs(before)*100;
 return {target:rpComparisonText(raw),targetTone:rpComparisonTone(raw)};
}
function rpLossFields(record,current,previous){
 const product=upIdentity(record),w=upWindow(),platform=record.metricPlatform||'all',stock=rpLossStock(product);
 const now=upNetEstimate(current),before=upNetEstimate(previous),fields=[];
 const add=(key,name,value,raw,tone='rp-quality-normal',target='',targetTone='',hint='')=>fields.push({...rpField(key,name,value,tone,hint,target),sortValue:raw,targetTone});
 const compareHint='环比取紧邻等长区间；上涨绿色，跌幅≤10%灰色，跌幅>10%红色，持平灰色；上期缺失或为0且本期非0显示--；两期相同显示持平。';
 for(const [key,name,value,old] of [['gsv','GSV',current.gsvCents,previous.gsvCents],['sales','销量',current.sales,previous.sales],['netSales','去退后销量',current.sales-current.returned,previous.sales-previous.returned]]){
  add(key,name,key==='gsv'?rpQualityMoney(value/100):fmt(value),value,'rp-quality-normal',rpQualityChange(value,old),rpQualityChangeTone(value,old),compareHint);
 }
 const marginChange=rpLossMarginComparison(now.profitRate,before.profitRate);
 add('margin','净利润率',upPercent(now.profitRate),now.profitRate,'rp-quality-normal',marginChange.target,marginChange.targetTone,rpLossMarginHint+compareHint+'负利润率环比以其上期绝对值为分母。');
 const loss=Math.min(0,now.profitCents),lossRate=current.gsvCents>0?Math.abs(loss)/current.gsvCents*100:null;
 add('loss','亏损金额',rpQualityMoney(loss/100),loss,'rp-quality-red','亏损率 '+upPercent(lossRate),'rp-quality-red','亏损金额为负的测算净利额；亏损率＝亏损金额绝对值÷GSV。');
 const totalTarget=rpLossReturnTarget(product,platform,w.start,w.end);
 for(const [key,name,actual,target] of [['return','总退',current.returnRate,totalTarget],['received','已收退',current.receivedRate,8]]){
  const rule=rpQualityReturnRule(actual,target);
  add(key,name,upPercent(actual),actual,rule.tone,rule.target,rule.targetTone,'偏差＝实际退货率－目标。目标 '+upPercent(target)+'；正偏差小于目标×5%黄色，达到或超过红色；低于目标时主值正常色、负偏差绿色。'+(key==='return'&&platform==='all'?'全平台目标按同期销量加权。':''));
 }
 add('total','总库存',stock?fmt(stock.totalUnits):'—',stock?.totalUnits??null,'rp-quality-normal','','','公司最新快照 '+DATA_CUTOFF+'：仓内＋工厂＋新机未交付；不按平台拆分。');
 add('value','货值（总库存）',stock?rpQualityMoney(stock.goodsValueCents/100):'—',stock?.goodsValueCents??null,'rp-quality-normal','','','公司总库存×含税含品牌财务价；快照 '+DATA_CUTOFF+'。');
 return [...fields,...rpQualityProductFields(record)];
}
