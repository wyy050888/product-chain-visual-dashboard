function pcMetricTable(label,headers,rows,summary=null){
 const cells=row=>`<th scope="row">${esc(row[0])}</th>${row.slice(1).map(value=>`<td>${value===null?'<span class="pc-data-pending">—</span>':esc(value)}</td>`).join('')}`;
 return `<div class="pc-data-scroll" tabindex="0" role="region" aria-label="${esc(label)}"><table class="pc-data-table" aria-label="${esc(label)}">
  <thead><tr>${headers.map(([text,source])=>`<th scope="col">${esc(text)}${source?`<small>${esc(source)}</small>`:''}</th>`).join('')}</tr></thead>
  ${summary?`<tbody class="pc-data-total"><tr>${cells(summary)}</tr></tbody>`:''}
  <tbody>${rows.length?rows.map(row=>`<tr>${cells(row)}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">暂无匹配记录</td></tr>`}</tbody></table></div>`;
}
function pcMetricText(value){return Array.isArray(value)?value.map(n=>fmt(n)).join(' / '):Number.isFinite(value)?fmt(value):null}
function pcPeoplePeriodControls(){
 const {mode,date}=pcPeopleState;
 return `<div class="period-picker pc-people-period"><div class="period-segment" role="group" aria-label="人员指标统计周期">${[['day','日'],['week','周'],['month','月']].map(([key,label])=>`<button type="button" data-pc-people-mode="${key}" aria-pressed="${mode===key}">${label}</button>`).join('')}</div><label>统计日期 <input type="date" id="pc-people-date" min="2025-01-01" max="${DATA_CUTOFF}" value="${date}" required></label></div>`;
}
function pcPersonnelSection(){
 const section=document.createElement('section');section.id='dp-management';section.className='section pc-personnel';
 section.innerHTML=`<div class="sectionhead"><div class="titlegroup"><h2>人员管理</h2></div>${pcPeoplePeriodControls()}</div>
  <div class="pc-panel">
   <div class="pc-people-toolbar"><div class="tabs" role="group" aria-label="人员指标分组">${pcMetricGroups.map(([key,label])=>`<button type="button" data-pc-people-group="${key}" aria-pressed="${key===pcPeopleState.group}" class="${key===pcPeopleState.group?'active':''}">${label}</button>`).join('')}</div>
   <label class="ui-search-field"><input type="search" id="pc-people-search" aria-label="搜索人员" placeholder="搜索人员" value="${esc(pcPeopleState.name)}"></label></div>
   <div class="pc-people-content"></div>
  </div>`;
 return section;
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
 const mode=event.target.closest('[data-pc-people-mode]'),group=event.target.closest('[data-pc-people-group]');
 if(!mode&&!group)return;
 if(mode)pcPeopleState.mode=mode.dataset.pcPeopleMode;
 if(group)pcPeopleState.group=group.dataset.pcPeopleGroup;
 const caller=mode||group;
 for(const button of caller.parentElement.children){const active=button===caller;button.setAttribute('aria-pressed',String(active));if(group)button.classList.toggle('active',active)}
 pcPaintPersonnel(undefined,{refreshChain:true});pcQueueNavigation();
});
dpView.addEventListener('change',event=>{
 const input=event.target;
 if(input.id!=='pc-people-date')return;
 if(!input.validity.valid){input.value=pcPeopleState.date;return}
 pcPeopleState.date=input.value;pcPaintPersonnel(undefined,{refreshChain:true});pcQueueNavigation();
});
dpView.addEventListener('input',event=>{
 if(event.target.id!=='pc-people-search')return;
 pcPeopleState.name=event.target.value;pcPaintPersonnel();
});
