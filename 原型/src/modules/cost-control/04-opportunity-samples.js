// 固定三个SPU展示执行阶段，其余建议保持待下发；已有记录（含删除标记）不覆盖。
function ccEnsureOpportunitySamples(rows){
 const samples=[['SPU-SOURCE-018','pending'],['SPU-SOURCE-010','working'],['SPU-SOURCE-001','done']],changes={};
 const stamp=days=>shiftDate(DATA_CUTOFF,days)+'T09:00:00+08:00';
 for(const [spuId,status] of samples){
  const row=rows.find(item=>item.spuId===spuId);if(!row||upTodos[row.taskId]||ccSavedOpportunityTask(row))continue;
  const proposal=ccCostProposal(row),assignedAt=stamp(-6),startedAt=stamp(-4),completedAt=status==='done'?stamp(-1):'';
  const evidence=status==='done'?'样例：已完成报价对比与方案评估，形成降本验证结论；实际节省金额待业务确认。':'';
  const logs=[{at:assignedAt,actor:'林悦',action:'assign',from:'suggested',to:'pending',note:''}];
  if(status!=='pending')logs.push({at:startedAt,actor:'唐琪',action:'start',from:'pending',to:'working',note:''});
  if(status==='done')logs.push({at:completedAt,actor:'唐琪',action:'complete',from:'working',to:'done',note:evidence});
  changes[proposal.id]={...proposal,status,source:'demo-cost-history',assignee:'唐琪',department:'采购部',suggestionDepartment:proposal.department,assignedBy:'林悦',assignedAt,createdAt:assignedAt,updatedAt:logs.at(-1).at,due:shiftDate(DATA_CUTOFF,7),completedAt,completedBy:status==='done'?'唐琪':'',evidence,logs};
 }
 if(!Object.keys(changes).length)return;
 try{upPersistTodos({...upTodos,...changes})}catch(_){/* 样例写入失败不影响已有任务和待下发建议。 */}
}
