// 四个专属榜的取数与排序；品质四榜和亏损榜仍由总看板的模型提供。
const pcProjectRiskTypes=new Map([['自研开发','自研'],['自选开发','自选'],['产品迭代','迭代'],['品质整改','品质整改']]);
const pcLaunchChannels=['一类电商','兴趣电商','跨境电商','亚欧跨境','线上渠道','线下渠道'];
const pcLaunchDemoManagers=['陈宁','林晓','潘东跃'];
const pcInitiationDocumentUrl='待定';
const pcRiskDays=(from,to)=>Math.round((Date.parse(to)-Date.parse(from))/86400000);
// 模拟项目仅用于上品延期榜，仍按实际入榜规则计算延期天数。
const pcDelayedDemoProjects=[
 {name:'塔式循环扇 F32',imageFrom:'康佳台扇KTS-0403',category:'环境',type:'自研开发',plan:'2026-09-15',revisedPlan:'2027-01-31',channel:'一类电商',productOwner:'陈宁',task:'模具试产确认'},
 {name:'桌面暖风机 N28',imageFrom:'创维取暖器A944',category:'环境',type:'产品迭代',plan:'2026-09-28',revisedPlan:'2027-01-18',channel:'兴趣电商',productOwner:'陈宁',task:'温控可靠性验证'},
 {name:'静音取暖器 H30',imageFrom:'创维语音款取暖器A831',category:'环境',type:'品质整改',plan:'2026-10-06',revisedPlan:'2027-01-12',channel:'线下渠道',productOwner:'陈宁',task:'整改样机复测'},
 {name:'无线除螨仪 M30',imageFrom:'康佳无线双杆除螨仪2218',category:'清洁',type:'自选开发',plan:'2026-09-20',revisedPlan:'2027-01-25',channel:'跨境电商',productOwner:'林晓',task:'封样评审'},
 {name:'轻量家用吸尘器 V60',imageFrom:'康佳家用吸尘器KXCQ57',category:'清洁',type:'品质整改',plan:'2026-10-12',revisedPlan:'2027-01-18',channel:'亚欧跨境',productOwner:'林晓',task:'整机寿命测试'},
 {name:'果蔬清洗机 G12',imageFrom:'苏泊尔果蔬清洗机GS10',category:'厨电',type:'自研开发',plan:'2026-09-30',revisedPlan:'2027-01-16',channel:'线上渠道',productOwner:'侯佳莉',task:'小批量试产'},
 {name:'便携腰部按摩仪 J18',imageFrom:'海尔基础款腰部按摩仪-J15',category:'个护&健康',type:'自选开发',plan:'2026-10-15',revisedPlan:'2027-01-16',channel:'兴趣电商',productOwner:'姚栋',task:'包装运输测试'}
].map(({task,...project},index)=>({
 ...project,id:'DEMO-PC-DELAY-'+(index+1),projectState:'进行中',status:'红灯',
 ledger:[{status:'待处理',light:'红灯',taskNames:[task]}]
}));
function pcRiskProjectRows(rows,asOf){
 return rows.flatMap(project=>{
  const projectType=ppProjectType(project.type),type=pcProjectRiskTypes.get(projectType);
  const planned=ppDate(project.plan),revised=ppDate(project.revisedPlan),actual=ppDate(project.actual);
  if(!type||!planned||['已完成','已取消'].includes(project.projectState)||(actual&&actual<=asOf))return [];
  const overdue=revised&&revised>planned?revised:null,launch=overdue||planned;
  const blockers=ppValues((project.ledger||[]).filter(risk=>risk.status!=='已闭环'&&ppRiskLights.includes(risk.light)).flatMap(risk=>risk.taskNames||[]));
  return [{id:project.id,name:project.name,imageFrom:project.imageFrom,type,projectType,category:project.category,status:project.status,planned,revised:overdue,delay:overdue?pcRiskDays(planned,overdue):0,launch,
   daysUntil:pcRiskDays(asOf,launch),channel:ppValues(project.salesChannels??project.salesChannel??project.launchChannel??project.channel).join('、'),manager:project.productOwner,blockers:blockers.join('、')}];
 });
}
const pcRiskInitiationDays=5;
const pcRiskWorkingDay=date=>![0,6].includes(new Date(date+'T00:00:00Z').getUTCDay());
function pcRiskWorkdays(from,to,isWorkingDay){
 if(!ppDate(from)||!ppDate(to)||from>=to)return 0;
 let days=0;for(let date=shiftDate(from,1);date<=to;date=shiftDate(date,1))if(isWorkingDay(date))days++;
 return days;
}
function pcRiskInitiationWarningStart(target,isWorkingDay){
 let start=target;
 for(let remaining=pcRiskInitiationDays;remaining>0;){
  start=shiftDate(start,-1);
  if(isWorkingDay(start))remaining--;
 }
 return start;
}
// 提需池按「需求状态」判定，approvedAt 取最终审批通过时间；两处日期均转为业务时区的 ISO 日期。
// 审批、立项及提需人使用样例；产品经理统一取模板管理的产品链人员配置样例。
// 云文档只选名称、链群、项目类型、品牌及目标价格和成本齐备的产品行。
const pcInitiationDemo={
 managers:{环境:'张晓阳',厨电:'刘萱',清洁:'潘东跃','个护&健康':'姚栋'},
 demand:[
  {id:'DEMO-DEMAND-01',name:'大口径原汁机',category:'厨电',type:'自研',brand:'苏泊尔、海尔',approvedAt:'2026-11-02',status:'待立项',targetLaunchDate:'2027-02-15',channel:'兴趣电商',requester:'周晓'},
  {id:'DEMO-DEMAND-02',name:'创维冰雾台扇',category:'环境',type:'自选',brand:'创维',approvedAt:'2026-11-03',status:'待立项',targetLaunchDate:'2027-03-25',channel:'天猫',requester:'许晨'},
  {id:'DEMO-DEMAND-03',name:'苏泊尔无线除螨仪',category:'清洁',type:'自选',brand:'苏泊尔',approvedAt:'2026-11-05',status:'待立项',targetLaunchDate:'2027-04-14',channel:'兴趣电商',requester:'李欣'},
  {id:'DEMO-DEMAND-05',name:'美的蒸汽炸烤箱PRO',category:'厨电',type:'迭代',brand:'美的',approvedAt:'2026-11-09',status:'待立项',targetLaunchDate:'2027-06-30',channel:'兴趣电商',requester:'张妍'}
 ],
 wps:[
  {id:'DEMO-WPS-04',name:'苏泊尔2.5L玻璃方杯绞肉机',category:'厨电',type:'自选',brand:'苏泊尔',initiatedAt:'2026-11-04',targetCompletionDate:'2026-11-13',oaNo:'',channel:'一类电商'},
  {id:'DEMO-WPS-05',name:'美的暖菜板',category:'厨电',type:'自选',brand:'美的',initiatedAt:'2026-11-06',targetCompletionDate:'2026-11-25',oaNo:'',channel:'一类电商'},
  {id:'DEMO-WPS-06',name:'美的真蒸汽炸烤箱',category:'厨电',type:'自选',brand:'美的',initiatedAt:'2026-11-09',targetCompletionDate:'2026-11-26',oaNo:'',channel:'二类电商'}
 ]
};
function pcRiskInitiationRows({demand=[],wps=[],managers={}},asOf,category=null,isWorkingDay=pcRiskWorkingDay){
 const bySource=(rows,source)=>rows.flatMap(row=>{
  const fromDemand=source==='demand';
  const date=ppDate(row[fromDemand?'approvedAt':'initiatedAt']?.slice(0,10));
  const targetDate=fromDemand?null:String(row.targetCompletionDate??'').slice(0,10);
  const chain=filterCatalog.normalizeChain(row.category)??row.category;
  if(category!==null&&chain!==category)return [];
  if(fromDemand){
   if(row.status!=='待立项'||!date||date>asOf)return [];
  }else if(String(row.oaNo??'').trim()||!riskValidDate(targetDate)||asOf<pcRiskInitiationWarningStart(targetDate,isWorkingDay))return [];
  const wait=pcRiskWorkdays(targetDate??date,asOf,isWorkingDay);
  if(fromDemand&&wait<pcRiskInitiationDays)return [];
  const type=row.projectType??row.type;
  const projectType=[...pcProjectRiskTypes].find(([key,label])=>key===type||label===type)?.[0];
  const manager=Object.hasOwn(managers,chain)?managers[chain]:'';
  const daysToTarget=fromDemand?null:pcRiskDays(asOf,targetDate);
  const remaining=daysToTarget>0?pcRiskWorkdays(shiftDate(asOf,-1),shiftDate(targetDate,-1),isWorkingDay):0;
  return [{...row,category:chain,projectType,date,targetDate,wait,daysToTarget,remaining,source,manager}];
 });
 return [...bySource(demand,'demand'),...bySource(wps,'wps')].sort((a,b)=>{
  const upcomingOrder=Number(a.daysToTarget>0)-Number(b.daysToTarget>0);
  return upcomingOrder||b.wait-a.wait||(a.targetDate??a.date).localeCompare(b.targetDate??b.date)||String(a.id).localeCompare(String(b.id));
 });
}
// 补齐项目预警的展示字段，入榜和排序仍只使用项目日期等业务字段。
function pcLaunchDemoFields(row,index){
 const channels=row.channel.split(/[、，,；;/]/).map(value=>value.trim()).filter(value=>pcLaunchChannels.includes(value));
 return {
  ...row,
  channel:channels.join('、')||pcLaunchChannels[index%pcLaunchChannels.length],
  manager:row.manager&&!/^(?:—|-+)$/.test(row.manager)?row.manager:pcLaunchDemoManagers[index%pcLaunchDemoManagers.length]
 };
}
function pcRiskData(asOf=dashboardToday(),initiationSources=pcInitiationDemo){
 const period=pcMetricPeriod({start:asOf,end:asOf}),chain=pcChain(),category=chain===null?null:pcManagerCategory;
 const projects=pcWithModulePeriod('projects',period,()=>ppSourceRows(period).map(row=>ppAdapt(row,asOf)));
 const comparable=pcRiskProjectRows(projects,asOf),byId=(a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true});
 const demoDelayed=pcRiskProjectRows(pcDelayedDemoProjects.filter(row=>category===null||row.category===category),asOf);
 const unsold=nspUnsoldSummary({category:category||'all',season:'all',asOf});
 const materials=pcWithModulePeriod('projects',period,()=>{
  const projectsById=new Map(projects.map(project=>[project.id,project]));
  return comparable.filter(row=>row.daysUntil>=0&&row.daysUntil<=60)
   .sort((a,b)=>a.daysUntil-b.daysUntil||b.delay-a.delay||byId(a,b))
   .map((row,index)=>{
    const {stageData}=projectControlModel(projectsById.get(row.id));
    const names=stageData.flatMap(stage=>(stage.tasks||[])
     .filter(task=>!task.done&&(task.target||task.state==='进行中')).map(task=>task.name));
    return {...pcLaunchDemoFields(row,index),currentTask:ppValues(names).join('、')};
   });
 });
 return {
  delayed:{asOf,rows:[...comparable,...demoDelayed].filter(row=>row.delay>=90).sort((a,b)=>b.delay-a.delay||a.launch.localeCompare(b.launch)||byId(a,b)).map(pcLaunchDemoFields)},
  unsold,
  materials:{asOf,rows:materials},
  initiation:{asOf,rows:pcRiskInitiationRows(initiationSources,asOf,category)}
 };
}
