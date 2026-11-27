const pcScoreTones={绿灯:'green',黄灯:'orange',红灯:'red'};
let pcRatingPreviewObserver=null;

function pcScoreValue(score){
 const light=pcPeopleScoreLight(score);
 if(!light)return '—';
 return `<b class="${pcScoreTones[light]}" data-pc-score-value aria-label="${fmt(score,1)} 分，${light}">${fmt(score,1)}</b>`;
}
function pcWeeklyLines(entries=[]){
 return entries.length?`<ol class="pc-weekly-lines">${entries.map(item=>`<li>${esc(item.text)}</li>`).join('')}</ol>`:'—';
}
function pcWeeklyDeviations(entries=[]){
 const kinds=new Map(gdTabs.resource);
 const unclassified=entries.filter(item=>!kinds.has(item.kind));
 const groups=Array.from(kinds,([kind,label])=>{
  const items=entries.filter(item=>item.kind===kind);
  return items.length?`<div class="pc-weekly-deviation"><strong>【${esc(label)}】</strong>${pcWeeklyLines(items)}</div>`:'';
 }).join('');
 return groups+(unclassified.length?pcWeeklyLines(unclassified):'')||'—';
}
function pcRatingSummaryCards(people,daily){
 const {average,rated,reported,lights,deviations,deviationStats}=pcPeopleRatingSummary(people);
 const card=(title,value,unit='',stats='')=>`<article class="gd-card">
  <div class="gd-card-head"><h3>${title}</h3></div>
  <div class="gd-card-number">${value}${unit?`<span>${unit}</span>`:''}</div>
  ${stats?`<div class="gd-card-stats">${stats}</div>`:''}</article>`;
 const distribution=Object.entries(lights).map(([label,count])=>`<span class="${pcScoreTones[label]}">${label}<b>${count} 人</b></span>`).join('');
 const deviationBreakdown=deviationStats.map(([label,count])=>`<span>${esc(label)}<b>${count}</b></span>`).join('');
 const demo=!daily?.counts&&Boolean(daily?.demoCounts);
 const counts=daily?.counts??daily?.demoCounts;
 const dailyCount=key=>counts?fmt(counts[key]):'—';
 return `<div class="gd-workspace pc-rating-summary" role="group" aria-label="人员评分概览">
  ${card('本周评分',average===null?'—':fmt(average,1),average===null?'':'分',reported?`<span>已评分<b>${rated} / ${reported} 人</b></span>${distribution}`:'')}
  <article class="gd-card pc-daily-report-card"${demo?' title="用于演示，数值为虚构"':''}>
   <div class="gd-card-head"><h3>日报提交</h3></div>
   <div class="gd-card-number"><div class="pc-daily-report-pair"><span class="pc-daily-report-label">已交</span> ${dailyCount('submitted')}</div> <div class="pc-daily-report-pair"><span class="pc-daily-report-label">应交</span> ${dailyCount('expected')}</div></div>
   <div class="gd-card-stats"><span>未交<b>${dailyCount('missing')}</b></span><span>未按时交<b>${dailyCount('late')}</b></span></div>
  </article>
  ${card('周工作偏差',reported?deviations:'—','',reported?deviationBreakdown:'')}
 </div>`;
}
const pcPeopleRatingContext={
 state:pcPeopleRatingState,data:pcPeopleRatingData,pager:'pc-people-ratings-pager',
 daily:week=>pcDailyReportSummary(week,pcChain()),afterPaint:pcQueueNavigation
};

function pcPaintPeopleRatings(section,context=pcPeopleRatingContext){
 const {state,data,daily,pager,afterPaint}=context,{week,people}=data();
 const host=section.querySelector('.pc-people-ratings');
 const heading=['姓名/岗位','人员评分','周重点工作','下周计划','周工作偏差','操作'];
 const unscored=Number.MAX_SAFE_INTEGER;
 people.sort((first,second)=>(first.score??unscored)-(second.score??unscored));
 const page=pcPersonnelPage(people,state.page,pager);
 state.page=page.current;
 const rows=page.rows.map(person=>[
  `${esc(person.name)}<small>${esc(person.role)}</small>`,pcScoreValue(person.score),
  gdCellPreview(pcWeeklyLines(person.work),heading[2]),
  gdCellPreview(pcWeeklyLines(person.plans),heading[3]),
  gdCellPreview(pcWeeklyDeviations(person.deviations),heading[4]),
  `<button type="button" class="link" data-pc-rating-person="${esc(person.name)}">查看得分明细</button>`
 ]);
 pcRatingPreviewObserver?.disconnect();
 host.innerHTML=`${pcRatingSummaryCards(people,daily(week))}<div class="pc-data-scroll" tabindex="0" role="region" aria-label="人员评分">${table(heading,rows,'pc-data-table pc-rating-table')}</div>${page.pager}`;
 pcBindPersonnelPager(host,pager,next=>{
  state.page=next;
  pcPaintPeopleRatings(section,context);
 });
 pcRatingPreviewObserver=gdObserveTaskPreviews(host,[...host.querySelectorAll('.gd-task-preview')]);
 host.querySelector('thead th:nth-child(2)').setAttribute('aria-sort','ascending');
 const [start,end]=[week,shiftDate(week,6)];
 const trigger=section.querySelector('[data-pc-rating-week]');
 trigger.querySelector('span').textContent=pcRiskDate(start)+' — '+pcRiskDate(end);
 trigger.onclick=()=>{
  openDateWeekPicker(trigger,{start,end},start=>{
   state.week=start;state.page=1;
   pcPaintPeopleRatings(section,context);afterPaint?.();
  },{min:aiCoverageStart,max:dashboardSyncDate});
 };
}
function pcScoreDetailTable(details){
 const headers=['评分维度','计分口径','达标 / 样本','得分','依据'];
 const rows=details.map((item,index)=>{
  const recordId='pc-score-records-'+index;
  const count=item.entries.length;
  const cells=[
   esc(item.label)+'<small>'+item.weight+' 分</small>',
   esc(item.rule),
   count?item.numerator+' / '+item.denominator:'—',
   item.points===null?'—':fmt(item.points,1),
   count?`<button type="button" class="link pc-score-record-toggle" aria-expanded="false" aria-controls="${recordId}">查看记录</button>`:'—'
  ];
  const scoreRow=`<tr>${cells.map(cell=>`<td>${cell}</td>`).join('')}</tr>`;
  if(!count)return scoreRow;
  const entries=item.entries.map(entry=>({text:(entry.pass?'达标 · ':'未达标 · ')+entry.text}));
  return scoreRow+`<tr class="pc-score-record-row" id="${recordId}" hidden>
   <td colspan="${headers.length}"><p class="pc-score-record-count">共 ${count} 条记录</p>${pcWeeklyLines(entries)}</td>
  </tr>`;
 }).join('');
 return `<table><thead><tr>${headers.map(header=>`<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}
function pcOpenPeopleScore(name,context=pcPeopleRatingContext){
 const {report,people}=context.data();
 const person=people.find(row=>row.name===name);
 if(!person)return;
 const light=pcPeopleScoreLight(person.score);
 const tone=pcScoreTones[light]||'pending';
 const score=light?fmt(person.score,1):'—';
 openModal(name+' · 得分明细',`<div class="pc-score-detail">
  <section class="pc-score-summary" aria-label="得分概览" data-tone="${tone}">
   <div class="pc-score-ring" role="img" aria-label="${light?`总分 ${score} 分，满分 100 分，${light}`:'暂无评分'}" style="--pc-score-progress:${person.score??0}%">
    <strong>${score}</strong>
    ${light?'<span>/ 100 分</span>':''}
   </div>
   <div class="pc-score-rules">
    <h3>计分规则</h3>
    <p>单项得分＝达标数 ÷ 样本数 × 权重。至少有三项可评分且有交付结果时，按有样本的权重折算为百分制。</p>
    <ul class="pc-score-bands" aria-label="灯色对应分数">
     <li data-tone="red"><b>红灯</b><span>低于 60 分</span></li>
     <li data-tone="orange"><b>黄灯</b><span>60 分至不足 80 分</span></li>
     <li data-tone="green"><b>绿灯</b><span>80 分及以上</span></li>
    </ul>
   </div>
  </section>
  <div class="tablewrap">${pcScoreDetailTable(person.details)}</div>
 </div>`,true,report.label+' · '+person.role);
 $('#dialogbody .pc-score-detail .tablewrap').addEventListener('click',event=>{
  const button=event.target.closest('.pc-score-record-toggle');
  if(!button)return;
  const records=document.getElementById(button.getAttribute('aria-controls'));
  const expanded=records.hidden;
  records.hidden=!expanded;
  button.setAttribute('aria-expanded',String(expanded));
  button.textContent=expanded?'收起记录':'查看记录';
 });
}
const pcPreviousScoreDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope>.pc-score-detail');
 return root?{root,entries:[{node:root,key:'shared'}],tabs:[]}:pcPreviousScoreDrawerProfile(body,title);
};
