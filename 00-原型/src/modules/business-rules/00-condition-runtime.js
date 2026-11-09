// 条件是判定真值来源；数值投影只供公式、目标、旧图表和兼容数据读取。
function brcConditions(){
 if(typeof brcSaved!=='undefined'&&brcSaved.conditions)return brcSaved.conditions;
 const values=Object.fromEntries(brcDefinitions.map(r=>[r.key,typeof brcNumber==='function'?brcNumber(r.key):r.value]));return brcDefaultConditions(values);
}
function brcMatch(key,value,context={}){const metric=brcMetricConfig(key).default;return brcPredicateTest(brcConditions()[key],metric,{...context,[metric]:value})}
// 三种天数共用近15日均净销量；组成缺失不当作0，无正净销量不计算天数。
function brcStockMetrics(stock){
 const valid=value=>Number.isFinite(value)&&value>=0,daily=stock.dailyNet15;
 if(daily!==undefined&&(!Number.isFinite(daily)||daily<=0))return {coverage15:null,sellableCoverage15:null,totalCoverage15:null};
 const days=units=>valid(units)&&Number.isFinite(daily)&&daily>0?units/daily:null;
 const parts=[stock.warehouse,stock.transit,stock.factoryAvailable];
 const sellable=valid(stock.sellableUnits)?stock.sellableUnits:parts.every(valid)?parts.reduce((sum,value)=>sum+value,0):null;
 return {coverage15:valid(stock.coverage15)?stock.coverage15:days(stock.warehouse),
  sellableCoverage15:valid(stock.sellableCoverage15)?stock.sellableCoverage15:days(sellable),
  totalCoverage15:valid(stock.totalCoverage15)?stock.totalCoverage15:days(stock.totalUnits)};
}
function brcStockRuleMatch(key,stock){const metrics=brcStockMetrics(stock);return brcMatch(key,metrics[key==='stock.shortDays'?'totalCoverage15':'coverage15'],metrics)}
function brcStockStagnant(stock){
 const positiveSales=stock.dailyNet15===undefined?Number.isFinite(stock.coverage15):Number.isFinite(stock.dailyNet15)&&stock.dailyNet15>0;
 return Number.isFinite(stock.warehouse)&&stock.warehouse>0&&positiveSales&&brcStockRuleMatch('stock.slowDays',stock);
}
function brcStockRuleText(key){return brcNamedConditionText(key,brcConditions()[key])}
function brcStockWarningMetrics(stock,excluded=false){
 const days=brcStockMetrics(stock);
 // 台账明确给出空天数时保留缺失；不以推算值覆盖数据源的空值。
 if(Number.isFinite(stock.dailyNet15)&&stock.dailyNet15>0)for(const key of Object.keys(days))if(Object.hasOwn(stock,key))days[key]=Number.isFinite(stock[key])&&stock[key]>=0?stock[key]:null;
 return {...days,warehouse:Number.isFinite(stock.warehouse)?stock.warehouse:null,netSales15:Number.isFinite(stock.dailyNet15)?Math.round(stock.dailyNet15*15):null,excluded:excluded?1:0};
}
function brcStockWarningRuleText(key){return brcNamedConditionText(key,brcConditions()[key])}
function brcStockWarningPrimary(key,stock){
 const first=c=>c?.conditions?first(c.conditions[0]):c,metric=brcTermMetric(key,first(brcConditions()[key]));
 return {name:metric.label,value:brcStockWarningMetrics(stock)[metric.id]};
}
function brcDescribe(key,unit){const item=brcEditorByKey.get(key);return brcPredicateText(key,brcConditions()[key],unit??item?.unit??'')}
function brcBandTone(id,value,context={}){
 const band=brcBands.find(b=>b.id===id);if(!band||band.style!=='score'&&!Number.isFinite(value))return 'gray';
 const conditions=brcConditions();
 for(const [index,key] of band.keys.entries())if(band.style==='score'?brcPredicateTest(conditions[key],'value',{...context,value:Number.isFinite(value)?value:null}):brcTestCondition(conditions[key],value))return band.tones[index];
 return 'gray';
}
function brcBandRows(id){const band=brcBands.find(b=>b.id===id);return band?band.keys.map((key,index)=>({tone:band.tones[index],label:brcEditorByKey.get(key).label,text:brcDescribe(key)})):[]}
function brcBandText(id){return brcBandRows(id).map(r=>r.label+'：'+r.text).join('；')}
function brcGradeKeys(level){return {sales:'grades.'+level+'.'+(level==='C'?'salesBelow':'salesAbove'),profit:'grades.'+level+'.'+(['A','C'].includes(level)?'profitBelow':'profitAbove')}}
// 图片规范按月销配置；近30天/月沿用月门槛，季/年换算，利润率不缩放。
function brcGradeFactor(mode='quarter'){return mode==='year'?12:mode==='quarter'?3:1}
function brcGradeCondition(key,mode='quarter'){
 const scale=c=>{const next=brcCloneCondition(c);if(next.conditions)next.conditions=next.conditions.map(scale);else if((next.metric||brcMetricConfig(key).default)==='gsv'&&Number.isFinite(next.a))next.a*=brcGradeFactor(mode);return next};return scale(brcConditions()[key]);
}
function brcProductGrade(sales,profit,mode='quarter'){
 if(!Number.isFinite(sales))return null;
 return ['S','A','B','C'].find(level=>brcGradeSalesRanges(level,null,mode).some(range=>brcRangeHas(range,sales)))||null;
}
function brcGradeConditionText(key,mode='quarter',unit){
 const condition=brcMapCondition(brcGradeCondition(key,mode),value=>Math.round(value*1000000)/1000000);
 return brcPredicateText(key,condition,unit??brcEditorByKey.get(key)?.unit??'');
}
function brcGradeDescription(level,mode='quarter'){return 'GSV'+brcConditionText(brcRangesCondition(brcGradeSalesRanges(level,null,mode)),'万元')}
function brcGradeRegions(level,conditions=null,mode='quarter'){
 return brcGradeSalesRanges(level,conditions,mode).map(gsv=>({gsv}));
}
function brcGradeRules(mode='quarter'){
 const universe={lo:-Infinity,hi:Infinity,lc:false,hc:false};
 return Object.fromEntries(['S','A','B','C'].map(level=>{
  const regions=brcGradeRegions(level,null,mode).map(box=>({sales:box.gsv||universe,profit:box.profitRate||universe})),rule={regions};
  for(const axis of ['sales','profit']){const ranges=brcMergeRanges(regions.map(region=>region[axis]));rule[axis+'Ranges']=ranges;if(Number.isFinite(ranges[0]?.lo))rule[axis+'Above']=ranges[0].lo;if(Number.isFinite(ranges.at(-1)?.hi))rule[axis+'Below']=ranges.at(-1).hi;}
  return [level,rule];
 }));
}
function brcProjectValues(values,conditions){
 const next={...values};
 for(const item of brcEditorItems){
  if(item.kind!=='condition'||!item.legacy)continue;const c=conditions[item.key];if(c.op==='else')continue;
  const metric=brcMetricConfig(item.key).default,terms=brcConditionTerms(c).filter(term=>!term.metric||term.metric===metric);if(!terms.length)continue;const range=brcInterval(c.op==='all'||c.op==='any'?{op:c.op,conditions:terms}:terms[0]),bound=item.anchor==='b'?range.hi:range.lo;
  next[item.legacy]=Number.isFinite(bound)?bound:Number.isFinite(range.hi)?range.hi:terms[0]?.a;
  if(item.aliases?.length&&Number.isFinite(range.hi))next[item.aliases[0]]=range.hi;
 }
 return next;
}
function brcLinkBandBoundary(key,before,after,conditions){
 const item=brcEditorByKey.get(key),cycle=brcRefurbCycleKeys.includes(key);if((!item?.band&&!cycle)||before.op==='else'||after.op==='else')return;
 const score=item.band?.startsWith('score.'),scoreMetrics=score?brcScoreMetrics(before):[];
 if(score&&(scoreMetrics.length!==1||brcScoreMetrics(after).length!==1||brcScoreMetrics(after)[0]!==scoreMetrics[0]))return;
 const oldRanges=brcRanges(before),newRanges=brcRanges(after);if(oldRanges.length!==1||newRanges.length!==1)return;
 const oldRange=oldRanges[0],newRange=newRanges[0],band=cycle?{keys:brcRefurbCycleKeys}:brcBands.find(b=>b.id===item.band);
 for(const peerKey of band.keys.filter(k=>k!==key)){
  const peer=brcNormalizeCondition(conditions[peerKey]);if(!peer||['else','any'].includes(peer.op))continue;const terms=brcConditionTerms(peer);
  for(const term of terms){
   if(score&&(term.metric||'value')!==scoreMetrics[0])continue;
   if(['lt','lte'].includes(term.op)&&Number.isFinite(oldRange.lo)&&Number.isFinite(newRange.lo)&&term.a===oldRange.lo){term.a=newRange.lo;term.op=newRange.lc?'lt':'lte';}
   if(['gt','gte'].includes(term.op)&&Number.isFinite(oldRange.hi)&&Number.isFinite(newRange.hi)&&term.a===oldRange.hi){term.a=newRange.hi;term.op=newRange.hc?'gt':'gte';}
  }
  conditions[peerKey]=peer.op==='all'?{...peer,conditions:terms}:terms[0];
 }
}

// 相对目标的差额用于店铺连续两期退货判断；零目标正值仍可判定。
function brcRelativeExcess(actual,target){return target>0?(actual-target)/target*100:actual>0?Infinity:null}
