// 项目全景只适配明确来源字段；日报、项目经理不能代替风险台账及责任链主。
const ppStages={
 '自研开发':['立项筹备期','研发评审期','产品研发期','打样验证期','开模试产期','首批上线期'],
 '自选开发':['产品寻源期','整改测试期','首批上线期'],
 '品质整改':['整改立项','样机制作与测试','改善品生产期','销售与数据回收','改善大货退货率监控数据'],
 '产品迭代':['提需规划期','迭代开发期','首批上线期'],
 '研发创新':['第一阶段：创新需求收集与技术研判','第二阶段：技术可行性评审','第三阶段：创新难点预研','第四阶段：功能手板评审&测试','第五阶段：创新模块评审','第六阶段：专利申请']
};
const ppProjectStates=['进行中','已完成','已暂停/取消','未开始'];
// 项目风险责任部门目录，供风险分布、明细筛选和根因页签共用。
const ppDepartments=['产品中心','品质中心','研发中心','采购部'];
const ppRiskLights=['红灯','黄灯'];
const ppProjectLights=['红灯','黄灯','绿灯'];
const ppState={category:[],type:[],projectState:['进行中'],brand:[],light:[],riskLight:[],stage:[],department:[],query:'',plan:null,actual:null,started:null,page:1,distribution:'type',riskDepartment:'全部',link:null,sort:{key:'plan',direction:'asc'}};
const ppValues=value=>[...new Set((Array.isArray(value)?value:[value]).filter(v=>v!=null&&v!==''&&v!=='—'))];
// 只归一明确的部门别名，不从项目经理或任务内容推断责任部门。
const ppDepartmentValues=value=>ppValues(ppValues(value).map(filterCatalog.normalizeDepartment));
function ppMatchesRiskDepartment(risk,department){
 const selected=department==='全部'?department:filterCatalog.normalizeDepartment(department);
 return ppDepartmentValues(risk.department).some(name=>ppDepartments.includes(name)&&(selected==='全部'||name===selected));
}
// 兼容旧记录中的高危红灯，项目灯色与延期天数各自取值。
function ppNormalizeProjectLight(light){return light==='高危红灯'?'红灯':light}
const ppMatchesLight=(p,values)=>!values.length||values.includes(p.status);
const ppDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value:null;
function ppProjectType(type){return ({'自研':'自研开发','自选':'自选开发','创新研发':'研发创新','创新项目':'研发创新'})[type]||type}
function ppProjectLight(source){return ppNormalizeProjectLight(source.status)||null}
function ppAdapt(source,cutoff){
 source=ppSampleQuotes(ppSampleSchedule(source));
 const type=ppProjectType(source.type);
 const ledger=(Array.isArray(source.riskLedger)?source.riskLedger:ppSampleLedger(source)).filter(r=>!r.recordedAt||r.recordedAt.slice(0,10)<=cutoff).map(r=>ppRiskFields({...r,department:Array.isArray(r.department)?ppDepartmentValues(r.department):r.department==null?r.department:filterCatalog.normalizeDepartment(r.department),...(ppDate(r.closedAt)&&r.closedAt>cutoff?{status:'待整改'}:{}),taskNames:ppValues(r.taskNames).filter(name=>typeof name==='string')},cutoff));
 const stages=ppValues(String(source.stage||'').split(/[,，、]/)).filter(s=>(ppStages[type]||[]).includes(s));
 const actual=ppDate(source.actual)&&source.actual<=cutoff?source.actual:null,plan=ppDate(source.plan);
 const revised=ppDate(source.revisedPlan),revisedPlan=revised&&(!plan||revised>plan)?revised:null;
 const delay=plan&&(actual||source.projectState!=='已完成')?Math.max(0,Math.round((Date.parse(actual||cutoff)-Date.parse(plan))/86400000)):null;
 return {...source,type,status:ppProjectLight(source),category:pfCategory(source),stages,ledger,actual,delay,revisedPlan,
  departments:ppValues(ledger.filter(r=>r.status!=='已闭环').flatMap(r=>ppValues(r.department))).filter(d=>ppDepartments.includes(d)),
  responsible:ppValues(ledger.map(r=>r.owner))};
}
// 原始项目范围共用截止日与ID去重；数量汇总无需重复构建风险台账。
function ppSourceRows(p=periodFor()){const cutoff=bounds(p).cutoff;return [...new Map(projects().filter(project=>!ppDate(project.started)||project.started<=cutoff).map(project=>[project.id,project])).values()]}
function ppRows(p=periodFor()){const cutoff=bounds(p).cutoff;return ppSourceRows(p).map(source=>ppAdapt(source,cutoff))}
// 日期限定当前项目范围，顶部概览和下方列表共同遵守；灯色联动仍不改变分母。
function ppScope(rows,state=ppState){return rows.filter(p=>pfIncludes(state.category,p.category)&&pfIncludes(state.type,p.type)&&pfIncludes(state.projectState,p.projectState)&&ppMatchesDates(p,state))}
function ppMatchesDates(project,state){return ['plan','actual','started'].every(key=>{const range=ppDateRange(state[key]);return !range||(ppDate(project[key])&&project[key]>=range.start&&project[key]<=range.end)})}
function ppDateRange(selection){
 if(!selection)return null;
 return selection.mode==='range'?{start:selection.start,end:selection.end}:nspLaunchRange(selection.mode,selection.year,selection.value);
}
function ppDateSelectionLabel(selection){return selection?.mode==='range'?selection.start+' — '+selection.end:nspLaunchLabel(selection)}
// 项目明细默认只展示红黄灯；部门分析显式传入自己的风险灯色范围。
function ppVisibleRisks(project,allowedLights=ppRiskLights){return (project.ledger||[]).filter(risk=>allowedLights.includes(risk.light))}
function ppSelectedRisks(project,state=ppState){
 const ledger=ppVisibleRisks(project,state.allowedRiskLights||ppRiskLights),lights=state.riskLight||[],departments=ppDepartmentValues(state.department||[]);
 if(!lights.length&&!departments.length)return ledger;
 return ledger.filter(risk=>(state.includeClosedRisks||risk.status!=='已闭环')&&(!lights.length||lights.includes(risk.light))
  &&(!departments.length||ppDepartmentValues(risk.department).some(department=>departments.includes(department))));
}
function ppMatchesRisk(project,state){
 return !(state.riskLight?.length||state.department?.length)||ppSelectedRisks(project,state).length>0;
}
function ppFiltered(rows,s=ppState){
 const q=s.query.trim().toLowerCase();
 return rows.filter(p=>pfIncludes(s.brand,p.brand)&&ppMatchesLight(p,s.light)&&(!s.stage.length||s.stage.some(path=>path.type===p.type&&p.stages.includes(path.stage)))&&ppMatchesRisk(p,s)
  &&(!q||[p.name,...ppSelectedRisks(p,s).flatMap(r=>[r.rootCause||r.description,r.owner])].some(value=>String(value||'').toLowerCase().includes(q)))
  &&ppMatchesDates(p,s)&&ppLinked(p,s.link))
  .sort((a,b)=>ppCompareProjects(a,b,s.sort));
}
function ppDetailScope(rows){return rows.filter(project=>project.status==='红灯'||project.status==='黄灯')}
function ppDetailRows(rows,state=ppState){return ppFiltered(ppDetailScope(rows),state)}
function ppLinked(p,link){if(!link)return true;if(link.kind==='light')return link.value==='红黄灯'?['红灯','黄灯'].includes(p.status):ppMatchesLight(p,[link.value]);if(link.kind==='departmentRisk')return p[link.type]===link.value&&ppDepartmentRiskRecords(p,link.department).length>0;if(link.kind==='department')return p.departments.includes(link.value);return p[link.kind]===link.value&&['红灯','黄灯','绿灯'].includes(p.status)}
function ppCounts(rows){const red=rows.filter(p=>p.status==='红灯').length,yellow=rows.filter(p=>p.status==='黄灯').length,green=rows.filter(p=>p.status==='绿灯').length,total=rows.length;return {total,red,yellow,green,rate:n=>total?(n/total*100).toFixed(1)+'%':'—'}}
// 报价适用范围按项目类型区分；不适用与适用但缺数据分别展示。
function ppQuoteApplicable(project,key){
 const fields={'自研开发':['targetCosts','targetPrices','finalQuotes'],'自选开发':['targetCosts','targetPrices','finalQuotes'],
  '品质整改':[],'产品迭代':['targetPrices'],'研发创新':['finalQuotes']}[ppProjectType(project.type)];
 return !fields||fields.includes(key);
}
function ppQuoteLines(p,key){
 if(!ppQuoteApplicable(p,key))return [];
 const rows=p[key];
 if(Array.isArray(rows))return rows.flatMap(r=>{
  const version=r.version&&r.version!=='无'?r.version+'－':'';
  const fields=key==='targetPrices'?[['price','目标售价']]:[['factory','工厂供价'],['channel','渠道供价'],['company','公司供价']];
  return fields.filter(([k])=>typeof r[k]==='number'&&Number.isFinite(r[k])).map(([k,label])=>version+label+'：'+r[k].toFixed(2)+'元');
 });
 // 导入表仅有单一金额时如实展示；不补造版本、供价类型或最终报价。
 const legacy=key==='targetCosts'?p.cost:key==='targetPrices'?p.price:null;
 return typeof legacy==='number'&&Number.isFinite(legacy)?[legacy.toFixed(2)+'元']:[];
}

// 计划上线日期按原计划、延期日期中的较晚者排序；单个缺失时采用另一个日期。
function ppLatestPlan(project){
 const plan=ppDate(project.plan),revised=ppDate(project.revisedPlan);
 return plan&&revised?(plan>revised?plan:revised):plan||revised;
}
// 缺失值在升降序中均置后；相同值按项目ID稳定排序。
function ppCompareProjects(a,b,sort=ppState.sort){
 const key=sort.key,value=p=>key==='plan'?ppLatestPlan(p):key==='delay'?p.delay:ppDate(p[key]),av=value(a),bv=value(b);
 if(av==null||bv==null)return av==null&&bv==null?a.id-b.id:av==null?1:-1;
 const compared=typeof av==='number'?av-bv:av.localeCompare(bv);
 return compared*(sort.direction==='asc'?1:-1)||a.id-b.id;
}
