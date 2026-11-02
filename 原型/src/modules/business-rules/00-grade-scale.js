// 规模等级只读GSV条件；利润条件独立用于经营标签，缺失利润不影响规模评级。
const brcGradeScaleCache=new WeakMap();
function brcNormalizeGradeAxes(conditions,defaults){
 for(const key of Object.keys(defaults).filter(key=>key.startsWith('grades.'))){
  const metric=key.includes('.sales')?'gsv':'profitRate';
  const keep=c=>c?.conditions?{...c,conditions:c.conditions.map(keep).filter(Boolean)}:c&&(!c.metric||c.metric===metric)?c:null;
  const next=keep(conditions[key]);
  conditions[key]=next&&brcPredicateBoxes(next,metric).some(box=>box[metric])?next:defaults[key];
 }
}
function brcGradeSalesRanges(level,conditions=null,mode='month'){
 const source=conditions||brcConditions(),order=['S','A','B','C'];
 let cache=brcGradeScaleCache.get(source);if(!cache){cache=new Map();brcGradeScaleCache.set(source,cache)}
 const cacheKey=mode+':'+level;if(cache.has(cacheKey))return cache.get(cacheKey);
 const ranges=grade=>{
  const key=brcGradeKeys(grade).sales;
  const keep=c=>c?.conditions?{op:c.op,conditions:c.conditions.map(keep).filter(Boolean)}:c&&(!c.metric||c.metric==='gsv')?{...c,metric:'gsv'}:null;
  const c=keep(source[key]);
  if(!c)return [];
  return brcPredicateBoxes(brcMapCondition(c,value=>value*brcGradeFactor(mode)),'gsv').map(box=>box.gsv).filter(Boolean);
 };
 // 自定义区间若重叠，沿用S→A→B→C的优先级；图表与判定使用同一有效区间。
 const higher=order.slice(0,order.indexOf(level)).flatMap(ranges),remaining=brcRangesComplement(higher);
 const result=brcMergeRanges(ranges(level).flatMap(a=>remaining.map(b=>brcRangeIntersection(a,b)).filter(Boolean)));
 cache.set(cacheKey,result);return result;
}
function brcProductOperatingMatch(level,profit){
 return Number.isFinite(profit)&&brcPredicateTest(brcConditions()[brcGradeKeys(level).profit],'profitRate',{profitRate:profit});
}
