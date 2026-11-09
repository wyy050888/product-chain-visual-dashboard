function ppHelp(label,text){return `<span class="metric-help" role="button" tabindex="0" aria-label="${esc(label)}说明" data-metric-rule="${esc(text)}"></span>`}
function ppLightValues(value){return value==='红黄灯'?['高危红灯','红灯','黄灯']:[value]}
function ppLightActive(value){
 // 红灯已包含高危；手动勾选红、黄灯与合计覆盖同一批项目。
 if(value==='红黄灯')return ['红灯','黄灯'].every(light=>ppState.light.includes(light))&&!ppState.light.includes('绿灯');
 const values=ppLightValues(value);return ppState.light.length===values.length&&values.every(light=>ppState.light.includes(light));
}
function ppLink(kind,value,label,body='',type=''){
 const active=kind==='light'?ppLightActive(value):['type','category'].includes(kind)?ppState[kind].includes(value):ppState.link?.kind===kind&&ppState.link.value===value&&(!type||ppState.link.type===type);
 return `<button type="button" class="pp-link ${active?'selected':''}" data-pp-link="${kind}" data-value="${esc(value)}" data-type="${esc(type)}" aria-pressed="${active}">${label}${body}</button>`;
}
// 列头与各行共用数量列规格；灯色说明直接对应下方数字。
function ppChartColumns(dimension,department=false){
 const lights=department?[['red','红灯','红灯风险数'],['orange','黄灯','黄灯风险数']]:[['pp-high-risk','高危','高危红灯项目数'],['red','红灯','普通红灯项目数，不含高危红灯'],['orange','黄灯','黄灯项目数'],['green','绿灯','绿灯项目数']];
 return `<div class="pp-chart-columns" role="group" aria-label="${department?'责任部门风险数':'进行中项目分布'}列头"><span>${dimension==='type'?'项目类型':'链群'}</span><span class="pp-chart-columns-line"><span class="pp-chart-column-bar" aria-hidden="true"></span><span class="${department?'pp-risk-counts':'pp-distribution-counts'} pp-chart-count-head">${lights.map(([tone,label,title])=>`<b class="${tone}" title="${title}">${label}</b>`).join('')}</span></span></div>`;
}
function ppOverview(rows){
 const ongoing=rows.filter(p=>p.projectState==='进行中'),dimension=ppState.distribution;
 const keys=dimension==='type'?Object.keys(ppStages):pfCategories;
 const groups=keys.map(key=>({key,...ppCounts(ongoing.filter(p=>p[dimension]===key))}));
 // 红灯拆为高危与普通红灯，两部分互斥；每组总宽度保持100%。
 const share=(group,count)=>count/Math.max(1,group.red+group.yellow+group.green)*100;
 return ` <article class="pp-card pp-distribution"><div class="pp-card-head"><h3>进行中项目分布</h3></div><div class="pp-card-tools">
 <div class="pp-tabs">${[['type','项目类型'],['category','链群']].map(([key,label])=>`<button type="button" data-pp-distribution="${key}" aria-pressed="${dimension===key}" class="${dimension===key?'active':''}">${label}</button>`).join('')}</div></div>
 <div class="pp-chart-body">${ppChartColumns(dimension)}<div class="pp-bars">${groups.map(g=>ppLink(dimension,g.key,`<span class="pp-bar-label">${esc(g.key)}</span>`,`<span class="pp-bar-line"><span class="pp-track"><i class="pp-high" style="width:${share(g,g.high)}%" title="高危红灯 ${g.high} 个"></i><i class="pp-red" style="width:${share(g,g.red-g.high)}%" title="红灯 ${g.red-g.high} 个"></i><i class="pp-yellow" style="width:${share(g,g.yellow)}%"></i><i class="pp-green" style="width:${share(g,g.green)}%"></i></span><span class="pp-distribution-counts" aria-label="高危红灯 ${g.high}，普通红灯 ${g.red-g.high}，黄灯 ${g.yellow}，绿灯 ${g.green}"><b class="pp-high-risk" title="高危红灯">${g.high}</b><b class="red" title="普通红灯">${g.red-g.high}</b><b class="orange" title="黄灯">${g.yellow}</b><b class="green" title="绿灯">${g.green}</b></span></span>`)).join('')}</div></div></article>
 ${ppDepartmentRiskChart(rows)}`;
}
