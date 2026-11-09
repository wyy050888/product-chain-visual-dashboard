// 产品中心只增加展示范围；原始台账与总看板组件保持同一来源。
let pcMounted=false,pcScopeBypass=0;
const pcFixedDepartment=upTodoDepartments.includes('产品中心')?'产品中心':'产品部';
const pcProjectDepartment=ppDepartments.includes('产品中心')?'产品中心':'产品部',pcManagerCategory=filterCatalog.chainByIndex[2],pcManagerChain=2;
function pcProductDepartment(value){return value==='产品中心'||value==='产品部'}
function pcIsActive(){return pcMounted&&dpState.view==='department'&&dwActive==='product'}
function pcChain(){return pcIsActive()&&!pcScopeBypass&&dpState.role==='owner'?pcManagerChain:null}
function pcUnscoped(fn){pcScopeBypass++;try{return fn()}finally{pcScopeBypass--}}
function pcScopeRows(rows){const chain=pcChain();return chain===null?rows:rows.filter(row=>row.chain===chain)}
const pcProductRows=productRows,pcProjects=projects,pcInventoryLedger=inventoryProductLedger;
productRows=function(...args){return pcScopeRows(pcProductRows(...args))};
projects=function(...args){return pcScopeRows(pcUnscoped(()=>pcProjects(...args)))};
inventoryProductLedger=function(...args){return pcScopeRows(pcUnscoped(()=>pcInventoryLedger(...args)))};

// 销售矩阵保留原索引，单品类合计与趋势读取相同品类，不重分配其他品类金额。
const pcSalesCells=msSampleCells,pcSalesDaily=msDailySeries,pcBreakdown=msBreakdown;
msSampleCells=function(...args){
 const rows=pcSalesCells(...args),chain=pcChain();
 return chain===null?rows:rows.map((row,index)=>index===chain?row:row.map(cell=>({...cell,...Object.fromEntries(['sku','sale','target','annual','ytd','gross','targetGross','expense','netSales','salesUnits'].map(key=>[key,0]))})));
};
msDailySeries=function(index,...args){const chain=pcChain();return pcSalesDaily(index<0&&chain!==null?chain:index,...args)};
msBreakdown=function(index,view){const chain=pcChain();return pcBreakdown(index<0&&chain!==null?chain:index,view)};

// 生命周期保留完整行索引供详情定位；概览按相同链群及其目标元数据汇总。
const pcLifeTotals=ltDashboardTotals;
ltDashboardTotals=function(stage,p=periodFor('lifecycle')){
 const chain=pcChain();return chain===null?pcLifeTotals(stage,p):ltDashboardRows(stage,p)[chain];
};
const pcLifeProducts=openLifecycleProducts;
openLifecycleProducts=function(scope,dimension,index){const chain=pcChain();return pcLifeProducts(scope,chain===null?dimension:'chain',chain===null?index:chain)};

// AI共用分析组件，仅收紧其只读数据视图，不修改任务、来源和报告问题。
const pcDiagnosisDataset=gdDataset;
gdDataset=function(){
 const data=pcUnscoped(pcDiagnosisDataset),chain=pcChain();if(!pcIsActive())return data;
 const match=row=>gdAnalysisDepartments(row).some(pcProductDepartment)&&(chain===null||(row.categories||[]).includes(pcManagerCategory));
 const scopeDepartment=row=>({...row,department:pcProductDepartment(row.department)?pcFixedDepartment:row.department,departments:row.departments?.map(value=>pcProductDepartment(value)?pcFixedDepartment:value)});
 const scopeAction=row=>({...scopeDepartment(row),participants:row.participants?.filter(role=>pcProductDepartment(role.department||upTodoPersonDepartment(role.assignee,row.task))).map(role=>({...role,department:pcFixedDepartment}))});
 const work=data.work.filter(match).map(scopeAction),deviations=data.deviations.filter(match).map(scopeAction),improvements=data.improvements.filter(match).map(scopeDepartment),mismatch=data.mismatch.filter(match).map(scopeDepartment),tasks=data.tasks.filter(match).map(scopeAction);
 const focus=gdFocusGroups(data.focus.flatMap(row=>row.sources).filter(source=>pcProductDepartment(source.department)&&(chain===null||(source.categories||[]).includes(pcManagerCategory))).map(scopeDepartment));
 const owners=new Set(pcUnscoped(()=>dpDocuments()).filter(row=>row.chain===chain).map(row=>row.owner));
 const reports=data.reports.filter(row=>gdAnalysisDepartments(row).some(pcProductDepartment)&&(chain===null||owners.has(row.owner)||(row.categories||[]).includes(pcManagerCategory))).map(scopeDepartment);
 return {...data,partLabels:{coordination:'重点工作清单'},work,coordination:work,deviations,improvements,mismatch,resource:deviations,tasks,focus,reports};
};
