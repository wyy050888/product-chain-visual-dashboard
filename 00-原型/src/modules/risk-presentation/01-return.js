// 退货恶化榜复用经营台账和品质处罚事件；展示调整不改变入榜规则。
const rpReturnCardKeys=['return','received','gsv','netSales'];
const rpReturnListKeys=['gsv','sales','netSales','margin','return','returnGrowth','received','receivedGrowth','season','productType'];
// 两项环比取原值最大值；同涨幅按SPU全平台近30天GSV排序。
function rpReturnRankGrowth(record){
 const deltas=[riskRateDelta(record.returnRate,record.previousRate),riskRateDelta(record.receivedRate,record.previousReceivedRate)].filter(Number.isFinite);
 return deltas.length?Math.max(...deltas):null;
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
// 环比取两期退货率之差，按页面约定以%展示，不改成相对增长率。
function rpReturnPeriodComparison(actual,previous){
 const delta=riskRateDelta(actual,previous),shown=Number.isFinite(delta)?Math.sign(delta)*Math.round(Math.abs(delta)*10)/10:null;
 const tone=shown===null||shown===0?'gray':shown>0?'red':'green';
 return {delta,tone:'rp-quality-'+(!Number.isFinite(actual)?'gray':shown>0?'red':'normal'),targetTone:'rp-quality-'+tone,
  target:rpSignedComparisonText(delta)};
}
// 标签背景复用入榜条件本身，以未取整差值判定，等于阈值不命中。
function rpReturnGrowthHighlighted(key,delta){
 const rule=key==='received'?'quality.worsenReceived':'quality.worsenReturn';
 return Number.isFinite(delta)&&brcResultKeyActive('quality-worsening',rule)&&brcMatch(rule,delta);
}
// 完整榜单比率下方保留实际减目标的偏差，环比仍用独立列；不改首页卡片。
function rpReturnListFields(fields,record){
 const targets=qrbReturnTargets(upIdentity(record),record.channel);
 return fields.map(field=>{
  if(!['return','received'].includes(field.key))return field;
  const rule=rpQualityReturnRule(field.sortValue,targets[field.key==='return'?'returnTarget':'receivedTarget'],field.key);
  return {...field,target:rule.target,targetTone:rule.targetTone,targetNumericSignal:false};
 });
}
function rpReturnFields(record,current,previous){
 const product=upIdentity(record),w=upWindow(),platform=record.channel;
 const observed=qrObservation(upProduct(product),platform,w.start,w.end);
 const events=rpQualitySelectEvents(observed.monthly,true);
 const earlier=rpQualityEvents(copyFactRecord(record,{platform}),previous.start,previous.end,true),fields=[];
 const add=(key,name,value,raw,tone='rp-quality-normal',target='',targetTone='',hint='')=>{const field={...rpField(key,name,value,tone,hint,target),sortValue:raw,targetTone};fields.push(field);return field};
 const compareHint='环比取当前周/月控件显示的上期区间；'+rpComparisonRuleText();
 for(const [key,name,now,before] of [['gsv','GSV',current.gsvCents,previous.gsvCents],['sales','销量',current.sales,previous.sales],['netSales','销量',current.sales-current.returned,previous.sales-previous.returned]])
  add(key,name,key==='gsv'?rpQualityMoney(now/100):fmt(now),now,'rp-quality-normal',rpQualityChange(now,before),rpQualityChangeTone(now,before),(key==='netSales'?'同期销量减总退件数。':'')+compareHint);
 const margin=rpProfitRateComparison(current.profitRate,previous.profitRate);
 add('margin','利润率',upPercent(current.profitRate),current.profitRate,'rp-quality-normal',margin.target,margin.targetTone,'所选期间利润额÷GSV；'+rpProfitRateComparisonRuleText());
 for(const [key,name,actual,before] of [['return','总退',current.returnRate,previous.returnRate],['received','已收退',current.receivedRate,previous.receivedRate]]){
  const comparison=rpReturnPeriodComparison(actual,before),highlight=rpReturnGrowthHighlighted(key,comparison.delta);
  add(key,name,upPercent(actual),actual,comparison.tone,comparison.target,comparison.targetTone,'环比＝本期退货率－上期退货率，以%展示。上期取当前周／月控件的对照区间；上升红色，下降绿色，持平和缺失灰色。').targetNumericSignal=highlight;
  add(key==='return'?'returnGrowth':'receivedGrowth',name+'环比',comparison.target.replace(/^环比 /,''),comparison.delta,comparison.targetTone,'','','两期稳定区间的退货率之差，以%展示；按未取整差值排序，缺失值置后。').noNumericSignal=!highlight;
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
function rpReturnCardColumns(){return '<div class="rp-quality-columns rp-return-columns">'+['总退','已收退','GSV','销量'].map(name=>'<span>'+netSalesLabel(name,name==='销量'?'netSales':'')+'</span>').join('')+'</div>'}
function rpReturnCardEntry(record,index){return rpProductCardEntry(6,record,index,rpReturnCardKeys,'rp-return')}
