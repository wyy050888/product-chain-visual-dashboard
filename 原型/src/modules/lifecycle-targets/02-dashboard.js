// 目标与完成台账独立：修改目标只更新分母，历史实际完成数不随目标变化。
function ltDashboardActive(){const section=document.getElementById('lifecycle');return $('#lifecycle')===section&&!section.hidden}
const ltChainCategories=filterCatalog.chainByIndex.map(name=>[ltCategories.indexOf(name)]);
function ltDashboardRows(stage,p=periodFor('lifecycle')){
 return lifeBaseChainRows(stage,p).map((row,i)=>{
  const target=ltTargetFor(stage,ltChainCategories[i],p),annual=ltTargetFor(stage,ltChainCategories[i],p,true);
  return {...row,target:target.value,yearTarget:annual.value,targetMeta:target,yearTargetMeta:annual};
 });
}
function ltDashboardTotals(stage,p=periodFor('lifecycle')){
 const rows=ltDashboardRows(stage,p),categories=ltCategories.map((_,i)=>i),target=ltTargetFor(stage,categories,p),annual=ltTargetFor(stage,categories,p,true);
 return {name:'公司整体',actual:rows.reduce((n,r)=>n+r.actual,0),yearActual:rows.reduce((n,r)=>n+r.yearActual,0),target:target.value,yearTarget:annual.value,targetMeta:target,yearTargetMeta:annual};
}
function ltTargetText(meta){return meta?.state==='complete'?fmt(meta.value):'—'}
function ltMainCards(){
 $$('#lifecards .lifecard').forEach((card,stage)=>{
  const d=ltSelectedTotals(stage),complete=d.targetMeta.state==='complete',f=lifeAchievement(d.actual,complete?d.target:null);
  const rate=complete&&f.rate!==null?`${fmt(f.rate,1)}<span class="unit">%</span>`:'—';
  card.innerHTML=`<h3>${esc(lifeNames[stage])}</h3><div class="lt-card-completion"><strong class="num ${complete?f.tone:'lt-muted'}" data-lt-card-rate aria-label="完成率">${rate}</strong></div><div class="lt-card-counts"><div><span>目标</span><b data-lt-card-target>${ltTargetText(d.targetMeta)}</b></div><div><span>完成</span><b data-lt-card-actual>${fmt(d.actual)}</b></div></div>`;
 });
}
function ltMainCells(row,annual){
 const rate=(actual,meta,ytd=false)=>meta.state==='complete'?lifeAchievementCell(actual,meta.value,ytd):'—';
 return [esc(row.name),ltTargetText(row.targetMeta),fmt(row.actual),rate(row.actual,row.targetMeta),...(annual?[]:[ltTargetText(row.yearTargetMeta),fmt(row.yearActual),rate(row.yearActual,row.yearTargetMeta,true)])];
}
