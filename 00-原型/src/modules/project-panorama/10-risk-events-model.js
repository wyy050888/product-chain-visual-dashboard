// 固定样例补充真实业务所需的创建/闭环日期；仅由样例台账调用，不覆盖导入台账。
function ppSampleRiskEvents(source,records){
 const index=Math.abs(Number(source.id)||0),day=offset=>new Date(Date.UTC(2026,8,20+offset)).toISOString().slice(0,10);
 const started=ppDate(source.started)||'2026-01-01';
 const result=records.map((r,i)=>({...r,recordedAt:[started,day((index+i*3)%20)].sort().at(-1)}));
 if(index%3===0&&records.length){
  const closedAt=day(10+index%11),recordedAt=[started,day(index%9)].sort().at(-1);
  if(recordedAt<=closedAt)result.push({...records[0],id:`demo-${source.sourceKey}-closed`,light:index%2?'红灯':'黄灯',recordedAt,closedAt,status:'已闭环'});
 }
 return result.map((risk,i)=>ppSampleRiskFields(source,risk,i));
}
const ppEventState={range:null,department:'全部'};
function ppEventDepartment(){return pcIsActive()?ppState.riskDepartment:ppEventState.department}
function ppEventRange(){
 const today=dashboardToday();
 return ppEventState.range||{start:today,end:today};
}
function ppEventDateOffset(date,offset){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)}
function ppEventRows(range,currentRows){
 // 历史事件不按项目当前状态排除已完成项目；只跟随顶部项目类型/类目。
 const rows=currentRows&&range.end===bounds().cutoff?currentRows:ppRows({mode:'day',...range});
 return rows.filter(p=>pfIncludes(ppState.category,p.category)&&pfIncludes(ppState.type,p.type));
}
function ppRiskEvents(rows,range){
 const seen=new Set(),events=[];
 for(const project of rows)for(const [index,risk] of project.ledger.entries()){
  if(!ppRiskLights.includes(risk.light))continue;
  const id=project.id+':'+(risk.id??index);if(seen.has(id))continue;seen.add(id);
  const created=ppDate(risk.recordedAt?.slice(0,10)),closed=ppDate(risk.closedAt?.slice(0,10));
  if(created&&created>=range.start&&created<=range.end)events.push({project,risk,kind:'new',date:created});
  if(closed&&(!created||closed>=created)&&closed>=range.start&&closed<=range.end)events.push({project,risk,kind:'closed',date:closed});
 }
 return events;
}
function ppEventGroups(rows,range,dimension,department){
 const events=ppRiskEvents(rows,range).filter(e=>ppMatchesRiskDepartment(e.risk,department)),keys=dimension==='type'?Object.keys(ppStages):pfCategories;
 return keys.map(key=>({key,new:events.filter(e=>e.kind==='new'&&e.project[dimension]===key),closed:events.filter(e=>e.kind==='closed'&&e.project[dimension]===key)}));
}
window.projectRiskEventsAudit=()=>withPeriod('projects',()=>{
 const range=ppEventRange(),rows=ppEventRows(range),state={...ppEventState,dimension:ppState.distribution,department:ppEventDepartment()};
 return {state,range,rows,groups:ppEventGroups(rows,range,state.dimension,state.department)};
});
