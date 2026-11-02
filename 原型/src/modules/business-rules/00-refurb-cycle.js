// 标准周期参与延期公式；三档分布则保存完整条件，兼容旧45/60天上界。
const brcRefurbCycleKeys=['stock.refurbSecond','stock.refurbThird','stock.refurbOverflow'];
function brcRefurbDefaultConditions(values){
 const range=(lower,upper,inclusive)=>({op:'all',conditions:[{op:inclusive?'gte':'gt',a:lower},{op:'lt',a:upper}]});
 return {
  'stock.refurbSecond':range(values['stock.refurbDays'],values['stock.refurbSecond'],false),
  'stock.refurbThird':range(values['stock.refurbSecond'],values['stock.refurbThird'],true),
  'stock.refurbOverflow':{op:'gte',a:values['stock.refurbThird']}
 };
}
function brcValidateRefurbCycle(values,conditions){
 const rows=[{key:'stock.refurbDays',label:'达标',c:{op:'lte',a:values['stock.refurbDays']}},...brcRefurbCycleKeys.map(key=>({key,label:brcEditorByKey.get(key).label,c:conditions[key]}))];
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(brcConditionsOverlap(rows[i].c,rows[j].c))return {key:rows[j].key,message:'翻新周期的'+rows[i].label+'与'+rows[j].label+'条件重叠'};
 if(!brcCoversLine(rows.map(row=>row.c)))return {key:brcRefurbCycleKeys[0],message:'翻新周期存在未覆盖区间，请补齐明确的比较条件'};
 return null;
}
function brcLinkRefurbStandard(before,after,conditions){
 if(!Number.isFinite(before)||!Number.isFinite(after))return;
 // 只移动与旧标准相接的下界，保留用户明确配置的其他范围与且/或结构。
 for(const key of brcRefurbCycleKeys){
  const condition=brcCloneCondition(conditions[key]);
  const visit=node=>{if(node.conditions)node.conditions.forEach(visit);else if(['gt','gte'].includes(node.op)&&node.a===before)node.a=after};
  visit(condition);conditions[key]=condition;
 }
}
