// 纯区间运算：包含等号、交集和覆盖校验共用同一套边界规则。
const brcEpsilon=1e-9;
function brcLeafInterval(c){
 if(c.op==='between')return {lo:c.a,hi:c.b,lc:c.lower,hc:c.upper};
 if(c.op==='eq')return {lo:c.a,hi:c.a,lc:true,hc:true};
 if(c.op==='gt'||c.op==='gte')return {lo:c.a,hi:Infinity,lc:c.op==='gte',hc:false};
 if(c.op==='lt'||c.op==='lte')return {lo:-Infinity,hi:c.a,lc:false,hc:c.op==='lte'};
 return {lo:-Infinity,hi:Infinity,lc:false,hc:false};
}
function brcRangeHas(r,x){return (x>r.lo+brcEpsilon||r.lc&&Math.abs(x-r.lo)<=brcEpsilon||r.lo===-Infinity)&&(x<r.hi-brcEpsilon||r.hc&&Math.abs(x-r.hi)<=brcEpsilon||r.hi===Infinity)}
function brcRangeIntersection(a,b){
 const lo=Math.max(a.lo,b.lo),hi=Math.min(a.hi,b.hi),lc=(lo!==a.lo||a.lc)&&(lo!==b.lo||b.lc),hc=(hi!==a.hi||a.hc)&&(hi!==b.hi||b.hc);
 return lo<hi-brcEpsilon||Math.abs(lo-hi)<=brcEpsilon&&lc&&hc?{lo,hi,lc,hc}:null;
}
// 条件组仅有一层且/或关系，避免混合优先级；兼容旧版区间存储。
function brcCloneCondition(c){return c&&typeof c==='object'?{...c,...(Array.isArray(c.conditions)?{conditions:c.conditions.map(brcCloneCondition)}:{})}:c}
function brcNormalizeCondition(c){
 if(c?.op==='between'&&typeof c.lower==='boolean'&&typeof c.upper==='boolean'&&c.a<c.b)return {op:'all',conditions:[{op:c.lower?'gte':'gt',a:c.a},{op:c.upper?'lte':'lt',a:c.b}]};
 return brcCloneCondition(c);
}
function brcConditionTerms(c){c=brcNormalizeCondition(c);return ['all','any'].includes(c?.op)?c.conditions||[]:c?.op==='else'?[]:[c]}
function brcMergeRanges(ranges){
 const sorted=ranges.filter(Boolean).sort((a,b)=>a.lo-b.lo||Number(b.lc)-Number(a.lc)),out=[];
 for(const next of sorted){const last=out.at(-1);if(!last||next.lo>last.hi+brcEpsilon||Math.abs(next.lo-last.hi)<=brcEpsilon&&!next.lc&&!last.hc){out.push({...next});continue}if(next.hi>last.hi){last.hi=next.hi;last.hc=next.hc}else if(next.hi===last.hi)last.hc=last.hc||next.hc;}
 return out;
}
function brcRanges(condition){
 const c=brcNormalizeCondition(condition);if(!c||c.op==='else')return [];
 if(['all','any'].includes(c.op)){
  if(!Array.isArray(c.conditions))return [];if(!c.conditions.length)return c.op==='all'?[{lo:-Infinity,hi:Infinity,lc:false,hc:false}]:[];
  if(c.op==='any')return brcMergeRanges(c.conditions.flatMap(brcRanges));
  return c.conditions.reduce((ranges,term)=>brcMergeRanges(ranges.flatMap(a=>brcRanges(term).map(b=>brcRangeIntersection(a,b)))),[{lo:-Infinity,hi:Infinity,lc:false,hc:false}]);
 }
 return ['gt','gte','lt','lte','eq'].includes(c.op)&&Number.isFinite(c.a)?[brcLeafInterval(c)]:[];
}
// 包络仅用于旧数值兼容投影；实际判定、冲突及图表分区使用完整区间集。
function brcInterval(c){const ranges=brcRanges(c);return ranges.length?{...ranges[0],hi:ranges.at(-1).hi,hc:ranges.at(-1).hc}:{lo:Infinity,hi:-Infinity,lc:false,hc:false}}
function brcConditionsOverlap(a,b){return brcRanges(a).some(x=>brcRanges(b).some(y=>brcRangeIntersection(x,y)))}
function brcTestCondition(c,x){return typeof x==='number'&&!Number.isNaN(x)&&brcRanges(c).some(range=>brcRangeHas(range,x))}
function brcJoinConditionText(c,render){return c.conditions.map(term=>{const text=render(term);return term.conditions&&term.conditions.length>1&&term.op!==c.op?'（'+text+'）':text}).join(c.op==='all'?' 且 ':' 或 ')}
function brcConditionText(condition,unit=''){
 const c=brcNormalizeCondition(condition);if(!c)return '—';if(c.op==='else')return '其余情况';
 if(['all','any'].includes(c.op))return brcJoinConditionText(c,term=>brcConditionText(term,unit));
 if(!Number.isFinite(c.a))return '—';return ({gt:'＞',gte:'≥',lt:'＜',lte:'≤',eq:'＝'})[c.op]+String(Number(c.a))+unit;
}
function brcCoversLine(conditions){
 if(conditions.some(c=>c.op==='else'))return true;
 const ranges=brcMergeRanges(conditions.flatMap(brcRanges));return ranges.length===1&&ranges[0].lo===-Infinity&&ranges[0].hi===Infinity;
}
function brcSameCondition(a,b){return JSON.stringify(brcNormalizeCondition(a))===JSON.stringify(brcNormalizeCondition(b))}
function brcCopyConditions(conditions){return Object.fromEntries(Object.entries(conditions).map(([key,c])=>[key,brcNormalizeCondition(c)]))}
function brcMapCondition(condition,transform){const c=brcCloneCondition(condition);if(Array.isArray(c?.conditions))c.conditions=c.conditions.map(term=>brcMapCondition(term,transform));else if(c)for(const bound of ['a','b'])if(Number.isFinite(c[bound]))c[bound]=transform(c[bound]);return c}

// 多指标条件用各指标区间的笛卡尔积表达，且取交、或取并，避免不同单位混算。
function brcBoxIntersection(a,b){
 const box={...a};for(const [metric,range] of Object.entries(b)){const next=box[metric]?brcRangeIntersection(box[metric],range):range;if(!next)return null;box[metric]=next}return box;
}
function brcPredicateBoxes(condition,defaultMetric){
 const c=brcNormalizeCondition(condition);if(!c||c.op==='else')return [];
 if(c.op==='any')return c.conditions.flatMap(term=>brcPredicateBoxes(term,defaultMetric));
 if(c.op==='all')return c.conditions.reduce((boxes,term)=>boxes.flatMap(a=>brcPredicateBoxes(term,defaultMetric).map(b=>brcBoxIntersection(a,b)).filter(Boolean)),[{}]);
 return brcRanges(c).map(range=>({[c.metric||defaultMetric]:range}));
}
function brcPredicateTest(condition,defaultMetric,values){
 const c=brcNormalizeCondition(condition);if(!c||c.op==='else')return false;
 if(c.op==='all')return c.conditions.every(term=>brcPredicateTest(term,defaultMetric,values));
 if(c.op==='any')return c.conditions.some(term=>brcPredicateTest(term,defaultMetric,values));
 return brcTestCondition(c,values[c.metric||defaultMetric]);
}
function brcMetricConditionText(metric,condition){return metric?.valueType==='boolean'&&condition.op==='eq'?Number.isFinite(condition.a)?'＝'+(condition.a===1?'是':'否'):'—':brcConditionText(condition,metric?.unit||'')}
function brcPredicateText(key,condition,unit){
 const config=brcMetricConfig(key),terms=brcConditionTerms(condition);
 if(!terms.some(term=>brcTermMetric(key,term)?.valueType==='boolean'||term.metric&&term.metric!==config.default))return brcConditionText(condition,unit??config.choices.find(m=>m.id===config.default).unit);
 const text=c=>['all','any'].includes(c.op)?brcJoinConditionText(c,text):c.op==='else'?'其余情况':(brcTermMetric(key,c)?.label||'—')+brcMetricConditionText(brcTermMetric(key,c),c);
 return text(brcNormalizeCondition(condition));
}

function brcNamedConditionText(key,condition,labels={}){
 const text=c=>['all','any'].includes(c.op)?brcJoinConditionText(c,text):c.op==='else'?'其余情况':(()=>{const metric=brcTermMetric(key,c);return (labels[metric?.id]||metric?.label||'—')+brcMetricConditionText(metric,c)})();
 return text(brcNormalizeCondition(condition));
}

// 将旧兜底分段转换为其他分段的精确补集，保留开闭边界及多个不连续区间。
function brcRangesComplement(ranges){
 const gaps=[];let lo=-Infinity,lc=false;
 for(const range of brcMergeRanges(ranges)){
  if(range.lo!==-Infinity&&(lo<range.lo||lo===range.lo&&lc&&!range.lc))gaps.push({lo,hi:range.lo,lc,hc:!range.lc});
  lo=range.hi;lc=!range.hc;if(lo===Infinity)return gaps;
 }
 if(lo!==Infinity)gaps.push({lo,hi:Infinity,lc,hc:false});return gaps;
}
function brcRangesCondition(ranges){
 const parts=ranges.map(range=>{
  const terms=[];if(Number.isFinite(range.lo))terms.push({op:range.lc?'gte':'gt',a:range.lo});if(Number.isFinite(range.hi))terms.push({op:range.hc?'lte':'lt',a:range.hi});
  if(range.lo===range.hi)return {op:'eq',a:range.lo};
  return terms.length===1?terms[0]:{op:'all',conditions:terms};
 });
 return parts.length===1?parts[0]:{op:'any',conditions:parts};
}
function brcExpandLegacyFallbacks(conditions){
 const next=brcCopyConditions(conditions);
 for(const band of brcBands){const keys=band.keys.filter(key=>next[key]?.op==='else');if(keys.length!==1)continue;const ranges=band.keys.filter(key=>key!==keys[0]).flatMap(key=>brcRanges(next[key]));next[keys[0]]=brcRangesCondition(brcRangesComplement(ranges));}
 return next;
}
function brcConditionAt(condition,path=[]){return path.reduce((node,index)=>node?.conditions?.[index],condition)}
function brcConditionPath(input){return input.dataset.brcPath?input.dataset.brcPath.split('.').map(Number):[]}
