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
function ppDepartmentRiskChart(rows){
 const dimension=ppState.departmentDistribution,groups=ppDepartmentRiskGroups(rows,dimension,ppState.riskDepartment),max=Math.max(1,...groups.map(g=>g.red+g.yellow));
 return `<article class="pp-card pp-departments"><div class="pp-card-head"><h3>责任部门风险数</h3><span><i class="dot red"></i>红灯 <i class="dot orange"></i>黄灯</span></div>
 <div class="pp-tabs">${[['type','项目类型'],['category','类目']].map(([key,label])=>`<button type="button" data-pp-dept-dimension="${key}" aria-pressed="${dimension===key}" class="${dimension===key?'active':''}">${label}</button>`).join('')}</div>
 <div class="pp-dept-options" role="group" aria-label="责任部门">${['全部',...ppDepartments].map(name=>`<button type="button" data-pp-risk-department="${name}" aria-pressed="${ppState.riskDepartment===name}">${name}</button>`).join('')}</div>
 <div class="pp-bars">${groups.map(g=>ppLink('departmentRisk',g.key,`<span class="pp-bar-label">${esc(g.key)}</span>`,`<span class="pp-bar-line"><span class="pp-track"><i class="pp-red" style="width:${g.red/max*100}%"></i><i class="pp-yellow" style="width:${g.yellow/max*100}%"></i></span><span><b class="red">${g.red}</b> / <b class="orange">${g.yellow}</b></span></span>`,dimension)).join('')}</div>
 <p class="pp-note">${rows.some(p=>p.ledger.some(r=>r.sample))?'含演示风险台账，按未闭环风险数统计。':'按已维护的未闭环风险数统计。'}</p></article>`;
}
document.addEventListener('click',e=>{
 const button=e.target.closest('#projects.pp-main [data-pp-dept-dimension],#projects.pp-main [data-pp-risk-department]');if(!button)return;
 if(button.dataset.ppDeptDimension)ppState.departmentDistribution=button.dataset.ppDeptDimension;
 else ppState.riskDepartment=button.dataset.ppRiskDepartment;
 if(ppState.link?.kind==='departmentRisk')ppState.link=null;
 ppState.page=1;renderProjects();
});
