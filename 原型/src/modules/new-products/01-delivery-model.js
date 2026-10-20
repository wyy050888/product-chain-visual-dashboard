// 上线及时率按项目任务计算；与SPU首笔销售日期、销售成功率分开。
function nspDeliveryAssessment(projects,tasks,range){
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 const byProject=new Map();
 for(const task of tasks){
  if(task.kind!=='bulk-delivery'||!validDate(task.planned)||task.planned<range.start||task.planned>range.end)continue;
  if(!byProject.has(task.projectId))byProject.set(task.projectId,new Map());
  byProject.get(task.projectId).set(task.taskId,task);
 }
 const rows=[...new Map(projects.map(p=>[p.id,p])).values()].filter(p=>byProject.has(p.id)).map(project=>{
  const deliveries=[...byProject.get(project.id).values()].map(task=>{
   const actual=validDate(task.actual)&&task.actual<=range.cutoff?task.actual:null;
   return {...task,actual,deadline:shiftDate(task.planned,10),onTime:!!actual&&actual<=shiftDate(task.planned,10)};
  });
  // 同一项目多条应交付任务须全部完成且均在容差内，项目只计一次。
  return {projectId:project.id,name:project.name,brand:project.brand,category:pfCategory(project),tasks:deliveries,onTime:deliveries.every(task=>task.onTime)};
 });
 const planned=rows.length,ontime=rows.filter(row=>row.onTime).length;
 return {planned,ontime,rate:planned?ontime/planned*100:null,rows,range:{...range}};
}
function nspDeliverySummary(){
 const category=pfControlValue($('#newchain'));
 const projects=sampleProjectSource.filter(p=>pfIncludes(category,pfCategory(p))&&pfIncludes(nspFilters.brand,p.brand));
 // 品牌、类目是项目可直接映射字段；不以SPU销量、分级、销售状态反推项目范围。
 return nspDeliveryAssessment(projects,nspDeliverySamples,bounds());
}

function nspDepartmentDeliverySummary(){
 const filters=dpState.filters.new||{};
 const projects=sampleProjectSource.filter(p=>(dpState.chain==='all'||p.chain===Number(dpState.chain))&&pfIncludes(filters.brand||'all',p.brand));
 return nspDeliveryAssessment(projects,nspDeliverySamples,bounds());
}
