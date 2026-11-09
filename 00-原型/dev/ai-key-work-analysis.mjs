// 仅绑定已校验的AI内容；规则字段由调用方保持，不接受模型覆盖。
export function bindKeyWorkAnalysis(items,analyses,checkedAt){
 const byId=new Map(analyses.map(row=>[row.rule_item_id,row]));
 if(byId.size!==analyses.length||items.length!==analyses.length||items.some(row=>!byId.has(row.rule_item_id)))throw new Error('重点工作分析必须与规则事项逐项对应');
 return items.map(item=>{
  const analysis=byId.get(item.rule_item_id),previous=item.ai_analysis;
  if(Object.keys(analysis).some(key=>!['rule_item_id','problem','actions'].includes(key)))throw new Error('AI不能覆盖规则字段或输出优先级');
  const content={problem:analysis.problem,actions:analysis.actions};
  const changed=JSON.stringify(content)!==JSON.stringify(previous&&{problem:previous.problem,actions:previous.actions});
  return {...item,ai_analysis:{...content,checked_at:checkedAt,updated_at:changed?checkedAt:previous.updated_at},analysis_history:changed?[...(item.analysis_history||[]),{at:checkedAt,previous:previous||null,current:content}]:(item.analysis_history||[])};
 });
}
