// 库存/呆滞展示只组合统一经营、库存和处罚台账，不改变入榜规则。
const rpStockCardKeys={3:['sellable','sellableCoverage15','total','totalCoverage15','dailyNet15'],4:['staleUnits','staleValue','age','warehouse','coverage15','dailyNet15']};
const rpStockListKeys={3:['sellable','sellableCoverage15','warehouse','factoryAvailable','transit','total','totalCoverage15','dailyNet15','gsv','netSales','margin','productType'],4:['staleUnits','staleValue','age','warehouse','coverage15','dailyNet15','season','productType']};
const rpStockEventCache=boundedCache(1200);
function rpStockEvents(product,start,end,platform){
 const key=[upRuleRevision,product.spuId,start,end,platform].join('|');
 let events=rpStockEventCache.get(key);
 if(!events){events=(platform==='all'?qrPlatforms:[platform]).flatMap(channel=>rpQualitySelectEvents(qrObservation(upProduct(product),channel,start,end).monthly,false));rpStockEventCache.set(key,events)}
 return events;
}
function rpShortageSkuFields(record){
 const known=Number.isFinite,days=record.totalCoverage15,daysText=known(days)?fmt(days,1)+'天':'—',tone=rpShortageTone(record),sellable=rpShortageSellableDays(record);
 const field=(key,name,value,raw,hint='',color='rp-quality-normal')=>({...rpField(key,name,value,color,hint,''),sortValue:raw,targetTone:''});
 const money=value=>known(value)?rpQualityMoney(value/100):'—';
 const inventory=(key,name,units,value,hint='')=>{
  const row=field(key,name,stockQuantity(units),units,hint);
  row.target=row.cardTarget='货值 '+money(value);row.targetTone=row.cardTargetTone='rp-quality-normal';return row;
 };
 const available=inventory('sellable','可售库存',record.sellableUnits,record.sellableValueCents,'我司可售库存＋在途库存＋工厂可售库存');
 const total=inventory('total','总库存',record.totalUnits,record.goodsValueCents,'SKU仓内＋工厂＋新机未交付');
 const warehouse=inventory('warehouse','我司可售库存',record.warehouse,record.warehouseValueCents);
 const factory=inventory('factoryAvailable','工厂可售库存',record.factoryAvailable,record.factoryAvailableValueCents);
 const transit=inventory('transit','在途库存',record.transit,record.transitValueCents);
 const performance=(key,name,value,before,format)=>{
  const row=field(key,name,known(value)?format(value):'—',known(value)?value:null,'所选期间SKU经营数据；环比取紧邻等长上期。');
  row.target=rpQualityChange(value,before);row.targetTone=rpQualityChangeTone(value,before);return row;
 };
 // SKU利润率缺失时保留空态，不读取继承的SPU利润率。
 const rate=known(record.skuProfitRate)?record.skuProfitRate:null,previous=known(record.skuPreviousProfitRate)?record.skuPreviousProfitRate:null;
 const margin=field('margin','利润率',rate===null?'—':upPercent(rate),rate),comparison=rpProfitRateComparison(rate,previous);
 margin.target=comparison.target;margin.targetTone=comparison.targetTone;
 const totalDays=field('totalCoverage15','总可售天数',daysText,days,'总库存÷近15日均净销量',tone);
 return [available,field('sellableCoverage15','可售天数',known(sellable)?fmt(sellable,1)+'天':'—',sellable,'（我司可售库存＋在途库存＋工厂可售库存）÷近15日均净销量',tone),
  warehouse,factory,transit,total,totalDays,
  field('dailyNet15','近15日均净销量',stockQuantity(Number.isFinite(record.dailyNet15)?Math.round(record.dailyNet15):null),record.dailyNet15,'近15日净销量÷15'),
  performance('gsv','GSV',record.skuGsvCents,record.skuPreviousGsvCents,money),
  performance('netSales','销量',record.skuNetSales,record.skuPreviousNetSales,value=>fmt(value)),margin,...rpQualityProductFields(record)];
}
function rpStagnantSkuFields(record){
 const tone=rpStagnantTone(record),known=Number.isFinite;
 const field=(key,name,value,raw,color='rp-quality-normal',hint='')=>({...rpField(key,name,value,color,hint,''),sortValue:raw,targetTone:'',noNumericSignal:true});
 const share=(part,total)=>known(part)&&known(total)&&total>0?upPercent(part/total*100):'—';
 const stale=field('staleUnits','呆滞库存',known(record.staleUnits)?stockQuantity(record.staleUnits):'—',record.staleUnits,known(record.staleUnits)?tone:'rp-quality-gray','SKU呆滞库存数量；占比为该SKU呆滞库存÷总库存');
 const amount=field('staleValue','呆滞货值',known(record.staleValueCents)?rpQualityMoney(record.staleValueCents/100):'—',record.staleValueCents,known(record.staleValueCents)?tone:'rp-quality-gray','呆滞库存对应货值');
 stale.target=stale.cardTarget='占比 '+share(record.staleUnits,record.totalUnits);stale.targetTone=stale.cardTargetTone=tone;
 amount.target=amount.cardTarget='占比 '+share(record.staleValueCents,record.goodsValueCents);amount.targetTone=amount.cardTargetTone=tone;
 const age=field('age','呆滞最高库龄',known(record.staleMaxAgeDays)?fmt(record.staleMaxAgeDays)+'天':'—',record.staleMaxAgeDays,'rp-quality-normal','仍有结余的呆滞库存批次最高库龄');
 age.target=age.cardTarget='库存 '+(known(record.staleOldestSellableUnits)?stockQuantity(record.staleOldestSellableUnits):'—');age.targetTone=age.cardTargetTone='rp-quality-normal';age.cardTargetHint='最高库龄对应的我司可售库存数量';
 const warehouse=field('warehouse','我司可售库存',stockQuantity(record.warehouse),record.warehouse);
 warehouse.target=warehouse.cardTarget='货值 '+(known(record.warehouseValueCents)?rpQualityMoney(record.warehouseValueCents/100):'—');warehouse.targetTone=warehouse.cardTargetTone='rp-quality-normal';
 return [stale,amount,age,warehouse,field('warehouseValue','我司可售货值',known(record.warehouseValueCents)?rpQualityMoney(record.warehouseValueCents/100):'—',record.warehouseValueCents),
  field('coverage15','我司可售天数',known(record.coverage15)?fmt(record.coverage15,1)+'天':'—',record.coverage15,tone,'我司可售库存÷近15日均净销量'),
  field('dailyNet15','近15日均净销量',stockQuantity(Number.isFinite(record.dailyNet15)?Math.round(record.dailyNet15):null),record.dailyNet15),...rpQualityProductFields(record)];
}
function rpStockFields(kind,record,current,previous){
 if(kind===4&&record.skuId)return rpStagnantSkuFields(record);
 if(kind===3&&record.skuId)return rpShortageSkuFields(record);
 const product=upIdentity(record),w=upWindow(),platform=kind===3?'all':record.metricPlatform||'all';
 const stock=kind===3?record:upPlatformStockFacts(record,platform),fields=[];
 const add=(key,name,value,raw,tone='rp-quality-normal',target='',targetTone='',hint='')=>{const field={...rpField(key,name,value,tone,hint,target),sortValue:raw,targetTone};fields.push(field);return field};
 const compareHint='环比取紧邻等长区间；'+rpComparisonRuleText();
 const ratio=stock.goodsValueCents>0?stock.staleValueCents/stock.goodsValueCents*100:0;
 if(kind===3){
  for(const [key,name,value,before] of [['gsv','GSV',current.gsvCents,previous.gsvCents],['sales','销量',current.sales,previous.sales],['netSales','销量',current.sales-current.returned,previous.sales-previous.returned]])add(key,name,key==='gsv'?rpQualityMoney(value/100):fmt(value),value,'rp-quality-normal',rpQualityChange(value,before),rpQualityChangeTone(value,before),compareHint);
  const change=rpProfitRateComparison(current.profitRate,previous.profitRate);
  add('margin','利润率',upPercent(current.profitRate),current.profitRate,'rp-quality-normal',change.target,change.targetTone,'所选期间利润额÷GSV；'+rpProfitRateComparisonRuleText());
  const target=rpLossReturnTarget(product,platform,w.start,w.end);
  for(const [key,name,actual,goal] of [['return','总退',current.returnRate,target],['received','已收退',current.receivedRate,null]]){
   const rule=rpQualityReturnRule(actual,goal,key);
   add(key,name,upPercent(actual),actual,rule.tone,rule.target,rule.targetTone,Number.isFinite(goal)?'偏差＝实际－目标；目标 '+upPercent(goal)+'；'+rpReturnDeviationHint(key)+'全平台总退目标按同期销量加权。':'消费者签收后发生的退货件数÷同期销量。');
  }
  const total=add('total','总库存',stockQuantity(stock.totalUnits),stock.totalUnits,'rp-quality-normal','','','公司库存：仓内＋工厂＋新机未交付，不按平台重复计算。');
  total.target='总可售天数 '+(Number.isFinite(stock.totalCoverage15)?fmt(stock.totalCoverage15,1)+'天':'—');total.targetTone='rp-quality-normal';
  total.cardTarget='货值 '+rpQualityMoney(stock.goodsValueCents/100);total.cardTargetTone='rp-quality-normal';
  add('totalCoverage15','总可售天数',Number.isFinite(stock.totalCoverage15)?fmt(stock.totalCoverage15,1)+'天':'—',stock.totalCoverage15,'rp-quality-red','','','总库存÷近15日均净销量；与库存管控缺货规则共用原值，显示保留一位小数。');
  const warehouse=add('warehouse','我司可售库存',stockQuantity(stock.warehouse),stock.warehouse);
  warehouse.cardTarget='货值 '+(Number.isFinite(stock.warehouseValueCents)?rpQualityMoney(stock.warehouseValueCents/100):'—');warehouse.cardTargetTone='rp-quality-normal';
  warehouse.cardTargetHint='我司可售库存对应货值，使用库存台账原值。';
  add('dailyNet15','近15日均净销量',Number.isFinite(stock.dailyNet15)?stockQuantity(Math.round(stock.dailyNet15)):'—',stock.dailyNet15,'rp-quality-normal','','','近15天（销量－总退件数）÷15；缺货判定使用未取整数值。');
  add('value','货值（总库存）',rpQualityMoney(stock.goodsValueCents/100),stock.goodsValueCents);
  add('turn','库存周转率',Number.isFinite(stock.turn)?fmt(stock.turn,1)+'次':'—',stock.turn,'rp-quality-normal','','','库存风险快照近30天出库成本÷平均库存成本。');
  add('staleRatio','呆滞占比',upPercent(ratio),ratio,'rp-quality-normal','','','超库龄货值÷总库存货值；没有呆滞库存时显示0。');
  const events=rpStockEvents(product,w.start,w.end,platform),old=rpStockEvents(product,previous.start,previous.end,platform);
  const frozen=events.filter(e=>e.type==='资金冻结'),amount=frozen.reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  add('frozen','资金冻结',rpQualityMoney(amount),amount,rpQualityAmountTone(amount),frozen.length+'次','rp-quality-gray','所选期间全原因冻结事件金额及次数，不作为实时冻结余额。');
  const offShelf=events.filter(e=>e.type==='下架').length,before=old.filter(e=>e.type==='下架').length;
  const comparison=rpCountComparison(offShelf,before);
  add('offShelf','链接下架',offShelf+'次',offShelf,'rp-quality-normal',comparison.target,comparison.targetTone,'上期取紧邻等长区间；'+rpCountComparisonRuleText());
 }else{
  const recent=upSummary(product,shiftDate(w.end,-14),w.end,platform),dailyNet=(recent.sales-recent.returned)/15;
  const stale=add('staleUnits','呆滞库存',stockQuantity(stock.staleUnits),stock.staleUnits,'rp-quality-red','','','呆滞批次数量合计；占比＝呆滞库存数量÷总库存数量。');
  stale.cardTarget='占比 '+upPercent(stock.totalUnits>0?stock.staleUnits/stock.totalUnits*100:0);stale.cardTargetTone='rp-quality-red';
  const staleValue=add('staleValue','呆滞货值',rpQualityMoney(stock.staleValueCents/100),stock.staleValueCents,'rp-quality-red','','','只计超库龄部分的库存货值。呆滞金额占比＝呆滞货值÷总库存货值。');
  staleValue.cardTarget='占比 '+upPercent(ratio);staleValue.cardTargetTone='rp-quality-red';
  const age=add('age','呆滞最高库龄',Number.isFinite(stock.staleMaxAgeDays)?fmt(stock.staleMaxAgeDays)+'天':'—',stock.staleMaxAgeDays??null,'rp-quality-normal','','','截至所选结束日距最早呆滞批次入库的天数；当前采用演示入库日期。');
  age.cardTarget='库存 '+(Number.isFinite(stock.staleOldestSellableUnits)?stockQuantity(stock.staleOldestSellableUnits):'—');
  age.cardTargetTone='rp-quality-normal';
  age.cardTargetHint='最高库龄对应的我司可售库存数量；同库龄批次合计，当前为演示批次样例。';
  // 三项二排指标在卡片与完整榜单共用同一数值及颜色。
  for(const field of [stale,staleValue,age]){field.target=field.cardTarget;field.targetTone=field.cardTargetTone}
  const warehouse=add('warehouse','我司可售库存',stockQuantity(stock.warehouse),stock.warehouse,'rp-quality-normal','','','我司可售＝聚量实体仓仓库库存＋京东仓库存，按公司库存快照统计，不按平台重复累计');
  const warehouseValueCents=Number.isFinite(stock.warehouseValueCents)?stock.warehouseValueCents:stock.warehouse*stock.financePriceCents;
  add('warehouseValue','我司可售货值',rpQualityMoney(warehouseValueCents/100),warehouseValueCents);
  const coverage=add('coverage15','我司可售天数',dailyNet>0?fmt(stock.warehouse/dailyNet,1)+'天':'—',dailyNet>0?stock.warehouse/dailyNet:null,'rp-quality-normal','','','公司可售库存÷所选平台近15日均净销量。库存保持公司口径。');
  warehouse.target=warehouse.cardTarget='货值 '+rpQualityMoney(warehouseValueCents/100);warehouse.targetTone=warehouse.cardTargetTone='rp-quality-normal';
  warehouse.cardTargetHint='我司可售库存数量×财务单价。';
  add('dailyNet15','近15日均净销量',stockQuantity(Math.round(dailyNet)),dailyNet,'rp-quality-normal','','','截至所选结束日近15天（销量－总退件数）÷15，按所选平台计算；显示四舍五入整数，可售天数仍使用未取整均值。');
 }
 return [...fields,...rpQualityProductFields(record)].map(field=>({...field,noNumericSignal:kind===4||/^stale/.test(field.key)}));
}
