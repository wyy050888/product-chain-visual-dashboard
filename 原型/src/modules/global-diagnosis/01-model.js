// 总诊断持有独立筛选；业务事实读取各模块当前口径，不改动模块筛选。
const gdParts=[['execution','执行诊断'],['closure','任务闭环'],['coordination','产品链紧急协同'],['resource','资源建议']];
const gdTabs={execution:[['reports','日志诊断'],['focus','工作聚焦']],closure:[['all','全部任务'],['suggested','待下发'],['overdue','已逾期'],['pending','待处理'],['working','处理中'],['done','已完成']],coordination:[['all','全部事项'],['block','协同卡点'],['decision','待决策项']],resource:[['all','全部建议'],['capacity','资源缺口'],['conflict','排期冲突']]};
const gdDayRange={start:shiftDate(DATA_CUTOFF,-29),end:DATA_CUTOFF};
const gdState={part:'execution',tabs:{execution:'reports',closure:'all',coordination:'all',resource:'all'},period:drawerPeriodFromRange(gdDayRange),filters:{},pages:{}};
function gdRange(){return uiNaturalPeriodRange(gdState.period,DATA_CUTOFF)}
// 期间只控制总诊断；日区间单独记忆，切换自然周期不覆盖其他九模块。
function gdApplyPeriod(period){
 const range=uiNaturalPeriodRange(period,DATA_CUTOFF);
 if(!range||range.end<aiCoverageStart)return false;
 upCalendarClose?.(false);gdState.period={...period};
 if(period.mode==='day')Object.assign(gdDayRange,range);
 gdRefreshFilters(true);return true;
}
function gdChangePeriod(field,value){
 if(field==='mode'&&value==='day')return gdApplyPeriod(drawerPeriodFromRange(gdDayRange));
 const prior=gdState.period,range=gdRange(),next={...prior};
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
// 日志、聚焦及三个业务表分别持有筛选；时间仍为模块统一范围。
const gdFilterDefaults=(part=gdState.part,tab=gdState.tabs[part])=>({query:'',category:'all',department:'all',reportType:'all',sort:'priority',...(part==='execution'&&tab==='focus'?{issueType:'all'}:{}),...(part==='closure'?{}:{status:'all'})});
function gdFilterKey(part=gdState.part,tab=gdState.tabs[part]){return part==='execution'?part+'/'+tab:part}
function gdTableFilters(part=gdState.part,tab=gdState.tabs[part]){return gdState.filters[gdFilterKey(part,tab)]||=(gdFilterDefaults(part,tab))}
const gdSearchSpecs={
 'execution/reports':{label:'搜索日志',placeholder:'搜索提交人 / 日志内容 / 业务对象',fields:r=>[r.owner,r.progress,r.reportProblem,r.next,r.objectName,r.type]},
 'execution/focus':{label:'搜索工作聚焦',placeholder:'搜索工作事项 / 产品 / 责任人',fields:r=>[r.title,r.objectName,r.problem,r.action,r.owner,r.focusEvidence?.expected,r.focusEvidence?.observed]},
 closure:{label:'搜索任务',placeholder:'搜索任务 / 问题描述 / 负责人 / 下发人',fields:r=>[r.title,r.objectName,r.problem,r.owner,r.task?.assignedBy,r.task?.evidence]},
 coordination:{label:'搜索协同事项',placeholder:'搜索协同事项 / 关联业务 / 参与部门',fields:r=>[r.title,r.objectName,r.problem,...(r.departments||[]),r.owner,r.task?.plan]},
 resource:{label:'搜索资源建议',placeholder:'搜索资源 / 关联业务 / 负责人',fields:r=>[r.resource,r.title,r.objectName,r.owner,r.problem,r.task?.plan]}
};
function gdMatch(row,part=gdState.part,tab=gdState.tabs[part]){const filter=gdTableFilters(part,tab),query=filter.query.trim().toLowerCase(),fields=gdSearchSpecs[gdFilterKey(part,tab)].fields(row);return (part==='closure'||pfIncludes(filter.status,gdStatusValue(row)))&&(part!=='execution'||tab!=='focus'||pfIncludes(filter.issueType,row.issueType))&&pfIncludes(filter.category,row.category)&&(filter.department==='all'||row.department===filter.department)&&(!query||fields.some(v=>String(v||'').toLowerCase().includes(query)))}
function gdRowSort(rows,filter=gdTableFilters()){return [...rows].sort((a,b)=>filter.sort==='due'?String(a.due||'9999').localeCompare(String(b.due||'9999')):filter.sort==='date'?String(b.date).localeCompare(String(a.date)):({red:0,yellow:1,green:2}[a.priority]??1)-({red:0,yellow:1,green:2}[b.priority]??1)||String(a.due||'9999').localeCompare(String(b.due||'9999')))}
