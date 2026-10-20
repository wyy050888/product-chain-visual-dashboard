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
const scpState={projectQuery:'',categoryQuery:'',categoryPeriod:scpPeriodDefault(),resourceYear:+DATA_CUTOFF.slice(0,4),materialPeriod:scpPeriodDefault(),openBrands:new Set(),sorts:{projects:{key:'',direction:''},categories:{key:'',direction:''},resources:{key:'',direction:''},materials:{key:'',direction:''}}};
function scpRange(period){const b=bounds(period);return {...b,future:b.start>DATA_CUTOFF}}
function scpActive(s,cutoff){return s.reserved<=cutoff&&(!s.disabled||s.disabled>cutoff)}
function scpScopeRows(scope){
 if(scope.kind==='supplier-list')return scpListScopeRows(scope);
 if(scope.kind==='resource')return scpCompanies.filter(s=>s.kinds.includes('machine')).map(s=>({...s,supplierId:s.id}));
 if(scope.kind==='project')return scpProjectFacts().find(row=>String(row.project.id)===String(scope.id))?.links||[];
 return scpCapabilities.filter(row=>row.kind===scope.kind&&(!scope.categoryId||row.categoryId===scope.categoryId)&&(!scope.category||row.category===scope.category)&&(!scope.group||row.group===scope.group)&&(!scope.brand||row.brand===scope.brand)&&(!scope.material||row.material===scope.material));
}
function scpMembers(scope,metric,range,disabledCutoff=range.cutoff){
 if(range.future)return [];
 const dateKey={reserved:'reserved',admitted:'admitted',newAdmitted:'admitted',cooperated:'cooperation',newCooperation:'cooperation'}[metric],events=new Map();
 for(const row of scpScopeRows(scope)){
  const s=scpCompanyMap.get(row.supplierId);if(!s||s.reserved>range.cutoff||s.disabled&&s.disabled<=disabledCutoff)continue;
  if(!events.has(s.id))events.set(s.id,{...s,scopeDates:{reserved:null,admitted:null,cooperation:null}});
  const entry=events.get(s.id);for(const key of ['reserved','admitted','cooperation'])if(row[key]&&row[key]<=range.cutoff&&(!entry.scopeDates[key]||row[key]<entry.scopeDates[key]))entry.scopeDates[key]=row[key];
 }
 return [...events.values()].filter(s=>s.scopeDates[dateKey]&&(!metric.startsWith('new')||s.scopeDates[dateKey]>=range.start)).map(s=>({...s,date:s.scopeDates[dateKey]})).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
}
function scpStats(scope,range){return Object.fromEntries(['reserved','admitted','newAdmitted','cooperated','newCooperation'].map(metric=>[metric,scpMembers(scope,metric,range).length]))}
const scpRate=(actual,target)=>target>0?actual/target*100:null;
const scpValue=value=>Number.isFinite(value)?fmt(value):'—';
function scpMaterialStats(brand,category,range){
 const scope={kind:'material',brand,...(category?{category}:{})},stats=scpStats(scope,range);
 const target=stTotal(stMaterial(+range.start.slice(0,4),brand,category).slice(Math.floor((range.first-1)/3),Math.ceil(range.last/3))),minimum=stStandards(+range.start.slice(0,4)).materialAdmitted;
 const materials=Object.fromEntries(scpMaterials.map(material=>[material,scpMembers({...scope,material},'admitted',range).length]));
 const shortages=Object.fromEntries(scpMaterials.map(material=>[material,category?materials[material]<minimum:pfCategories.some(name=>scpMembers({...scope,category:name,material},'admitted',range).length<minimum)])),shortage=Object.values(shortages).some(Boolean);
 return {...stats,...materials,target,rate:range.future?null:scpRate(stats.newCooperation,target),shortages,shortage};
}
function scpSort(rows,state,valueOf){return rpSortRows(rows,state,valueOf)}
function scpAnnual(year){const range=scpRange({year,mode:'year',value:1}),target=stTotal(stMachine(year)),stats=scpStats({kind:'resource'},range);return {...stats,target,rate:range.future?null:scpRate(stats.newCooperation,target),range}}
function scpQuarterRows(year){return [1,2,3,4].map(quarter=>{const range=scpRange({year,mode:'quarter',value:quarter}),stats=scpStats({kind:'resource'},range),target=stMachine(year)[quarter-1];return {...stats,quarter,target,rate:range.future?null:scpRate(stats.newCooperation,target),range}})}
window.supplierPlanningAudit=()=>({companies:scpCompanies,categories:scpCategories,capabilities:scpCapabilities,projects:scpProjectFacts().map(row=>({id:row.project.id,name:row.project.name,brand:row.project.brand,procurementLead:row.procurementLead,links:row.links})),annual:scpAnnual(scpState.resourceYear),quarters:scpQuarterRows(scpState.resourceYear),categoryPeriod:{...scpState.categoryPeriod},materialPeriod:{...scpState.materialPeriod},materials:scpBrands.map(([brand])=>({brand,grade:stGrade(brand),stats:scpMaterialStats(brand,null,scpRange(scpState.materialPeriod)),categories:pfCategories.map(category=>({category,stats:scpMaterialStats(brand,category,scpRange(scpState.materialPeriod))}))}))});
