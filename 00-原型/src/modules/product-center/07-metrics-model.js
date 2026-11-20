// 截图指标字典。缺少明确台账时保留空值；不同维度的比率由分子、分母重算。
const pcProjectTypes=[['自研开发','自研'],['自选开发','自选'],['产品迭代','迭代']];
const pcProjectMetrics=[
 ...[['started','立项数'],['planned','上品计划数'],['launched','上市数']].map(([key,label])=>[key,label,'自研 / 自选 / 迭代']),
 ['delisted','产品下市数'],['lights','项目红/黄灯数'],
 ['newLights','新增红/黄灯风险数'],['closedLights','闭环红/黄灯风险数']
];
const pcChainProjectMetrics=new Set(['planned','delisted']);
const pcKnowledgeSource='从产品中心知识库识别提取';
const pcPlanningMetrics=[
 ['market','市场分析报告数量',pcKnowledgeSource],['definition','产品定义报告数量',pcKnowledgeSource],
 ['competitor','竞品样机体验与分析报告数量',pcKnowledgeSource],
 ['materials','产品培训资料数量',pcKnowledgeSource],['launchFiles','产品上市资料数量',pcKnowledgeSource],
 ['timeliness','上市资料提供及时率','上市前 60 至 30 天已提供资料的产品数 ÷ 上市产品数','percent'],
 ['training','销售培训与推广次数',pcKnowledgeSource],['linePlanning','产品线规划',pcKnowledgeSource]
];
const pcOperationsMetrics=[
 ['successMeeting','新品上市成功率提拉会议次数',pcKnowledgeSource],
 ['afterSalesMeeting','产品售后分析及供应链管理会议次数',pcKnowledgeSource],
 ['keyProductMeeting','产品链关键单品前后拉通会议次数',pcKnowledgeSource],
 ['brandMeeting','品牌方前后协同周例会次数',pcKnowledgeSource]
];
const pcMetricGroups=[
 ['projects','项目管理',pcProjectMetrics],
 ['planning','竞品分析及产品企划',pcPlanningMetrics],
 ['system','产品档案管理',[
  ['archive','产品档案更新完成率','已完成封样评审且已关联产品档案的项目数 ÷ 已完成封样评审的项目数','percent'],
  ['samples','直播间样机提供及时率','人工导入','percent']
 ]],
 ['operations','产品运营',pcOperationsMetrics]
];
const pcPeopleState={view:'ratings',group:'projects',mode:'month',date:DATA_CUTOFF,pages:{},sorts:{}};
function pcPeoplePeriod(mode=pcPeopleState.mode,date=pcPeopleState.date){
 const month=+date.slice(5,7);
 return {mode,year:+date.slice(0,4),value:mode==='month'?month:mode==='quarter'?Math.ceil(month/3):1};
}
function pcPeopleRange(mode=pcPeopleState.mode,date=pcPeopleState.date){
 if(mode==='week'){
  const [start]=dateRangePreset('week',date),nominalEnd=shiftDate(start,6);
  return {start,end:nominalEnd<DATA_CUTOFF?nominalEnd:DATA_CUTOFF,nominalEnd};
 }
 const {start,end:nominalEnd,cutoff:end}=bounds(pcPeoplePeriod(mode,date));
 return {start,end,nominalEnd};
}
function pcMetricPeriod({start,end}){return {mode:'day',start,end,year:+end.slice(0,4),value:+end.slice(5,7)}}
function pcWithin(value,start,end){return !!ppDate(value)&&value>=start&&value<=end}
function pcWithModulePeriod(module,period,read){
 const old=localPeriods[module];localPeriods[module]=period;
 try{return withPeriod(module,read)}finally{if(old)localPeriods[module]=old;else delete localPeriods[module]}
}
function pcRoster(chain){
 const roster=new Map();
 for(const category of pcMetricChains(chain)){
  for(const name of pcMetricManagerNames(category)){
   if(!roster.has(name))roster.set(name,[]);
   roster.get(name).push(category);
  }
 }
 return [...roster].map(([name,chains])=>({name,chains})).sort((a,b)=>a.name.localeCompare(b.name,'zh'));
}
// 企划演示台账。只在所选期间纳入记录，及时率按分子、分母汇总。
const pcPlanningSamples=[
 {name:'张泽昆',date:'2026-11-09',market:8,definition:5,competitor:6,materials:4,launchFiles:5,onTime:5,launches:6,training:4,linePlanning:2},
 {name:'潘东跃',date:'2026-11-11',market:7,definition:4,competitor:5,materials:3,launchFiles:4,onTime:3,launches:4,training:3,linePlanning:2},
 {name:'侯佳莉',date:'2026-11-10',market:6,definition:4,competitor:4,materials:5,launchFiles:3,onTime:2,launches:3,training:5,linePlanning:1},
 {name:'姚栋',date:'2026-11-13',market:5,definition:3,competitor:4,materials:3,launchFiles:4,onTime:4,launches:4,training:2,linePlanning:2},
 {name:'孟森祥',date:'2026-11-12',market:4,definition:5,competitor:7,materials:2,launchFiles:3,onTime:3,launches:4,training:2,linePlanning:1},
 {name:'张晓阳',date:'2026-11-16',market:3,definition:2,competitor:5,materials:2,launchFiles:3,onTime:2,launches:3,training:1,linePlanning:1},
 {name:'刘萱',date:'2026-11-17',market:2,definition:1,competitor:1,materials:2,launchFiles:2,onTime:1,launches:2,training:3,linePlanning:0},
 {name:'梁勋进',date:'2026-11-18',market:1,definition:2,competitor:0,materials:0,launchFiles:1,onTime:1,launches:1,training:1,linePlanning:3},
 {name:'李亦姮',date:'2026-11-19',market:0,definition:1,competitor:2,materials:3,launchFiles:4,onTime:3,launches:4,training:0,linePlanning:0}
];
const pcPlanningCountKeys=pcPlanningMetrics.map(([key])=>key).filter(key=>key!=='timeliness');
const pcArchiveSamples=[
 {name:'张泽昆',date:'2026-11-09',linked:8,reviews:8,sampleOnTime:5,sampleRequests:6},
 {name:'潘东跃',date:'2026-11-11',linked:9,reviews:10,sampleOnTime:7,sampleRequests:8},
 {name:'侯佳莉',date:'2026-11-10',linked:7,reviews:8,sampleOnTime:5,sampleRequests:5},
 {name:'孟森祥',date:'2026-11-12',linked:4,reviews:5,sampleOnTime:3,sampleRequests:4},
 {name:'张晓阳',date:'2026-11-16',linked:3,reviews:4,sampleOnTime:2,sampleRequests:3},
 {name:'姚栋',date:'2026-11-13',linked:5,reviews:7,sampleOnTime:4,sampleRequests:5},
 {name:'刘萱',date:'2026-11-17',linked:2,reviews:3,sampleOnTime:1,sampleRequests:2},
 {name:'梁勋进',date:'2026-11-18',linked:1,reviews:2,sampleOnTime:1,sampleRequests:1},
 {name:'李亦姮',date:'2026-11-19',linked:0,reviews:2,sampleOnTime:1,sampleRequests:2}
];
const pcOperationsSamples=[
 {name:'张泽昆',date:'2026-11-09',successMeeting:3,afterSalesMeeting:2,keyProductMeeting:4,brandMeeting:3},
 {name:'潘东跃',date:'2026-11-11',successMeeting:2,afterSalesMeeting:3,keyProductMeeting:4,brandMeeting:3},
 {name:'侯佳莉',date:'2026-11-10',successMeeting:2,afterSalesMeeting:2,keyProductMeeting:2,brandMeeting:3},
 {name:'姚栋',date:'2026-11-13',successMeeting:3,afterSalesMeeting:1,keyProductMeeting:3,brandMeeting:4},
 {name:'孟森祥',date:'2026-11-12',successMeeting:2,afterSalesMeeting:3,keyProductMeeting:3,brandMeeting:2},
 {name:'张晓阳',date:'2026-11-16',successMeeting:1,afterSalesMeeting:2,keyProductMeeting:2,brandMeeting:2},
 {name:'刘萱',date:'2026-11-17',successMeeting:2,afterSalesMeeting:1,keyProductMeeting:2,brandMeeting:3},
 {name:'梁勋进',date:'2026-11-18',successMeeting:1,afterSalesMeeting:2,keyProductMeeting:2,brandMeeting:1},
 {name:'李亦姮',date:'2026-11-19',successMeeting:0,afterSalesMeeting:1,keyProductMeeting:1,brandMeeting:0}
];
const pcPersonnelSamples={
 planning:{records:pcPlanningSamples,totals:pcPlanningTotals,defaultSort:{key:'market',direction:'desc'}},
 system:{records:pcArchiveSamples,totals:pcArchiveTotals,defaultSort:{key:'archive',direction:'desc'}},
 operations:{records:pcOperationsSamples,totals:pcOperationsTotals}
};
function pcPlanningTotals(records){
 const sum=key=>records.reduce((total,row)=>total+row[key],0);
 return {...Object.fromEntries(pcPlanningCountKeys.map(key=>[key,sum(key)])),timeliness:msRatio(sum('onTime'),sum('launches'))};
}
function pcArchiveTotals(records){
 const sum=key=>records.reduce((total,row)=>total+row[key],0);
 return {archive:msRatio(sum('linked'),sum('reviews')),samples:msRatio(sum('sampleOnTime'),sum('sampleRequests'))};
}
function pcOperationsTotals(records){
 return Object.fromEntries(pcOperationsMetrics.map(([key])=>[
  key,records.length?records.reduce((total,row)=>total+row[key],0):null
 ]));
}
function pcPersonnelSampleData(roster,chain,range,{records:entries,totals}){
 const names=new Set(roster.map(person=>person.name));
 const records=entries.filter(row=>names.has(row.name)&&pcWithin(row.date,range.start,range.end));
 const rows=roster.flatMap(({name,chains:assigned})=>{
  const values=totals(records.filter(row=>row.name===name));
  return assigned.map(chain=>({name,chain,...values}));
 });
 const summary={name:'汇总',chain:chain===null?'全部':chains[chain],...totals(records)};
 return {rows,summary};
}
function pcPersonnelSortedRows(rows,sort){
 if(!['name','chain'].includes(sort.key))return rpSortRows(rows,sort,(row,key)=>row[key]);
 const labels=[...new Set(rows.map(row=>row[sort.key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh'));
 const ranks=new Map(labels.map((label,index)=>[label,index]));
 return rpSortRows(rows,sort,(row,key)=>ranks.get(row[key]));
}
function pcMetricRowsByChain(rows,chainOf){
 const groups=new Map();
 for(const row of rows){
  const chain=chainOf(row);
  if(!groups.has(chain))groups.set(chain,[]);
  groups.get(chain).push(row);
 }
 return groups;
}
function pcOrderPersonnelMetricRows(rows,sort){
 const groups=pcMetricRowsByChain(pcPersonnelSortedRows(rows,sort),row=>row.chain);
 const order=sort.key==='chain'?[...groups.keys()]:pcMetricChains();
 return order.flatMap(chain=>groups.get(chain)??[]);
}
function pcProjectMetricRows(range){
 const period=pcMetricPeriod(range);
 // 指标按链群汇总。项目全景的部门范围仅用于项目全景。
 return pcWithModulePeriod('projects',period,()=>pcProjectRows(period));
}
const pcProjectTypeCounts=records=>pcProjectTypes.map(([type])=>records.filter(row=>ppProjectType(row.type)===type).length);
const pcProjectCountable=row=>!['已取消','已暂停','已暂停/取消'].includes(row.projectState);
function pcProjectPersonnelCounts(rows,launches,events,range){
 const riskCounts=kind=>ppRiskLights.map(light=>events.filter(event=>event.kind===kind&&event.risk.light===light).length);
 return {started:pcProjectTypeCounts(rows.filter(row=>pcProjectCountable(row)&&pcWithin(row.started,range.start,range.end))),
  launched:pcProjectTypeCounts(launches),lights:ppRiskLights.map(light=>rows.filter(row=>row.status===light&&row.projectState==='进行中').length),
  newLights:riskCounts('new'),closedLights:riskCounts('closed')};
}
function pcProjectPerson(value){
 const people=new Set(ppValues(value).filter(name=>typeof name==='string').map(name=>name.trim()).filter(name=>name&&name!=='待指定'&&name!=='—'));
 return people.size===1?[...people][0]:null;
}
function pcProductEvents(range,projects){
 const types={'自研':'自研','自选':'自选','产品迭代':'产品迭代','迭代':'产品迭代'};
 const iteration=new Set(kpmStrategySamples.filter(row=>row.category==='iteration'&&row.newSpuId).map(row=>row.newSpuId));
 const productOwners=new Map();
 for(const {spuId,chain,productOwner} of projects){
  const name=pcProjectPerson(productOwner);
  if(!spuId||!name||upIdentity(spuId)?.chain!==chain)continue;
  if(!productOwners.has(spuId))productOwners.set(spuId,new Set());
  productOwners.get(spuId).add(name);
 }
 const launches=sampleSpus.flatMap(spu=>{
  const date=upProduct(upIdentity(spu)).actualLaunch,type=iteration.has(spu.spuId)?'产品迭代':types[spu.developmentType];
  if(!type||!pcWithin(date,range.start,range.end))return [];
  const sample=pcResponsibilitySamples[chains[spu.chain]]?.products[spu.spuId];
  const person=pcProjectPerson(spu.productOwner)??pcProjectPerson([...(productOwners.get(spu.spuId)||[])])??sample;
  return [{type,chain:spu.chain,person}];
 });
 const exits=[...new Set(kpmStrategySamples.filter(row=>row.category==='clearance'&&pcWithin(row.delistedAt,range.start,range.end)).map(row=>row.spuId))]
  .map(id=>({chain:upIdentity(id)?.chain}));
 return {launches,exits};
}
function pcMetricChains(scope=pcChain()){return scope===null?filterCatalog.chains:[chains[scope]]}
function pcProjectPeopleRows(names,{projects,launches,events},range){
 return names.map(name=>({name,values:pcProjectPersonnelCounts(projects.filter(row=>pcProjectPerson(row.productOwner)===name),
  launches.filter(row=>row.person===name),events.filter(event=>pcProjectPerson(event.risk.owner)===name),range)}));
}
const pcProjectSuccessSample={chain:'厨电',date:'2026-11-19',success:1,total:4};
function pcIncludeProjectSuccessSample(result,sample){
 const success=result.success+sample.success,total=result.total+sample.total;
 return {...result,success,total,rate:msRatio(success,total),example:true};
}
function pcProjectDashboard(){
 const mode=pcPeopleState.mode,range=pcPeopleRange(),weekly=mode==='week';
 const snapshot=pcActiveProjectSnapshot(),emptyCounts=pcProjectPersonnelCounts([],[],[],range);
 const projects=pcProjectMetricRows(range),{launches,exits}=pcProductEvents(range,projects);
 const events=ppRiskEvents(projects,range);
 const salesPeriod=weekly?pcPeoplePeriod('month',range.nominalEnd):pcPeoplePeriod(mode,range.start);
 const sales=pcWithModulePeriod('sales',salesPeriod,()=>msSampleCells().map((cells,i)=>msFacts(msSum(cells,chains[i]),salesPeriod)));
 const selectedPeriod=pcMetricPeriod(range),assessment=nspSuccessPeriod(selectedPeriod);
 const products=pcWithModulePeriod('new',selectedPeriod,()=>nspRows({start:assessment.start,cutoff:assessment.end}));
 const {rows:deliveries}=nspDeliveryAssessment(sampleProjectSource,nspDeliverySamples,nspDeliveryRange(assessment));
 const deliveryRate=includes=>{
  const due=deliveries.filter(row=>includes(row.category));
  return msRatio(due.filter(row=>row.onTime).length,due.length);
 };
 const gradeRange={start:weekly?shiftDate(range.end,-29):range.start,end:range.end};
 const grades=pcWithModulePeriod('matrix',weekly?pcMetricPeriod(gradeRange):salesPeriod,()=>kpmRows('all'));
 const scopeFor=matches=>({projects:projects.filter(matches),launches:launches.filter(matches),events:events.filter(event=>matches(event.project))});
 const metrics=(matches,scope)=>({
  values:{planned:pcProjectTypeCounts(scope.projects.filter(row=>pcProjectCountable(row)&&pcWithin(ppLatestPlan(row),range.start,range.nominalEnd))),
   delisted:exits.filter(matches).length},
  success:nspSuccessSummary(products.filter(matches),assessment),
  grades:kpmGradeOrder.map(level=>grades.filter(row=>matches(row)&&row.level===level).length)
 });
 const chain=pcChain(),names=pcMetricChains(chain),indices=new Set(names.map(name=>chains.indexOf(name)));
 const demo=pcProjectSuccessSample;
 const demoChain=pcWithin(demo.date,assessment.start,assessment.end)?demo.chain:null;
 const rows=names.map(name=>{
  const index=chains.indexOf(name),matches=row=>row.chain===index,scope=scopeFor(matches);
  const verified=snapshot?.people[name],managers=pcMetricManagerNames(name);
  const people=snapshot?managers.map(person=>({
   name:person,values:{...emptyCounts,...verified?.[person]}
  })):pcProjectPeopleRows(managers,scope,range);
  const chainMetrics=metrics(matches,scope);
  if(name===demoChain&&!chainMetrics.success.total)chainMetrics.success=pcIncludeProjectSuccessSample(chainMetrics.success,demo);
  return {name,sales:sales[index],...chainMetrics,deliveryRate:deliveryRate(category=>category===name),people};
 });
 // 各链群的配置目标先折算成目标利润额，再按汇总金额重算利润率和规模达成。
 const salesTotals=msSum(rows.map(({sales})=>({...sales,targetGross:sales.target*(sales.targetMargin??0)/100})),'汇总');
 const matches=row=>indices.has(row.chain),scope=scopeFor(matches);
 const summary={name:chain===null?'全部':chains[chain],sales:rows.length===1?rows[0].sales:msFacts(salesTotals,salesPeriod),...metrics(matches,scope)};
 summary.deliveryRate=deliveryRate(category=>names.includes(category));
 if(rows.some(row=>row.success.example))summary.success=pcIncludeProjectSuccessSample(summary.success,demo);
 const personnelTotals={...emptyCounts};
 for(const {values} of rows.flatMap(row=>row.people)){
  for(const key of Object.keys(personnelTotals))personnelTotals[key]=personnelTotals[key].map((total,index)=>total+values[key][index]);
 }
 Object.assign(summary.values,personnelTotals);
 const riskPeriod={start:range.start,end:snapshot?.end??(weekly?range.end:range.nominalEnd)};
 return {rows,summary,salesPeriod,quarter:assessment.label,gradeRange,riskPeriod};
}
