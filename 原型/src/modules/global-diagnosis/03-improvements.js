// 改善按跨项目的明确根因聚合；单项整改留在重点清单或工作偏差。
function gdImprovementRows(context,sample,range){
 const projects=context.by('projects').rows.filter(p=>p.projectState==='进行中');
 const rows=[],groups=[
  {id:'verification',root:'测试资源排期冲突',title:'跨项目统一确认验证窗口',
   suggestion:'阶段排期确认时，同步核对样品到位、测试项目与设备窗口；冲突项目共同确认先后安排，窗口变更同步至受影响项目。',
   benefit:'减少不同项目争用同一测试窗口造成的反复排期；按窗口变更次数及验证按期完成情况复盘。'},
  {id:'materials',root:'备料计划确认滞后',title:'试产排期增加物料齐套确认节点',
   suggestion:'试产排期确认前，统一核对关键BOM、承诺交期及替代料验证；明确齐套结论的提交人与确认人，变更后同步复核。',
   benefit:'让试产排期使用已确认的齐套结论；按缺料导致的试产改期及到料承诺兑现情况检查效果。'}
 ];
 for(const spec of groups){
  const entries=projects.flatMap(project=>project.ledger.filter(r=>['红灯','黄灯'].includes(r.light)&&r.status!=='已闭环'&&r.verificationStatus!=='已验证'&&r.rectificationStatus!=='已整改'&&r.rootCause?.trim()===spec.root&&(!r.recordedAt||r.recordedAt.slice(0,10)<=range.end)).map(risk=>({project,risk})));
  const objects=[...new Map(entries.map(({project})=>[project.id,{key:'project|'+project.id,id:String(project.id),projectId:project.id,type:'project',name:project.name,category:project.category}])).values()];
  const sources=entries.map(({project,risk})=>{
   const owner=project.owner||'',department=({'产品部':'产品中心','品质部':'品质中心','研发部':'研发中心'})[project.dept]||project.dept;
   return {...gdKeySource('improve|'+spec.id+'|'+risk.id,objects.find(o=>o.projectId===project.id),(risk.recordedAt||DATA_CUTOFF).slice(0,10),'根因：'+risk.rootCause+'\n问题：'+risk.description+'\n项目负责人：'+owner),owner,department};
  });
  if(objects.length<2||!sources.some(s=>s.date>=range.start&&s.date<=range.end))continue;
  const people=[...new Set(sources.map(s=>s.owner).filter(Boolean))];
  rows.push({id:'improvement|'+spec.id,kind:'improvement',improvementType:'process',rootCause:spec.root,title:spec.title,object:objects[0],objectName:objects.map(o=>o.name).join('、'),businessObjects:objects,
   problem:objects.length+' 个在研项目的未闭环风险台账均记录“'+spec.root+'”，涉及 '+entries.length+' 条风险。',suggestion:spec.suggestion,benefit:spec.benefit,people,departments:[...new Set(sources.map(s=>s.department).filter(Boolean))],date:DATA_CUTOFF,sources});
 }
 return [...rows,...gdStrategyImprovementRows(context,range)];
}
