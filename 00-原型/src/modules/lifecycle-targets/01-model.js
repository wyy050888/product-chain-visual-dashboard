const ltStorageKey='lifecycle-quarter-targets-v1';
const ltClone=value=>JSON.parse(JSON.stringify(value));
const ltNumeric=value=>Number.isSafeInteger(value)&&value>=0&&value<=199998;
const ltTargetLimit=(category,brand='')=>category===3&&!brand?199998:99999;
const ltValidCell=(value,category=0,brand='')=>ltNumeric(value)&&value<=ltTargetLimit(category,brand);
const ltConfigured=ltNumeric;
const ltSupportsBrand=(category,brand,plan)=>Boolean(ltCategories[category]&&typeof brand==='string'&&brand.trim()&&ltPlans[plan]&&ltPlans[plan].stage!==ltInnovationStage);
const ltValidGrid=(grid,size=4)=>Array.isArray(grid)&&grid.length===size&&grid.every((row,c)=>Array.isArray(row)&&row.length===9&&row.every(q=>Array.isArray(q)&&q.length===4&&q.every(value=>ltValidCell(value,size===4?c:0)||value===null||value==='none'||value==='draft')));
const ltEmptyGrid=()=>ltCategories.map(()=>ltPlans.map(p=>Array(4).fill(null)));
function ltReadBrandTargets(data){
 return Object.fromEntries(ltCategories.flatMap((_,category)=>{
  const entries=Object.entries(data?.[category]??{}).filter(([brand,rows])=>brand.trim()&&Array.isArray(rows)).map(([brand,rows])=>{
   return [brand,ltPlans.map((plan,p)=>Array.from({length:4},(_,q)=>ltSupportsBrand(category,brand,p)&&ltValidCell(rows[p]?.[q])?rows[p][q]:null))];
  });
  return entries.length?[[category,Object.fromEntries(entries)]]:[];
 }));
}
// 旧五类目标按环境、清洁、厨电、个护&健康迁移；保留合并前拆分，历史月份及未配置状态不漂移。
function ltReadChainYear(data){
 const clean=grid=>grid.map(row=>row.map(q=>q.map(v=>ltNumeric(v)?v:null)));
 if(ltValidGrid(data?.values)){
  const values=clean(data.values),parts=data.mergedParts;
  const mergedParts=Array.isArray(parts)&&parts.length===9?parts.map((q,p)=>Array.from({length:4},(_,i)=>Array.isArray(q?.[i])&&q[i].length===2&&q[i].every(v=>v===null||ltNumeric(v))&&ltAggregate(q[i]).value===values[3][p][i]?[...q[i]]:null)):null;
  return {values,...(mergedParts?{mergedParts}:{})};
 }
 if(!ltValidGrid(data?.values,5))return null;
 const old=clean(data.values),mergedParts=old[2].map((q,p)=>q.map((v,i)=>[v,old[3][p][i]]));
 return {values:[old[0],old[1],old[4],mergedParts.map(q=>q.map(pair=>ltAggregate(pair).value))],mergedParts};
}
let ltStore={version:3,history:[],years:{2026:{...ltReadChainYear({values:ltReference2026}),revision:0,updatedAt:null}}},ltStorageSnapshot=null;
try{
 ltStorageSnapshot=localStorage.getItem(ltStorageKey);
 const saved=JSON.parse(ltStorageSnapshot||'null');
 if(Array.isArray(saved?.history))ltStore.history=saved.history.filter(row=>row&&['manual','import','import-error'].includes(row.kind)&&Array.isArray(row.changes)&&Array.isArray(row.errors));
 if([1,2,3].includes(saved?.version)&&saved.years)for(const [year,data] of Object.entries(saved.years)){
  const migrated=ltReadChainYear(data);
  if(/^\d{4}$/.test(year)&&+year>=2025&&migrated){
   const brandValues=ltReadBrandTargets(data.brandValues);
   ltStore.years[year]={...migrated,...(Object.keys(brandValues).length?{brandValues}:{}),revision:Number.isSafeInteger(data.revision)?data.revision:0,updatedAt:typeof data.updatedAt==='string'?data.updatedAt:null};
  }
 }
}catch(_){/* 损坏的缓存不覆盖参考样例。 */}
const ltYearValues=year=>ltStore.years[year]?.values||ltEmptyGrid();
function ltBrandsFor(year,category){
 const saved=ltStore.years[year]?.brandValues?.[category]??{};
 return [...new Set([...ltSampleCategoryBrands[category],...ltDefaultBrands,...Object.keys(saved)])];
}
function ltTargetRows(year,category,brand=''){
 if(!brand)return ltYearValues(year)[category];
 const saved=ltStore.years[year]?.brandValues?.[category]??{};
 if(Object.hasOwn(saved,brand))return saved[brand];
 return year===2026?ltSampleBrandTargets(category,brand):ltPlans.map(()=>Array(4).fill(null));
}
// 零目标参与分摊；空目标保留null，不能分摊成三个0。
function ltMonthValue(value,month){if(!ltConfigured(value))return null;const offset=(month-1)%3;return Math.floor(value/3)+(offset<value%3?1:0)}
function ltAggregate(values){
 const known=values.filter(ltConfigured);
 const state=known.length&&known.length===values.length?'complete':known.length?'partial':'missing';
 return {value:state==='complete'?known.reduce((a,b)=>a+b,0):null,state,label:state==='complete'?'':state==='partial'?'目标不完整':'未配置'};
}
function ltTargetFor(stage,categories,period,annual=false,grid=ltYearValues(period.year)){
 return ltPeriodTarget(stage,categories,period,annual,(category,plan,quarter)=>{
  const parts=category===3&&grid===ltYearValues(period.year)?ltStore.years[period.year]?.mergedParts?.[plan]?.[quarter]:null;
  return parts||[grid[category][plan][quarter]];
 });
}
function ltBrandTargetFor(stage,category,brand,period,annual=false){
 if(!brand||stage===ltInnovationStage)return ltAggregate([]);
 const rows=ltTargetRows(period.year,category,brand);
 return ltPeriodTarget(stage,[category],period,annual,(_,plan,quarter)=>[rows[plan][quarter]]);
}
function ltPeriodTarget(stage,categories,period,annual,readQuarter){
 const start=annual||period.mode==='year'?1:period.mode==='quarter'?(period.value-1)*3+1:period.value;
 const end=annual||period.mode==='year'?12:period.mode==='quarter'?period.value*3:period.value;
 const configured=[];let total=0;
 for(const c of categories)for(let plan=0;plan<ltPlans.length;plan++)if(ltPlans[plan].stage===stage){
  for(let quarter=Math.floor((start-1)/3);quarter<=Math.floor((end-1)/3);quarter++){
   const parts=readQuarter(c,plan,quarter);
   configured.push(...parts);
   for(let month=Math.max(start,quarter*3+1);month<=Math.min(end,quarter*3+3);month++)total+=parts.reduce((sum,v)=>sum+ltMonthValue(v,month),0);
  }
 }
 const meta=ltAggregate(configured);
 return {...meta,value:meta.state==='complete'?total:null};
}
const ltEditor={year:+dashboardToday().slice(0,4),category:0,expandedPlans:new Set(),error:''};
// 单个合法值即写入；存储失败时保留上一份已生效配置，不提交其他输入。
function ltSetTarget(year,category,plan,quarter,value,brand=''){
 if(brand&&!ltSupportsBrand(category,brand,plan))return {ok:false,error:'该计划不支持当前品牌目标'};
 const limit=ltTargetLimit(category,brand);
 if(value!==null&&!ltValidCell(value,category,brand))return {ok:false,error:'目标须为0至'+limit.toLocaleString('en-US')+'的整数'};
 const before=ltTargetRows(year,category,brand)[plan][quarter];
 if(before===value)return {ok:true,changed:false};
 try{ltCommitTargetChanges(year,[{category,plan,quarter,before,after:value,...(brand?{brand}:{})}],{kind:'manual'});return {ok:true,changed:true}}
 catch(error){return {ok:false,error:error.message}}
}
