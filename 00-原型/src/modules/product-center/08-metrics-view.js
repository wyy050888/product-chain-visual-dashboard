function pcMetricTable(label,headers,rows,summary=null){
 const cells=row=>`<th scope="row">${esc(row[0])}</th>${row.slice(1).map(value=>`<td>${value===null?'<span class="pc-data-pending">—</span>':esc(value)}</td>`).join('')}`;
 return `<div class="pc-data-scroll" tabindex="0" role="region" aria-label="${esc(label)}"><table class="pc-data-table" aria-label="${esc(label)}">
  <thead><tr>${headers.map(([text,source])=>`<th scope="col">${esc(text)}${source?`<small>${esc(source)}</small>`:''}</th>`).join('')}</tr></thead>
  ${summary?`<tbody class="pc-data-total"><tr>${cells(summary)}</tr></tbody>`:''}
  <tbody>${rows.length?rows.map(row=>`<tr>${cells(row)}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">暂无匹配记录</td></tr>`}</tbody></table></div>`;
}
function pcMetricText(value){return Array.isArray(value)?value.map(n=>fmt(n)).join(' / '):Number.isFinite(value)?fmt(value):null}
function pcMountPeoplePeriod(host){
 function paint(focus){
  const period=pcPeoplePeriod(),weekly=period.mode==='week';
  // 沿用页面的周期选择器，隔离事件避免回写其他模块的期间。
  host.innerHTML=periodControls('people',{period,label:'人员指标',follow:false}).replaceAll('data-time-','data-pc-people-');
  const controls=host.firstElementChild,segment=controls.querySelector('.period-segment');
  segment.insertAdjacentHTML('afterbegin',`<button type="button" data-pc-people-mode="week" aria-pressed="${weekly}">周</button>`);
  if(weekly){
   controls.querySelectorAll('select').forEach(select=>select.remove());
   const {start,end}=pcPeopleRange();
   controls.insertAdjacentHTML('beforeend',`<button type="button" class="risk-date-trigger" data-pc-people-week aria-label="选择人员指标所在周" aria-haspopup="dialog" aria-expanded="false" aria-controls="pc-people-week-popover"><span>${start} — ${end}</span><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14"/></svg></button>`);
  }
  if(focus)host.querySelector(focus)?.focus({preventScroll:true});
 }
 function refresh(focus){
  paint(focus);pcPaintPersonnel(host.closest('.pc-personnel'),{refreshChain:true});pcQueueNavigation();
 }
 host.addEventListener('click',event=>{
  const mode=event.target.closest('[data-pc-people-mode]')?.dataset.pcPeopleMode;
  if(mode&&mode!==pcPeopleState.mode){
   pcPeopleState.mode=mode;refresh(`[data-pc-people-mode="${mode}"]`);return;
  }
  const trigger=event.target.closest('[data-pc-people-week]');if(!trigger)return;
  if(trigger.getAttribute('aria-expanded')==='true'){dateRangeActive?.close();return}
  openDateRangePicker(trigger,pcPeopleRange(),date=>{
   pcPeopleState.date=date;refresh('[data-pc-people-week]');
  },{id:'pc-people-week-popover',label:'选择人员指标所在周',single:true,presets:[],min:riskDateMin,max:dashboardSyncDate});
 });
 host.addEventListener('change',event=>{
  const field=event.target,period=pcPeoplePeriod();
  if(field.matches('[data-pc-people-year]'))period.year=+field.value;
  else if(field.matches('[data-pc-people-value]'))period.value=+field.value;
  else return;
  pcPeopleState.date=bounds(normalizePeriod(period)).cutoff;
  refresh(field.matches('[data-pc-people-year]')?'[data-pc-people-year]':'[data-pc-people-value]');
 });
 paint();
}
function pcPersonnelSection(){
 const section=document.createElement('section');section.id='dp-management';section.className='section pc-personnel';
 section.innerHTML=`<div class="sectionhead"><div class="titlegroup"><h2>人员管理</h2></div><div class="module-header-time pc-people-period"></div></div>
  <div class="pc-panel">
   <div class="pc-people-toolbar"><div class="tabs" role="group" aria-label="人员指标分组">${pcMetricGroups.map(([key,label])=>`<button type="button" data-pc-people-group="${key}" aria-pressed="${key===pcPeopleState.group}" class="${key===pcPeopleState.group?'active':''}">${label}</button>`).join('')}</div>
   <label class="ui-search-field"><input type="search" id="pc-people-search" aria-label="搜索人员" placeholder="搜索人员" value="${esc(pcPeopleState.name)}"></label></div>
   <div class="pc-people-content"></div>
  </div>`;
 pcMountPeoplePeriod(section.querySelector('.pc-people-period'));return section;
}
function pcPaintPersonnel(section=$('#dp-management'),{refreshChain=false}={}){
 if(!section||!pcIsActive())return;
 const group=pcMetricGroups.find(([key])=>key===pcPeopleState.group),isProject=group[0]==='projects';
 const range=pcPeopleRange(),chain=pcChain(),snapshot=isProject?pcPeopleSnapshot():{roster:pcRoster(sampleProjectSource,chain)};
 const sourceRows=isProject?snapshot.rows:snapshot.roster.map(person=>({...person,values:{}}));
 const makeRow=person=>[person.name,person.chains.map(i=>chains[i]).join('、')||'—',...group[2].map(([key])=>pcMetricText(person.values[key]))];
 const summary=['范围汇总',chain===null?'产品中心':chains[chain],...group[2].map(([key])=>pcMetricText(snapshot.summary?.[key]))];
 const rows=sourceRows.filter(person=>person.name.includes(pcPeopleState.name.trim())).map(makeRow);
 const host=section.querySelector('.pc-people-content'),existing=host.querySelector('.pc-chain-metrics');
 host.innerHTML=`<p class="pc-data-context"><span>${range.start} 至 ${range.end} · ${snapshot.roster.length} 人</span><span class="muted">${isProject?'项目及经营指标来自现有原型台账；未明确归属的项目或产品仅计入汇总。':'— 表示来源待接入，未按零值统计。'}</span></p>
  ${pcMetricTable(group[1]+'人员指标',[['人员'],['链群'],...group[2].map(([key,title,source])=>[title,source])],rows,summary)}
  ${isProject?'<div class="pc-chain-metrics"></div>':''}`;
 if(!isProject)return;
 if(existing?.childNodes.length&&!refreshChain){host.querySelector('.pc-chain-metrics').replaceWith(existing);return}
 const chainRows=pcChainMetrics(range,chain);
 const percent=(actual,target)=>target?fmt(actual/target*100,1)+'%':'—';
 const chainCells=r=>[r.name,msPercent(msAchievementRatio(r.sales,r.target)),msMoney(r.sales)+' / '+msMoney(r.target),percent(r.success,r.total),r.success+' / '+r.total,pcMetricText(r.grades)];
 const sum=key=>chainRows.reduce((n,r)=>n+r[key],0);
 const chainTotal={name:'范围汇总',sales:sum('sales'),target:sum('target'),success:sum('success'),total:sum('total'),grades:[0,1,2,3].map(i=>chainRows.reduce((n,r)=>n+r.grades[i],0))};
 host.querySelector('.pc-chain-metrics').innerHTML=`<h3>链群经营指标</h3><p class="muted">销售目标按所选日期折算；新品成功率沿用总看板季度规则，统计至所选截止日；SABC 按所选期间分级。</p>
  ${pcMetricTable('链群经营指标',[['链群'],['销售额达成'],['实际 / 目标'],['新品成功率'],['成功 / 参评'],['S / A / B / C 数量']],chainRows.map(chainCells),chainCells(chainTotal))}`;
}
dpView.addEventListener('click',event=>{
 const group=event.target.closest('[data-pc-people-group]');if(!group)return;
 pcPeopleState.group=group.dataset.pcPeopleGroup;
 for(const button of group.parentElement.children){const active=button===group;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active)}
 pcPaintPersonnel(undefined,{refreshChain:true});pcQueueNavigation();
});
dpView.addEventListener('input',event=>{
 if(event.target.id!=='pc-people-search')return;
 pcPeopleState.name=event.target.value;pcPaintPersonnel();
});
