const ltStorageKey='lifecycle-quarter-targets-v1';
const ltClone=value=>JSON.parse(JSON.stringify(value));
const ltNumeric=value=>Number.isSafeInteger(value)&&value>=0&&value<=99999;
const ltValidCell=value=>value===null||value==='none'||value==='draft'||ltNumeric(value);
const ltValidGrid=grid=>Array.isArray(grid)&&grid.length===5&&grid.every(row=>Array.isArray(row)&&row.length===9&&row.every(q=>Array.isArray(q)&&q.length===4&&q.every(ltValidCell)));
const ltEmptyGrid=()=>ltCategories.map(()=>ltPlans.map(p=>Array(4).fill(p.stage===6?'none':null)));
let ltStore={version:1,years:{2026:{values:ltClone(ltReference2026),revision:0,updatedAt:null}}};
try{
 const saved=JSON.parse(localStorage.getItem(ltStorageKey)||'null');
 if(saved?.version===1&&saved.years)for(const [year,data] of Object.entries(saved.years)){
  if(/^(2025|2026|2027)$/.test(year)&&ltValidGrid(data?.values))ltStore.years[year]={values:ltClone(data.values),revision:Number.isSafeInteger(data.revision)?data.revision:0,updatedAt:typeof data.updatedAt==='string'?data.updatedAt:null};
 }
}catch(_){/* 损坏的缓存不覆盖参考样例。 */}
const ltYearValues=year=>ltStore.years[year]?.values||ltEmptyGrid();
// 月份顺序分配余数；不把“无考核、制定中、未配置”转换成0。
function ltMonthValue(value,month){if(!ltNumeric(value))return value;const offset=(month-1)%3;return Math.floor(value/3)+(offset<value%3?1:0)}
function ltAggregate(values){
 const known=values.filter(ltNumeric),value=known.length?known.reduce((a,b)=>a+b,0):null;
 if(known.length===values.length)return {value,state:'complete',label:''};
 if(values.every(v=>v==='none'))return {value:null,state:'none',label:'无考核'};
 if(values.every(v=>v==='draft'))return {value:null,state:'draft',label:'制定中'};
 if(known.length)return {value,state:'partial',label:values.every(v=>v==='none'||ltNumeric(v))?'部分考核':'待补齐'};
 return {value:null,state:values.some(v=>v==='draft')?'draft':'missing',label:values.some(v=>v==='draft')?'制定中':'未配置'};
}
function ltTargetFor(stage,categories,period,annual=false,grid=ltYearValues(period.year)){
 const start=annual||period.mode==='year'?1:period.mode==='quarter'?(period.value-1)*3+1:period.value;
 const end=annual||period.mode==='year'?12:period.mode==='quarter'?period.value*3:period.value;
 const values=[];
 for(const c of categories)for(let plan=0;plan<ltPlans.length;plan++)if(ltPlans[plan].stage===stage){
  for(let month=start;month<=end;month++)values.push(ltMonthValue(grid[c][plan][Math.floor((month-1)/3)],month));
 }
 return ltAggregate(values);
}
const ltEditor={year:2026,category:0,view:'quarter',drafts:{},dirty:new Set(),error:''};
function ltDraft(year=ltEditor.year){return ltEditor.drafts[year]??=ltClone(ltYearValues(year))}
function ltMarkDirty(){
 const year=ltEditor.year;
 if(JSON.stringify(ltDraft())===JSON.stringify(ltYearValues(year)))ltEditor.dirty.delete(year);else ltEditor.dirty.add(year);
}
function ltDiscard(){ltEditor.drafts={};ltEditor.dirty.clear();ltEditor.error=''}
function ltInvalidCell(){
 for(const year of ltEditor.dirty)for(let c=0;c<5;c++)for(let p=0;p<9;p++)for(let q=0;q<4;q++)if(!ltValidCell(ltDraft(year)[c][p][q]))return {year,c,p,q};
 return null;
}
// 原子保存：校验或浏览器存储失败时保留完整草稿及已生效配置。
function ltPersist(){
 const invalid=ltInvalidCell();
 if(invalid)return {ok:false,invalid,error:'目标须为0至99,999的整数'};
 if(!ltEditor.dirty.size)return {ok:true,changed:false};
 const next=ltClone(ltStore),at=new Date().toISOString();
 for(const year of ltEditor.dirty)next.years[year]={values:ltClone(ltDraft(year)),revision:(ltStore.years[year]?.revision||0)+1,updatedAt:at};
 try{localStorage.setItem(ltStorageKey,JSON.stringify(next))}catch(_){return {ok:false,error:'保存失败，请检查浏览器存储后重试'}}
 ltStore=next;ltDiscard();return {ok:true,changed:true};
}
