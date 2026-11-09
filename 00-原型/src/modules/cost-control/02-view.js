const ccDepartmentSort={key:'',direction:''};
const ccCategorySort={key:'',direction:''};
let ccView='category';
function ccSortButton(key,label,sort,description=label){
 const direction=sort.key===key?sort.direction:'',next=!direction?'降序':direction==='desc'?'升序':'恢复默认顺序';
 return `<button type="button" class="rp-sort-header" data-cc-sort="${key}" data-direction="${direction}" aria-label="${esc(description)}：${next}">${esc(label)}<span class="rp-sort-arrows" aria-hidden="true"></span></button>`;
}
function ccTable(period,rows,{first='部门',action,summary=null,sort=null,actualOnly=false,contextLabel=''}={}){
 const groups=ccGroups(period),headers=[{html:esc(first)},...(contextLabel?[{html:esc(contextLabel)}]:[]),...groups.flatMap(({mode,label})=>actualOnly?[{keys:sort?[mode+'-actual']:null,html:sort?ccSortButton(mode+'-actual',label+'实际降本',sort):esc(label+'实际降本')}]:sort?[
  {keys:[mode+'-actual',mode+'-target'],html:`<span class="cc-amount-header">${esc(label)}${ccSortButton(mode+'-actual','实际',sort,label+'实际降本')}/${ccSortButton(mode+'-target','目标降本',sort,label+'目标降本')}</span>`},
  ...[['rate','达成'],['gap','差额']].map(([key,name])=>({keys:[mode+'-'+key],html:ccSortButton(mode+'-'+key,label+name,sort)}))
 ]:[{html:esc(label+'实际/目标降本')},{html:esc(label+'达成')},{html:esc(label+'差额')}]),...(action?[{html:'操作'}]:[])];
 const cells=values=>groups.map(({mode})=>{const v=values[mode];return actualOnly?`<td data-cc-value="${mode}-actual">${ccAmount(v.actual)}</td>`:`<td data-cc-value="${mode}-amount">${ccAmount(v.actual)}<span class="cc-divider"> / </span>${ccAmount(v.target)}</td><td data-cc-value="${mode}-rate"><span class="cc-rate ${Number.isFinite(v.rate)?status(v.rate):'muted'} ${Number.isFinite(v.rate)?numberSignalClass(status(v.rate)):''}">${ccRate(v.rate)}</span></td><td data-cc-value="${mode}-gap">${ccGap(v.gap)}</td>`}).join('');
 return `<table class="cc-table cc-groups-${groups.length}${actualOnly?' cc-actual-only':''}${contextLabel?' cc-with-context':''}"><thead><tr>${headers.map(({html,keys})=>`<th scope="col" data-up-basic ${keys?`aria-sort="${keys.includes(sort.key)?sort.direction==='asc'?'ascending':'descending':'none'}"`:""}>${html}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr data-cc-row="${esc(row.id)}"><td><span class="cc-row-name">${esc(row.name)}</span>${!contextLabel&&row.subtitle?`<small>${esc(row.subtitle)}</small>`:""}</td>${contextLabel?`<td class="cc-context" data-cc-context>${esc(row.subtitle||'—')}</td>`:''}${cells(row.values)}${action?'<td>'+action(row)+'</td>':''}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">暂无符合条件的数据</td></tr>`}</tbody>${summary?`<tfoot><tr><td${contextLabel?' colspan="2"':''}>合计</td>${cells(summary)}${action?'<td>—</td>':''}</tr></tfoot>`:''}</table>`;
}
function ccSummary(metrics,period,actualOnly=false){return Object.fromEntries(ccGroups(period).map(({mode})=>[mode,ccTotals(metrics,period,mode,!actualOnly)]))}
function ccRender(){
 const period=periodFor('cost'),groups=ccGroups(period),summary=ccSummary(ccMetrics,period),cards=$('#costcards');
 cards.className='costtop cc-cards';cards.style.gridTemplateColumns=`repeat(${groups.length},minmax(0,1fr))`;
 cards.innerHTML=groups.map(({mode,label})=>{
  const v=summary[mode],knownRate=Number.isFinite(v.rate),tone=knownRate?status(v.rate):'muted',width=Math.max(0,Math.min(100,v.rate||0)),progress=ccTimeProgress(period,mode);
  return `<article class="cc-card" data-cc-card="${mode}"><header><h3>${label}降本</h3></header><div class="cc-card-metrics"><div class="cc-actual"><span>实际</span><strong>${ccAmount(v.actual)}</strong></div><div><span>目标</span><strong>${ccAmount(v.target)}</strong></div><div><span>差额</span><strong>${ccGap(v.gap)}</strong></div></div><div class="ms-attainment-highlight"><div class="ms-attainment"><span>达成率</span><b class="${tone}">${ccRate(v.rate)}</b></div><div class="ms-progress" role="progressbar" aria-label="${label}降本达成率" aria-valuemin="0" aria-valuemax="100" ${knownRate?`aria-valuenow="${width}"`:""} aria-valuetext="${knownRate?ccRate(v.rate):'暂无达成数据'}；时间进度 ${ccRate(progress)}"><i style="width:${width}%;background:var(--${tone})"></i><b class="ms-time-marker" data-cc-time-progress="${progress}" style="left:${progress}%" aria-hidden="true"></b></div></div></article>`;
 }).join('');
 ccRenderDepartments(period);
}

// 两个维度保留独立排序；切换只改变分组，不改变总览卡片的统计范围。
function ccRenderDepartments(period=periodFor('cost')){
 const host=$('#costtable'),scroll=host.querySelector('table')?host.scrollLeft:0,modes=ccGroups(period).map(group=>group.mode);
 const byCategory=ccView==='category',sort=byCategory?ccCategorySort:ccDepartmentSort;
 if(sort.key&&(!modes.some(mode=>sort.key.startsWith(mode+'-'))||byCategory&&!sort.key.endsWith('-actual')))Object.assign(sort,{key:'',direction:''});
 const rows=ccSortedDepartmentRows(byCategory?ccCategoryRows(period):ccRows(period),sort);
 host.innerHTML=ccTable(period,rows,{first:byCategory?'降本分类':'部门',sort,actualOnly:byCategory,action:row=>`<button type="button" class="link" data-cc-${byCategory?'category':'department'}="${row.id}">查看</button>`});if(scroll)host.scrollLeft=scroll;
 for(const button of $$('#cost [data-cc-view]')){const active=button.dataset.ccView===ccView;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active)}
}
