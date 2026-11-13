// 退货恶化榜复用经营台账和品质处罚事件。
const rpReturnRateKeys=['return','received','unreceived'];
const rpReturnCardKeys=[...rpReturnRateKeys,'gsv'];
const rpReturnListKeys=[...rpReturnRateKeys.map(key=>key+'Growth'),'gsv','netSales','margin','productType'];
// 两项环比增长率取最大值，同涨幅按SPU全平台近30天GSV排序。
function rpReturnRankGrowth(record){
 const growths=[periodRateGrowth(record.returnRate,record.previousRate),periodRateGrowth(record.receivedRate,record.previousReceivedRate)].filter(Number.isFinite);
 return growths.length?Math.max(...growths):null;
}
function rpReturnRankRange(period){
 const range=period.start&&period.end?period:bounds(period);
 let end=period.reference||range.cutoff||range.end;
 // 周对比截至所选基准日；历史月截至该月末，当月截至当前基准日。
 if(period.comparisonMode==='month'&&range.end.slice(0,7)!==end.slice(0,7))end=range.end;
 return {start:shiftDate(end,-29),end};
}
function rpRankReturnRows(rows,period=periodFor('risk')){
 const range=rpReturnRankRange(period),periodSales=new Map();
 return rows.map((row,index)=>{
  const identity=upIdentity(row),key=identity.spuId;
  if(!periodSales.has(key))periodSales.set(key,upSummary(identity,range.start,range.end,'all').gsvCents);
  return {row,index,growth:rpReturnRankGrowth(row),sales:periodSales.get(key)};
 }).sort((a,b)=>{
  for(const key of ['growth','sales']){
   const av=Number.isFinite(a[key]),bv=Number.isFinite(b[key]);
   if(av!==bv)return av?-1:1;
   if(av&&Math.abs(b[key]-a[key])>1e-9)return b[key]-a[key];
  }
  return a.index-b.index;
 }).map(entry=>entry.row);
}
// 按两期退货率的相对增长率展示和排序。
function rpReturnPeriodComparison(actual,previous){
 const growth=periodRateGrowth(actual,previous),shown=Number.isFinite(growth)?Math.sign(growth)*Math.round(Math.abs(growth)*10)/10:null;
 const tone=shown===null||shown===0?'gray':shown>0?'red':'green';
 return {growth,tone:'rp-quality-'+(!Number.isFinite(actual)?'gray':shown>0?'red':'normal'),targetTone:'rp-quality-'+tone,
  target:'环比 '+periodRateGrowthText(growth)};
}
// 退货增长预警使用未取整增长率，等于阈值不命中。
function rpReturnGrowthHighlighted(key,growth){
 const rule=key==='received'?'quality.worsenReceived':'quality.worsenReturn';
 return Number.isFinite(growth)&&brcResultKeyActive('quality-worsening',rule)&&brcMatch(rule,growth);
}
function rpReturnFields(record,current,previous){
 const product=upIdentity(record),w=upWindow(),platform=record.channel;
 const observed=qrObservation(upProduct(product),platform,w.start,w.end);
 const events=rpQualitySelectEvents(observed.monthly,true);
 const earlier=rpQualityEvents(copyFactRecord(record,{platform}),previous.start,previous.end,true),fields=[];
 const add=(key,name,value,raw,tone='rp-quality-normal',target='',targetTone='',hint='')=>{const field={...rpField(key,name,value,tone,hint,target),sortValue:raw,targetTone};fields.push(field);return field};
 const compareHint='环比取当前周/月控件显示的上期区间；'+rpComparisonRuleText();
 for(const [key,name,now,before] of [['gsv','GSV',current.gsvCents,previous.gsvCents],['sales','销量',current.sales,previous.sales],['netSales','销量',current.sales-current.returned,previous.sales-previous.returned]])
  add(key,name,key==='gsv'?rpQualityMoney(now/100):formatSalesQuantity(now),now,'rp-quality-normal',rpQualityChange(now,before),rpQualityChangeTone(now,before),(key==='netSales'?'同期销量减总退件数。':'')+compareHint);
 const margin=rpProfitRateComparison(current.profitRate,previous.profitRate);
 add('margin','利润率',upPercent(current.profitRate),current.profitRate,'rp-quality-normal',margin.target,margin.targetTone,'所选期间利润额÷GSV；'+rpProfitRateComparisonRuleText());
 for(const [key,name,actual,before] of [
  ['return','总退',current.returnRate,previous.returnRate],
  ['received','已收退',current.receivedRate,previous.receivedRate],
  ['unreceived','未收退',upUnreceivedRate(current),upUnreceivedRate(previous)]
 ]){
  const comparison=rpReturnPeriodComparison(actual,before),actualText=upPercent(actual);
  const field=add(key,name,actualText,actual,comparison.tone,comparison.target,comparison.targetTone,'环比增长率＝（本期比率－上期比率）÷上期比率×100%。上期为0或任一期缺失时显示—。上期取当前周／月控件的对照区间。');
  field.cardComparisonFirst=true;
  add(key+'Growth',name+'环比',comparison.target.replace(/^环比 /,''),comparison.growth,comparison.targetTone,'实际 '+actualText,'rp-quality-gray',field.hint).noNumericSignal=true;
 }
 for(const [key,name,type] of [['fine','平台罚款','罚款'],['frozen','资金冻结','资金冻结']]){
  const list=events.filter(e=>e.type===type),amount=list.reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  add(key,name,rpQualityMoney(amount),amount,rpQualityAmountTone(amount),list.length+'次','rp-quality-gray','所选期间品质原因'+name+'事件金额与次数；冻结事件金额不作为实时余额。');
 }
 const count=events.filter(e=>e.type==='下架').length,before=earlier.filter(e=>e.type==='下架').length;
 const comparison=rpCountComparison(count,before);
 add('offShelf','链接下架',count+'次',count,'rp-quality-normal',comparison.target,comparison.targetTone,'所选期间品质原因下架次数，不合并掉权。上期取当前周/月控件显示的对照区间；'+rpCountComparisonRuleText());
 return [...fields,...rpQualityProductFields(record)].map(field=>rpViolationField(field,platform));
}
function rpReturnCardEntry(record,index){return rpProductCardEntry(6,record,index,rpReturnCardKeys,'rp-return')}
