// 全部部门下每份风险记录只计一次；单部门按台账中的责任部门匹配。
function ppDepartmentRiskRecords(project,department){
 return project.ledger.filter(r=>r.status!=='已闭环'&&['红灯','黄灯'].includes(r.light)&&ppValues(r.department).some(name=>ppDepartments.includes(name)&&(department==='全部'||name===department)));
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
function ppDepartmentRiskChart(rows){
 const dimension=ppState.departmentDistribution,groups=ppDepartmentRiskGroups(rows,dimension,ppState.riskDepartment),max=Math.max(1,...groups.map(g=>g.red+g.yellow));
 return `<article class="pp-card pp-departments"><div class="pp-card-head"><h3>责任部门风险数</h3><span><i class="dot red"></i>红灯 <i class="dot orange"></i>黄灯</span></div>
 <div class="pp-tabs">${[['type','项目类型'],['category','类目']].map(([key,label])=>`<button type="button" data-pp-dept-dimension="${key}" aria-pressed="${dimension===key}" class="${dimension===key?'active':''}">${label}</button>`).join('')}</div>
 <div class="pp-dept-options" role="group" aria-label="责任部门">${['全部',...ppDepartments].map(name=>`<button type="button" data-pp-risk-department="${name}" aria-pressed="${ppState.riskDepartment===name}">${name}</button>`).join('')}</div>
 <div class="pp-bars">${groups.map(group=>ppDepartmentRiskRow(group,dimension,ppState.riskDepartment,max)).join('')}</div>
 <p class="pp-note">${rows.some(p=>p.ledger.some(r=>r.sample))?'含演示风险台账，按未闭环风险数统计。':'按已维护的未闭环风险数统计。'}</p></article>`;
}
document.addEventListener('click',e=>{
 const button=e.target.closest('#projects.pp-main [data-pp-dept-dimension],#projects.pp-main [data-pp-risk-department]');if(!button)return;
 if(button.dataset.ppDeptDimension)ppState.departmentDistribution=button.dataset.ppDeptDimension;
 else ppState.riskDepartment=button.dataset.ppRiskDepartment;
 ppState.page=1;renderProjects();
});
