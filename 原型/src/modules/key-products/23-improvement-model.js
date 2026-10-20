// 改善进展只接收已有方案，经营结果与任务状态分别判断。
const kpmImprovementKinds={upgrade:'提级改善',rescue:'一次挽救',bom:'BOM降本',quality:'品质改善'};
function kpmImprovementItems(rows){
 const end=upWindow().end;
 return kpmAiFollowups(rows).filter(i=>i.record||i.task?.managementObjective&&i.task.start<=end&&!i.task.deletedAt).map(item=>{
  const r=item.record,p=item.product,kind=r?.kind||item.task.managementObjective,current=kpmGradeAssessment(upIdentity(p),end,'all');
  const verified=r&&(kind==='bom'?Number.isFinite(r.actual)&&r.actual>=5:kind==='upgrade'?current.level==='S':r.review==='通过');
  const failed=r?.review==='未通过',missed=r?.due&&r.due<end&&!verified&&(kind==='upgrade'||kind==='bom'&&Number.isFinite(r.actual));
  const stage=failed?'exit':verified?'effective':missed?'stalled':item.task?.status==='done'||r?.due&&r.due<end?'verify':'progressing';
  const baseline=r&&['upgrade','rescue'].includes(kind)?kpmGradeAssessment(upIdentity(p),shiftDate(r.start,-1),'all'):item.task?.managementBaseline;
  const marginChange='利润率'+upPercent(baseline?.profitRate)+' → '+upPercent(current.profitRate);
  let progress;
  if(kind==='bom')progress=Number.isFinite(r?.actual)?'已'+(verified?'验证':'确认')+'降本'+r.actual+'%':'降本结果待补充';
  else if(kind==='rescue')progress=(r?.review?'评审'+r.review:'待评审')+' · '+marginChange;
  else if(kind==='upgrade')progress=marginChange+' · '+(current.level?current.level+'级':'待分级');
  else progress='总退'+upPercent(baseline?.returnRate)+' → '+upPercent(p.facts.returnRate);
  const decisions={stalled:'调整改善方案',exit:'评估退出',progressing:p.facts.profitRate<0?'调整改善方案':'继续推进',verify:'验证经营效果',effective:kind==='bom'?'巩固降本成效':'巩固改善成效'};
  return {...item,kind,stage,progress,advice:{...item.advice,decision:decisions[stage],reason:progress}};
 });
}
// 三个视角共用同一事项关联，视角只改变判断呈现，不改变任务身份。
function kpmManagementInsight(product,tab,context){
 if(tab==='cycles')return {...kpmImprovementItems([product])[0],view:tab,contextText:''};
 const item=kpmAiFollowups([product])[0],a=product.assessment,c=a.current,b=a.previous;
 let decision=item.advice.decision,contextText;
 if(tab==='changes'){
  const scale=c.gsvCents<b.gsvCents,margin=c.profitRate<b.profitRate;
  decision=a.change==='up'?(margin?'放量后仍需提利':'验证增长持续性'):a.change==='down'?(scale&&margin?'规模与利润同步走弱':margin?'优先核实利润回落':'优先核实规模回落'):margin?'优先核实利润回落':decision;
  contextText=kpmChangeText(a)+' · GSV '+upMoney(b.gsvCents)+' → '+upMoney(c.gsvCents)+' · 利润率'+upPercent(b.profitRate)+' → '+upPercent(c.profitRate);
 }else{
  decision=({core:'评估支柱修复',tail:'核实挽救价值','new-core':'巩固利润支柱'}[context?.group?.key]||decision);
  const total=context?.totalGsv||context?.all?.reduce((n,p)=>n+p.facts.gsvCents,0)||0;
  contextText=(product.level?product.level+'级':'待分级')+' · GSV '+upMoney(product.facts.gsvCents)+'（'+upPercent(total?product.facts.gsvCents/total*100:null)+'） · 利润率'+upPercent(product.facts.profitRate);
 }
 if(product.facts.profitRate<0)decision='控制新增投入';
 return {...item,view:tab,contextText,advice:{...item.advice,decision}};
}
