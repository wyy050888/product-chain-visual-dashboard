const ccDepartmentSort={key:'',direction:''};
function ccSortButton(key,label,sort,description=label){
 const direction=sort.key===key?sort.direction:'',next=!direction?'降序':direction==='desc'?'升序':'恢复默认顺序';
 return `<button type="button" class="rp-sort-header" data-cc-sort="${key}" data-direction="${direction}" aria-label="${esc(description)}：${next}">${esc(label)}<span class="rp-sort-arrows" aria-hidden="true"></span></button>`;
}
function ccTable(period,rows,{first='部门',action,summary=null,sort=null}={}){
 const groups=ccGroups(period),headers=[{html:esc(first)},...groups.flatMap(({mode,label})=>sort?[
  {keys:[mode+'-target',mode+'-actual'],html:`<span class="cc-amount-header">${esc(label)}${ccSortButton(mode+'-target','目标',sort,label+'目标降本')}/${ccSortButton(mode+'-actual','实际',sort,label+'实际降本')}降本</span>`},
  ...[['rate','达成'],['gap','差额']].map(([key,name])=>({keys:[mode+'-'+key],html:ccSortButton(mode+'-'+key,label+name,sort)}))
 ]:[{html:esc(label+'目标/实际降本')},{html:esc(label+'达成')},{html:esc(label+'差额')}]),...(action?[{html:'操作'}]:[])];
 const cells=values=>groups.map(({mode})=>{const v=values[mode];return `<td data-cc-value="${mode}-amount">${ccAmount(v.target)}<span class="cc-divider"> / </span>${ccAmount(v.actual)}</td><td data-cc-value="${mode}-rate"><span class="cc-rate ${Number.isFinite(v.rate)?status(v.rate):'muted'}">${ccRate(v.rate)}</span></td><td data-cc-value="${mode}-gap">${ccGap(v.gap)}</td>`}).join('');
 return `<table class="cc-table cc-groups-${groups.length}"><thead><tr>${headers.map(({html,keys})=>`<th scope="col" data-up-basic ${keys?`aria-sort="${keys.includes(sort.key)?sort.direction==='asc'?'ascending':'descending':'none'}"`:""}>${html}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr data-cc-row="${esc(row.id)}"><td>${esc(row.name)}</td>${cells(row.values)}${action?'<td>'+action(row)+'</td>':''}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">暂无符合条件的数据</td></tr>`}</tbody>${summary?`<tfoot><tr><td>合计</td>${cells(summary)}${action?'<td>—</td>':''}</tr></tfoot>`:''}</table>`;
}
function ccSummary(metrics,period){return Object.fromEntries(ccGroups(period).map(({mode})=>[mode,ccTotals(metrics,period,mode)]))}
function ccRender(){
 const period=periodFor('cost'),groups=ccGroups(period),summary=ccSummary(ccMetrics,period),cards=$('#costcards');
 cards.className='costtop cc-cards';cards.style.gridTemplateColumns=`repeat(${groups.length},minmax(0,1fr))`;
 cards.innerHTML=groups.map(({mode,label})=>{
  const v=summary[mode],knownRate=Number.isFinite(v.rate),tone=knownRate?status(v.rate):'muted',width=Math.max(0,Math.min(100,v.rate||0)),progress=ccTimeProgress(period,mode);
  return `<article class="cc-card" data-cc-card="${mode}"><header><h3>${label}降本</h3></header><div class="cc-card-metrics"><div class="cc-actual"><span>实际</span><strong>${ccAmount(v.actual)}</strong></div><div><span>目标</span><strong>${ccAmount(v.target)}</strong></div><div><span>差额</span><strong>${ccGap(v.gap)}</strong></div></div><div class="ms-attainment-highlight"><div class="ms-attainment"><span>达成率</span><b class="${tone}">${ccRate(v.rate)}</b></div><div class="ms-progress" role="progressbar" aria-label="${label}降本达成率" aria-valuemin="0" aria-valuemax="100" ${knownRate?`aria-valuenow="${width}"`:""} aria-valuetext="${knownRate?ccRate(v.rate):'暂无达成数据'}；时间进度 ${ccRate(progress)}"><i style="width:${width}%;background:var(--${tone})"></i><b class="ms-time-marker" data-cc-time-progress="${progress}" style="left:${progress}%" aria-hidden="true"></b></div></div></article>`;
 }).join('');
 ccRenderDepartments(period);
 $('#costcallout').textContent=`截至 ${DATA_CUTOFF}，识别 ${ccOpportunityRows().length} 个近30天高销低利产品，建议优先评估采购议价、工艺及包材优化。`;
}

// 仅刷新部门表，保留卡片、建议条、横向位置及当前可见期间的排序条件。
function ccRenderDepartments(period=periodFor('cost')){
 const host=$('#costtable'),scroll=host.scrollLeft,modes=ccGroups(period).map(group=>group.mode);
 if(ccDepartmentSort.key&&!modes.some(mode=>ccDepartmentSort.key.startsWith(mode+'-')))Object.assign(ccDepartmentSort,{key:'',direction:''});
 const rows=ccSortedDepartmentRows(ccRows(period),ccDepartmentSort);
 host.innerHTML=ccTable(period,rows,{sort:ccDepartmentSort,action:row=>`<button type="button" class="link" data-cc-department="${row.id}">查看</button>`});host.scrollLeft=scroll;
}
