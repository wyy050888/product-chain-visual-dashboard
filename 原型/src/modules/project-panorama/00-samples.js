// 用户授权的演示风险台账，按固定项目编码关联；真实台账（含空数组）优先。
// 不改导入项目数据，不按经理或阶段自动推测责任部门。
const ppRiskExamples={
 'XM-008':[
  ['产品部','红灯','需求确认—方案未定','产品功能方案尚未确认','关键需求尚未达成一致','组织方案评审并确认范围','产品负责人B','2026-10-14',["产品立项", "外观风格定位", "竞品体验"]],
  ['采购部','黄灯','物料交付—备料风险','试产备料尚未全部确认','备料计划确认滞后','核对备料清单及供应商交期','采购负责人A','2026-10-18',["供应商储备完成", "产品供应商确认落地"]],
  ['产品部','黄灯','协作交接—材料缺失','上线验收清单未同步至承接部门','跨部门交接信息遗漏','补齐验收清单并组织交接确认','产品负责人A','2026-10-16',["供应商关键文件输出"]]],
 'XM-010':[
  ['采购部','红灯','报价成本—报价超时','首批订单报价尚未确认','供应商报价反馈滞后','补齐报价清单并确认交付节点','采购负责人A','2026-10-12',["产品预估报价", "产品供应商确认落地"]],
  ['品质部','黄灯','测试验证—报告待补','整改验证报告待补充','验证材料提交不完整','补齐测试记录并安排复核','品质负责人A','2026-10-15',["品质标准制定", "验厂"]]],
 'XM-011':[
  ['采购部','红灯','物料交付—到料延期','首批关键物料未按计划到料','供应商交期未落实','确认分批到料计划并逐日跟进','采购负责人B','2026-10-13',["供应商储备完成", "产品供应商确认落地"]],
  ['产品部','黄灯','需求确认—规格待定','包装规格待最终确认','需求确认节点滞后','完成规格确认并同步相关部门','产品负责人A','2026-10-12',["2D外观设计", "ID 3D设计及评审"]]],
 'XM-014':[
  ['品质部','红灯','品质整改—验证未通过','整改样机复测仍存在异常','改善措施验证不充分','补充复测方案并重新验证','品质负责人A','2026-10-16',["品质标准制定", "竞品体验"]]],
 'XM-015':[
  ['研发部','红灯','研发验证—结构干涉','样机装配发现结构干涉','结构尺寸配合需调整','完成结构调整并复验装配','研发负责人A','2026-10-14',["结构堆叠设计", "ID 3D设计及评审", "ID外观手板评审"]]],
 'XM-016':[
  ['研发部','黄灯','测试验证—耐久待测','耐久测试排期存在风险','测试资源排期冲突','调整测试排期并跟进报告','研发负责人B','2026-10-16',["创新难点预研"]]],
 'XM-017':[
  ['产品部','红灯','需求确认—方案未定','产品功能方案尚未确认','关键需求尚未达成一致','组织方案评审并确认范围','产品负责人B','2026-10-14',["产品立项", "外观风格定位", "竞品体验"]]],
 'XM-020':[
  ['研发部','红灯','试产验证—异常待改','试产装配异常尚未完成验证','试产问题闭环不足','完成问题整改并安排小批验证','研发负责人A','2026-10-17',["结构堆叠设计", "ID外观手板评审"]],
  ['品质部','红灯','品质验证—标准待补','关键检验标准缺少验证记录','检验标准验证不充分','完善检验标准并留存验证记录','品质负责人B','2026-10-15',["品质标准制定", "竞品深度拆解"]]],
 'XM-021':[
  ['采购部','黄灯','物料交付—备料风险','试产备料尚未全部确认','备料计划确认滞后','核对备料清单及供应商交期','采购负责人A','2026-10-18',["供应商储备完成", "产品供应商确认落地"]],
  ['产品部','红灯','需求确认—变更未闭环','需求变更影响首批上线安排','变更影响评估未完成','评估变更影响并确认上线方案','产品负责人A','2026-10-16',["产品立项", "2D外观设计", "ID 3D设计及评审"]]]
};
function ppSampleLedger(source){
 const index=Math.abs(Number(source.id)||0),templates=Object.values(ppRiskExamples).flat();
 const examples=ppRiskExamples[source.sourceKey]||[templates[index%templates.length],templates[(index+3)%templates.length]];
 const records=examples.map(([department,light,category,description,rootCause,action,owner,deadline,taskNames],i)=>({
  id:`demo-${source.sourceKey}-${i+1}`,department,light:ppRiskExamples[source.sourceKey]?light:source.status,category,description,rootCause,action,owner,deadline,
  taskNames:[...taskNames],status:'待整改',recordedAt:/^\d{4}-\d{2}-\d{2}$/.test(source.started)&&source.started>'2026-10-01'?source.started:'2026-10-01',sample:true
 }));
 return ppSampleRiskEvents(source,records);
}

// 缺失报价仅用于演示；不覆盖真实数组或已导入的金额。
function ppSampleQuotes(source){
 const sampleFields=[],result={...source},base=Number.isFinite(source.cost)?source.cost:180+(Math.abs(Number(source.id)||0)%8)*30;
 if(source.targetCosts==null&&!Number.isFinite(source.cost)){result.targetCosts=[{version:'基础款',factory:base}];sampleFields.push('targetCosts')}
 if(source.finalQuotes==null){result.finalQuotes=[{version:'基础款',factory:base+12,channel:Math.round((base+12)*1.12),company:Math.round((base+12)*1.2)}];sampleFields.push('finalQuotes')}
 if(source.targetPrices==null&&!Number.isFinite(source.price)){result.targetPrices=[{version:'基础款',price:Math.round(base*2.2/100)*100+99}];sampleFields.push('targetPrices')}
 return {...result,sampleFields};
}
