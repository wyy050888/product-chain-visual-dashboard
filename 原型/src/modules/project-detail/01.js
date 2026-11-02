

// Project detail, task schedule, risk ledger and assignment share one snapshot.
const projectDispatchKey='product-chain-project-dispatch-reference-20261010';
let projectDispatches={};try{const saved=JSON.parse(localStorage.getItem(projectDispatchKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))projectDispatches=saved}catch(_){}
function projectControlModel(p){
 const issue=projectIssueRecord(p),cutoff=bounds().cutoff,red=p.status==='红灯',yellow=p.status==='黄灯',green=p.status==='绿灯';
 const mapping={'产品部':[0,6],'采购部':[0,5],'研发部':[1,0],'品质部':[1,0],'项目部':[2,0]},[riskStage,riskTask]=p.controlNode||mapping[p.dept],currentStage=green?2:riskStage,currentTask=green?1:riskTask;
 const phaseNames=aiFlowStages.map(s=>s.name),root=phaseNames[currentStage]+' / '+aiFlowStages[currentStage].tasks[currentTask];
 let conclusion=red?`计划上线 ${p.plan}，截至 ${cutoff} 仍未上线，已延期 ${p.delay} 天；「${root}」未完成，关键交付条件未满足。`:yellow?issue.review?`原问题已完成整改，但闭环验证尚未通过；「${root}」仍未满足放行条件，保留黄灯跟进。`:`尚未超过计划上线日期 ${p.plan}，但「${root}」存在未解除的依赖风险，可能影响后续节点。`:`当前无逾期未完成的关键任务，未发现阻塞风险；项目按计划推进，计划上线 ${p.plan}。`;
 if(p.reference)conclusion='源表状态：'+p.status+'；当前阶段：'+p.stage+'。'+(p.report?p.report.replace(/\s+/g,' ').slice(0,100)+(p.report.length>100?'…':''):'项目日报待补录。');
 // 已有阶段快照包含人工修正后的灯色，优先读取；任务延期红灯保持独立。
 const stageData=Array.isArray(p.stageData)?p.stageData:aiFlowStages.map((phase,si)=>{
  const tasks=phase.tasks.map((name,ti)=>{
   const target=si===currentStage&&ti===currentTask,done=si<currentStage||(si===currentStage&&ti<currentTask),later=si>currentStage||(si===currentStage&&ti>currentTask);
   const end=done?shiftDate(cutoff,-28+si*8+ti):target?(red?shiftDate(p.plan,-3):yellow?issue.due:shiftDate(cutoff,4)):si===currentStage?shiftDate(red?p.plan:cutoff,6+(ti-currentTask)*2):shiftDate(red?p.plan:cutoff,10+(si-currentStage)*10+ti*2);
   const duration=(si===0&&ti===4)?15:target?10:3,start=shiftDate(end,1-duration),actual=done?end:'',delay=done?0:Math.max(0,aiFlowDayDiff(end,cutoff));
   const light=done||green?'绿灯':delay?'红灯':'黄灯';
   const dept=target?p.dept:si===0?['采购部','产品部','品质部','产品部','品质部','采购部','产品部'][ti]:si===1?['品质部','采购部','产品部','品质部','产品部'][ti]:si===2?['采购部','品质部'][ti]:'品质部';
   const taskOwner=target?p.owner:({'采购部':'唐琪','产品部':issue.chainOwner,'品质部':'刘畅','研发部':'王磊','项目部':'沈舟'}[dept]);
   return{id:si+'-'+ti,name,stage:phase.name,si,ti,target,done,later,start,end,duration,actual,delay,light,dept,owner:taskOwner,state:done?'已完成':target?(green?'进行中':issue.review?'待闭环验证':'未完成'):green?'待启动':'待前置完成',problem:done?'无遗留问题':green?'当前无异常':target?(issue.review?'整改材料已提交，尚缺独立验证通过记录。':issue.description):`受「${root}」影响，前置交付条件尚未确认。`,action:done?'已确认交付结果':green?'按计划提交交付物并完成节点验收。':target?issue.review?'安排验证责任人复核整改材料，通过后再确认放行。':issue.t.action:'并行完成可先行的准备工作，前置条件确认后更新执行计划。'};
  });
  const light=tasks.some(t=>t.light==='红灯')?'红灯':tasks.some(t=>t.light==='黄灯')?'黄灯':'绿灯';
  const start=tasks.map(t=>t.start).sort()[0],end=tasks.map(t=>t.end).sort().at(-1),done=tasks.filter(t=>t.done).length;
  return{name:phase.name,tasks,light,start,end,done,total:tasks.length,delay:Math.max(0,...tasks.map(t=>t.delay)),actual:done===tasks.length?tasks.map(t=>t.actual).sort().at(-1):'',duration:aiFlowDayDiff(start,end)+1};
 });
 return{p,issue,cutoff,red,yellow,green,currentStage,currentTask,root,conclusion,stageData,key:periodKey()+'|'+cutoff+'|'+(p.reference?p.sourceKey:p.model),period:periodLabel(),tab:'risk',stage:currentStage,taskStatus:'all',taskLight:'all'};
}
