// 同一平台的四项评分按各自字段比较；旧value指标仍表示店铺分。
function brcScoreMetrics(condition){
 if(condition?.conditions)return [...new Set(condition.conditions.flatMap(brcScoreMetrics))];
 return condition&&condition.op!=='else'?[condition.metric||'value']:[];
}
// 从一个评分区域中精确扣除已覆盖部分，保留开闭端点，不枚举四维数值网格。
function brcScoreSubtract(box,covered){
 const intersection=brcBoxIntersection(box,covered);if(!intersection)return [box];
 const remaining=[],core={...box};
 for(const metric of Object.keys(box)){
  const source=core[metric],cut=intersection[metric];
  for(const range of [
   {lo:source.lo,hi:cut.lo,lc:source.lc,hc:!cut.lc},
   {lo:cut.hi,hi:source.hi,lc:!cut.hc,hc:source.hc}
  ])if(brcRangeIntersection(range,range))remaining.push({...core,[metric]:range});
  core[metric]=cut;
 }
 return remaining;
}
function brcValidateScoreBand(band,conditions){
 const metrics=[...new Set(band.keys.flatMap(key=>brcScoreMetrics(conditions[key])))];
 const domain=Object.fromEntries(metrics.map(metric=>[metric,{lo:0,hi:5,lc:true,hc:true}]));
 const rows=band.keys.map(key=>({key,boxes:brcPredicateBoxes(conditions[key],'value').map(box=>brcBoxIntersection(domain,box)).filter(Boolean)}));
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  if(rows[i].boxes.some(a=>rows[j].boxes.some(b=>brcBoxIntersection(a,b))))return {key:rows[j].key,message:band.section+'的'+brcEditorByKey.get(rows[i].key).label+'与'+brcEditorByKey.get(rows[j].key).label+'条件重叠'};
 }
 let gaps=[domain];
 for(const box of rows.flatMap(row=>row.boxes)){
  gaps=gaps.flatMap(gap=>brcScoreSubtract(gap,box));
  if(!gaps.length)return null;
  // 限制极端条件组合的分区规模，避免保存时长时间阻塞界面。
  if(gaps.length>4096)return {key:band.keys.at(-1),message:band.section+'条件组合过于复杂，请简化条件'};
 }
 return {key:band.keys.at(-1),message:band.section+'存在未覆盖评分组合，请补齐红黄绿灯条件'};
}
