// 当前只诊断明确重点与实际工作的方向偏移，不判断资源投入数量。
function gdResourceCategory(comparison){
 const c=comparison;
 if(!c?.scope||!c.start||!c.end||c.start>c.end||!c.priorityConfirmed||c.priorityChanged||c.approvedSpecialty)return null;
 return c.direction==='deviated'?'deviation':null;
}
function gdResourceSamples(objects,baseline){
 const {expected,diverted,qualityExpected,qualityDiverted}=baseline,day=n=>shiftDate(DATA_CUTOFF,n);
 const comparison=scope=>({scope,start:day(-3),end:DATA_CUTOFF,direction:'deviated',priorityConfirmed:true,priorityChanged:false,approvedSpecialty:false});
 const rows=[
  {id:'resource-mismatch-acceptance',object:objects.project,department:'产品中心',priority:'P1',title:'验收确认工作偏离既定分工',problemSource:{sourceId:'focus-observed-2',quote:'继续整理历史宣传素材，未记录验收口径确认进展'},problem:'验收口径确认已有明确分工，周铭连续两天仍在整理已后移的历史素材，相关验收工作未见进展记录，验收确认可能延迟。',suggestion:'先核实验收口径确认的实际进展，暂停已后移的素材整理，明确验收确认时间并反馈项目部。',people:['周铭'],sources:[expected,...diverted],relatedWork:'work-core-delivery',comparison:comparison('本周样机验收口径确认与素材整理分工')},
  {id:'resource-mismatch-returns',object:objects.product,department:'产品中心',priority:'P2',title:'退货原因分析投入偏移',problemSource:{sourceId:'quality-observed',quote:'退货原因分类工作尚未开始'},problem:'退货原因分类尚未开始，许宁本周主要投入已同意后移的常规包装图审核，品质整改所需的原因分析可能延迟。',suggestion:'按原分工优先完成退货原因分类并回传品质，常规包装图审核按已确认的后移安排执行。',people:['许宁'],sources:[qualityExpected,...qualityDiverted],comparison:comparison('本周退货原因分类与常规包装图审核分工')},
 ];
 return rows.map(row=>{
  const resourceType=gdResourceCategory(row.comparison);
  if(!resourceType)throw new Error('资源样例缺少可比依据：'+row.id);
  return {...row,kind:'mismatch',resourceType};
 });
}

// 迁移已具名的分工/观察对照；至少包含明确要求和实际工作两侧证据。
function gdFocusDeviationRows(rows,range){
 return rows.filter(row=>gdResourceCategory(row.comparison)&&row.sources.some(s=>s.type==='会议纪要')&&row.sources.some(s=>s.type!=='会议纪要')&&row.sources.some(s=>s.date>=range.start&&s.date<=range.end)).map(row=>{
  const participants=row.people.map(assignee=>({assignee,department:row.department||upTodoPersonDepartment(assignee),action:row.suggestion}));
  return {...row,kind:'focus-shift',participants,departments:[...new Set(participants.map(p=>p.department))],businessObjects:[{...row.object,id:String(row.object.spuId??row.object.projectId??row.object.key)}]};
 });
}
