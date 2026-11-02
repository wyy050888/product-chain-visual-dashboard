// 目标只属于部门＋月份；首次迁移按旧细项台账汇总，之后不随细项增删或改分类变化。
function cecMigrateDepartmentTargets(store){
 if(store.version===4&&store.departmentTargets)return store;
 const catalog=cecMetricCatalog(store),departmentByItem=new Map(catalog.map(item=>[item.id,item.department]));
 const records=new Map(cecBase.ledger.map(row=>[cecRecordKey(row.itemId,row.month),row.targetCents]));
 for(const [key,value] of Object.entries(store.months))if(Object.hasOwn(value,'targetCents'))records.set(key,value.targetCents);
 const departmentTargets={};
 for(const [key,value] of records){
  const [id,month]=key.split('|'),department=departmentByItem.get(id);if(!department||!Number.isFinite(value))continue;
  const targetKey=cecRecordKey(department,month),before=departmentTargets[targetKey];
  departmentTargets[targetKey]={targetCents:(before?.targetCents??0)+value,updatedAt:[before?.updatedAt||'',store.months[key]?.updatedAt||''].sort().at(-1)};
 }
 const months=Object.fromEntries(Object.entries(store.months).map(([key,value])=>{const {targetCents,...actual}=value;return [key,actual]}));
 return {...store,version:4,months,departmentTargets};
}
function cecDepartmentTargetCell(department,month){return cecStore.departmentTargets[cecRecordKey(department,month)]||{targetCents:null,updatedAt:''}}
function cecAnnualDepartmentTarget(department,year=cecState.year){
 const values=Array.from({length:12},(_,i)=>cecDepartmentTargetCell(department,cecMonth(year,i+1)).targetCents),known=values.filter(Number.isFinite);
 return {values,total:known.length?known.reduce((sum,value)=>sum+value,0):null};
}
function cecDepartmentTargetSummary(department){
 const cells=cecSelectedMonths().map(month=>cecDepartmentTargetCell(department,month)),values=cells.map(cell=>cell.targetCents).filter(Number.isFinite);
 return {targetCents:values.length?values.reduce((sum,value)=>sum+value,0):null,...cecLatestUpdate(cells)};
}
// 看板只汇总部门总目标；细项/分类调用实际模型，不分摊或推算目标。
function cecDepartmentTargetTotal(metrics,range){
 const departments=new Set(metrics.map(metric=>metric.department));let total=null;
 for(const [key,cell] of Object.entries(cecStore.departmentTargets)){
  const [department,month]=key.split('|');
  if(departments.has(department)&&month>=range.first&&month<=range.last&&Number.isFinite(cell.targetCents))total=(total??0)+cell.targetCents;
 }
 return total;
}
