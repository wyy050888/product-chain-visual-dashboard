// 季度合作目标按供应商去重范围独立配置；年度仅汇总同一范围的四季。
const stStorageKey='supplier-targets-v1',stYears=dashboardYears(1),stClone=value=>JSON.parse(JSON.stringify(value));
// 配置使用完整品牌字典；原有五品牌保留顺序与参考值，新增品牌不虚设目标和等级。
const stBrands=[...scpBrands,...brands.filter(brand=>!scpBrands.some(row=>row[0]===brand)).map(brand=>[brand,''])];
const stStandardFields=[['projectReserved','产品寻源','已储备数量',5],['projectAdmitted','产品寻源','已准入数量',3],['categoryAdmitted','三级类目','已准入数量',3],['materialAdmitted','品牌 × 一级类目 × 核心物料','已准入数量',5]];
const stInteger=value=>Number.isSafeInteger(value)&&value>=0&&value<=99999;
const stGrid=value=>Array.isArray(value)&&value.length===4&&value.every(stInteger);
function stDefaultYear(year){
 const reference=year===2025||year===2026;
 return {machine:[...(scpMachineTargets[year]||[0,0,0,0])],materials:Object.fromEntries(stBrands.map(([brand],bi)=>[brand,{quarters:reference&&bi<scpBrands.length?[...scpBrandTargets[bi]]:[0,0,0,0],categories:Object.fromEntries(pfCategories.map((category,ci)=>[category,reference&&bi<scpBrands.length?[...scpCategoryTargets[(bi+ci)%5]]:[0,0,0,0]]))}])),standards:Object.fromEntries(stStandardFields.map(([key,,,value])=>[key,value]))};
}
let stStore={version:1,years:Object.fromEntries([2025,2026].map(year=>[year,stDefaultYear(year)])),grades:Object.fromEntries(stBrands)};
try{
 const saved=JSON.parse(localStorage.getItem(stStorageKey)||'null');
 if(saved?.version===1){
  for(const year of stYears){const raw=saved.years?.[year];if(!raw||typeof raw!=='object')continue;const value=stDefaultYear(year);
   if(stGrid(raw.machine))value.machine=raw.machine;
   for(const [brand] of stBrands){const source=raw.materials?.[brand];if(stGrid(source?.quarters))value.materials[brand].quarters=source.quarters;for(const category of pfCategories)if(stGrid(source?.categories?.[category]))value.materials[brand].categories[category]=source.categories[category]}
   for(const [key] of stStandardFields)if(stInteger(raw.standards?.[key])&&raw.standards[key]>0)value.standards[key]=raw.standards[key];stStore.years[year]=value;
  }
  for(const [brand] of stBrands)if(['A','B'].includes(saved.grades?.[brand]))stStore.grades[brand]=saved.grades[brand];
 }
}catch(_){/* 缓存损坏时沿用已有参考样例。 */}
const stYear=year=>stStore.years[year]||stDefaultYear(year);
const stMachine=year=>stYear(year).machine;
const stMaterial=(year,brand,category=null)=>category?stYear(year).materials[brand]?.categories[category]||[0,0,0,0]:stYear(year).materials[brand]?.quarters||[0,0,0,0];
const stStandards=year=>stYear(year).standards;
const stGrade=brand=>stStore.grades[brand]||'';
const stTotal=quarters=>quarters.reduce((sum,value)=>sum+value,0);
function stSave(change){
 const next=stClone(stStore);change(next);try{localStorage.setItem(stStorageKey,JSON.stringify(next))}catch(_){return {ok:false,error:'自动保存失败，请检查浏览器存储后重新修改'}}stStore=next;return {ok:true,changed:true};
}
function stSetValue({year,type,brand,category,key,quarter},value){
 if(!stYears.includes(year))return {ok:false,error:'请选择有效年度'};
 if(!stInteger(value)||(type==='standards'&&value===0))return {ok:false,error:type==='standards'?'标准须为1至99,999的整数':'目标须为0至99,999的整数'};
 if(!['machine','material','standards'].includes(type))return {ok:false,error:'目标字段无效'};
 if(type==='standards'&&!stStandardFields.some(row=>row[0]===key))return {ok:false,error:'目标字段无效'};
 if(type!=='standards'&&(!Number.isInteger(quarter)||quarter<0||quarter>3))return {ok:false,error:'目标季度无效'};
 if(type==='material'&&(!stBrands.some(row=>row[0]===brand)||category&&!pfCategories.includes(category)))return {ok:false,error:'品牌或类目无效'};
 const old=type==='standards'?stStandards(year)[key]:type==='machine'?stMachine(year)[quarter]:stMaterial(year,brand,category)[quarter];if(old===value)return {ok:true,changed:false};
 return stSave(next=>{next.years[year]||=stDefaultYear(year);const data=next.years[year];if(type==='standards')data.standards[key]=value;else if(type==='machine')data.machine[quarter]=value;else if(category)data.materials[brand].categories[category][quarter]=value;else data.materials[brand].quarters[quarter]=value});
}
function stSetGrade(brand,grade){if(!stBrands.some(row=>row[0]===brand)||!['A','B'].includes(grade))return {ok:false,error:'请选择A或B等级'};return stGrade(brand)===grade?{ok:true,changed:false}:stSave(next=>next.grades[brand]=grade)}
const ST_BRAND_PAGE_SIZE=10;
const stEditor={type:'machine',year:+dashboardToday().slice(0,4),materialPage:1,openBrands:new Set(),error:''};
function stPageBrands(){const pages=Math.max(1,Math.ceil(stBrands.length/ST_BRAND_PAGE_SIZE));stEditor.materialPage=Math.max(1,Math.min(stEditor.materialPage,pages));return stBrands.slice((stEditor.materialPage-1)*ST_BRAND_PAGE_SIZE,stEditor.materialPage*ST_BRAND_PAGE_SIZE)}
window.supplierTargetsAudit=()=>({year:stEditor.year,type:stEditor.type,materialPage:stEditor.materialPage,store:stClone(stStore),values:stClone(stYear(stEditor.year)),brands:stBrands.map(([brand])=>brand)});
