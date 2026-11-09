const ltStorageKey='lifecycle-quarter-targets-v1';
const ltClone=value=>JSON.parse(JSON.stringify(value));
const ltNumeric=value=>Number.isSafeInteger(value)&&value>=0&&value<=199998;
const ltValidCell=(value,category=0)=>ltNumeric(value)&&value<=(category===3?199998:99999);
const ltConfigured=ltNumeric;
const ltValidGrid=(grid,size=4)=>Array.isArray(grid)&&grid.length===size&&grid.every((row,c)=>Array.isArray(row)&&row.length===9&&row.every(q=>Array.isArray(q)&&q.length===4&&q.every(value=>ltValidCell(value,size===4?c:0)||value===null||value==='none'||value==='draft')));
const ltEmptyGrid=()=>ltCategories.map(()=>ltPlans.map(p=>Array(4).fill(null)));
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
  if(/^\d{4}$/.test(year)&&+year>=2025&&migrated)ltStore.years[year]={...migrated,revision:Number.isSafeInteger(data.revision)?data.revision:0,updatedAt:typeof data.updatedAt==='string'?data.updatedAt:null};
 }
}catch(_){/* 损坏的缓存不覆盖参考样例。 */}
const ltYearValues=year=>ltStore.years[year]?.values||ltEmptyGrid();
// 零目标参与分摊；空目标保留null，不能分摊成三个0。
function ltMonthValue(value,month){if(!ltConfigured(value))return null;const offset=(month-1)%3;return Math.floor(value/3)+(offset<value%3?1:0)}
function ltAggregate(values){
 const known=values.filter(ltConfigured);
 const state=known.length&&known.length===values.length?'complete':known.length?'partial':'missing';
 return {value:state==='complete'?known.reduce((a,b)=>a+b,0):null,state,label:state==='complete'?'':state==='partial'?'目标不完整':'未配置'};
}
function ltTargetFor(stage,categories,period,annual=false,grid=ltYearValues(period.year)){
 const start=annual||period.mode==='year'?1:period.mode==='quarter'?(period.value-1)*3+1:period.value;
 const end=annual||period.mode==='year'?12:period.mode==='quarter'?period.value*3:period.value;
 const configured=[];let total=0;
 for(const c of categories)for(let plan=0;plan<ltPlans.length;plan++)if(ltPlans[plan].stage===stage){
  for(let quarter=Math.floor((start-1)/3);quarter<=Math.floor((end-1)/3);quarter++){
   const value=grid[c][plan][quarter],parts=c===3&&grid===ltYearValues(period.year)?ltStore.years[period.year]?.mergedParts?.[plan]?.[quarter]:null;
   configured.push(...(parts||[value]));
   for(let month=Math.max(start,quarter*3+1);month<=Math.min(end,quarter*3+3);month++)total+=(parts||[value]).reduce((sum,v)=>sum+ltMonthValue(v,month),0);
  }
 }
 const meta=ltAggregate(configured);
 return {...meta,value:meta.state==='complete'?total:null};
}
const ltEditor={year:+dashboardToday().slice(0,4),category:0,error:''};
// 单个合法值即写入；存储失败时保留上一份已生效配置，不提交其他输入。
function ltSetTarget(year,category,plan,quarter,value){
 if(value!==null&&!ltValidCell(value,category))return {ok:false,error:'目标须为0至'+(category===3?'199,998':'99,999')+'的整数'};
 if(ltYearValues(year)[category][plan][quarter]===value)return {ok:true,changed:false};
 try{ltCommitTargetChanges(year,[{category,plan,quarter,before:ltYearValues(year)[category][plan][quarter],after:value}],{kind:'manual'});return {ok:true,changed:true}}
 catch(error){return {ok:false,error:error.message}}
}
