const ltStorageKey='lifecycle-quarter-targets-v1';
const ltClone=value=>JSON.parse(JSON.stringify(value));
const ltNumeric=value=>Number.isSafeInteger(value)&&value>=0&&value<=99999;
const ltValidCell=value=>ltNumeric(value);
const ltConfigured=value=>ltNumeric(value)&&value>0;
const ltValidGrid=grid=>Array.isArray(grid)&&grid.length===5&&grid.every(row=>Array.isArray(row)&&row.length===9&&row.every(q=>Array.isArray(q)&&q.length===4&&q.every(value=>ltValidCell(value)||value===null||value==='none'||value==='draft')));
const ltEmptyGrid=()=>ltCategories.map(()=>ltPlans.map(p=>Array(4).fill(0)));
let ltStore={version:2,years:{2026:{values:ltClone(ltReference2026),revision:0,updatedAt:null}}};
try{
 const saved=JSON.parse(localStorage.getItem(ltStorageKey)||'null');
 if([1,2].includes(saved?.version)&&saved.years)for(const [year,data] of Object.entries(saved.years)){
  if(/^(2025|2026|2027)$/.test(year)&&ltValidGrid(data?.values))ltStore.years[year]={values:data.values.map(row=>row.map(quarters=>quarters.map(value=>ltNumeric(value)?value:0))),revision:Number.isSafeInteger(data.revision)?data.revision:0,updatedAt:typeof data.updatedAt==='string'?data.updatedAt:null};
 }
}catch(_){/* 损坏的缓存不覆盖参考样例。 */}
const ltYearValues=year=>ltStore.years[year]?.values||ltEmptyGrid();
// 季度平均拆分到月份，余数按月份先后分配；季度0未配置。
function ltMonthValue(value,month){if(!ltConfigured(value))return 0;const offset=(month-1)%3;return Math.floor(value/3)+(offset<value%3?1:0)}
function ltAggregate(values){
 const known=values.filter(ltConfigured),value=known.length?known.reduce((a,b)=>a+b,0):null;
 const state=known.length===values.length?'complete':known.length?'partial':'missing';
 return {value,state,label:state==='complete'?'':'未配置'};
}
function ltTargetFor(stage,categories,period,annual=false,grid=ltYearValues(period.year)){
 const start=annual||period.mode==='year'?1:period.mode==='quarter'?(period.value-1)*3+1:period.value;
 const end=annual||period.mode==='year'?12:period.mode==='quarter'?period.value*3:period.value;
 const configured=[];let total=0;
 for(const c of categories)for(let plan=0;plan<ltPlans.length;plan++)if(ltPlans[plan].stage===stage){
  for(let quarter=Math.floor((start-1)/3);quarter<=Math.floor((end-1)/3);quarter++){
   const value=grid[c][plan][quarter];configured.push(value);
   for(let month=Math.max(start,quarter*3+1);month<=Math.min(end,quarter*3+3);month++)total+=ltMonthValue(value,month);
  }
 }
 const meta=ltAggregate(configured);
 return total>0?{...meta,value:total}:{value:null,state:'missing',label:'未配置'};
}
const ltEditor={year:2026,category:0,error:''};
// 单个合法值即写入；存储失败时保留上一份已生效配置，不提交其他输入。
function ltSetTarget(year,category,plan,quarter,value){
 if(!ltValidCell(value))return {ok:false,error:'目标须为0至99,999的整数'};
 if(ltYearValues(year)[category][plan][quarter]===value)return {ok:true,changed:false};
 const next=ltClone(ltStore),values=ltClone(ltYearValues(year));
 values[category][plan][quarter]=value;
 next.years[year]={values,revision:(ltStore.years[year]?.revision||0)+1,updatedAt:new Date().toISOString()};
 try{localStorage.setItem(ltStorageKey,JSON.stringify(next))}catch(_){return {ok:false,error:'自动保存失败，请检查浏览器存储后重新修改'}}
 ltStore=next;return {ok:true,changed:true};
}
