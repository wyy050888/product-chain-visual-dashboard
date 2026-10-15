// 库存/呆滞展示只组合统一经营、库存和处罚台账，不改变入榜规则。
const rpStockCardKeys={3:['gsv','margin','return','total','turn'],4:['staleUnits','staleValue','age','warehouse','dailyNet15']};
const rpStockListKeys={3:['gsv','sales','netSales','margin','return','received','total','value','turn','staleRatio','frozen','offShelf','season','productType'],4:['staleUnits','staleValue','age','warehouse','warehouseValue','coverage15','dailyNet15','season','productType']};
const rpStockEventCache=boundedCache(1200);
function rpStockEvents(product,start,end,platform){
 const key=[upRuleRevision,product.spuId,start,end,platform].join('|');
 let events=rpStockEventCache.get(key);
 if(!events){events=(platform==='all'?qrPlatforms:[platform]).flatMap(channel=>rpQualitySelectEvents(qrObservation(upProduct(product),channel,start,end).monthly,false));rpStockEventCache.set(key,events)}
 return events;
}
function rpStockFields(kind,record,current,previous){
 const product=upIdentity(record),w=upWindow(),platform=kind===3?'all':record.metricPlatform||'all';
 const stock=kind===3?record:upPlatformStockFacts(record,platform),fields=[];
 const add=(key,name,value,raw,tone='rp-quality-normal',target='',targetTone='',hint='')=>{const field={...rpField(key,name,value,tone,hint,target),sortValue:raw,targetTone};fields.push(field);return field};
 const compareHint='环比取紧邻等长区间，上涨绿色，跌幅≤10%灰色，跌幅>10%红色，持平灰色；上期缺失或为0且本期非0显示--；两期相同显示持平。';
 const ratio=stock.goodsValueCents>0?stock.staleValueCents/stock.goodsValueCents*100:0;
 if(kind===3){
  for(const [key,name,value,before] of [['gsv','GSV',current.gsvCents,previous.gsvCents],['sales','销量',current.sales,previous.sales],['netSales','去退后销量',current.sales-current.returned,previous.sales-previous.returned]])add(key,name,key==='gsv'?rpQualityMoney(value/100):fmt(value),value,'rp-quality-normal',rpQualityChange(value,before),rpQualityChangeTone(value,before),compareHint);
  const change=rpLossMarginComparison(current.profitRate,previous.profitRate);
  add('margin','利润率',upPercent(current.profitRate),current.profitRate,'rp-quality-normal',change.target,change.targetTone,'所选期间利润额÷GSV；负利润率环比以上期绝对值为分母。'+compareHint);
  const target=rpLossReturnTarget(product,platform,w.start,w.end);
  for(const [key,name,actual,goal] of [['return','总退',current.returnRate,target],['received','已收退',current.receivedRate,8]]){
   const rule=rpQualityReturnRule(actual,goal);
   add(key,name,upPercent(actual),actual,rule.tone,rule.target,rule.targetTone,'偏差＝实际－目标；目标 '+upPercent(goal)+'，正偏差小于目标×5%黄色，达到或超过红色；负偏差绿色，主值正常色。全平台总退目标按同期销量加权，已收退沿用8%演示目标。');
  }
  const total=add('total','总库存',fmt(stock.totalUnits),stock.totalUnits,'rp-quality-normal','','','公司库存：仓内＋工厂＋新机未交付，不按平台重复计算。');
  total.cardTarget='呆滞占比 '+upPercent(ratio);total.cardTargetTone='rp-quality-red';
  add('value','货值（总库存）',rpQualityMoney(stock.goodsValueCents/100),stock.goodsValueCents);
  add('turn','库存周转率',Number.isFinite(stock.turn)?fmt(stock.turn,1)+'次':'—',stock.turn,'rp-quality-normal','','','库存风险快照近30天出库成本÷平均库存成本。');
  add('staleRatio','呆滞占比',upPercent(ratio),ratio,'rp-quality-normal','','','超库龄货值÷总库存货值；没有呆滞库存时显示0。');
  const events=rpStockEvents(product,w.start,w.end,platform),old=rpStockEvents(product,previous.start,previous.end,platform);
  const frozen=events.filter(e=>e.type==='资金冻结'),amount=frozen.reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  add('frozen','资金冻结',rpQualityMoney(amount),amount,rpQualityAmountTone(amount),frozen.length+'次','rp-quality-gray','所选期间全原因冻结事件金额及次数，不作为实时冻结余额。');
  const offShelf=events.filter(e=>e.type==='下架').length,before=old.filter(e=>e.type==='下架').length;
  add('offShelf','链接下架',offShelf+'次',offShelf,'rp-quality-normal',rpQualityChange(offShelf,before),rpQualityChangeTone(offShelf,before),compareHint);
 }else{
  const recent=upSummary(product,shiftDate(w.end,-14),w.end,platform),dailyNet=(recent.sales-recent.returned)/15;
  const stale=add('staleUnits','呆滞库存',fmt(stock.staleUnits),stock.staleUnits,'rp-quality-normal','','','沿用超库龄库存样例数量，按原超库龄货值比例折算；正式数量需批次台账。呆滞占比＝呆滞库存数量÷总库存数量。');
  stale.cardTarget='呆滞占比 '+upPercent(stock.totalUnits>0?stock.staleUnits/stock.totalUnits*100:0);stale.cardTargetTone='rp-quality-red';
  const staleValue=add('staleValue','呆滞库存金额',rpQualityMoney(stock.staleValueCents/100),stock.staleValueCents,'rp-quality-normal','','','只计超库龄部分的库存货值。呆滞金额占比＝呆滞库存金额÷总库存货值。');
  staleValue.cardTarget='呆滞金额占比 '+upPercent(ratio);staleValue.cardTargetTone='rp-quality-red';
  const age=add('age','呆滞最高库龄',Number.isFinite(stock.staleMaxAgeDays)?fmt(stock.staleMaxAgeDays)+'天':'—',stock.staleMaxAgeDays??null,'rp-quality-normal','','','截至所选结束日距最早呆滞批次入库的天数；当前采用演示入库日期。');
  age.cardTarget='库存 '+(Number.isFinite(stock.staleOldestSellableUnits)?fmt(stock.staleOldestSellableUnits):'—');
  age.cardTargetTone='rp-quality-normal';
  age.cardTargetHint='最高库龄对应的我司可售库存数量；同库龄批次合计，当前为演示批次样例。';
  // 三项二排指标在卡片与完整榜单共用同一数值及颜色。
  for(const field of [stale,staleValue,age]){field.target=field.cardTarget;field.targetTone=field.cardTargetTone}
  const warehouse=add('warehouse','我司可售库存',fmt(stock.warehouse),stock.warehouse,'rp-quality-normal','','','当前样例以公司仓内库存作为可售库存；未提供锁定或不可售库存明细。');
  add('warehouseValue','货值（我司可售库存）',rpQualityMoney(stock.warehouse*stock.financePriceCents/100),stock.warehouse*stock.financePriceCents);
  const coverage=add('coverage15','我司可售天数',dailyNet>0?fmt(stock.warehouse/dailyNet,1)+'天':'—',dailyNet>0?stock.warehouse/dailyNet:null,'rp-quality-normal','','','公司可售库存÷所选平台近15日均净销量；无正净销量时显示—。库存保持公司口径。');
  warehouse.cardTarget='可售天数 '+coverage.value;warehouse.cardTargetTone='rp-quality-normal';
  warehouse.cardTargetHint=coverage.hint;
  add('dailyNet15','近15日均净销量',fmt(Math.round(dailyNet)),dailyNet,'rp-quality-normal','','','截至所选结束日近15天（销量－总退件数）÷15，按所选平台计算；显示四舍五入整数，可售天数仍使用未取整均值。');
 }
 return [...fields,...rpQualityProductFields(record)];
}
