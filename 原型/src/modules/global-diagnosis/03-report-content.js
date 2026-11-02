// 报告原文为演示材料；每个有问题的报告使用独立案例，原文按六个诊断维度组织。
const gdReportIssueSamples={
 '产品中心/日报':{key:'result',excerpt:'已备货 320 台，试销达成良好，暂未汇总实际签收量。',problem:'把备货量当作试销成果，尚未提供实际签收量及目标差额，销售达成判断缺少依据。',deductions:[
  {ruleId:'actual',problem:'把备货量当作试销成果，未提供实际签收量。'},
  {ruleId:'comparison',problem:'未提供销售目标与实际成果的差额。'}]},
 '产品中心/周报':{key:'risk',excerpt:'首发渠道已确定，促销价保及退差价成本暂不纳入本周风险说明。',problem:'促销价保和退差价被排除在风险说明之外，渠道活动对实际毛利的影响无法评估。',deductions:[
  {ruleId:'scope',problem:'遗漏促销价保及退差价成本风险，无法评估实际毛利影响。'}]},
 '项目部/周报':{key:'risk',excerpt:'各环节继续按原排期推进，物料到货视为已确认，采购回传条件暂略。',problem:'将关键物料到货视为已确认，未披露采购回传的前置依赖及对验收的影响，周排期的可执行性无法核对。',deductions:[
  {ruleId:'dependencies',problem:'采购回传的前置依赖未披露，将待确认的到货条件视为已确认。'}]},
 '品质中心/日报':{key:'result',excerpt:'已发现滤网堵塞，同时认为电机衰减也是原因，尚未开展电机对照试验。',problem:'已验证的滤网堵塞与未经验证的电机衰减被并列为故障原因，整改对象可能被误判。',deductions:[
  {ruleId:'verification',problem:'未经电机对照试验，将电机衰减与已验证的滤网堵塞并列为故障原因。'}]},
 '品质中心/周报':{key:'risk',excerpt:'整改复测已通过，报告未说明复测抽样台数、通过数及失败样本编号。',problem:'复测只写“通过”，未说明样本量、通过数和失败样本，品质放行结论无法复核。',deductions:[
  {ruleId:'sample-size',problem:'复测结论未说明抽样台数。'},
  {ruleId:'pass-count',problem:'复测结论未说明通过数。'},
  {ruleId:'failed-samples',problem:'复测结论未说明失败样本编号。'}]},
 '研发中心/日报':{key:'result',excerpt:'替代电机预计单台节约 2 元，测算暂未纳入工装改造及旧料切换费用。',problem:'降本测算仅比较器件单价，遗漏工装及旧料切换费用，方案净收益可能被高估。',deductions:[
  {ruleId:'total-cost',problem:'切换成本口径不完整，遗漏工装改造及旧料切换费用。'}]},
 '研发中心/周报':{key:'object',excerpt:'业务对象仅填写“该款产品”，未写产品全称、型号或项目编号。',problem:'工作条目只用“该款产品”代指业务对象，无法将温升验证和BOM变更准确关联到具体产品。',deductions:[
  {ruleId:'identity',problem:'仅用“该款产品”代称，缺少产品全称、型号或项目编号，无法明确识别业务对象。'}]},
 '采购部/日报':{key:'result',excerpt:'工厂回复新报价 26 元，未注明原价对比、起订量及适用生产批次。',problem:'工厂新报价未明确比较基准与生效批次，起订条件也未落实，采购无法据此执行或确认价格传导。',deductions:[
  {ruleId:'baseline',problem:'仅提供新报价，缺少原价比较基准。'},
  {ruleId:'moq',problem:'未说明新报价的起订量。'},
  {ruleId:'batch',problem:'未说明新报价适用的生产批次。'}]}
};
function gdReportCompleteContent(context,department,workDate){
 const date=offset=>shiftDate(workDate,offset),stamp=workDate.replaceAll('-','');
 const identity=product=>{const master=upSpus.get(product.spuId)||product;return `产品：${product.name}；型号/SPU标识：${master.model||master.spuCode||product.spuId}`};
 const product=identity(context.product),launch=identity(context.newProduct);
 const cases={
  '产品中心':{
   object:launch,
   progress:'小范围试销已完成，正推进全渠道首发批次确认，已交付渠道清单，最终批次表待确认。',
   result:`截至 ${workDate}，试销目标 500 台，实际签收 320 台，差额 180 台；备货量不计入签收成果。`,
   risk:'首发批次尚未确认，影响渠道备货；活动价保和退差价费用仍需核实，可能压低实际毛利。',
   evidence:`依据《试销签收汇总》${workDate}版及《首发方案对比表》V1，查询位置：产品资料库/试销复盘；经营结果已核对，首发方案待评审。`,
   next:`林悦于 ${date(2)} 提交首发批次对比表，组织采购部确认供货条件并发布最终批次表。`},
  '项目部':{
   object:`项目：${context.project.name}；项目ID：${context.project.id}${context.project.model?'；关联产品型号：'+context.project.model:''}`,
   progress:`节点：样机验收，计划 ${date(-3)} 完成，当前仍待验收，尚未取得物料齐套确认。`,
   result:'较计划延期 3 天，关键电机晚到，后续渠道验收窗口可能顺延。',
   risk:`依赖采购部于 ${date(1)} 回传物料齐套日；该承诺仍待确认，品质验收排期以齐套回传为前置输入。`,
   evidence:`《项目节点排期》${workDate}版与《样机验收清单》V1已归档至项目资料库/交付跟踪；沈舟负责确认节点，验收以清单为准。`,
   next:`沈舟于 ${date(2)} 汇总采购及品质排期，形成调整后的交付表；仍未确认的齐套条件提交采购负责人协调。`},
  '品质中心':{
   object:`${product}；检测批次：QA-${stamp}；样本编号：S01—S10。`,
   progress:'针对吸力衰减，在统一档位、连续运行10分钟的条件下现场复现，抽样 10 台中 3 台异常；客户投诉与现场结果分别记录。',
   result:'清理滤网后吸力恢复，滤网堵塞为已验证原因；电机衰减仍属假设，待开展电机对照试验。',
   risk:'整改复测 10 台、通过 9 台，失败样本 S10 暂留分析；暂缓本批次放行，未确认异常原因前保持隔离。',
   evidence:`《吸力复现记录》《整改复测记录》${workDate}版已存于品质资料库/复测追溯，整改前后记录按S01—S10关联。`,
   next:`刘畅于 ${date(2)} 提交复测记录核对及余下样本验证结论；达到验收标准且证据齐全后申请关闭，否则保留样本继续分析。`},
  '研发中心':{
   object:`${product}；验证部件：替代电机MTR-01；BOM版本：V2；图纸版本：V3。`,
   progress:'额定负载连续运行30分钟，替代电机温升验证10台中9台达标，测试已完成，异常尚未关闭，暂不切换生产。',
   result:'替代料预计单台节约2元，工装及旧料切换费用折合每台0.4元，预计净节约1.6元；适用于BOM V2下一生产批次，待成本确认。',
   risk:'1台温升超标，绕组参数为待验证假设，存在性能及安规影响；先进行参数对照验证，再评估交期。',
   evidence:`BOM V2、图纸V3、《替代电机温升验证》${workDate}版及《切换成本测算》V1已关联，查询位置：研发资料库/温升验证。`,
   next:`王磊于 ${date(2)} 提交绕组对比测试报告与修订BOM，交品质复核温升标准、采购核对切换物料清单。`},
  '采购部':{
   object:`${product}；物料：电机组件MTR-01；采购单：PO-${stamp}-01；供应商：协同电机制造有限公司（样例）。`,
   progress:`采购数量1000件，已到0件、未到1000件；供方已书面确认 ${date(3)} 到货，交期已确认而非询期结果。`,
   result:'原报价28元，新报价26元，均为含税含运费口径；起订量1000件，下月首批订单生效，价格条件已书面确认，降本仍需实际订单复核。',
   risk:'备用供方检测报告未齐，主供异常时存在保供风险；备选电机仅完成资料预审，尚不能直接切换供货。',
   evidence:`采购单PO-${stamp}-01、《电机报价确认》V1及《交期回执》${workDate}版已关联，查询位置：采购资料库/订单跟踪。`,
   next:`唐琪于 ${date(2)} 回收备用供方检测报告和交期回执，交刘畅复核准入条件，并反馈物料保障结果。`}
 };
 return cases[department];
}
