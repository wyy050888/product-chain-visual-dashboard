// 经营预警使用实际分级事实；AI跟进复用制度、明确承诺及已产生的验收记录。
const kpmManagementSections={changes:'等级异动',structure:'大盘结构'};
// 五类异动在概览计数和主表筛选中共用一份条件，避免两处口径漂移。
const kpmChangeSignals=[
 {key:'core',label:'利润支柱退出S级',tone:'red',detail:'优先核实规模与利润变化',match:p=>p.assessment.previous.level==='S'&&p.assessment.current.sales>0&&p.level!=='S'},
 {key:'consecutive',label:'连续两期等级下滑',tone:'red',detail:'核实持续下行原因及投入安排',match:p=>p.assessment.change==='down'&&kpmGradeComparison(upIdentity(p),p.assessment.previous.end,kpmBusinessPlatforms(),p.assessment.previous.mode).change==='down'},
 {key:'down',label:'本期等级下降',tone:'yellow',detail:'区分规模收缩与利润变化',match:p=>p.assessment.change==='down'},
 {key:'margin',label:'S/A级利润率回落',tone:'yellow',detail:'核实成本改善与贡献变化',match:p=>['S','A'].includes(p.level)&&Number.isFinite(p.assessment.previous.profitRate)&&p.assessment.current.profitRate<p.assessment.previous.profitRate},
 {key:'up',label:'本期等级上升',tone:'green',detail:'核实增长来源及利润改善的持续性',match:p=>p.assessment.change==='up'}
];
function kpmMatchesSignal(product,key='all'){
 const rule=kpmChangeSignals.find(rule=>rule.key===key);
 return rule?rule.match(product):kpmMatchesChange(product.assessment,key);
}

function kpmManagementCycles(rows){
 const end=upWindow().end,result=[];
 for(const record of kpmCycleSamples){
  const product=rows.find(p=>p.spuId===record.spuId);if(!product||record.start>end)continue;
  const company=kpmGradeAssessment(upIdentity(product),end,'all',periodFor('matrix').mode,upWindow().start),reported=record.reportDate&&record.reportDate<=end;
  const achieved=record.kind==='upgrade'?company.level==='S':record.kind==='bom'?reported&&record.actual>=5:record.reviewDate<=end&&record.review==='通过';
  const failed=record.kind==='upgrade'?company.sales>0&&Number.isFinite(company.profitRate)&&company.level!=='S':record.kind==='rescue'?record.reviewDate<=end&&record.review==='未通过':false;
  const state=achieved?'achieved':end>=record.due?(failed?'overdue':'verify'):record.due.slice(0,7)===end.slice(0,7)?'due':record.kind==='bom'?'annual':'working';
  result.push({record,product,company,state,reported,task:kpmCycleTask(record,product)});
 }
 return result;
}
function kpmManagementGroups(rows,tab='changes'){
 const group=(key,label,tone,items,detail)=>({key,label,tone,ids:[...new Set(items.map(p=>p.spuId))],detail});
 if(tab==='structure')return [
  group('core','利润支柱流出','red',rows.filter(p=>p.assessment.previous.level==='S'&&p.assessment.current.sales>0&&p.level!=='S'),'原S级产品退出利润支柱梯队'),
  group('tail','尾部产品新增','yellow',rows.filter(p=>p.level==='C'&&p.assessment.previous.level!=='C'),'关注尾部新增及后续挽救安排'),
  group('new-core','利润支柱补充','green',rows.filter(p=>p.level==='S'&&p.assessment.previous.level!=='S'),'新增S级产品及其经营贡献')];
 return kpmChangeSignals.map(rule=>group(rule.key,rule.label,rule.tone,rows.filter(rule.match),rule.detail));
}

function kpmManagementIds(rows,key,tab='changes'){
 if(key.startsWith('grade-'))return rows.filter(p=>(p.level||'unrated')===key.slice(6)).map(p=>p.spuId);
 return kpmManagementGroups(rows,tab).find(g=>g.key===key)?.ids||[];
}
function kpmManagementStructure(rows){
 const sum=(items,key)=>items.every(p=>Number.isFinite(p.facts[key]))?items.reduce((total,p)=>total+p.facts[key],0):null;
 const total=sum(rows,'gsvCents'),previousRows=rows.filter(p=>!p.assessment.previous.inNewPool);
 const summarize=(items,before)=>{
  const gsv=sum(items,'gsvCents'),profit=sum(items,'profitCents');
  return {count:items.length,before,ids:items.map(p=>p.spuId),gsv,profit,netSales:sum(items,'netSales'),
   share:total>0&&gsv!==null?gsv/total*100:null,margin:gsv!==null&&gsv!==0&&profit!==null?profit/gsv*100:null};
 };
 return [...kpmGradeOrder,'unrated'].map(level=>{
  const items=rows.filter(p=>(p.level||'unrated')===level),before=previousRows.filter(p=>(p.assessment.previous.level||'unrated')===level).length;
  const operating=level==='unrated'?[]:items.filter(p=>brcProductOperatingMatch(level,p.assessment.current.profitRate)),operatingBefore=level==='unrated'?[]:previousRows.filter(p=>p.assessment.previous.level===level&&brcProductOperatingMatch(level,p.assessment.previous.profitRate));
  return {level,...summarize(items,before),operating:summarize(operating,operatingBefore.length)};
 });
}
window.dashboardKeyProductManagementSnapshot=()=>withPeriod('matrix',()=>{
 const all=kpmRows(),rows=kpmFilterRows(all,true,false);
 return {view:'combined',structureGroups:kpmManagementGroups(rows,'structure'),baseIds:rows.map(p=>p.spuId),groups:kpmManagementGroups(rows),followups:kpmAiFollowups(rows).map(i=>({spuId:i.product.spuId,stage:i.stage,decision:i.advice.decision,issue:i.advice.issue,taskId:i.task?.id||null,policy:i.policy,progress:i.progress})),strategies:kpmStrategyItems(rows).map(i=>({spuId:i.product.spuId,category:i.strategyCategory,stage:i.stage,taskStatus:i.task?.status||null,goal:i.goal,taskId:i.task?.id||null,records:i.activities.map(a=>({id:a.record.id,source:a.record.source,stage:a.stage,effective:a.effective,verified:a.verified,metrics:a.metrics,newSpuId:a.record.newSpuId||null,batch:a.record.batch||null}))})),cycles:kpmManagementCycles(rows).map(c=>({id:c.record.id,spuId:c.product.spuId,state:c.state,due:c.record.due})),structure:kpmManagementStructure(kpmFilterRows(all,false,false))};
});
