// 实际按部门＋细项＋月份保存，目标独立按部门＋月份保存；金额统一以分计。
const cecKey='cost-efficiency-config-v1',cecCopy=value=>JSON.parse(JSON.stringify(value));
const cecBase={items:cecCopy(ccItems),ledger:cecCopy(ccLedger)};
const cecState={tab:'actual',mode:'month',year:+dashboardToday().slice(0,4),month:+dashboardToday().slice(5,7),department:'',category:'',query:'',page:1};
const cecMonth=(year,month)=>`${year}-${String(month).padStart(2,'0')}`;
const cecRecordKey=(id,month)=>id+'|'+month;
const cecDepartment=id=>ccDepartments.find(d=>d.id===id);
// 页面使用部门正式名称；兼容旧文件的括号备注，不拆分或扣减金额。
function cecDepartmentByName(value){
 const name=String(value||'').trim().replace(/\(/g,'（').replace(/\)/g,'）'),aliases={'采购部（去计划）':'采购部','发货部（去仓储）':'发货部'};
 return ccDepartments.find(d=>d.name===(aliases[name]||name));
}
const cecTime=()=>new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'});
// 时间和人员从同一次更新记录成对取值，汇总时不分别取最大值。
function cecLatestUpdate(records){
 const latest=records.filter(row=>row?.updatedAt).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt)).at(-1);
 return {updatedAt:latest?.updatedAt||'',actor:latest?.actor||''};
}
const cecInput=cents=>cents===null||cents===undefined?'':(cents/100).toFixed(2);
const cecMoney=cents=>cents===null||cents===undefined?'--':(cents/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
function cecAmount(value,signed=false){
 const raw=String(value??'').trim();if(!raw)return null;
 if(!(signed?/^-?\d{1,9}(?:\.\d{1,2})?$/:/^\d{1,9}(?:\.\d{1,2})?$/).test(raw))throw Error((signed?'目标金额须在±999,999,999.99内':'实际金额须为0至999,999,999.99')+'，最多两位小数');
 const [whole,fraction='']=raw.replace(/^-/,'').split('.');return (raw.startsWith('-')?-1:1)*(Number(whole)*100+Number(fraction.padEnd(2,'0')))||0;
}
function cecSeedCell(id,month){
 const row=cecBase.ledger.find(r=>r.itemId===id&&r.month===month);
 const confirmed=row&&!row.actualMissing?row.confirmations.filter(e=>e.date<=DATA_CUTOFF):[];
 const actual=confirmed.length?confirmed.reduce((n,e)=>n+e.cents,0):null;
 return {targetCents:row?.targetCents??null,actualCents:actual,note:'',updatedAt:''};
}
// 旧项目缓存按指标归并，已保存金额相加并保留备注；不重复保留项目层。
function cecMigrate(saved){
 if(saved?.version===4&&saved.metrics&&saved.months&&saved.departmentTargets)return saved;
 if([2,3].includes(saved?.version)&&saved.metrics&&saved.months)return {...saved,version:3,metrics:Object.fromEntries(Object.entries(saved.metrics).map(([id,value])=>[id,saved.version===3?{department:value.department,metricIndex:value.metricIndex,metric:value.metric,...(Object.hasOwn(value,'category')?{category:value.category}:{}),updatedAt:value.updatedAt||''}:{updatedAt:value.updatedAt||''}]))};
 const next={version:3,metrics:{},months:{}};if(saved?.version!==1||!saved.projects||!saved.months)return next;
 const previous=new Map(cecBase.items.map(item=>[item.id,item]));for(const item of Object.values(saved.projects))previous.set(item.id,item);
 const sum=values=>{const known=values.filter(v=>v!==null&&v!==undefined);return known.length?known.reduce((a,b)=>a+b,0):null};
 for(const metric of cecBase.items){
  const members=[...previous.values()].filter(p=>p.department===metric.department&&p.metricIndex===metric.metricIndex);
  const edits=members.map(p=>saved.projects[p.id]).filter(Boolean);if(edits.length)next.metrics[metric.id]={updatedAt:edits.map(p=>p.updatedAt||'').sort().at(-1)};
  const dates=new Set(cecBase.ledger.filter(r=>r.itemId===metric.id).map(r=>r.month));
  for(const key of Object.keys(saved.months))if(members.some(p=>key.startsWith(p.id+'|')))dates.add(key.split('|')[1]);
  for(const month of dates){
   const cells=members.map(p=>({...cecSeedCell(p.id,month),...saved.months[cecRecordKey(p.id,month)]}));
   const value={targetCents:sum(cells.map(c=>c.targetCents)),actualCents:sum(cells.map(c=>c.actualCents)),note:[...new Set(cells.map(c=>c.note).filter(Boolean))].join('；'),updatedAt:cells.map(c=>c.updatedAt||'').sort().at(-1)||''},base=cecSeedCell(metric.id,month);
   if(value.targetCents!==base.targetCents||value.actualCents!==base.actualCents||value.note||value.updatedAt)next.months[cecRecordKey(metric.id,month)]=value;
  }
 }
 return next;
}
let cecStore={version:3,metrics:{},months:{}};
try{cecStore=cecMigrate(JSON.parse(localStorage.getItem(cecKey)||'null'))}catch(_){/* 缓存损坏时保留参考台账。 */}
cecStore=cecMigrateDepartmentTargets(cecStore);
const cecDirectoryUpgrade=cecUpgradeDepartmentDirectory(cecBase,cecStore);
cecBase.items=cecDirectoryUpgrade.items;cecBase.ledger=cecDirectoryUpgrade.ledger;cecStore=cecDirectoryUpgrade.store;
function cecCell(id,month){return {...cecSeedCell(id,month),...cecStore.months[cecRecordKey(id,month)]}}
function cecApplyStore(){
 ccItems.splice(0,ccItems.length,...cecMetricCatalog(cecStore));ccLedger.splice(0,ccLedger.length,...cecCopy(cecBase.ledger));
 for(const row of ccLedger)delete row.targetCents;
 ccMetrics.splice(0,ccMetrics.length,...ccItems.map(item=>({...item,name:item.metric})));
 for(const department of ccDepartments)department.metrics=ccItems.filter(item=>item.department===department.id).map(item=>item.metric);
 for(const [key,value] of Object.entries(cecStore.months)){
  const [itemId,month]=key.split('|');if(!ccItems.some(p=>p.id===itemId)||!/^\d{4}-\d{2}$/.test(month))continue;
  let row=ccLedger.find(r=>r.itemId===itemId&&r.month===month);
  if(!row){row={id:'CB-CONFIG-'+key,itemId,month,actualMissing:true,confirmations:[]};ccLedger.push(row)}

  if(Object.hasOwn(value,'actualCents')){
   const last=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).toISOString().slice(0,10),date=month===DATA_CUTOFF.slice(0,7)?DATA_CUTOFF:last;
   row.actualMissing=value.actualCents===null;row.confirmations=value.actualCents===null?[]:[{id:'CFG-'+key,date,cents:value.actualCents}];
  }
 }
}
function cecCommit(next){
 const saved=cecCopy(next),stamp=cecTime();
 for(const collection of ['metrics','months','departmentTargets'])for(const [key,value]of Object.entries(saved[collection]||{})){
  if(JSON.stringify(value)!==JSON.stringify(cecStore[collection]?.[key]))Object.assign(value,{actor:'管理员',updatedAt:stamp});
 }
 for(const detail of saved.details||[])if(!(cecStore.details||[]).some(row=>row.id===detail.id))Object.assign(detail,{actor:'管理员',updatedAt:stamp});
 try{localStorage.setItem(cecKey,JSON.stringify(saved))}catch(_){throw Error('保存失败，请检查浏览器存储后重试')}
 cecStore=saved;cecApplyStore();ccRender();
}
function cecFiltered(){const q=cecState.query.trim().toLowerCase();return ccItems.filter(p=>(!cecState.department||p.department===cecState.department)&&(!cecState.category||(cecState.category==='unclassified'?!ccCategoryByValue(p.category):p.category===cecState.category))&&(!q||p.metric.toLowerCase().includes(q)))}
cecApplyStore();
function cecPeriod(){return {mode:cecState.mode,year:cecState.year,value:cecState.mode==='month'?cecState.month:cecState.mode==='quarter'?Math.ceil(cecState.month/3):1}}
function cecSelectedMonths(){const p=cecPeriod(),first=p.mode==='year'?1:p.mode==='quarter'?(p.value-1)*3+1:p.value,last=p.mode==='year'?12:p.mode==='quarter'?p.value*3:p.value;return Array.from({length:last-first+1},(_,i)=>cecMonth(p.year,first+i))}
function cecSummaryCell(id){
 const cells=cecSelectedMonths().map(month=>cecCell(id,month));const sum=key=>{const known=cells.map(c=>c[key]).filter(v=>v!==null);return known.length?known.reduce((a,b)=>a+b,0):null};
 return {targetCents:sum('targetCents'),actualCents:sum('actualCents'),note:[...new Set(cells.map(c=>c.note).filter(Boolean))].join('；'),...cecLatestUpdate(cells)};
}
