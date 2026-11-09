// 总诊断持有独立筛选；业务事实读取各模块当前口径，不改动模块筛选。
const gdParts=[['coordination','重点工作清单'],['resource','工作偏差预警'],['execution','日周报诊断'],['tasks','任务清单']];
const gdTabs={coordination:[['project','项目卡点'],['high-risk','新增高危']],resource:[['omission','工作遗漏'],['blocker','协同卡点'],['solution','缺少方案'],['focus-shift','资源错配']],execution:[['quality','问题诊断'],['missing','日报未提交']],tasks:[]};
// 提示只解释现有诊断口径，不新增判定阈值。
const gdDeviationStandards={
 omission:'• 业务存在风险或待处理事项。\n• 已收集的会议、日周月报中未见对应工作安排。\n• 仅表示现有材料未发现，不代表实际未开展。',
 blocker:'• 上游所需的资料、确认或交付尚未完成，导致下游工作无法继续推进。\n• 从业务事项中直接识别需要跨部门共同推进或衔接的工作，明确协同部门及各方配合内容。',
 'focus-shift':'• 会议或计划已明确工作分工与优先要求，但同期实际工作记录与既定重点或先后顺序不一致。\n• 排除已批准的优先级调整和专项分工；仅未提及某项工作不直接判定偏移。',
 solution:'• 需要解决的问题已明确，但尚未形成可执行方案。\n• 方案需包含关键条件、实施安排及确认结论。'
};
const gdDayRange={start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF};
const gdState={part:'coordination',tabs:{execution:'quality',coordination:'project',resource:'omission',tasks:'all'},period:drawerPeriodFromRange(gdDayRange),taskPeriod:null,taskDueRange:{start:'',end:''},filters:{},pages:{}};
function gdRange(){return uiNaturalPeriodRange(gdState.period,DATA_CUTOFF)}
// 期间只控制总诊断；日区间单独记忆，切换自然周期不覆盖其他九模块。
function gdApplyPeriod(period){
 if(gdState.part==='tasks')return gdApplyTaskPeriod(period);
 const range=uiNaturalPeriodRange(period,DATA_CUTOFF);
 if(!range||range.end<aiCoverageStart)return false;
 upCalendarClose?.(false);gdState.period={...period};
 if(period.mode==='day')Object.assign(gdDayRange,range);
 gdRefreshFilters(true);return true;
}
function gdChangePeriod(field,value){
 if(field==='mode'&&value==='day')return gdApplyPeriod(drawerPeriodFromRange(gdState.part==='tasks'?gdTaskDayRange:gdDayRange));
 const prior=gdState.part==='tasks'?gdTaskCurrentPeriod():gdState.period,range=uiNaturalPeriodRange(prior,DATA_CUTOFF),next={...prior};
 if(field==='mode'){
  if(!['month','quarter','year'].includes(value))return false;
  const month=prior.mode==='day'?+range.end.slice(5,7):prior.mode==='month'?prior.value:prior.mode==='quarter'?prior.value*3:12;
  Object.assign(next,{mode:value,value:value==='month'?month:value==='quarter'?Math.ceil(month/3):1});
 }else next[field]=Number(value);
 normalizePeriod(next);const selected=uiNaturalPeriodRange(next,DATA_CUTOFF);
 if(selected?.end<aiCoverageStart&&next.year===+aiCoverageStart.slice(0,4))next.value=next.mode==='month'?+aiCoverageStart.slice(5,7):next.mode==='quarter'?Math.ceil(+aiCoverageStart.slice(5,7)/3):1;
 return gdApplyPeriod(next);
}
const gdMoney=cents=>Number.isFinite(cents)?fmt(cents/1000000,2)+'w':'—';
const gdPercent=n=>Number.isFinite(n)?fmt(n,1)+'%':'—';
function gdSourceRange(id){const b=bounds(periodFor(id));return {start:b.start,end:b.cutoff}}
function gdBusinessSources(){
 const sales=window.dashboardSalesReviewSnapshot(),newData=withPeriod('new',()=>{const rows=nspRows();return {rows,success:nspSuccessSummary(rows)}});
 const projectRows=withPeriod('projects',()=>ppRows()),life=withPeriod('lifecycle',()=>lifeNames.map((name,stage)=>({...ltDashboardTotals(stage),name})));
 const key=withPeriod('matrix',()=>kpmRows()),stock=ipStockRecords(inventoryProductLedger()),supplyRange=scpRange(scpState.categoryPeriod);
 const suppliers=scpProjectFacts().map(row=>({...row,stats:scpStats({kind:'project',id:row.project.id},supplyRange)})),cost=ccTotals(ccMetrics,periodFor('cost'),periodFor('cost').mode);
 const riskBoards=withPeriod('risk',()=>[0,1,2,3,4,6].map(kind=>({kind,title:rpTitles[kind],rows:rpCardRows(kind)}))),risk=riskBoards.flatMap(board=>board.rows.map(row=>({...row,gdRiskKind:board.kind,gdRiskTitle:board.title})));
 const source=(id,name,metrics,rows,range=gdSourceRange(id))=>({id,name,metrics,rows,range});
 return [
  source('risk','全局高危预警',riskBoards.map(board=>[board.title,board.rows.length+(board.kind===1?'家':'条')]),risk),
  source('sales','销售达成',[['GSV',msMoney(sales.company.sale)],['利润率',gdPercent(sales.company.actualMargin)],['规模达成率',gdPercent(sales.company.scaleRate)]],sales.chains),
  source('new','新品专项',[['纳入考核',newData.success.total+'个'],['成功',newData.success.success+'个']],newData.rows),
  source('projects','项目进度',[['进行中',projectRows.filter(p=>p.projectState==='进行中').length+'个'],['红灯项目',projectRows.filter(p=>p.status==='红灯').length+'个']],projectRows),
  source('lifecycle','产品全生命周期',[['业务规划',life.length+'类'],['本期完成',life.reduce((n,r)=>n+r.actual,0)+'项']],life),
  source('matrix','关键产品',[['产品数',key.length+'个'],['高销低利',key.filter(p=>p.level==='A').length+'个']],key),
  source('inventory','库存管控',[['我司可售库存',fmt(stock.reduce((n,p)=>n+p.warehouse,0))],['呆滞库存金额',gdMoney(stock.reduce((n,p)=>n+p.staleValueCents,0))]],stock,{start:DATA_CUTOFF,end:DATA_CUTOFF}),
  source('suppliers','供应链采购',[['自研寻源项目',suppliers.length+'个'],['准入不足',suppliers.filter(r=>r.stats.admitted<stStandards(+DATA_CUTOFF.slice(0,4)).projectAdmitted).length+'个']],suppliers,{start:supplyRange.start,end:supplyRange.cutoff}),
  source('cost','降本增效',[['目标降本',gdMoney(cost.target)],['实际降本',gdMoney(cost.actual)],['达成率',gdPercent(cost.rate)]],ccRows(periodFor('cost')))
 ];
}
function gdBusinessContext(sources){
 const by=id=>sources.find(s=>s.id===id),projects=by('projects').rows;
 const project=projects.find(p=>p.projectState==='进行中'&&p.status==='红灯')||projects[0]||ppAdapt(sampleProjectSource[0],DATA_CUTOFF);
 const product=by('matrix').rows.find(p=>p.level==='A')||by('matrix').rows[0]||upProduct([...upSpus.values()].find(p=>p.cohort==='old'));
 const newProduct=by('new').rows.find(p=>p.launchDelayDays>0)||by('new').rows[0]||(()=>{const p=newLaunchFacts(productRows(true))[0];return {...p,category:pfCategory(p),launchDelayDays:null}})();
 const supplier=by('suppliers').rows.find(p=>p.stats.admitted<stStandards(+DATA_CUTOFF.slice(0,4)).projectAdmitted)||by('suppliers').rows[0];
 return {by,project,product,newProduct,supplier};
}
// 各模块分别持有筛选；时间仍为总诊断统一范围。
const gdFilterDefaults=(part=gdState.part,tab=gdState.tabs[part])=>({query:'',category:'all',priority:'all',department:'all',reportType:'all',sort:part==='coordination'?'listedAt':'priority',sortDirection:part==='coordination'?'desc':'asc',status:part==='tasks'?'working':'all'});
function gdFilterKey(part=gdState.part,tab=gdState.tabs[part]){return part+'/'+tab}
function gdTableFilters(part=gdState.part,tab=gdState.tabs[part]){
 const filter=gdState.filters[gdFilterKey(part,tab)]||=(gdFilterDefaults(part,tab));
 // 日报台账不保留旧版报告类型筛选，避免隐藏已确认的未提交记录。
 if(part==='execution'&&tab==='missing')filter.reportType='all';
 return filter;
}
// 部门取实际责任项；跨部门任务可分别出现在每个参与部门下。
function gdRowDepartments(row){return [...new Set((row.participants||[]).map(role=>role.department||upTodoPersonDepartment(role.assignee,row.task)).filter(Boolean))]}
function gdTaskMatches(row,filter){return row.task.gdLedger?gdLedgerMatches(row.task,filter):pfIncludes(filter.status,row.task.status)&&row.participants.some(role=>pfIncludes(filter.department,role.department||upTodoPersonDepartment(role.assignee,row.task)))}
// 一条任务只占一行；部门命中任一负责人即可，整单状态与详情一致。
function gdTaskEntries(rows,filter=gdTableFilters()){
 const tasks=new Map();
 for(const row of rows){
  if(!gdTaskMatches(row,filter))continue;
  let entry=tasks.get(row.task.id);if(!entry){entry={row,rows:[],roles:[]};tasks.set(row.task.id,entry)}
  entry.rows.push(row);
  for(const role of row.participants)if(!entry.roles.some(r=>r.id===role.id))entry.roles.push(role);
 }
 return [...tasks.values()];
}
// 按任务排序后分页；个人进度在任务详情中独立维护。
function gdTableEntries(rows,filter=gdTableFilters()){
 const entries=gdTaskEntries(rows,filter);
 const value=({row},key)=>key==='priority'?upTodoPriorityRank(row.task.priority):key==='due'?Date.parse(row.task.due||''):key==='registered'?Date.parse(row.task.registrationDate||''):row.task.status==='done'?Date.parse(upTodoDate(row.task.completedAt)):NaN;
 return rpSortRows(entries,{key:filter.sort||'priority',direction:filter.sortDirection||'asc'},value);
}
