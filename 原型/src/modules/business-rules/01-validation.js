// 保存前验证区间、判灯覆盖和二维分级冲突；不替业务补齐分级空档。
function brcValidate(values,conditions=brcDefaultConditions(values)){
 const error=(key,message)=>({key,message});
 for(const rule of brcDefinitions.filter(item=>item.editable===false))if(!Number.isFinite(values[rule.key])||values[rule.key]<rule.min||values[rule.key]>rule.max)return error(rule.key,'历史测算参数无效');
 for(const group of brcResultGroups){
  const primary=conditions[brcResultRelationKey(group.id)];
  if(primary?.groupOp&&!['all','any'].includes(primary.groupOp))return error(group.keys[0],'请选择有效的且／或关系');
  if(!group.parent&&!brcResultMembers(group.id,conditions).length)return error(group.keys[0],'请至少保留一条条件');
 }
 for(const item of brcEditorItems){
  const valid=n=>Number.isFinite(n)&&n>=item.min&&n<=item.max&&(!item.integer||Number.isInteger(n));
  if(item.kind==='parameter'){if(!valid(values[item.key]))return error(item.key,item.label+'需为'+brcEditorDisplayValue(item.min,item.unit)+'至'+brcEditorDisplayValue(item.max,item.unit)+brcEditorUnit(item.unit).label+'之间的'+(item.integer?'整数':'有效数值'));continue;}
  const original=conditions[item.key],c=brcNormalizeCondition(original);
  if(c?.groupSkip&&brcResultGroups.some(group=>group.keys.includes(item.key)))continue;
  if(!c||c.op==='else')return error(item.key,'请选择有效判定条件');
  if(original.op==='between'&&(typeof original.lower!=='boolean'||typeof original.upper!=='boolean'||original.a>=original.b))return error(item.key,'区间终点须大于起点，并明确两端是否包含等号');
  const validateTerm=(term,depth=0)=>{
   if(!term||depth>12)return '请选择有效判定条件';
   if(['all','any'].includes(term.op)){
    if(!Array.isArray(term.conditions)||!term.conditions.length)return item.band&&depth===0?'':'请至少添加一条条件';
    for(const child of term.conditions){const message=validateTerm(child,depth+1);if(message)return message}return '';
   }
   if(!['gt','gte','lt','lte','eq'].includes(term.op))return '请选择有效判定条件';
   const metric=brcTermMetric(item.key,term);if(!metric)return '请选择当前业务可用的指标';
   if(metric.valueType==='boolean'&&term.op!=='eq')return '状态条件仅支持等于“是”或“否”';
   return !Number.isFinite(term.a)||term.a<metric.min||term.a>metric.max||metric.integer&&!Number.isInteger(term.a)?metric.label+'需填写'+brcEditorDisplayValue(metric.min,metric.unit)+'至'+brcEditorDisplayValue(metric.max,metric.unit)+brcEditorUnit(metric.unit).label+'之间的'+(metric.integer?'整数':'有效数值'):'';
  };
  const message=validateTerm(c);if(message)return error(item.key,message);
  if(!brcPredicateBoxes(c,brcMetricConfig(item.key).default).length&&!(item.band&&c.op==='any'&&!c.conditions.length))return error(item.key,'条件无法同时满足，请调整数值或“且／或”关系');
 }
 for(const group of brcResultGroups)if(brcResultMembers(group.id,conditions).length&&!brcPredicateBoxes(brcResultCondition(group.id,conditions),'value').length)return error(group.keys[0],group.title+'条件无法同时满足，请调整数值或“且／或”关系');
 for(const band of brcBands){
  if(band.style==='score'){const result=brcValidateScoreBand(band,conditions);if(result)return result;continue}
  const rows=band.keys.map(key=>({key,c:conditions[key]}));
  const explicit=rows.filter(r=>r.c.op!=='else');
  for(let i=0;i<explicit.length;i++)for(let j=i+1;j<explicit.length;j++)if(brcConditionsOverlap(explicit[i].c,explicit[j].c))return error(explicit[j].key,band.section+'的'+brcEditorByKey.get(explicit[i].key).label+'与'+brcEditorByKey.get(explicit[j].key).label+'条件重叠');
  if(!brcCoversLine(rows.map(r=>r.c)))return error(rows[rows.length-1].key,band.section+'存在未覆盖区间，请补齐明确的比较条件');
 }
 const levels=['S','A','B','C'];
 for(let i=0;i<levels.length;i++)for(let j=i+1;j<levels.length;j++){
  const a=brcGradeKeys(levels[i]),b=brcGradeKeys(levels[j]);
  if(brcGradeRegions(levels[i],conditions).some(x=>brcGradeRegions(levels[j],conditions).some(y=>brcBoxIntersection(x,y))))return error(b.sales,levels[i]+'级与'+levels[j]+'级规则区间重叠');
 }
 return brcValidateRefurbCycle(values,conditions);
}
