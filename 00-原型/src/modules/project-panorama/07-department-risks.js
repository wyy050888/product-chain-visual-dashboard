// 全部部门下每份风险记录只计一次；单部门按台账中的责任部门匹配。
function ppDepartmentRiskRecords(project,department){
 return project.ledger.filter(r=>r.status!=='已闭环'&&['红灯','黄灯'].includes(r.light)&&ppDepartmentValues(r.department).some(name=>ppDepartments.includes(name)&&(department==='全部'||name===filterCatalog.normalizeDepartment(department))));
}
function ppDepartmentRiskGroups(rows,dimension,department){
 const keys=dimension==='type'?Object.keys(ppStages):pfCategories;
 return keys.map(key=>{
  const records=rows.filter(p=>p[dimension]===key).flatMap(p=>ppDepartmentRiskRecords(p,department));
  return {key,red:records.filter(r=>r.light==='红灯').length,yellow:records.filter(r=>r.light==='黄灯').length};
 });
}
function ppDepartmentRiskActive(dimension,key,department,lights){
 const selected=ppState[dimension],departments=department==='全部'?[]:[department];
 return selected.length===1&&selected[0]===key&&ppState.department.length===departments.length&&departments.every(value=>ppState.department.includes(value))
  &&ppState.riskLight.length===lights.length&&lights.every(value=>ppState.riskLight.includes(value));
}
function ppApplyDepartmentRisk(button){
 const {type,value,ppRiskLight}=button.dataset,lights=ppRiskLight?[ppRiskLight]:['红灯','黄灯'];
 // 名称、柱段和数字共用切换：再次点击同一组合，取消该组合联动的筛选。
 const cancel=ppDepartmentRiskActive(type,value,ppState.riskDepartment,lights);
 ppState[type]=cancel?[]:[value];ppState.department=cancel||ppState.riskDepartment==='全部'?[]:[ppState.riskDepartment];
 ppState.riskLight=cancel?[]:lights;ppState.link=null;ppState.stage=[];ppState.page=1;renderProjects();
}
function ppDepartmentRiskRow(group,dimension,department,max){
 const attributes=light=>`data-pp-link="departmentRisk" data-type="${dimension}" data-value="${esc(group.key)}" data-pp-risk-light="${light}" aria-pressed="${ppDepartmentRiskActive(dimension,group.key,department,light?[light]:['红灯','黄灯'])}"`;
 const label=light=>esc(department+' · '+group.key+' · '+light+'风险');
 const selected=['红灯','黄灯',''].some(light=>ppDepartmentRiskActive(dimension,group.key,department,light?[light]:['红灯','黄灯']));
 return `<div class="pp-link pp-dept-risk-row ${selected?'selected':''}"><button type="button" class="pp-bar-label" ${attributes('')} aria-label="${label('红黄灯')}">${esc(group.key)}</button>
 <span class="pp-bar-line"><span class="pp-track">${[['红灯','red',group.red],['黄灯','yellow',group.yellow]].map(([light,tone,count])=>`<button type="button" class="pp-risk-segment pp-${tone}" ${attributes(light)} style="width:${count/max*100}%" title="${label(light)} ${count}条" aria-label="${label(light)} ${count}条" ${count?'':'disabled'}></button>`).join('')}</span>
 <span class="pp-risk-counts"><button type="button" class="red" ${attributes('红灯')} aria-label="${label('红灯')} ${group.red}条">${group.red}</button><span>/</span><button type="button" class="orange" ${attributes('黄灯')} aria-label="${label('黄灯')} ${group.yellow}条">${group.yellow}</button></span></span></div>`;
}
// 按与右图相同的风险记录计数；全部只计一条，多部门共责分别计入对应部门。
function ppDepartmentRiskOptions(rows){
 return '<div class="pp-dept-options" role="group" aria-label="责任部门">'+['全部',...ppDepartments].map(name=>{
  const count=rows.reduce((sum,project)=>sum+ppDepartmentRiskRecords(project,name).length,0);
  return '<button type="button" data-pp-risk-department="'+name+'" aria-pressed="'+(ppState.riskDepartment===name)+'" aria-label="'+name+'，'+count+'条风险" title="未闭环红黄灯风险 '+count+'条"><span>'+name+'</span><b class="pp-dept-count" data-pp-dept-count="'+count+'">'+count+'<span>条</span></b></button>';
 }).join('')+'</div>';
}
function ppDepartmentRiskChart(rows){
 const dimension=ppState.distribution,groups=ppDepartmentRiskGroups(rows,dimension,ppState.riskDepartment),max=Math.max(1,...groups.map(g=>g.red+g.yellow));
 const title=ppState.riskDepartment==='全部'?'责任部门风险数':ppState.riskDepartment+'风险数';
 return `<article class="pp-card pp-departments"><div class="pp-card-head"><h3 data-pp-department-title>${esc(title)}</h3>${ppDepartmentRiskOptions(rows)}</div>
 <div class="pp-card-tools"><div class="pp-tabs">${[['type','项目类型'],['category','链群']].map(([key,label])=>`<button type="button" data-pp-dept-dimension="${key}" aria-pressed="${dimension===key}" class="${dimension===key?'active':''}">${label}</button>`).join('')}</div>
 </div>
 <div class="pp-chart-body">${ppChartColumns(dimension,true)}<div class="pp-bars">${groups.map(group=>ppDepartmentRiskRow(group,dimension,ppState.riskDepartment,max)).join('')}</div></div></article>`;
}
document.addEventListener('click',e=>{
 const button=e.target.closest('#projects.pp-main [data-pp-risk-department]');if(!button)return;
 if(ppState.riskDepartment===button.dataset.ppRiskDepartment)return;
 const chart=button.closest('.pp-departments'),scrollLeft=chart.querySelector('.pp-dept-options').scrollLeft;
 ppState.riskDepartment=button.dataset.ppRiskDepartment;
 // 部门只切换右图，保留左图、明细筛选、分页及滚动位置。
 chart.outerHTML=withPeriod('projects',()=>ppDepartmentRiskChart(ppScope(ppRows())));
 const selected=document.querySelector('#pp-overview [data-pp-risk-department="'+ppState.riskDepartment+'"]');
 selected.closest('.pp-dept-options').scrollLeft=scrollLeft;selected.focus({preventScroll:true});
});
