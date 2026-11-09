// 岗位诊断细项：同一问题在整份报告内只记录一次。
// 使用明确的岗位判断标准，不拆句猜测问题。
const gdReportDetailRules={
 object:[['identity','业务对象无法明确识别，或多对象与工作条目无法对应']],
 progress:[['scope','未写清本期工作范围或计划'],['status','未说明实际完成量或当前阶段'],['schedule','未对照计划说明时间或进度偏差'],['delivery','未说明已交付成果或完成状态'],['deviation','存在偏差但未说明原因及待解决事项']],
 result:[['actual','以计划或投入替代实际成果，或缺少实际结果'],['comparison','缺少目标/原值对比及差额'],['scope','结果的统计周期、范围或口径不清'],['verification','将未经核实的判断作为已验证结论'],['conditions','未说明结果适用条件或影响收益的成本']],
 risk:[['scope','遗漏已知风险或未说明影响范围'],['dependencies','前置依赖或待确认条件未披露'],['verification','缺少支撑风险判断/放行结论的验证信息'],['closure','未说明处置、隔离或闭环状态']],
 evidence:[['reference','缺少可查询的凭证名称、日期/版本或位置'],['traceability','原始记录与结论无法对应，或未区分事实和推测']],
 next:[['action','后续动作及应交付成果不明确'],['owner','缺少明确责任人或协作接收人'],['deadline','缺少完成日期或验收/关闭条件']]
};
const gdReportDirectorDetailRules={
 progress:[['target','未写明部门本期目标及重点'],['status','未说明整体推进阶段'],['deviation','未说明关键偏差'],['scope','将个人动作当作部门成果']],
 result:[['target','缺少目标值'],['actual','缺少实际结果'],['comparison','缺少差额或变化对比'],['reason','未说明偏差原因'],['decision','未说明取舍、资源配置或方案决策'],['effect','未说明决策效果或验证状态']]
};
// 与岗位原标准对应的专用细项；类别总分保持不变。
const gdReportRoleDetailRules={
 'laboratory-engineer':{
  result:[['sample-size','缺少样本量'],['pass-count','缺少通过数或达标情况'],['failed-samples','缺少失败样本明细'],['comparison','缺少故障分析完成量或目标对照'],['verification','将待验证假设作为已验证故障原因']],
  risk:[['sample-size','复测/放行判断缺少抽样台数'],['pass-count','复测/放行判断缺少通过数'],['failed-samples','复测/放行判断缺少失败样本编号'],['closure','未说明缺陷闭环、隔离措施或批次影响']]
 },
 'hardware-engineer':{
  result:[['actual','缺少测试通过率或评审闭环结果'],['comparison','缺少目标或变更前后对照'],['scope','未说明性能及适用批次影响'],['verification','把未经验证的技术判断当作结论'],['total-cost','替换成本遗漏工装、旧料切换等费用']]
 },
 'procurement-specialist':{
  result:[['baseline','报价缺少原价/新价比较基准'],['comparability','含税运费或模具/翻新费用口径不清'],['moq','未写明起订量'],['batch','未写明报价生效批次'],['actual','缺少阶段转化、报价结果或适用降本指标']]
 }
};
function gdReportIssueRules(profile,key){
 const row=profile.rows.find(item=>item[0]===key);
 if(!row)throw new Error('未知报告诊断项：'+key);
 const details=(profile.level==='director'?gdReportDirectorDetailRules[key]:gdReportRoleDetailRules[profile.id]?.[key])||gdReportDetailRules[key];
 if(!details?.length)throw new Error('缺少报告诊断细项：'+profile.id+'/'+key);
 return details.map(([id,label])=>({id,label}));
}
