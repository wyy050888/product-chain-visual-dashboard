// 决策评审演示材料；以固定事项ID关联业务对象，不重开已完成/删除的原待办。
const gdDecisionMeetingReferences={
 'decision-launch-batch':{file:'产品链决策评审样例.xlsx',sheet:'待决策事项',row:2,date:shiftDate(DATA_CUTOFF,-1),subject:'新品首发节奏选择',discussion:'一次性全渠道首发和先小范围试销两种方案待比较，首批供货与后续补货安排尚需确认。',decision:'由产品中心汇总供货和渠道准备情况，评审首发节奏后确认采用方案、日期及分工。',owner:'林悦',due:shiftDate(DATA_CUTOFF,2)},
 'decision-test-route':{file:'产品链决策评审样例.xlsx',sheet:'待决策事项',row:3,date:shiftDate(DATA_CUTOFF,-1),subject:'关键验证采用内部排期还是外部检测',discussion:'内部检测窗口和外部检测方案尚未完成比较，检测周期、费用及验收安排需要共同确认。',decision:'品质提交验证要求，采购核实外部检测条件，项目部组织评审并记录最终选择。',owner:'沈舟',due:shiftDate(DATA_CUTOFF,2)},
 'decision-backup-supplier':{file:'产品链决策评审样例.xlsx',sheet:'待决策事项',row:4,date:shiftDate(DATA_CUTOFF,-1),subject:'备选供应商导入方式',discussion:'先保障现有供方交付与同步导入备选供方两种安排待评审，准备周期、样品验证和工艺适配情况需要补齐。',decision:'采购牵头比较导入安排，品质与研发确认验证要求，再确定是否并行导入及后续节点。',owner:'唐琪',due:shiftDate(DATA_CUTOFF,3)}
};
function gdDecisionSamples(context){
 const participant=(assignee,department,action,completionCriteria)=>({id:department,assignee,department,action,completionCriteria});
 const decision=(id,source,owner,object,extra)=>({id,kind:'decision',source,sourceName:context.by(source).name,owner,department:upTodoPersonDepartment(owner),objectName:object.name,spuId:object.spuId,projectId:['projects','suppliers'].includes(source)?object.id:undefined,category:object.category||pfCategory(object)||'全公司',date:gdDecisionMeetingReferences[id].date,due:gdDecisionMeetingReferences[id].due,priority:'P1',...extra});
 return [
  decision('decision-launch-batch','new','林悦',context.newProduct,{
   title:'新品首发节奏待决策',problem:'新品是一次性全渠道首发，还是先小范围试销，还没有确定；需要把供货和渠道准备情况放在一起比较。',impact:'首发方案未定，备货和渠道上线安排还无法统一。',action:'对比两种首发节奏，确定采用方案、上架日期和责任分工。',departments:['产品中心','采购部'],
   options:[['一次性全渠道首发','集中安排上线；需先确认首批供货和各渠道准备完成时间。'],['先小范围试销','先验证反馈再扩大；需明确试销范围、观察指标和转入正式首发的条件。']],
   decisionParticipants:[participant('林悦','产品中心','汇总渠道准备情况，对比首发方案并组织确认上线节奏。','首发方案、适用渠道、上线日期和确认记录已写清楚。'),participant('唐琪','采购部','核实首批供货和补货周期，反馈两种首发方案的供货条件。','首批供货、补货周期及供货限制已逐项说明。')]
  }),
  decision('decision-test-route','projects','沈舟',context.project,{
   title:'关键验证检测方案待决策',problem:'关键验证是等内部检测窗口，还是安排外部检测，还没有确定；需要比较周期、费用和验收要求。',impact:'检测方案未定，项目验证节点和交付安排暂时无法锁定。',action:'比较内部排期和外部检测条件，确认采用方案及验证节点。',departments:['项目部','品质中心','采购部'],
   options:[['安排内部检测','由现有团队执行；需明确可用窗口以及对其他任务的影响。'],['安排外部检测','先核实机构资质、报价、周期及验收要求，再确认是否采用。']],
   decisionParticipants:[participant('刘畅','品质中心','确认检测项目、内部可用窗口及外部报告的验收要求。','检测项目、可用窗口和报告验收要求均已确认。'),participant('唐琪','采购部','核实外部检测机构的资质、报价和预计出报告时间。','机构资质、报价和出报告周期已有可核对的材料。'),participant('沈舟','项目部','组织比较检测方案，记录最终选择并同步项目验证节点。','采用方案、确认记录及调整后的验证节点已同步。')]
  }),
  decision('decision-backup-supplier','suppliers','唐琪',context.supplier.project,{
   title:'备选供应商导入方式待决策',problem:'是先保障现有供方交付，还是同步导入备选供方，还没有确定；需要比较准备周期、验证投入和供货风险。',impact:'导入方式未定，寻源投入和样品验证资源暂时无法统一安排。',action:'汇总供货、样品验证和工艺适配条件，确定备选供方导入方式。',priority:'P2',departments:['采购部','品质中心','研发中心'],
   options:[['先保障现有供方','优先安排当前交付；同时保留备选资料并明确何时启动导入。'],['并行导入备选供方','同步准备备选；需确认样品、验证资源及导入节点。']],
   decisionParticipants:[participant('唐琪','采购部','比较当前供货和备选供方准备周期，组织确认导入方式。','采用的导入方式、供货安排和后续节点已有确认记录。'),participant('刘畅','品质中心','明确备选供方的样品要求、验证项目和预计评审周期。','样品要求、验证项目及评审周期已形成清单。'),participant('王磊','研发中心','核实备选供方的工艺适配条件及需要补做的技术验证。','工艺适配结论、技术验证项目和预计完成时间已说明。')]
  })
 ];
}
