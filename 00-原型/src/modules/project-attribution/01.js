

// Department attribution stays inline and uses the same filtered project set as the cards.
let projectDepartment=depts[0],departmentPage=1,departmentScope='';
const departmentGuidance={
 '产品部':['评审资料与需求输入不完整，立项评审无法按计划推进。','补齐立项材料、需求边界与评审依据，明确评审完成日期。'],
 '项目部':['跨部门排期及依赖节点尚未确认，项目交付计划存在阻塞。','对齐跨部门排期，落实依赖事项负责人及交付日期。'],
 '品质部':['关键测试项目未通过，品质验证与放行环节存在阻塞。','复核测试失败项，明确整改负责人、复测标准及复测日期。'],
 '研发部':['样机软件版本待验证，测试版本与验证结论尚未闭环。','确认软件问题清单、测试版本和验证计划，完成后同步品质复测。'],
 '采购部':['核心物料资质复审未完成，供应商与物料准备环节存在阻塞。','补齐资质复审材料，确认物料交期，并评估替代供应方案。']
};
$('#departments').insertAdjacentHTML('afterend','<div id="department-attribution" aria-live="polite"></div>');
function renderDepartmentAttribution(){withPeriod('projects',()=>{
 const scope=[periodKey(),$('#projectchain').value,$('#projecttype').value].join('|');if(scope!==departmentScope){departmentPage=1;departmentScope=scope}
 const rows=filteredProjects().filter(p=>p.dept===projectDepartment&&p.status==='红灯').sort((a,b)=>b.delay-a.delay||a.id-b.id),pages=Math.max(1,Math.ceil(rows.length/listPageSize('department-projects',10)));departmentPage=Math.min(departmentPage,pages);
 $$('#departments .dept').forEach(b=>{const name=b.dataset.dept||b.dataset.deptInline;b.removeAttribute('data-dept');b.dataset.deptInline=name;b.classList.toggle('selected',name===projectDepartment);b.setAttribute('aria-pressed',String(name===projectDepartment));b.setAttribute('aria-controls','department-attribution')});
 const guide=departmentGuidance[projectDepartment],visible=rows.slice((departmentPage-1)*listPageSize('department-projects',10),departmentPage*listPageSize('department-projects',10));
 const headers=['产品 / 项目','卡点阶段','红灯归因说明','延迟天数','责任人','操作'];
 $('#department-attribution').innerHTML=`<div class="department-detail-heading"><div class="titlegroup"><span class="department-marker"></span><h3>${esc(projectDepartment)} · 红灯归因</h3><span class="tag red">${rows.length} 个红灯</span></div><span class="note">截至 ${bounds().cutoff}</span></div>${rows.length?`<div class="department-cause-table"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${visible.map(p=>`<tr data-department-project="${p.id}">${[
 titleProduct(p),esc(p.stage),`<strong>${esc(p.cause)}</strong><p>${esc(p.name)}在${esc(p.stage)}阶段受阻，计划上线日期为 ${p.plan}，截至当前统计日已延期 ${p.delay} 天。</p><small>应对建议：${esc(guide[1])}</small>`,
 `<span class="red num">${p.delay} 天</span>`,esc(p.owner),`<button class="link" data-project="${p.id}">查看详情</button>`
 ].map((v,i)=>`<td data-label="${headers[i]}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty department-empty">当前时间、品链和项目类型下，${esc(projectDepartment)}暂无红灯项目。</div>`}${listPager(rows.length,departmentPage,listPageSize('department-projects',10),{sizeKey:'department-projects',attr:"data-department-page"})}`;
 });}
const renderProjectsBeforeDepartments=renderProjects;
renderProjects=function(){renderProjectsBeforeDepartments();renderDepartmentAttribution()};
document.addEventListener('click',e=>{const department=e.target.closest('[data-dept-inline]'),page=e.target.closest('[data-department-page]');if(department){projectDepartment=department.dataset.deptInline;departmentPage=1;renderDepartmentAttribution()}else if(page&&!page.disabled){departmentPage=+page.dataset.departmentPage;renderDepartmentAttribution()}});