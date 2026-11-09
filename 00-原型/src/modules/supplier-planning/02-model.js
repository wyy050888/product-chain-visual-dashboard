const scpPeriodDefault=()=>({year:+DATA_CUTOFF.slice(0,4),mode:'year',value:1});
// 年度与季度各自保留选择；期间对象仍只保存统计所需的年月粒度。
const scpPeriodQuarters=new WeakMap();
function scpUpdatePeriod(period,field,value){
 if(field==='mode'){
  if(period.mode==='quarter')scpPeriodQuarters.set(period,period.value);
  period.mode=value;period.value=value==='quarter'?(scpPeriodQuarters.get(period)||Math.ceil(+DATA_CUTOFF.slice(5,7)/3)):1;
 }else if(field==='year')period.year=+value;
 else if(field==='quarter'){period.value=+value;scpPeriodQuarters.set(period,period.value)}
}
// 默认列由业务口径明确指定；每个视图拿独立副本，恢复默认不串改其他表。
function scpDefaultSort(scope){
 const rules={projects:['admitted','asc'],categories:['newAdmitted','asc'],materials:['',''],materialSummary:['',''],categoryList:['admitted','asc']};
 const [key,direction]=rules[scope];return {key,direction};
}
const scpState={projectType:'all',projectQuery:'',categoryQuery:'',categoryPeriod:scpPeriodDefault(),resourceYear:+DATA_CUTOFF.slice(0,4),materialPeriod:scpPeriodDefault(),sorts:Object.fromEntries(['projects','categories','materialSummary'].map(scope=>[scope,scpDefaultSort(scope)]))};
function scpRange(period){const b=bounds(period);return {...b,future:b.start>DATA_CUTOFF}}
function scpActive(s,cutoff){return s.reserved<=cutoff&&(!s.disabled||s.disabled>cutoff)}
function scpScopeRows(scope){
 if(scope.kind==='resource')return scpCompanies.filter(s=>s.kinds.includes('machine')).map(s=>({...s,supplierId:s.id}));
 if(scope.kind==='project')return scpProjectFacts().find(row=>String(row.project.id)===String(scope.id))?.links||[];
 return scpCapabilities.filter(row=>row.kind===scope.kind&&(!scope.categoryId||row.categoryId===scope.categoryId)&&(!scope.category||row.category===scope.category)&&(!scope.group||row.group===scope.group)&&(!scope.brand||scpBrandMembers(scope.brand).includes(row.brand)||row.brand===scope.brand)&&(!scope.material||row.material===scope.material));
}
function scpMembers(scope,metric,range,disabledCutoff=range.cutoff){
 if(range.future)return [];
 const dateKey={reserved:'reserved',newReserved:'reserved',admitted:'admitted',newAdmitted:'admitted',cooperated:'cooperation',newCooperation:'cooperation'}[metric],events=new Map();
 for(const row of scpScopeRows(scope)){
  const s=scpCompanyMap.get(row.supplierId);if(!s||s.reserved>range.cutoff||s.disabled&&s.disabled<=disabledCutoff)continue;
  if(!events.has(s.id))events.set(s.id,{...s,scopeDates:{reserved:null,admitted:null,cooperation:null}});
  const entry=events.get(s.id);for(const key of ['reserved','admitted','cooperation'])if(row[key]&&row[key]<=range.cutoff&&(!entry.scopeDates[key]||row[key]<entry.scopeDates[key]))entry.scopeDates[key]=row[key];
 }
 return [...events.values()].filter(s=>s.scopeDates[dateKey]&&(!metric.startsWith('new')||s.scopeDates[dateKey]>=range.start)).map(s=>({...s,date:s.scopeDates[dateKey]})).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
}
function scpStats(scope,range){return Object.fromEntries(['reserved','newReserved','admitted','newAdmitted','cooperated','newCooperation'].map(metric=>[metric,scpMembers(scope,metric,range).length]))}
const scpRate=(actual,target)=>target>0?actual/target*100:null;
const scpValue=value=>Number.isFinite(value)?fmt(value):'—';
// 父级数量直接按供应商身份去重，不累加三级类目或品牌行。
function scpCoreMaterialMembers(brand,categoryId,material,range){
 return new Set(scpMembers({kind:'material',brand,...(categoryId?{categoryId}:{}),material},'newAdmitted',range).map(row=>row.id));
}

function scpMaterialStats(brand,categoryId,range){
 const scope={kind:'material',brand,...(categoryId?{categoryId}:{})},stats=scpStats(scope,range),year=+range.start.slice(0,4);
 const targets=Object.fromEntries(scpMaterials.map(material=>[material,categoryId?stMaterialAnnualTarget(year):null]));
 const materials=Object.fromEntries(scpMaterials.map(material=>[material,categoryId&&!Number.isFinite(targets[material])?null:scpCoreMaterialMembers(brand,categoryId,material,range).size]));
 const shortages=Object.fromEntries(scpMaterials.map(material=>[material,categoryId?Number.isFinite(targets[material])&&materials[material]<targets[material]:scpBrands.filter(([group])=>!brand||group===brand).some(([group])=>stMaterialCategories().some(category=>scpMembers({kind:'material',brand:group,categoryId:category.id,material},'newAdmitted',range).length<stMaterialAnnualTarget(year)))]));
 return {...stats,...materials,targets,shortages,shortage:Object.values(shortages).some(Boolean)};
}
function scpSort(rows,state,valueOf){return rpSortRows(rows,state,valueOf)}
// 三项阶段数量累计到截止日；三个新增分别按阶段日期限定当期。
// 手动年度目标优先，并按年度新增合作重算达成；未配置时保留原独立记录。
function scpAnnual(year){const range=scpRange({year,mode:'year',value:1}),stats=scpStats({kind:'resource'},range),reported=scpResourceReportedMetrics(year),target=stResourceAnnual(year);return {...stats,target,rate:range.future?null:stHasResourceAnnual(year)?scpRate(stats.newCooperation,target):reported.rate,range}}
function scpQuarterRows(year){return [1,2,3,4].map(quarter=>{const range=scpRange({year,mode:'quarter',value:quarter}),stats=scpStats({kind:'resource'},range),reported=scpResourceReportedMetrics(year,quarter);return {...stats,...reported,quarter,rate:range.future?null:reported.rate,range}})}
window.supplierPlanningAudit=()=>({companies:scpCompanies,categories:scpCategories,capabilities:scpCapabilities,projects:scpProjectFacts().map(row=>({id:row.project.id,name:row.project.name,type:row.project.type,brand:row.project.brand,procurementLead:row.procurementLead,links:row.links})),annual:scpAnnual(scpState.resourceYear),quarters:scpQuarterRows(scpState.resourceYear),categoryPeriod:{...scpState.categoryPeriod},materialPeriod:{...scpState.materialPeriod},coverage:scpCoverageRows(),materialTotal:scpMaterialStats(null,null,scpRange(scpState.materialPeriod)),brands:Object.fromEntries(scpBrands.map(([brand])=>[brand,scpBrandMembers(brand)])),materials:scpBrands.map(([brand])=>({brand,stats:scpMaterialStats(brand,null,scpRange(scpState.materialPeriod)),categories:stMaterialCategories().map(category=>({category:category.name,categoryId:category.id,stats:scpMaterialStats(brand,category.id,scpRange(scpState.materialPeriod))}))}))});
