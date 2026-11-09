// 只记录具名问题与原文证据，不计算报告分数或扣分。
function gdDiagnoseReportCheck(profile,row,excerpt,issues=[]){
 const [key,label,,criterion]=row,rules=gdReportIssueRules(profile,key),seen=new Set(),findings=[];
 for(const issue of issues){
  const rule=rules.find(item=>item.id===issue.ruleId);
  if(!rule||typeof issue.problem!=='string'||!issue.problem.trim())throw new Error('无效报告诊断细项：'+profile.id+'/'+key+'/'+issue.ruleId);
  if(seen.has(rule.id))continue;
  seen.add(rule.id);findings.push({ruleId:rule.id,label:rule.label,problem:issue.problem,excerpt:issue.excerpt||excerpt});
 }
 return {key,label,criterion,excerpt,passed:findings.length===0,issues:findings};
}
