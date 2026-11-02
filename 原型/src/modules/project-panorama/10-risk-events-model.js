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
const ppEventState={start:null,end:null,period:null,all:false};
function ppEventRange(){
 if(ppEventState.all){const cutoff=bounds().cutoff,dates=ppEventRows().flatMap(p=>p.ledger.flatMap(r=>[ppDate(r.recordedAt?.slice(0,10)),ppDate(r.closedAt?.slice(0,10))])).filter(date=>date&&date<=cutoff).sort();return {start:dates[0]||cutoff,end:cutoff}}
 const end=ppEventState.end||bounds().cutoff,start=ppEventState.start||ppEventDateOffset(end,-29);
 return {start,end};
}
function ppEventDateOffset(date,offset){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)}
function ppEventRows(){
 // 历史事件不按项目当前状态排除已完成项目；只跟随顶部项目类型/类目。
 return ppRows().filter(p=>pfIncludes(ppState.category,p.category)&&pfIncludes(ppState.type,p.type));
}
function ppRiskEvents(rows,range){
 const seen=new Set(),events=[];
 for(const project of rows)for(const [index,risk] of project.ledger.entries()){
  if(!['红灯','黄灯'].includes(risk.light))continue;
  const id=project.id+':'+(risk.id??index);if(seen.has(id))continue;seen.add(id);
  const created=ppDate(risk.recordedAt?.slice(0,10)),closed=ppDate(risk.closedAt?.slice(0,10));
  if(created&&created>=range.start&&created<=range.end)events.push({project,risk,kind:'new',date:created});
  if(closed&&(!created||closed>=created)&&closed>=range.start&&closed<=range.end)events.push({project,risk,kind:'closed',date:closed});
 }
 return events;
}
function ppEventGroups(rows,range,dimension){
 const events=ppRiskEvents(rows,range),keys=dimension==='type'?Object.keys(ppStages):pfCategories;
 return keys.map(key=>({key,new:events.filter(e=>e.kind==='new'&&e.project[dimension]===key),closed:events.filter(e=>e.kind==='closed'&&e.project[dimension]===key)}));
}
window.projectRiskEventsAudit=()=>withPeriod('projects',()=>({state:{...ppEventState,dimension:ppState.distribution},range:ppEventRange(),rows:ppEventRows(),groups:ppEventGroups(ppEventRows(),ppEventRange(),ppState.distribution)}));
