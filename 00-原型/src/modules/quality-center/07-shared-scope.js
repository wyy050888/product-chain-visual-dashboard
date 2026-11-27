const qcWeeklyAiReports={
 '2026-10-19':{
  exportedAt:'2026-11-16T02:22:03Z',
  result:'完成新品首批检验 8 批，5 批合格。完成 55 款产品测试。',
  risks:['4 家整机工厂均未通过现场审核，需确认复审和受影响项目。','A955／A956 耐压异常，批次放行待复测确认。']
 }
};
const qcPreviousWeeklyRows=gdWeeklyReportRows,qcPreviousWeeklyTable=gdWeeklyReportTable;
gdWeeklyReportRows=function(){
 const weeks=qcPreviousWeeklyRows();
 if(!qcIsActive())return weeks;
 const scopes=qcAccess.reports;
 if(!scopes.length)return [];
 const rowsByScope=scopes.map(([key])=>[key,pcDepartmentWeeklyRows(weeks,key,key==='quality'?qcWeeklyAiReports:key==='product'?pcWeeklyAiReports:{})]);
 if(rowsByScope.length===1)return rowsByScope[0][1];
 return weeks.map((week,index)=>{
  const departmentReports=Object.fromEntries(rowsByScope.map(([key,rows])=>[key,rows[index]]));
  const rows=Object.values(departmentReports);
  return {...week,departmentReports,reports:Object.assign({},...rows.map(row=>row.reports)),uploadedVersion:rows.find(row=>row.uploadedVersion)?.uploadedVersion};
 });
};
gdWeeklyReportTable=function(weeks){
 if(!qcIsActive())return qcPreviousWeeklyTable(weeks);
 const scopes=qcAccess.reports;
 return pcWeeklyTable(weeks,scopes,scopes.length===1?pcWeeklySummaryColumns:[],pcWeeklyActionCell);
};

function qcDiagnosisDepartment(value){return value==='计划管理部'?'计划部':filterCatalog.normalizeDepartment(value)}
function qcScopedDiagnosisRows(rows,grants){
 return rows.flatMap(row=>{
  const names=row.task?.gdLedger?[row.task.department]:gdAnalysisDepartments(row);
  const categories=[...(row.categories||[]),row.category,row.task?.gdCategory].map(filterCatalog.normalizeChain);
  const departments=[...new Set(names.map(qcDiagnosisDepartment))].filter(name=>Object.hasOwn(grants,name)&&(grants[name]===null||categories.some(value=>grants[name].includes(value))));
  if(!departments.length)return [];
  const department=qcDiagnosisDepartment(row.department);
  const participants=row.participants?.flatMap(person=>{
   const department=qcDiagnosisDepartment(person.department||upTodoPersonDepartment(person.assignee,row.task));
   return departments.includes(department)?[{...person,department}]:[];
  });
  const sources=row.sources?.flatMap(source=>{
   const department=qcDiagnosisDepartment(source.department);
   return !department||departments.includes(department)?[{...source,department}]:[];
  });
  const task=row.task?.gdLedger?{...row.task,department:departments[0]}:row.task;
  return [{...row,department:departments.includes(department)?department:departments[0],departments,participants,sources,task}];
 });
}
const qcPreviousDiagnosis=gdDataset,qcPreviousDiagnosisFilters=gdTableFilters,qcPreviousDiagnosisGroup=gdFilterGroup;
gdDataset=function(){
 const data=qcPreviousDiagnosis();if(!qcIsActive())return data;
 const scoped=(rows,permission)=>qcScopedDiagnosisRows(rows,qcAccess.departments[permission]||{});
 const work=scoped(data.work,'key-work'),deviations=scoped(data.deviations,'deviation');
 return {...data,work,coordination:work,deviations,resource:deviations,
  improvements:scoped(data.improvements,'key-work'),mismatch:scoped(data.mismatch,'deviation'),
  focus:gdFocusGroups(scoped(data.focus.flatMap(row=>row.sources),'key-work')),
  reports:qcScopedDiagnosisRows(data.reports,Object.fromEntries(qcAccess.reports.map(([,name])=>[name,null]))),tasks:scoped(data.tasks,'tasks')};
};
gdTableFilters=function(part=gdState.part,...args){
 const filter=qcPreviousDiagnosisFilters(part,...args);
 if(qcIsActive()&&!qcAllowedDepartments(qcDiagnosisPermissions[part]).includes(filter.department))filter.department='all';
 return filter;
};
gdFilterGroup=function(label,field,options,base,filter){
 if(!qcIsActive()||field!=='department')return qcPreviousDiagnosisGroup(label,field,options,base,filter);
 const departments=qcAllowedDepartments(qcDiagnosisPermissions[gdState.part]);
 return departments.length<2?'':qcPreviousDiagnosisGroup(label,field,[['all','全部'],...departments.map(name=>[name,name])],base,filter);
};

const qcPreviousAnalysisDepartments=ppAnalysisDepartments,qcPreviousAnalysisRows=ppAnalysisRows;
ppAnalysisDepartments=function(){
 return qcIsActive()?qcAllowedDepartments('project-risk'):qcPreviousAnalysisDepartments();
};
ppAnalysisRows=function(){
 if(!qcIsActive())return qcPreviousAnalysisRows();
 const departments=ppAnalysisDepartments();if(!departments.length)return [];
 const rows=qcCan('projects')?qcPreviousAnalysisRows():qcPreviousAnalysisRows(qcPreviousProjectRows());
 return ppAnalysisRowsForDepartments(rows,departments);
};

const qcPreviousProjectRows=ppRows,qcPreviousProjectChains=ppProjectChains;
ppRows=function(...args){
 const rows=qcPreviousProjectRows(...args);
 return qcScope('projects')===null?rows:rows.filter(row=>qcIncludesChain('projects',row.category));
};
ppProjectChains=function(){return qcScope('projects')??qcPreviousProjectChains()};

const qcPreviousNewRows=nspRows,qcPreviousKeyRows=kpmRows;
const qcPreviousUnsold=nspUnsoldSummary,qcPreviousDelivery=nspDeliverySummary;
nspRows=function(...args){
 const rows=qcPreviousNewRows(...args);
 return qcScope('new')===null?rows:rows.filter(row=>qcIncludesChain('new',row.category));
};
kpmRows=function(...args){
 const rows=qcPreviousKeyRows(...args);
 return qcScope('key-products')===null?rows:rows.filter(row=>qcIncludesChain('key-products',row.category));
};
nspUnsoldSummary=function(options){
 return qcIsActive()?qcPreviousUnsold({...options,allowedCategories:qcScope('new')}):qcPreviousUnsold(options);
};
nspDeliverySummary=function(assessment){
 const scope=qcScope('new');
 return scope===null?qcPreviousDelivery(assessment):qcPreviousDelivery(assessment,sampleProjectSource.filter(project=>qcIncludesChain('new',pfCategory(project))));
};

const qcPreviousRiskRender=renderRisks,qcPreviousRankingTabs=rpAvailableRankingTabs,qcPreviousRankingTitle=riskRankingTitle;
function qcRiskKinds(){return rpHomeQualityKinds.filter(kind=>qcCan(qcRiskPermissions[kind]))}
rpAvailableRankingTabs=function(){
 const tabs=qcPreviousRankingTabs();return qcIsActive()?tabs.filter(tab=>qcRiskKinds().includes(tab.kind)):tabs;
};
const qcPreviousRiskRows=rpRowsForPlatform,qcPreviousRiskList=rpListRows,qcPreviousOpenRisk=openRisk;
function qcScopedRiskRows(kind,rows){
 const permission=qcRiskPermissions[kind];
 return !qcIsActive()||!permission||qcScope(permission)===null?rows:rows.filter(row=>qcIncludesChain(permission,pfCategory(rpProduct(row)||row)));
}
rpRowsForPlatform=function(kind,...args){return qcScopedRiskRows(kind,qcPreviousRiskRows(kind,...args))};
rpListRows=function(kind,...args){return qcScopedRiskRows(kind,qcPreviousRiskList(kind,...args))};
openRisk=function(kind,...args){if(!qcIsActive()||qcRiskKinds().includes(kind))return qcPreviousOpenRisk(kind,...args)};
riskRankingTitle=function(){return qcIsActive()?'品质部高危预警榜单 · 完整榜单':qcPreviousRankingTitle()};
renderRisks=function(changedKinds,...args){
 if(!qcIsActive())return qcPreviousRiskRender(changedKinds,...args);
 return rpWithCardRows(()=>withPeriod('risk',()=>{
  rpObserveWarningBoards();
  const rail=$('#riskrail'),partial=Array.isArray(changedKinds)&&rail.querySelector('.rp-board-group-quality');
  const allowed=qcRiskKinds(),kinds=partial?allowed.filter(kind=>changedKinds.includes(kind)):allowed;
  const {cards,rules}=rpHomeCards(kinds);
  if(partial){for(const [kind,markup] of cards){const current=rail.querySelector(`[data-rp-board="${kind}"]`);if(current)current.outerHTML=markup}}
  else rail.innerHTML=`<div class="rp-board-group rp-board-group-quality"><div class="rp-group-grid">${[...cards.values()].join('')}</div></div>`;
  const sub=$('#risk .sectionhead .sub');if(sub)sub.textContent=allowed.length+' 个预警榜单 · TOP 6';
  rpFinishHomeCards(rail,kinds,rules);
  rpMountGroupNavigation(undefined,qualityEntryView.querySelector('.qc-navigation-toolbar'));
 }));
};

const qcExpandedLifeChains=new Set();
const qcPreviousLifeRender=renderLife,qcPreviousLifeFilter=ltCanFilterChains,qcPreviousLifeTotals=ltSelectedTotals;
const qcPreviousLifeMatches=ltChainMatches,qcPreviousLifeChain=ltChainScope,qcPreviousLifeSummary=ltDashboardTotals;
ltChainScope=function(){const scope=qcPreviousLifeChain();return scope==='all'||qcIncludesChain('lifecycle',chains[Number(scope)])?scope:'all'};
ltChainMatches=function(index){return qcIncludesChain('lifecycle',chains[index])&&qcPreviousLifeMatches(index)};
ltDashboardTotals=function(stage,p=periodFor('lifecycle')){
 if(qcScope('lifecycle')===null)return qcPreviousLifeSummary(stage,p);
 const rows=ltDashboardRows(stage,p).filter(row=>qcIncludesChain('lifecycle',row.name));
 const categories=ltCategories.flatMap((name,index)=>qcIncludesChain('lifecycle',name)?[index]:[]);
 const target=ltTargetFor(stage,categories,p),annual=ltTargetFor(stage,categories,p,true);
 return {...lifeSumRows(rows,'汇总'),target:target.value,yearTarget:annual.value,targetMeta:target,yearTargetMeta:annual};
};
ltCanFilterChains=function(){return qcIsActive()?ltDashboardActive():qcPreviousLifeFilter()};
ltSelectedTotals=function(stage,p=periodFor('lifecycle')){
 return qcIsActive()&&stage===ltInnovationStage?ltDashboardTotals(stage,p):qcPreviousLifeTotals(stage,p);
};
renderLife=function(...args){
 const result=qcPreviousLifeRender(...args);
 if(qcIsActive()){
  for(const button of $$('#lifecycle [data-lt-chain]:not([data-lt-chain="all"])'))button.hidden=!qcIncludesChain('lifecycle',chains[Number(button.dataset.ltChain)]);
  if(qcCan('brand'))pcRenderLifecycleBrands(qcExpandedLifeChains);
 }
 return result;
};
document.addEventListener('click',event=>{
 const button=event.target.closest('#quality-department [data-pc-life-chain],#quality-department [data-pc-life-brands]');
 if(button&&qcIsActive()&&qcCan('lifecycle')&&qcCan('brand'))pcToggleLifecycleBrands(button,qcExpandedLifeChains);
});

function qcOpenLifecycleCompletion(scope,stage,chain='all',brand=''){
 if(!qcCan('lifecycle')||brand&&!qcCan('brand'))return;
 withPeriod('lifecycle',()=>{
  const period=periodFor('lifecycle'),plan=ppLifecyclePlans[stage],chainName=chain==='all'?'全部链群':chains[Number(chain)];
  const source=plan?ppLifecycleCompletedProjects(stage,scope,period):lifecycleCompletionProducts(stage,scope,period);
  const records=source.filter(row=>{
   const category=plan?row.category:chains[row.chain];
   return qcIncludesChain('lifecycle',category)&&(!chainName||chain==='all'||category===chainName)&&(!brand||row.brand===brand);
  }).slice().sort((first,second)=>String(plan?second[plan.date]:second.date).localeCompare(String(plan?first[plan.date]:first.date)));
  const title=lifeNames[stage]+' · '+(scope==='year'?'年度累计完成明细':'本期完成明细');
  openModal(title,'<div class="tablewrap" id="qc-life-results"></div><div id="qc-life-pager"></div>',true,[chainName,brand].filter(Boolean).join(' · '));
  const result=$('#qc-life-results'),pager=$('#qc-life-pager');
  function paint(page){
   const size=listPageSize(pager,10);
   const rows=records.slice((page-1)*size,page*size).map(row=>[
    esc(row.name),esc(row.model||'—'),esc(plan?row.category:chains[row.chain]),esc(row.brand||'—'),plan?row[plan.date]:row.date
   ]);
   const dateName=plan?.date==='started'?'立项日期':stage===7?'下市日期':'完成日期';
   result.innerHTML=table([plan?'项目名称':'产品名称','型号','品类','品牌',dateName],rows,'pc-data-table');
   mountListPager(pager,records.length,page,paint);
  }
  paint(1);
 });
}
