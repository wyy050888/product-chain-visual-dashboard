// 目标与完成台账独立：修改目标只更新分母，历史实际完成数不随目标变化。
function ltDashboardActive(){const section=document.getElementById('lifecycle');return $('#lifecycle')===section&&!section.hidden}
const ltChainCategories=[[1],[4],[0],[2,3]];
function ltDashboardRows(stage,p=periodFor('lifecycle')){
 return lifeBaseChainRows(stage,p).map((row,i)=>{
  const target=ltTargetFor(stage,ltChainCategories[i],p),annual=ltTargetFor(stage,ltChainCategories[i],p,true);
  return {...row,target:target.value,yearTarget:annual.value,targetMeta:target,yearTargetMeta:annual};
 });
}
function ltDashboardTotals(stage,p=periodFor('lifecycle')){
 const rows=ltDashboardRows(stage,p),target=ltTargetFor(stage,[0,1,2,3,4],p),annual=ltTargetFor(stage,[0,1,2,3,4],p,true);
 return {name:'公司整体',actual:rows.reduce((n,r)=>n+r.actual,0),yearActual:rows.reduce((n,r)=>n+r.yearActual,0),target:target.value,yearTarget:annual.value,targetMeta:target,yearTargetMeta:annual};
}
function ltTargetText(meta){return meta?.state==='complete'?fmt(meta.value):meta?.value!==null&&meta?.value!==undefined?`${fmt(meta.value)} <span class="lt-target-state">${meta.label}</span>`:meta?.label||'未配置'}
function ltDeltaText(actual,meta){return meta?.state==='complete'?`<span class="num ${actual-meta.value>0?'green':actual-meta.value<0?'orange':'muted'}">${actual-meta.value>0?'+':''}${actual-meta.value}</span>`:'—'}
function ltMainCards(){
 $$('#lifecards .lifecard').forEach((card,stage)=>{
  const d=ltDashboardTotals(stage),complete=d.targetMeta.state==='complete',f=lifeAchievement(d.actual,complete?d.target:null),value=card.querySelector('strong'),track=card.querySelector('.track');
  value.className='num '+(complete?f.tone:'lt-muted');
  value.innerHTML=complete?(f.rate===null?'—':`${fmt(f.rate,1)}<span class="unit">%</span>`):`<span class="lt-card-state">${d.targetMeta.value===null?d.targetMeta.label:'目标待补齐'}</span>`;
  track.innerHTML=`<i style="width:${complete?Math.min(100,f.rate??0):0}%;background:var(--${f.tone})"></i>${complete?`<b style="left:${f.progress}%" aria-hidden="true"></b>`:''}`;
  card.querySelector('p').innerHTML=`<span>${word()} ${fmt(d.actual)} / ${ltTargetText(d.targetMeta)}</span><span class="life-count-gap">差额 ${complete?(d.actual-d.target>0?'+':'')+fmt(d.actual-d.target):'—'}</span>`;
  card.querySelector('p:last-child').innerHTML=`年度累计 ${fmt(d.yearActual)} / ${ltTargetText(d.yearTargetMeta)}`;
 });
}
function ltMainCells(row,annual){
 const rate=(actual,meta,ytd=false)=>meta.state==='complete'?lifeAchievementCell(actual,meta.value,ytd):'—';
 return [esc(row.name),ltTargetText(row.targetMeta),fmt(row.actual),rate(row.actual,row.targetMeta),ltDeltaText(row.actual,row.targetMeta),...(annual?[]:[ltTargetText(row.yearTargetMeta),fmt(row.yearActual),rate(row.yearActual,row.yearTargetMeta,true)])];
}
