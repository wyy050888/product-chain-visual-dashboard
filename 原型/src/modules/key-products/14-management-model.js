// 经营预警使用实际分级事实；AI跟进复用制度、明确承诺及已产生的验收记录。
const kpmManagementTabs={changes:'等级异动',cycles:'改善进展',structure:'大盘结构'};
let kpmManagementTab='changes';
function kpmManagementCycles(rows){
 const end=upWindow().end,result=[];
 for(const record of kpmCycleSamples){
  const product=rows.find(p=>p.spuId===record.spuId);if(!product||record.start>end)continue;
  const company=kpmGradeAssessment(upIdentity(product),end,'all'),reported=record.reportDate&&record.reportDate<=end;
  const achieved=record.kind==='upgrade'?company.level==='S':record.kind==='bom'?reported&&record.actual>=5:record.reviewDate<=end&&record.review==='通过';
  const failed=record.kind==='upgrade'?company.sales>0&&Number.isFinite(company.profitRate)&&company.level!=='S':record.kind==='rescue'?record.reviewDate<=end&&record.review==='未通过':false;
  const state=achieved?'achieved':end>=record.due?(failed?'overdue':'verify'):record.due.slice(0,7)===end.slice(0,7)?'due':record.kind==='bom'?'annual':'working';
  result.push({record,product,company,state,reported,task:kpmCycleTask(record,product)});
 }
 return result;
}
function kpmManagementGroups(rows,tab=kpmManagementTab){
 const group=(key,label,tone,items,detail)=>({key,label,tone,ids:[...new Set(items.map(p=>p.spuId))],detail});
 if(tab==='cycles'){
  const items=kpmImprovementItems(rows);
  return Object.entries(kpmImprovementStages).map(([key,[label,tone]])=>group(key,label,tone,items.filter(i=>i.stage===key).map(i=>i.product),''));
 }
 if(tab==='structure')return [
  group('core','利润支柱流出','red',rows.filter(p=>p.assessment.previous.level==='S'&&p.assessment.current.sales>0&&p.level!=='S'),'原S级产品退出利润支柱梯队'),
  group('tail','尾部产品新增','yellow',rows.filter(p=>p.level==='C'&&p.assessment.previous.level!=='C'),'关注尾部新增及后续挽救安排'),
  group('new-core','利润支柱补充','green',rows.filter(p=>p.level==='S'&&p.assessment.previous.level!=='S'),'新增S级产品及其经营贡献')];
 const fall=rows.filter(p=>p.assessment.change==='down');
 return [group('core','利润支柱退出S级','red',rows.filter(p=>p.assessment.previous.level==='S'&&p.assessment.current.sales>0&&p.level!=='S'),'优先核实规模与利润变化'),
  group('consecutive','连续两期等级下滑','red',rows.filter(p=>{if(p.assessment.change!=='down')return false;const prior=kpmGradeComparison(upIdentity(p),shiftDate(upWindow().end,-30),kpmBusinessPlatforms());return prior.change==='down'}),'核实持续下行原因及投入安排'),
  group('down','本期等级下降','yellow',fall,'区分规模收缩与利润变化'),group('margin','S/A级利润率回落','yellow',rows.filter(p=>['S','A'].includes(p.level)&&Number.isFinite(p.assessment.previous.profitRate)&&p.assessment.current.profitRate<p.assessment.previous.profitRate),'核实成本改善与贡献变化'),group('up','本期等级上升','green',rows.filter(p=>p.assessment.change==='up'),'核实增长来源及利润改善的持续性')];
}
function kpmManagementIds(rows,key,tab=kpmManagementTab){
 if(key.startsWith('grade-'))return rows.filter(p=>(p.level||'unrated')===key.slice(6)).map(p=>p.spuId);
 return kpmManagementGroups(rows,tab).find(g=>g.key===key)?.ids||[];
}
function kpmManagementStructure(rows){
 const total=rows.reduce((n,p)=>n+p.facts.gsvCents,0);
 return [...kpmGradeOrder,'unrated'].map(level=>{
  const items=rows.filter(p=>(p.level||'unrated')===level),before=rows.filter(p=>(p.assessment.previous.level||'unrated')===level).length;
  const amount=items.reduce((n,p)=>n+p.facts.gsvCents,0),profit=items.reduce((n,p)=>n+p.facts.profitCents,0);
  return {level,count:items.length,before,share:total>0?amount/total*100:null,gsv:amount,profit,margin:amount!==0?profit/amount*100:null,ids:items.map(p=>p.spuId)};
 });
}
window.dashboardKeyProductManagementSnapshot=()=>withPeriod('matrix',()=>{
 const rows=kpmFilterRows(kpmRows());
 return {tab:kpmManagementTab,baseIds:rows.map(p=>p.spuId),groups:kpmManagementGroups(rows),followups:kpmAiFollowups(rows).map(i=>({spuId:i.product.spuId,stage:i.stage,decision:i.advice.decision,issue:i.advice.issue,taskId:i.task?.id||null,policy:i.policy,progress:i.progress})),improvements:kpmImprovementItems(rows).map(i=>({spuId:i.product.spuId,stage:i.stage,decision:i.advice.decision,issue:i.advice.issue,taskId:i.task?.id||null,progress:i.progress,kind:i.kind})),cycles:kpmManagementCycles(rows).map(c=>({id:c.record.id,spuId:c.product.spuId,state:c.state,due:c.record.due})),structure:kpmManagementStructure(rows)};
});
