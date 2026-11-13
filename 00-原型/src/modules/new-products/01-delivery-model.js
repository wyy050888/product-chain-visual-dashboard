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
   return {...task,actual,deadline:shiftDate(task.planned,brcNumber('new.deliveryDays')),onTime:!!actual&&actual<=shiftDate(task.planned,brcNumber('new.deliveryDays'))};
  });
  // 同一项目多条应交付任务须全部完成且均在容差内，项目只计一次。
  return {projectId:project.id,name:project.name,brand:project.brand,category:pfCategory(project),tasks:deliveries,onTime:deliveries.every(task=>task.onTime)};
 });
 const planned=rows.length,ontime=rows.filter(row=>row.onTime).length;
 return {planned,ontime,rate:planned?ontime/planned*100:null,rows,range:{...range}};
}
function nspDeliverySummary(assessment=nspSuccessPeriod()){
 const category=pfControlValue($('#newchain'));
 const projects=sampleProjectSource.filter(p=>pfIncludes(category,pfCategory(p))&&pfIncludes(nspFilters.brand,p.brand));
 // 品牌、类目是项目可直接映射字段；不以SPU销量、分级、销售状态反推项目范围。
 const {annual,start,end:cutoff,label}=assessment;
 const year=Number(start.slice(0,4)),quarter=Math.ceil(Number(start.slice(5,7))/3);
 // 应上市项目覆盖整个季度或年度，完成日期截至新品销售成功率使用的同一统计日。
 const period=bounds({mode:annual?'year':'quarter',year,value:annual?1:quarter});
 const range={...period,cutoff,partial:period.end>cutoff};
 return {...nspDeliveryAssessment(projects,nspDeliverySamples,range),label,annual};
}

function nspDepartmentDeliverySummary(){
 const filters=dpState.filters.new||{};
 const projects=sampleProjectSource.filter(p=>(dpState.chain==='all'||p.chain===Number(dpState.chain))&&pfIncludes(filters.brand||'all',p.brand));
 return nspDeliveryAssessment(projects,nspDeliverySamples,bounds());
}
