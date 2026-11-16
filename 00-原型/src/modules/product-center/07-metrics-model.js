// 截图指标字典。缺少明确台账时保留空值；不同维度的比率由分子、分母重算。
const pcProjectTypes=[['自研开发','自研'],['自选开发','自选'],['产品迭代','迭代']];
const pcProjectMetrics=[
 ...[['started','立项数'],['planned','上品计划数'],['launched','上市数']].map(([key,label])=>[key,label,'自研 / 自选 / 迭代']),
 ['delisted','产品下市数','关键产品下市记录（样例）'],
 ['lights','项目红 / 黄灯数','截至统计日的项目台账'],['newLights','新增红 / 黄灯数','统计期风险台账，按项目去重']
];
const pcMetricGroups=[
 ['projects','项目管理',pcProjectMetrics],
 ['planning','竞品分析及产品企划',[
  ['market','市场分析报告数量','日报提取'],['definition','产品定义报告数量','日报提取'],
  ['competitor','竞品样机体验与分析报告数量','选品中心 · 产品测试报告'],
  ['materials','产品培训资料数量','日报提取'],['launchFiles','产品上市资料数量','日报提取'],
  ['timeliness','上市资料提供及时率','上市前 60 至 30 天已提供资料的产品数 ÷ 上市产品数'],
  ['training','销售培训与推广次数','日报提取'],['linePlanning','产品线规划','日报提取']
 ]],
 ['system','罗盘系统管理',[
  ['archive','产品档案更新完成率','已完成封样评审且已关联产品档案的项目数 ÷ 已完成封样评审的项目数'],
  ['samples','直播间样机提供及时率','人工导入 · 日维度']
 ]],
 ['operations','产品运营',[
  ['successMeeting','新品上市成功率提拉会议次数','日报提取'],['afterSalesMeeting','产品售后分析及供应链管理会议次数','日报提取'],
  ['keyProductMeeting','产品链关键单品前后拉通会议次数','日报提取'],['brandMeeting','品牌方前后协同周例会次数','日报提取']
 ]]
];
const pcPeopleState={mode:'month',date:DATA_CUTOFF,group:'projects',name:''};
function pcPeopleRange(mode=pcPeopleState.mode,date=pcPeopleState.date){
 const [start]=dateRangePreset(mode==='day'?'today':mode,date);
 const nominalEnd=mode==='month'?iso(new Date(Date.UTC(+date.slice(0,4),+date.slice(5,7),0))):mode==='week'?shiftDate(start,6):date;
 return {start,end:nominalEnd<DATA_CUTOFF?nominalEnd:DATA_CUTOFF,nominalEnd};
}
function pcMetricPeriod({start,end}){return {mode:'day',start,end,year:+end.slice(0,4),value:+end.slice(5,7)}}
function pcWithin(value,start,end){return !!ppDate(value)&&value>=start&&value<=end}
function pcWithModulePeriod(module,period,read){
 const old=localPeriods[module];localPeriods[module]=period;
 try{return withPeriod(module,read)}finally{if(old)localPeriods[module]=old;else delete localPeriods[module]}
}
function pcPlanProjects(period){
 return pcWithModulePeriod('projects',period,()=>ppSourceRows(period).map(ppSampleSchedule).filter(row=>!['已取消','已暂停','已暂停/取消'].includes(row.projectState)));
}
function pcRoster(all,chain){
 const roster=new Map();
 const add=(name,index)=>{
  if(!name||gdTaskPersonEmpty(name)||name==='待指定')return;
  if(!roster.has(name))roster.set(name,new Set());
  if(Number.isInteger(index))roster.get(name).add(index);
 };
 aiOwners.forEach(add);
 for(const person of gdTaskPeople())if(pcProductDepartment(person.department))add(person.name);
 for(const project of all)add(project.productOwner,project.chain);
 return [...roster].filter(([,chains])=>chain===null||chains.has(chain)).map(([name,chains])=>({name,chains:chain===null?[...chains].sort():[chain]})).sort((a,b)=>a.name.localeCompare(b.name,'zh'));
}
function pcPeopleProjectRows(range){
 const period=pcMetricPeriod(range);
 return pcPlanProjects(period).map(row=>ppAdapt(row,range.end));
}
function pcPersonProjectMetrics(rows,launches,exits,range){
 const inRange=date=>pcWithin(date,range.start,range.end),inPlan=date=>pcWithin(date,range.start,range.nominalEnd);
 const counts=records=>pcProjectTypes.map(([type])=>records.filter(row=>ppProjectType(row.type)===type).length);
 const lightCounts=filter=>['红灯','黄灯'].map(light=>rows.filter(row=>filter(row,light)).length);
 return {started:counts(rows.filter(row=>inRange(row.started))),planned:counts(rows.filter(row=>inPlan(ppLatestPlan(row)))),
  launched:counts(launches),delisted:exits.length,lights:lightCounts((row,light)=>row.status===light&&row.projectState==='进行中'),
  newLights:lightCounts((row,light)=>row.ledger.some(risk=>risk.light===light&&inRange(String(risk.recordedAt||'').slice(0,10))))};
}
function pcProductEvents(projects,range,chain=pcChain()){
 const owners=new Map();
 for(const project of projects){
  if(!project.spuId||!project.productOwner||gdTaskPersonEmpty(project.productOwner))continue;
  if(!owners.has(project.spuId))owners.set(project.spuId,new Set());
  owners.get(project.spuId).add(project.productOwner);
 }
 const types={'自研':'自研','自选':'自选','产品迭代':'产品迭代','迭代':'产品迭代'};
 const ownerFor=id=>owners.get(id)?.size===1?[...owners.get(id)][0]:null;
 const iteration=new Set(kpmStrategySamples.filter(row=>row.category==='iteration'&&row.newSpuId).map(row=>row.newSpuId));
 const launches=sampleSpus.flatMap(spu=>{
  if(chain!==null&&spu.chain!==chain)return [];
  const date=upProduct(upIdentity(spu)).actualLaunch,type=iteration.has(spu.spuId)?'产品迭代':types[spu.developmentType];
  if(!type||!pcWithin(date,range.start,range.end))return [];
  return [{type,owner:ownerFor(spu.spuId)}];
 });
 const exits=[...new Set(kpmStrategySamples.filter(row=>row.category==='clearance'&&pcWithin(row.delistedAt,range.start,range.end)).map(row=>row.spuId))]
  .filter(id=>chain===null||upIdentity(id)?.chain===chain).map(id=>({owner:ownerFor(id)}));
 return {launches,exits};
}
function pcPeopleSnapshot(){
 const range=pcPeopleRange(),chain=pcChain(),roster=pcRoster(sampleProjectSource,chain),projects=pcPeopleProjectRows(range),{launches,exits}=pcProductEvents(projects,range,chain);
 return {range,chain,roster,summary:pcPersonProjectMetrics(projects,launches,exits,range),
  rows:roster.map(person=>({...person,values:pcPersonProjectMetrics(projects.filter(row=>row.productOwner===person.name),launches.filter(row=>row.owner===person.name),exits.filter(row=>row.owner===person.name),range)}))};
}
function pcChainMetrics(range,chain){
 const p=pcMetricPeriod(range);
 const monthPeriod={...p,mode:'month'};
 const assessment=nspSuccessPeriod(p),selected=filterCatalog.chainByIndex.map((name,i)=>({name,i})).filter(({i})=>chain===null||i===chain);
 const products=pcWithModulePeriod('new',p,()=>nspRows({start:assessment.start,cutoff:range.end}));
 const grades=pcWithModulePeriod('matrix',p,kpmRows);
 return selected.map(({name,i})=>{
  const sales=msDailySeries(i,monthPeriod,{start:range.start,end:range.end}).reduce((total,row)=>total+row.value,0);
  let target=0;
  for(let month=range.start.slice(0,7);month<=range.nominalEnd.slice(0,7);month=riskMonthShift(month,1)){
   const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate();
   const first=month+'-01',last=iso(new Date(Date.UTC(year,m,0)));
   const start=range.start>first?range.start:first,end=range.nominalEnd<last?range.nominalEnd:last;
   target+=targetGrid(year,'chain')[i][m-1]*(aiFlowDayDiff(start,end)+1)/days;
  }
  const success=nspSuccessSummary(products.filter(row=>row.chain===i),assessment);
  return {name,sales,target,success:success.success,total:success.total,quarter:assessment.key,grades:['S','A','B','C'].map(level=>grades.filter(row=>row.chain===i&&row.level===level).length)};
 });
}
