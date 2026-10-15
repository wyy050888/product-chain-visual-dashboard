

// Additive channel-level demo fixtures; every view rolls up the same monthly tasks.
const lifeChannelAnnual=[
 [48,36,24,60,36,72,24,36],
 [84,60,48,72,84,96,36,48],
 [60,36,36,72,48,84,24,48],
 [96,72,48,84,96,108,36,60],
 [48,36,24,60,36,72,24,36],
 [60,48,36,48,48,60,24,36],
 [36,24,24,48,24,60,24,36],
 [36,24,24,36,48,36,24,24]
];
const lifeChannelRates=[.98,.88,.81,1.08,.86,1.12,.76,.94];
const lifeChainWeights=[[4,3,2,2],[3,4,2,3],[4,3,3,2],[3,4,3,3],[4,3,2,3],[3,3,4,2],[4,2,3,3],[2,3,4,3]];
function lifeChannelMonth(stage,channel,month,p=periodFor()){
 const annual=Math.round(lifeChannelAnnual[stage][channel]*(p.year===2025?.92:1));
 const target=splitTarget(annual,[8,7,8,8,9,8,9,9,8,9,9,8])[month-1];
 const start=`${p.year}-${String(month).padStart(2,'0')}-01`,days=new Date(Date.UTC(p.year,month,0)).getUTCDate();
 const elapsed=start>DATA_CUTOFF?0:start.slice(0,7)===DATA_CUTOFF.slice(0,7)?Number(DATA_CUTOFF.slice(8))/days:1;
 const rate=lifeChannelRates[(channel+stage)%8]+(stage%3-1)*.04+(month%3-1)*.035;
 return {target,actual:Math.max(0,Math.round(target*rate*elapsed))};
}
lifeMonth=function(stage,month,p=periodFor()){const items=channels.map((_,channel)=>lifeChannelMonth(stage,channel,month,p));return{target:targetSum(items.map(x=>x.target)),actual:targetSum(items.map(x=>x.actual))}};
function lifeChannelRows(stage,p=periodFor()){
 const b=bounds(p),actualMonths=months(p),yearMonths=months(p,true);
 return channels.map((name,c)=>({name,target:targetSum(Array.from({length:b.last-b.first+1},(_,i)=>lifeChannelMonth(stage,c,b.first+i,p).target)),actual:targetSum(actualMonths.map(m=>lifeChannelMonth(stage,c,m,p).actual)),yearTarget:targetSum(Array.from({length:12},(_,i)=>lifeChannelMonth(stage,c,i+1,p).target)),yearActual:targetSum(yearMonths.map(m=>lifeChannelMonth(stage,c,m,p).actual))}));
}
function lifeSumRows(rows,name='公司整体'){return{name,...Object.fromEntries(['target','actual','yearTarget','yearActual'].map(k=>[k,targetSum(rows.map(r=>r[k]))]))}}
lifeData=function(stage){return lifeSumRows(lifeChannelRows(stage))};
function lifeChainRows(stage,p=periodFor()){
 const b=bounds(p),actualMonths=new Set(months(p)),yearMonths=new Set(months(p,true)),rows=chains.map(name=>({name,target:0,actual:0,yearTarget:0,yearActual:0}));
 for(let m=1;m<=12;m++)for(let c=0;c<channels.length;c++){
  const d=lifeChannelMonth(stage,c,m,p),weights=lifeChainWeights[stage].map((v,i)=>v+((c+i)%3===0?1:0)),targets=splitTarget(d.target,weights),actuals=splitTarget(d.actual,weights);
  rows.forEach((r,i)=>{r.yearTarget+=targets[i];if(m>=b.first&&m<=b.last)r.target+=targets[i];if(actualMonths.has(m))r.actual+=actuals[i];if(yearMonths.has(m))r.yearActual+=actuals[i]});
 }return rows;
}
// 年度累计以当前所选期间截止日为准，不能直接使用今天或全年视图的截止日。
function lifeAchievement(actual,target,annual=false){
 const b=bounds(),year=periodFor().year,start=annual?`${year}-01-01`:b.start,end=annual?`${year}-12-31`:b.end;
 const days=aiFlowDayDiff(start,end)+1,elapsed=Math.max(0,Math.min(days,aiFlowDayDiff(start,b.cutoff)+1));
 const progress=elapsed/days*100,rate=target>0?msAchievementRatio(actual,target):null;
 const deviation=rate===null?null:rate-progress,tone=elapsed?msTone(deviation):'muted';
 return {rate,progress,deviation,tone,started:elapsed>0};
}
function lifeAchievementHint(f){
 return `时间进度 ${msPercent(f.progress)}；偏差 ${msDeviation(f.deviation)}。完成率＝实际完成÷完整周期目标，最高100%；偏差＝完成率－时间进度。落后超过10个百分点为红灯，落后不超过10个百分点为黄灯，达到或领先为绿灯；无有效目标或期间未开始不判灯。`;
}
function lifeAchievementCell(actual,target,annual=false){
 const f=lifeAchievement(actual,target,annual);
 return `<span class="tag ${f.tone}" title="${lifeAchievementHint(f)}">${msPercent(f.rate)}</span>`;
}
function lifeAchievementCards(){
 $$('#lifecards .lifecard').forEach((card,index)=>{
  const d=lifeData(index),f=lifeAchievement(d.actual,d.target),value=card.querySelector('strong'),track=card.querySelector('.track');
  value.className='num '+f.tone;value.innerHTML=f.rate===null?'--':`${fmt(f.rate,1)}<span class="unit">%</span>`;value.title=lifeAchievementHint(f);
  track.classList.add('life-achievement-track');track.title=lifeAchievementHint(f);
  track.innerHTML=`<i style="width:${f.rate??0}%;background:var(--${f.tone})"></i><b style="left:${f.progress}%" aria-hidden="true"></b>`;
  const counts=card.querySelector('p'),delta=d.actual-d.target;
  counts.classList.add('life-count-row');
  counts.innerHTML=`<span>${word()} ${fmt(d.actual)} / ${fmt(d.target)}</span><span class="life-count-gap" title="实际完成－完整周期目标，单位：项">差额 ${delta>0?'+':''}${fmt(delta)}</span>`;
  if(periodFor().mode==='year')card.querySelector('p:last-child').textContent=`年度累计 ${fmt(d.yearActual)} / ${fmt(d.yearTarget)}`;
 });
}
const renderLifeBeforeDemo=renderLife;
renderLife=function(){const combined=!$('#lifecycle').hidden;$('#lifetabs').style.display=combined?'none':'';if(combined)lifeView='chain';renderLifeBeforeDemo();withPeriod('lifecycle',()=>{
 const annual=periodFor().mode==='year',channelRows=lifeChannelRows(lifeIndex),summary=lifeSumRows(channelRows),rows=lifeView==='summary'?[summary]:lifeView==='chain'?lifeChainRows(lifeIndex):channelRows;
 lifeAchievementCards();
 const headers=['业务维度',word()+'目标（项）',word()+'实际完成（项）',word()+'完成率',word()+'数据差额（项）',...(annual?[]:['年度目标（项）','年度累计完成（项）','年度完成率'])];
 function cells(r){const delta=r.actual-r.target;return[esc(r.name),fmt(r.target),fmt(r.actual),lifeAchievementCell(r.actual,r.target),`<span class="num ${delta>0?'green':delta<0?'orange':'muted'}">${delta>0?'+':''}${delta}</span>`,...(annual?[]:[fmt(r.yearTarget),fmt(r.yearActual),lifeAchievementCell(r.yearActual,r.yearTarget,true)])]}
 // 汇总固定在分类明细之前，与明细共用统计数据和下钻入口。
 let content=table(headers,rows.map(cells));
 if(combined){
  const summaryRow=`<tr class="life-summary-row" data-life-summary>${cells({...summary,name:'汇总'}).map(v=>`<td>${v}</td>`).join('')}</tr>`;
  content=content.replace('<tbody>','<tbody>'+summaryRow);
 }else if(lifeView!=='summary')content=content.replace('</table>',`<tfoot><tr>${cells({...summary,name:'合计'}).map(v=>`<td>${v}</td>`).join('')}</tr></tfoot></table>`);
 $('#lifetable').innerHTML=content;
 });};
window.dashboardLifecycleSnapshot=()=>withPeriod('lifecycle',()=>({period:{...periodFor()},stage:lifeIndex,view:lifeView,summary:lifeData(lifeIndex),channels:lifeChannelRows(lifeIndex),chains:lifeChainRows(lifeIndex)}));
