// 重点事项是可办理的任务；资源与报告分析不经过此适配层。
const gdWorkLegacyOrigins={
 'work-core-delivery':'coordinate-project','work-core-margin':'coordinate-margin',
 'work-block-admission':'coordinate-supplier','work-solution-launch':'decision-launch-batch','work-solution-test':'decision-test-route'
};
function gdWorkPeople(row){
 const role=(name,action,completionCriteria)=>({assignee:name,department:upTodoPersonDepartment(name),action,completionCriteria});
 const plans={
  'work-core-delivery':[['沈舟','锁定样机交付与检测排期，确认每个节点的负责人。','交付清单、检测排期与责任人已确认。'],['唐琪','确认物料齐套日期，反馈缺料及到货计划。','已反馈物料齐套日期及缺料到货安排。'],['刘畅','确认检测验收标准、测试窗口及结论日期。','验收标准、检测窗口和结论日期已确认。']],
  'work-core-margin':[['唐琪','跟工厂协商电机和结构件降本，提交报价及适用批次。','已取得书面报价并明确型号、采购条件与生效批次。'],['王磊','核实替代物料性能与成本，提交验证结论。','已说明性能验证、成本变化与交付影响。'],['周铭','确认降本改善路径，反馈利润测算与实施节点。','已确认采用路径、收益测算和实施日期。']],
  'work-block-admission':[['刘畅','确认样品检测标准、检测窗口及准入评审结论日期。','检测标准、窗口和评审结论日期均已确认。'],['唐琪','按检测要求安排发样，补齐资料并组织准入评审。','样品及资料已齐套，已反馈发样日期与评审安排。']],
  'work-block-package':[['陈嘉','确认包装卖点文案并反馈定版结论。','包装卖点文案已确认并关联定版稿。'],['王磊','依据确认文案冻结包装刀模与尺寸。','已提交冻结刀模及尺寸文件。'],['唐琪','落实包材打样，确认样品交付日期。','打样方案及交样日期已确认。']],
  'work-solution-launch':[['林悦','形成全渠道首发与分批试销对比，确认首发数量及渠道范围。','已提交两种方案的成本、渠道、数量对比与推荐结论。'],['唐琪','核实首批最小起订量、供货周期和分批交货成本。','已取得工厂确认的起订量、成本及交付条件。']],
  'work-solution-test':[['刘畅','形成外部检测方案，确认机构资质、检测范围与报告周期。','机构资质、检测项目与报告交付日期均已确认。'],['唐琪','取得外部检测报价，核实费用承担及委托条件。','已取得报价并确认费用和委托条件。'],['沈舟','确认外部检测对项目节点的影响，更新验证排期。','已更新验证排期并明确受影响的交付节点。']]
 };
 return (row.rolePlans||plans[row.id]||[]).map(args=>role(...args));
}
function gdWorkTaskOrigin(row,origins,context){
 const legacy=origins.find(r=>r.id===gdWorkLegacyOrigins[row.id]),obj=row.object;
 const source=row.coverage?'inventory':obj.key.startsWith('admission|')?'suppliers':obj.type==='project'?'projects':row.kind==='core'?'matrix':'new';
 const product=obj.spuId&&upSpus.get(obj.spuId),category=obj.category||(product?pfCategory(upProduct(product)):source==='suppliers'?pfCategory(context.supplier.project):context.project.category||'全公司');
 const decisionParticipants=gdWorkPeople(row);
 const proposed=legacy?gdProposal(legacy).id:'global-diagnosis|'+row.id+'|'+obj.key;
 // 日期变化不重复下发同一业务事项；只按明确来源谱系及业务身份复用，包含删除标记。
 const lineage=new Set([row.id,...(legacy?origins.filter(r=>gdTaskKey(r)===gdTaskKey(legacy)).map(r=>r.id):[])]);
 const previous=Object.values(upTodos).filter(t=>lineage.has(t.gdIssue)&&(obj.spuId?t.spuId===obj.spuId:String(t.gdProjectId)===String(obj.projectId)&&t.gdSource===source)).sort((a,b)=>String(b.assignedAt||'').localeCompare(String(a.assignedAt||''))||a.id.localeCompare(b.id))[0];
 return {...row,isWorkTask:true,workTaskId:upTodos[proposed]?.id||previous?.id||proposed,
  source,sourceName:context.by(source).name,objectName:obj.name,spuId:obj.spuId,projectId:obj.projectId,category,
  due:row.due||shiftDate(DATA_CUTOFF,2),owner:decisionParticipants[0]?.assignee||'',decisionParticipants,
  action:decisionParticipants.map(p=>p.assignee+'：'+p.action).join('\n'),businessObjects:[{type:obj.type,id:obj.spuId??String(obj.projectId??obj.key),name:obj.name}]};
}
// 仅升级未办理、未人工编辑且仍逐字匹配旧模板的演示动作，保留原任务与责任项身份。
function gdRefreshSampleTasks(rows){
 const next={...upTodos};let changed=false;
 for(const row of rows){
  const task=next[row.workTaskId],old=row.samplePreviousActions,roles=task?.responsibilities||[];
  if(!old||!task?.gdAutomatic||task.source!=='global-diagnosis'||task.deletedAt||task.status!=='pending'||task.evidence||task.descriptionVersion===2)continue;
  if(roles.length!==old.length||roles.some(r=>r.status!=='pending'||r.feedback||!old.includes(r.action)))continue;
  if((task.logs||[]).some(log=>!['assign','sample-progress'].includes(log.action)))continue;
  if(task.plan!==roles.map(r=>r.assignee+'：'+r.action).join('\n'))continue;
  const plans=row.decisionParticipants;
  if(plans.length!==roles.length||!roles.every(r=>plans.some(p=>p.assignee===r.assignee&&p.department===r.department)))continue;
  const responsibilities=roles.map(r=>{const p=plans.find(p=>p.assignee===r.assignee&&p.department===r.department);return {...r,action:p.action,completionCriteria:p.completionCriteria}});
  next[task.id]={...task,title:row.title,description:row.problem,gdProblem:row.problem,responsibilities,
   plan:responsibilities.map(r=>r.assignee+'：'+r.action).join('\n')};changed=true;
 }
 if(changed)upPersistTodos(next);
}
function gdResolveWorkTasks(rows,origins,context){
 const adapted=rows.map(row=>gdWorkTaskOrigin(row,origins,context));
 gdRefreshSampleTasks(adapted);
 const unassigned=adapted.filter(row=>{const task=upTodos[row.workTaskId];return !task||!task.deletedAt&&task.status==='suggested'});
 if(unassigned.length)gdAutoAssign(unassigned);
 gdBindTaskOrigins(adapted);
 return adapted.map(row=>{const task=upTodos[row.workTaskId];if(!task||task.deletedAt)return null;return gdPresentWorkTask(row,task)}).filter(Boolean);
}
function gdPresentWorkTask(row,task){
 const display=gdPresentAction({...row,task});
 const manual=task.source==='manual'||task.descriptionVersion===2;
 return {...display,problem:row.problem,causalProblem:manual?task.description:row.problem};
}

// 工作偏差仅描述事实、建议与涉及人员，不关联执行单或办理状态。
function gdDeviationRows(rows){
 return rows.map(({rolePlans,samplePreviousActions,due,...row})=>{
  const participants=gdWorkPeople({...row,rolePlans}).map(({assignee,department,action})=>({assignee,department,action}));
  return {...row,participants,people:[...new Set(participants.map(p=>p.assignee))],
   departments:[...new Set(participants.map(p=>p.department))],
   suggestion:participants.map(p=>p.assignee+'：'+p.action).join('\n'),
   businessObjects:[{...row.object,id:String(row.object.spuId??row.object.projectId??row.object.key)}]};
 });
}
