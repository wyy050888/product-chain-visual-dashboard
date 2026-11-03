// 两个视角共用同一事项关联，视角只改变判断呈现，不改变任务身份。
function kpmManagementInsight(product,tab,context){
 const item=kpmAiFollowups([product])[0],a=product.assessment,c=a.current,b=a.previous;
 let decision=item.advice.decision,contextText;
 if(tab==='changes'){
  const scale=c.gsvCents<b.gsvCents,margin=c.profitRate<b.profitRate;
  decision=a.change==='up'?(margin?'放量后仍需提利':'验证增长持续性'):a.change==='down'?(scale&&margin?'规模与利润同步走弱':margin?'优先核实利润回落':'优先核实规模回落'):margin?'优先核实利润回落':decision;
  contextText=kpmChangeText(a)+' · GSV '+upMoney(b.gsvCents)+' → '+upMoney(c.gsvCents)+' · 利润率'+upPercent(b.profitRate)+' → '+upPercent(c.profitRate);
 }else{
  decision=({core:'评估支柱修复',tail:'核实挽救价值','new-core':'巩固利润支柱'}[context?.group?.key]||decision);
  const total=context?.totalGsv||context?.all?.reduce((n,p)=>n+p.facts.gsvCents,0)||0;
  contextText=(product.level?product.level+'级':'—')+' · GSV '+upMoney(product.facts.gsvCents)+'（'+upPercent(total?product.facts.gsvCents/total*100:null)+'） · 利润率'+upPercent(product.facts.profitRate);
 }
 if(product.facts.profitRate<0)decision='控制新增投入';
 return {...item,view:tab,contextText,advice:{...item.advice,decision}};
}
