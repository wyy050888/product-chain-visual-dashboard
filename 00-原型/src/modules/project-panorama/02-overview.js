function ppHelp(label,text,{titled=false}={}){
 return `<span class="metric-help" role="button" tabindex="0" aria-label="${esc(label)}说明" data-metric-rule="${esc(text)}"${titled?` data-metric-rule-title="${esc(label)}"`:''}></span>`;
}
function ppLightValues(value){return value==='红黄灯'?['红灯','黄灯']:[value]}
function ppLightActive(value){
 // 手动勾选红、黄灯与合计覆盖同一批项目。
 if(value==='红黄灯')return ['红灯','黄灯'].every(light=>ppState.light.includes(light))&&!ppState.light.includes('绿灯');
 const values=ppLightValues(value);return ppState.light.length===values.length&&values.every(light=>ppState.light.includes(light));
}
function ppLink(kind,value,label,body='',type=''){
 const active=kind==='light'?ppLightActive(value):['type','category'].includes(kind)?ppState[kind].includes(value):ppState.link?.kind===kind&&ppState.link.value===value&&(!type||ppState.link.type===type);
 return `<button type="button" class="pp-link ${active?'selected':''}" data-pp-link="${kind}" data-value="${esc(value)}" data-type="${esc(type)}" aria-pressed="${active}">${label}${body}</button>`;
}
// 列头与各行共用数量列规格；灯色说明直接对应下方数字。
const ppRiskCountSeparator='<span class="pp-risk-count-separator" aria-hidden="true"> / </span>';
function ppChartColumns(dimension,department=false){
 const lights=department?[['red','红灯','红灯风险数'],['orange','黄灯','黄灯风险数']]:[['red','红灯','红灯项目数'],['orange','黄灯','黄灯项目数'],['green','绿灯','绿灯项目数']];
 return `<div class="pp-chart-columns" role="group" aria-label="${department?ppDepartmentRiskTitle:'进行中项目分布'}列头"><span>${dimension==='type'?'项目类型':'链群'}</span><span class="pp-chart-columns-line"><span class="pp-chart-column-bar" aria-hidden="true"></span><span class="${department?'pp-risk-counts':'pp-distribution-counts'} pp-chart-count-head">${lights.map(([tone,label,title])=>`<b class="${tone}" title="${title}">${label}</b>`).join(department?ppRiskCountSeparator:'')}</span></span></div>`;
}
function ppChartDimensionTabs(attribute,extra=''){
 return `<div class="pp-card-tools"><div class="pp-tabs">${[['type','项目类型'],['category','链群']].map(([key,label])=>`<button type="button" ${attribute}="${key}" aria-pressed="${ppState.distribution===key}" class="${ppState.distribution===key?'active':''}">${label}</button>`).join('')}</div>${extra}</div>`;
}
const ppBlockerDepartmentHelp=[
 '1. 全部统计当前筛选范围内的所有进行中项目。',
 '2. 部门统计项目、任务所在阶段、任务均为红灯的进行中项目，按卡点任务负责人的所属部门归类。',
 '3. 同一项目在同一部门只计一次，涉及多个卡点部门时分别计入。未维护风险单的项目也计入。'
].join('\n');
function ppBlockerDepartmentOptions(ongoing){
 const counts=new Map();
 for(const project of ongoing){
  for(const department of new Set(ppBlockerTasks(project).map(task=>task.department)))counts.set(department,(counts.get(department)||0)+1);
 }
 const selected=ppState.blockerDepartment;
 if(selected!=='全部'&&!counts.has(selected))counts.set(selected,0);
 const options=[['全部',ongoing.length],...[...counts].sort(([a],[b])=>a.localeCompare(b,'zh-CN'))];
 return `<div class="pp-blocker-department-controls">${ppHelp('卡点部门统计',ppBlockerDepartmentHelp,{titled:true})}<div class="pp-dept-options" role="group" aria-label="卡点部门">${options.map(([name,count])=>{
  const scope=name==='全部'?'进行中项目':'卡点项目';
  return `<button type="button" data-pp-blocker-department="${esc(name)}" aria-pressed="${selected===name}" aria-label="${esc(name)}，${count}个${scope}"><span>${esc(name)}</span><b class="pp-dept-count">${count}</b></button>`;
 }).join('')}</div></div>`;
}
function ppOverview(rows,allRows){
 const ongoing=rows.filter(p=>p.projectState==='进行中'),dimension=ppState.distribution;
 const visible=ongoing.filter(project=>ppMatchesBlockerDepartment(project,ppState.blockerDepartment));
 const keys=dimension==='type'?Object.keys(ppStages):ppProjectChains();
 const groups=keys.map(key=>({key,...ppCounts(visible.filter(p=>p[dimension]===key))}));
 const share=(group,count)=>count/Math.max(1,group.red+group.yellow+group.green)*100;
 const groupMarkup=group=>{
  const parts=[['red','red','红灯'],['yellow','orange','黄灯'],['green','green','绿灯']];
  const segments=parts.map(([key,,label])=>`<i class="pp-${key}" style="width:${share(group,group[key])}%" title="${label} ${group[key]} 个"></i>`).join('');
  const counts=parts.map(([key,color,label])=>`<b class="${color}" title="${label}">${group[key]}</b>`).join('');
  const summary=parts.map(([key,,label])=>`${label} ${group[key]}`).join('，');
  return ppLink(dimension,group.key,`<span class="pp-bar-label">${esc(group.key)}</span>`,
   `<span class="pp-bar-line"><span class="pp-track">${segments}</span><span class="pp-distribution-counts${group.total?' pp-count-action':''}" aria-label="${summary}">${counts}</span></span>`);
 };
 return ` <article class="pp-card pp-distribution"><div class="pp-card-head"><h3>进行中项目分布</h3>${ppBlockerDepartmentOptions(ongoing)}</div>
 ${ppChartDimensionTabs('data-pp-distribution')}
 <div class="pp-chart-body">${ppChartColumns(dimension)}<div class="pp-bars">${groups.map(groupMarkup).join('')}</div></div></article>
 ${ppDepartmentRiskChart(rows)}${ppRiskEventsTable(allRows)}`;
}
