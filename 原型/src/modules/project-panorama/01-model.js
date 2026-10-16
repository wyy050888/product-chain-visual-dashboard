// 项目全景只适配明确来源字段；日报、项目经理不能代替风险台账及责任链主。
const ppStages={
 '自研开发':['立项筹备期','研发评审期','产品研发期','打样验证期','开模试产期','首批上线期'],
 '自选开发':['产品寻源期','整改测试期','首批上线期'],
 '品质整改':['整改立项','样机制作与测试','改善品生产期','销售与数据回收','改善大货退货率监控数据'],
 '产品迭代':['提需规划期','迭代开发期','首批上线期'],
 '研发创新':['第一阶段：创新需求收集与技术研判','第二阶段：技术可行性评审','第三阶段：创新难点预研','第四阶段：功能手板评审&测试','第五阶段：创新模块评审','第六阶段：专利申请']
};
const ppProjectStates=['进行中','已完成','已暂停/取消','未开始'];
const ppDepartments=['产品部','研发部','采购部','品质部'];
const ppState={category:[],type:[],projectState:['进行中'],brand:[],light:[],stage:[],department:[],owner:'',query:'',plan:null,started:null,page:1,distribution:'type',departmentDistribution:'type',riskDepartment:'全部',link:null,sort:{key:'revisedPlan',direction:'asc'}};
const ppValues=value=>[...new Set((Array.isArray(value)?value:[value]).filter(v=>v!=null&&v!==''&&v!=='—'))];
// 高危红灯是红灯子集；保留原灯色，避免分布和红灯率重复统计。
const ppHighRisk=p=>p.status==='红灯'&&p.delay>15;
const ppMatchesLight=(p,values)=>!values.length||values.some(value=>value==='高危红灯'?ppHighRisk(p):p.status===value);
const ppDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value:null;
function ppAdapt(source,cutoff){
 source=ppSampleQuotes(source);
 const type=({'自研':'自研开发','自选':'自选开发','创新研发':'研发创新','创新项目':'研发创新'})[source.type]||source.type;
 const ledger=(Array.isArray(source.riskLedger)?source.riskLedger:ppSampleLedger(source)).filter(r=>!r.recordedAt||r.recordedAt.slice(0,10)<=cutoff).map(r=>ppRiskFields({...r,...(ppDate(r.closedAt)&&r.closedAt>cutoff?{status:'待整改'}:{}),taskNames:ppValues(r.taskNames).filter(name=>typeof name==='string')},cutoff));
 const stages=ppValues(String(source.stage||'').split(/[,，、]/)).filter(s=>(ppStages[type]||[]).includes(s));
 const actual=ppDate(source.actual)&&source.actual<=cutoff?source.actual:null,plan=ppDate(source.plan);
 const revised=ppDate(source.revisedPlan),revisedPlan=revised&&(!plan||revised>plan)?revised:null;
 const delay=plan&&(actual||source.projectState!=='已完成')?Math.max(0,Math.round((Date.parse(actual||cutoff)-Date.parse(plan))/86400000)):null;
 return {...source,type,category:pfCategory(source),stages,ledger,actual,delay,revisedPlan,
  departments:ppValues(ledger.filter(r=>r.status!=='已闭环').flatMap(r=>ppValues(r.department))).filter(d=>ppDepartments.includes(d)),
  responsible:ppValues(ledger.map(r=>r.owner))};
}
function ppRows(){const cutoff=bounds().cutoff;return [...new Map(projects().filter(p=>!ppDate(p.started)||p.started<=cutoff).map(p=>[p.id,ppAdapt(p,cutoff)])).values()]}
function ppScope(rows){return rows.filter(p=>pfIncludes(ppState.category,p.category)&&pfIncludes(ppState.type,p.type)&&pfIncludes(ppState.projectState,p.projectState))}
function ppFiltered(rows,s=ppState){
 const q=s.query.trim().toLowerCase(),owner=s.owner.trim().toLowerCase(),range=s.plan?nspLaunchRange(s.plan.mode,s.plan.year,s.plan.value):null;
 const startedRange=s.started?nspLaunchRange(s.started.mode,s.started.year,s.started.value):null;
 const includesAny=(filter,values)=>!filter.length||values.some(v=>filter.includes(v));
 return rows.filter(p=>pfIncludes(s.brand,p.brand)&&ppMatchesLight(p,s.light)&&(!s.stage.length||s.stage.some(path=>path.type===p.type&&p.stages.includes(path.stage)))&&includesAny(s.department,p.departments)&&(!owner||p.responsible.some(name=>String(name).toLowerCase().includes(owner)))
  &&(!q||String(p.name||'').toLowerCase().includes(q))
  &&(!range||(p.plan>=range.start&&p.plan<=range.end))&&(!startedRange||(ppDate(p.started)&&p.started>=startedRange.start&&p.started<=startedRange.end))&&ppLinked(p,s.link))
  .sort((a,b)=>ppCompareProjects(a,b,s.sort));
}
function ppLinked(p,link){if(!link)return true;if(link.kind==='light')return link.value==='红黄灯'?['红灯','黄灯'].includes(p.status):ppMatchesLight(p,[link.value]);if(link.kind==='departmentRisk')return p[link.type]===link.value&&ppDepartmentRiskRecords(p,link.department).length>0;if(link.kind==='department')return p.departments.includes(link.value);return p[link.kind]===link.value&&['红灯','黄灯','绿灯'].includes(p.status)}
function ppCounts(rows){const red=rows.filter(p=>p.status==='红灯').length,yellow=rows.filter(p=>p.status==='黄灯').length,green=rows.filter(p=>p.status==='绿灯').length,total=rows.length;return {total,red,high:rows.filter(ppHighRisk).length,yellow,green,rate:n=>total?(n/total*100).toFixed(1)+'%':'—'}}
function ppDepartmentFacts(rows,department){
 const records=rows.flatMap(p=>p.ledger.filter(r=>r.status!=='已闭环'&&ppValues(r.department).includes(department)).map(r=>({project:p,risk:r})));
 const red=records.filter(x=>x.risk.light==='红灯'),yellow=records.filter(x=>x.risk.light==='黄灯');
 const redProjects=[...new Map(records.filter(x=>x.project.status==='红灯').map(x=>[x.project.id,x.project])).values()];
 return {records,red,yellow,redProjects};
}
function ppQuoteLines(p,key){
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

// 使用原始日期排序，缺失值在升降序中均置后；相同值按项目ID稳定排序。
function ppCompareProjects(a,b,sort=ppState.sort){
 const key=sort.key,value=p=>key==='delay'?p.delay:ppDate(p[key]),av=value(a),bv=value(b);
 if(av==null||bv==null)return av==null&&bv==null?a.id-b.id:av==null?1:-1;
 const compared=typeof av==='number'?av-bv:av.localeCompare(bv);
 return compared*(sort.direction==='asc'?1:-1)||a.id-b.id;
}
