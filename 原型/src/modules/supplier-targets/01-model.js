// v8仅配置年度准入目标；旧季度物料计划归档，不再参与计算。
const stStorageKey='supplier-targets-v1',stYears=dashboardYears(1),stClone=value=>JSON.parse(JSON.stringify(value));
const stStandardDefaults={projectReserved:5,projectAdmitted:3,categoryAdmitted:2,categoryCooperation:1,materialAdmitted:5};
const stInteger=value=>Number.isSafeInteger(value)&&value>=0&&value<=99999;
const stTargetInteger=stInteger;
const stTotal=values=>values.every(stInteger)?values.reduce((sum,value)=>sum+value,0):null;
const stDefaultYear=()=>({resourceAnnual:null,standards:{...stStandardDefaults}});
let stStore={version:8,years:{}},stLoadedValue=localStorage.getItem(stStorageKey);
try{
 const saved=JSON.parse(stLoadedValue||'null');
 if(saved&&Number.isInteger(saved.version)&&saved.version>=1&&saved.version<=8){
  if(saved.version<8)stStore.legacy=stClone(saved);else if(saved.legacy)stStore.legacy=stClone(saved.legacy);
  for(const year of stYears){const raw=saved.years?.[year];if(!raw)continue;const value=stDefaultYear();
   if(stInteger(raw.resourceAnnual))value.resourceAnnual=raw.resourceAnnual;
   for(const key of Object.keys(stStandardDefaults))if(stInteger(raw.standards?.[key])&&raw.standards[key]>0&&(saved.version>=7||['projectReserved','projectAdmitted'].includes(key)))value.standards[key]=raw.standards[key];
   stStore.years[year]=value;
  }
 }
}catch(_){/* 缓存不可用时使用已定义的默认标准，不修改供应商事实。 */}
const stYear=year=>stStore.years[year]||stDefaultYear();
const stStandards=year=>stYear(year).standards;
const stHasResourceAnnual=year=>stInteger(stYear(year).resourceAnnual);
const stResourceAnnual=year=>stHasResourceAnnual(year)?stYear(year).resourceAnnual:scpResourceReportedMetrics(year).target;
function stSave(change){
 if(localStorage.getItem(stStorageKey)!==stLoadedValue)return {ok:false,error:'目标已更新，请刷新后重试'};
 const next=stClone(stStore);change(next);const value=JSON.stringify(next);try{localStorage.setItem(stStorageKey,value)}catch(_){return {ok:false,error:'保存失败，请重试'}}stStore=next;stLoadedValue=value;return {ok:true,changed:true};
}
function stSetValue({year,type,key},value){
 if(!stYears.includes(year))return {ok:false,error:'请选择有效年度'};
 if(type==='standards'){
  if(!Object.hasOwn(stStandardDefaults,key))return {ok:false,error:'目标字段无效'};
  if(!stInteger(value)||value===0)return {ok:false,error:'目标须为1至99,999的整数'};
 }else if(type==='resource'){
  if(!stInteger(value))return {ok:false,error:'年度合作目标须为0至99,999的整数'};
 }else return {ok:false,error:'目标字段无效'};
 const old=type==='standards'?stStandards(year)[key]:stYear(year).resourceAnnual;if(old===value)return {ok:true,changed:false};
 return stSave(next=>{next.years[year]||=stDefaultYear();if(type==='standards')next.years[year].standards[key]=value;else next.years[year].resourceAnnual=value});
}
const stEditor={year:+dashboardToday().slice(0,4),error:''};
window.supplierTargetsAudit=()=>({year:stEditor.year,store:stClone(stStore),values:stClone(stYear(stEditor.year)),brands:scpBrands.map(([brand])=>brand)});
