// 抓取样例只读：钉钉日志与会议Excel不在本系统新增、补交或编辑。
function gdReports(context,includeAll=false){
 const {project,newProduct,product}=context;
 const specs=[
  {id:'report-project-daily',type:'日报',date:shiftDate(DATA_CUTOFF,-1),deadline:DATA_CUTOFF+'T09:00:00+08:00',owner:'沈舟',department:'项目部',source:'projects',objectName:project.name,category:project.category,projectId:project.id,progress:'',problem:'',next:'',submitted:''},
  {id:'report-new-daily',type:'日报',date:shiftDate(DATA_CUTOFF,-2),deadline:shiftDate(DATA_CUTOFF,-1)+'T09:00:00+08:00',owner:'林悦',department:'产品中心',source:'new',objectName:newProduct.name,category:newProduct.category,spuId:newProduct.spuId,progress:'已核对新品经营数据和上线计划。',problem:'已列出延期节点，缺少责任岗位反馈。',next:'',submitted:DATA_CUTOFF+'T08:30:00+08:00'},
  {id:'report-cost-weekly',type:'周报',date:shiftDate(DATA_CUTOFF,-6),deadline:shiftDate(DATA_CUTOFF,-6)+'T17:00:00+08:00',owner:'唐琪',department:'采购部',source:'cost',objectName:'采购降本周计划',category:'全公司',progress:'',problem:'',next:'',submitted:''},
  {id:'report-sales-weekly',type:'周报',date:shiftDate(DATA_CUTOFF,-6),deadline:shiftDate(DATA_CUTOFF,-6)+'T17:00:00+08:00',owner:'周铭',department:'产品中心',source:'sales',objectName:'产品链经营复盘',category:'全公司',progress:'已完成各产品链销售达成复盘。',problem:'重点产品改善动作需持续跟踪。',next:'按产品链确认责任人，周例会复核推进结果。',submitted:shiftDate(DATA_CUTOFF,-6)+'T16:30:00+08:00'},
  {id:'report-purchase-monthly',type:'月报',date:'2026-09-30',deadline:'2026-10-01T09:00:00+08:00',owner:'唐琪',department:'采购部',source:'suppliers',objectName:'供应链月度工作复盘',category:'全公司',progress:'已复盘供应商储备与准入情况，列出未完成的项目寻源清单。',problem:'准入评审资料与验证窗口需要跨部门对齐。',next:'',submitted:'2026-10-01T08:20:00+08:00'},
  {id:'report-quality-monthly',type:'月报',date:'2026-09-30',deadline:'2026-10-01T09:00:00+08:00',owner:'刘畅',department:'品质中心',source:'risk',objectName:'品质月度整改复盘',category:'全公司',progress:'已汇总重点产品问题复现与复测结论。',problem:'整改后的经营指标仍需继续观察。',next:'按重点产品跟踪退货与进线数据，复核整改效果。',submitted:'2026-10-01T08:10:00+08:00'}
,
  {id:'report-lifecycle-daily',type:'日报',date:shiftDate(DATA_CUTOFF,-2),deadline:shiftDate(DATA_CUTOFF,-1)+'T09:00:00+08:00',owner:'林悦',department:'产品中心',source:'lifecycle',objectName:'规划完成项归档',category:'全公司',progress:'已完成本期规划复盘，完成项后续统一归档。',problem:'部分完成项的成果物链接待补齐。',next:'继续跟进资料归档。',submitted:shiftDate(DATA_CUTOFF,-2)+'T18:00:00+08:00'},
  {id:'report-key-daily',type:'日报',date:shiftDate(DATA_CUTOFF,-2),deadline:shiftDate(DATA_CUTOFF,-1)+'T09:00:00+08:00',owner:'周铭',department:'产品中心',source:'matrix',objectName:product.name,category:product.category,spuId:product.spuId,progress:'已复盘高销低利产品，等待采购与研发反馈改善路径。',problem:'报价优化与结构替代方案尚未确定。',next:'择期组织方案评审。',submitted:shiftDate(DATA_CUTOFF,-2)+'T18:10:00+08:00'},
  {id:'report-stock-daily',type:'日报',date:shiftDate(DATA_CUTOFF,-2),deadline:shiftDate(DATA_CUTOFF,-1)+'T09:00:00+08:00',owner:'唐琪',department:'采购部',source:'inventory',objectName:'库存处置复盘',category:'全公司',progress:'已核对我司可售库存总量及呆滞库存金额。',problem:'各产品处置数量和交付要求尚待确认。',next:'继续跟进库存去化。',submitted:shiftDate(DATA_CUTOFF,-2)+'T18:20:00+08:00'}
 ];
 const range=gdRange();return [...specs,...gdFocusMaterials(context).logs].map(base=>{
  const r={...base},late=r.submitted&&Date.parse(r.submitted)>Date.parse(r.deadline),missing=!r.submitted,incomplete=!!r.submitted&&(!r.progress.trim()||!r.problem.trim()||!r.next.trim());
  return {...r,logId:r.submitted?'DD-LOG-'+r.id:'',capturedAt:DATA_CUTOFF+'T10:30:00+08:00',kind:'report',title:r.type+' · '+r.owner,priority:missing?'red':incomplete||late?'yellow':'green',status:missing?gdLogStatuses.missing:incomplete?gdLogStatuses.incomplete:late?gdLogStatuses.late:'已提交',problem:missing?'已到提交时间，抓取结果未匹配到对应日志':incomplete?'下一步安排不完整':r.problem,reportProblem:r.problem,sourceName:context.by(r.source).name,due:r.deadline.slice(0,10),late,missing,incomplete};
 }).filter(r=>includeAll||((r.missing||r.incomplete||r.late)&&r.date<=range.end&&(r.date>=range.start||r.missing||r.incomplete)));
}
function gdIssues(context){
 const {project:p,product:m,supplier:s,by}=context;
 const base=(id,source,department,owner,object,extra={})=>({id,source,sourceName:by(source).name,department,owner,objectName:object.name||object.objectName||by(source).name,category:object.category||'全公司',spuId:object.spuId,projectId:source==='projects'?object.id:undefined,date:shiftDate(DATA_CUTOFF,-2),due:shiftDate(DATA_CUTOFF,3),priority:'yellow',...extra});
 const projectBase=base('project','projects','项目部','沈舟',p,{priority:'red',impact:p.name+' · '+p.status+' · 延期 '+(p.delay??0)+'天'}),marginBase=base('margin','matrix','产品中心','周铭',m,{impact:m.name+' · 利润率 '+gdPercent(m.profit)}),supplierBase=base('supplier','suppliers','采购部','唐琪',{name:s.project.name,category:pfCategory(s.project)},{projectId:s.project.id,impact:'已准入 '+s.stats.admitted+'，要求 '+stStandards(+DATA_CUTOFF.slice(0,4)).projectAdmitted});
 const coordination=[
  {...projectBase,id:'coordinate-project',kind:'block',title:'关键节点交付需要跨部门对齐',problem:'协调会记录：采购与品质的交付窗口尚未形成一致安排。',priority:'red',departments:['项目部','采购部','品质中心'],action:'确认样机、检测和交付的统一排期，逐项明确负责人。',options:[['统一交付窗口','项目部牵头对齐采购与品质排期；相关节点需同步调整。'],['分阶段交付','先交付可验证部分，后补齐剩余内容；需确认验收边界。']]},
  {...marginBase,id:'coordinate-margin',kind:'decision',title:'重点产品改善路径待决策',problem:'评审会记录：报价优化与结构调整两条路径尚未确定。',priority:'red',departments:['产品中心','采购部','研发中心'],action:'对比报价有效期、验证周期和交付影响，确定推进方案。',options:[['先验证报价优化','优先核实适用SKU和采购条件；收益须经成本复核。'],['开展结构替代验证','研发与品质共同验证；需评估样机和检测投入。']]},
  {...supplierBase,id:'coordinate-supplier',kind:'block',title:'候选供应商准入评审需协同',departments:['采购部','品质中心'],problem:'采购已列候选范围，评审资料和品质验证窗口尚未对齐。',action:'联合确认资料清单、样品要求及评审日期。',options:[['集中评审','合并资料预审与样品验证安排；需预留评审窗口。'],['分批评审','先评审资料完整的候选供应商；其余补齐后续审。']]}
 ];
 const resource=[
  {...projectBase,id:'resource-test',kind:'conflict',title:'检测窗口排期冲突',department:'品质中心',owner:'刘畅',priority:'red',resource:'检测设备 / 复测窗口',problem:'资源排期记录：重点项目验证与常规样品测试占用同一窗口。',departments:['品质中心','研发中心','项目部'],action:'核对排期后优先保障关键验证，确认被调整任务的新日期。',options:[['调整内部测试顺序','设备投入不变；常规样品的交付时间可能后移。'],['评估外部检测','需要补充费用报价和资质核验；未经确认不安排采购。']]},
  {...supplierBase,id:'resource-supplier',kind:'capacity',title:'准入供应商储备不足',resource:'合格供应商',problem:'项目准入数量未达到已配置要求。',departments:['采购部','品质中心'],action:'复核候选供应商适配性，补齐准入资源。',options:[['复用现有资源池','先检查同类工艺及品类能力；须复核项目适配性。'],['补充新供方','增加寻源与打样投入；需核对费用及导入周期。']]},
  {...marginBase,id:'resource-engineering',kind:'capacity',title:'降本方案验证支持待安排',department:'研发中心',owner:'王磊',resource:'研发验证支持',problem:'方案需要研发与品质验证，尚未登记可用排期。',departments:['研发中心','品质中心','采购部'],action:'核实验证工作量和可用产能，确认支持方式。',options:[['内部错峰验证','需确认现有任务优先级及排期影响。'],['组织专项支持','工作量和支持人员待核实；由部门负责人确认。']]}
 ];
 return {focus:gdFocusRows(context),coordination,resource};
}
