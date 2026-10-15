const projectIssueTemplates={
 '产品部':{category:'需求与评审',task:'完成需求资料补齐与立项复审',reason:'需求边界、目标成本与验收标准未形成完整评审包，评审意见尚未逐项确认。',impact:'立项结论无法确认，后续研发输入与排期受影响。',action:'补齐需求说明、目标成本和验收标准；组织产品、研发及品质联合复审，逐项确认评审意见。',proof:'完整需求说明、评审签字记录及意见关闭清单',validator:'项目部 · 刘畅'},
 '项目部':{category:'排期与协同',task:'完成跨部门依赖确认与排期冻结',reason:'研发交付、品质复测与采购到料节点尚未对齐，前后置任务的交付边界和负责人未全部确认。',impact:'关键路径无法冻结，试产与上线节点存在冲突。',action:'拉通依赖任务，确认每个节点的负责人及交付日期；冻结关键路径并同步各部门执行。',proof:'各部门确认的排期表、依赖任务清单及会议结论',validator:'产品部 · 唐琪'},
 '品质部':{category:'品质与测试',task:'完成关键测试问题整改与复测放行',reason:'关键测试项目未通过，异常样本与复测判定标准尚未完成联合复核，缺少可放行的验证结论。',impact:'品质放行受阻，试产与上线需等待复测结果。',action:'复核异常样本与问题批次；研发提交修正方案，品质按统一标准复测，形成放行结论。',proof:'异常清单、复测报告及品质放行记录',validator:'项目部 · 刘畅'},
 '研发部':{category:'研发与版本',task:'完成样机版本验证与问题回归',reason:'样机软件版本待验证，修复项与测试用例尚未完成逐项回归，交付版本缺少完整验证依据。',impact:'稳定版本无法交付，品质验证与试产准备受到影响。',action:'冻结待测版本，核对修复清单与回归用例；完成验证后向品质移交版本及测试证据。',proof:'版本发布记录、回归测试报告及交接确认单',validator:'品质部 · 王磊'},
 '采购部':{category:'供应商与物料',task:'完成核心物料资质复审与交付确认',reason:'核心物料的资质复审材料未补齐，供应商交期与备选物料方案尚未完成确认。',impact:'关键物料到料缺少保障，样机及试产排期受影响。',action:'补齐供应商资质与物料证明，确认承诺交期；并行评估替代供应方案并完成品质确认。',proof:'资质复审结论、交期承诺及替代物料验证记录',validator:'品质部 · 王磊'}
};
function projectIssueRecord(p){
 const template=p.procurementIssue||projectIssueTemplates[p.dept],t=p.reference?{...template,reason:p.cause||'项目日报待补录',task:p.stage+'：确认关键交付进度'}:template,cutoff=bounds().cutoff,closed=!p.reference&&p.status==='绿灯'&&p.id%3===0,active=p.status!=='绿灯',hasIssue=active||closed,review=p.status==='黄灯'&&p.id%3===0;
 const occurred=hasIssue?shiftDate(cutoff,-(p.status==='红灯'?p.delay+8:closed?18:7)):'',due=hasIssue?(p.status==='红灯'?shiftDate(p.plan,3):shiftDate(cutoff,closed?-7:4)):'',actual=closed?shiftDate(cutoff,-9):review?shiftDate(cutoff,-1):'',verified=closed?shiftDate(cutoff,-7):'';
 const state=closed?'已闭环':!active?'正常推进':review?'待闭环验证':p.status==='红灯'?'逾期整改':'整改中';
 const verification=closed?'验证通过':review?'待验证':active?'待整改后验证':'不适用';
 return {p,t,closed,active,hasIssue,review,occurred,due,actual,verified,state,verification,created:(occurred||shiftDate(cutoff,-25))+' 09:30',chainOwner:p.reference?p.productOwner:['林悦','周铭','陈嘉','许宁'][p.chain],chainLead:['刘畅','唐琪','王磊','沈舟'][p.chain],task:hasIssue?t.task:'按计划完成'+p.stage,category:hasIssue?t.category:'无异常',description:hasIssue?t.reason:'当前节点按计划推进，未发现需整改的问题。',impact:closed?'原卡点已验证关闭，后续按排期推进。':active?(p.status==='红灯'?`已影响计划上线，截至 ${cutoff} 延期 ${p.delay} 天。`:'尚未超过计划上线日期，需在整改期限内消除风险。')+t.impact:'持续跟踪计划节点与交付质量。'};
}
function projectIssueFields(r){const p=r.p;return [
 ['项目任务',r.task],['问题类别',r.category],['问题描述',r.description],['责任部门',p.dept],['责任链主',r.chainOwner],['责任链负责人',r.chainLead],['红黄绿灯状态',p.status],['发生日期',r.occurred||'—（未发生异常）'],['整改期限',r.due||'—（无需整改）'],['实际整改日期',r.actual||'—（'+(r.active?'尚未完成':'无需整改')+'）'],['闭环验证日期',r.verified||'—（'+(r.hasIssue?'尚未验证':'不适用')+'）'],['当前状态',r.state],['闭环验证',r.verification],['创建时间',r.created]
 ];}
projectDetail=bindDetail(()=>activeModule||(!$('#overlay').hidden?modalModule:null)||'projects',function(id){
 const p=projects().find(p=>p.id===+id);if(!p){toast('当前周期未找到该项目');return}
 const r=projectIssueRecord(p),tone=p.status==='红灯'?'red':p.status==='黄灯'?'orange':'green';
 const item=(label,value)=>`<div class="pd-field"><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
 const milestones=[['发生日期',r.occurred,r.hasIssue?'问题登记，启动责任认领':'未发生异常'],['整改期限',r.due,r.active&&r.due<bounds().cutoff?'已逾期，需跟进整改':'计划完成整改'],['实际整改日期',r.actual,r.actual?'整改材料已提交':r.active?'尚未完成':'无需整改'],['闭环验证日期',r.verified,r.verified?'验证通过，问题已闭环':r.hasIssue?'尚未验证':'不适用']];
 openModal('项目详情 · '+p.name,`<article class="project-detail-v2">
 <div class="pd-overview"><div><span class="pd-eyebrow">${esc(p.model)} · ${esc(chains[p.chain])} · ${esc(p.brand)} · ${esc(p.type)}</span><h3>${esc(p.name)}</h3><p>计划上线 ${p.plan}　·　${p.delay?'已延期 '+p.delay+' 天':'按计划跟进'}　·　截至 ${bounds().cutoff}</p></div><div class="pd-status"><small>红黄绿灯状态</small>${traffic(p.status)}<small>当前状态</small><strong class="${tone}">${r.state}</strong></div></div>
 <section class="pd-section"><div class="pd-heading"><h3>问题归因与项目任务</h3><span class="tag ${tone}">${r.closed?'历史问题 · 已闭环':r.active?'当前问题':'无待整改问题'}</span></div>
 <dl class="pd-grid">${item('项目任务',r.task)}${item('问题类别',r.category)}</dl>
 <div class="pd-reason ${tone}"><span>问题描述</span><p>${esc(r.description)}</p><span>业务影响</span><p>${esc(r.impact)}</p></div>
 <div class="pd-plan"><strong>${r.closed?'已执行整改方案':'整改方案与交付要求'}</strong><p>${esc(r.hasIssue?r.t.action:'按节点提交交付物并完成评审，有异常及时登记并指定整改责任人。')}</p>${r.hasIssue?`<small>交付要求：${esc(r.t.proof)}。</small>`:''}</div></section>
 <section class="pd-section"><div class="pd-heading"><h3>责任分工</h3><small>任务跟进人：${esc(p.owner)}</small></div><dl class="pd-grid pd-grid-three">${item('责任部门',p.dept)}${item('责任链主',r.chainOwner)}${item('责任链负责人',r.chainLead)}</dl></section>
 <section class="pd-section"><div class="pd-heading"><h3>整改与闭环时间线</h3><small>创建时间：${r.created}</small></div><ol class="pd-milestones">${milestones.map(([label,date,note],i)=>`<li class="${date?'recorded':''} ${i===1&&r.active&&date<bounds().cutoff?'overdue':''}"><span>${label}</span><strong>${date||'—'}</strong><small>${note}</small></li>`).join('')}</ol></section>
 <section class="pd-section"><div class="pd-heading"><h3>闭环验证</h3><span class="tag ${r.closed?'green':r.active?'orange':''}">${r.verification}</span></div><dl class="pd-grid">${item('验证责任人',r.hasIssue?r.t.validator:'—')}${item('验证结论',r.closed?'交付材料完整，验收标准通过，同意关闭。':r.review?'整改已提交，待独立复核通过后关闭。':r.active?'整改尚未完成，暂不具备闭环条件。':'当前无整改事项。')}</dl>${r.hasIssue?`<div class="pd-evidence"><strong>闭环验证要求</strong><p>${esc(r.t.proof)}齐全，并由验证责任人确认结果符合验收标准。</p><small>验证依据：${r.closed?'验收记录 YS-'+p.model+' · '+r.verified+'；归档附件已完成核对（演示记录）。':r.review?'整改材料 ZG-'+p.model+' 已提交（演示记录）；验证结论待补充。':'待责任部门提交整改材料与验收证据。'}</small></div>`:''}</section>
 <details class="pd-more"><summary>项目基础信息</summary><dl class="pd-grid pd-grid-three">${item('立项日期',p.started||dateBack(100))}${item('实际上线日期',p.actual==='—'?'实际日期待补录':p.actual)}${item('当前阶段',p.stage)}${item('单品成本',p.cost===null?'—':'¥ '+p.cost)}${item('单品售价',p.price===null?'—':'¥ '+p.price)}${item('记录编号','ISS-'+p.model)}</dl></details>
 </article>`);
 
});