// 汇报原型使用审阅过的归纳样例；真实数据只按明确的根因映射，不伪造在线 AI 调用。
const ppRootFamilies=[
 {key:'decision',title:'需求确认与决策滞后',summary:'需求确认过程尚未闭环，项目推进缺少明确的输入。',roots:['关键需求尚未达成一致','需求确认节点滞后']},
 {key:'change',title:'变更影响评估不完整',summary:'需求变更后，影响评估尚未完成，上线安排仍有不确定性。',roots:['变更影响评估未完成']},
 {key:'handoff',title:'跨部门交接信息不完整',summary:'交接材料缺少关键验收信息，后续任务难以按计划承接。',roots:['跨部门交接信息遗漏']},
 {key:'schedule',title:'测试资源与排期冲突',summary:'测试资源安排与项目验证计划存在冲突，影响验证进度。',roots:['测试资源排期冲突']},
 {key:'trial',title:'试产问题闭环不足',summary:'试产发现的异常尚未完成整改验证，问题闭环不充分。',roots:['试产问题闭环不足']},
 {key:'structure',title:'结构配合验证不足',summary:'样机装配暴露结构配合问题，需要调整并重新验证。',roots:['结构尺寸配合需调整']},
 {key:'material',title:'备料计划确认滞后',summary:'关键物料备料计划未及时确认，试产准备存在缺口。',roots:['备料计划确认滞后']},
 {key:'quotation',title:'供应商报价反馈滞后',summary:'首批订单报价未及时确认，采购成本和下单安排仍待落实。',roots:['供应商报价反馈滞后']},
 {key:'delivery',title:'供应商交付计划不稳定',summary:'供应商交期未落实或反复调整，关键物料到料计划缺乏确定性。',roots:['供应商交期未落实','交付时间反复变更']},
 {key:'standard',title:'检验标准验证不充分',summary:'关键检验标准缺少验证记录，质量判定依据仍不完整。',roots:['检验标准验证不充分']},
 {key:'correction',title:'整改效果验证不足',summary:'整改后复测仍有异常，改善措施的有效性尚未得到充分验证。',roots:['改善措施验证不充分']},
 {key:'evidence',title:'验证材料提交不完整',summary:'整改验证报告和相关记录未完整提交，影响复核与闭环。',roots:['验证材料提交不完整']}
];
function ppAnalysisRows(){
 // 灯色筛选不隐藏部门风险分析；其他查询条件继续生效。
 return ppFiltered(ppScope(ppRows()),{...ppState,light:[],link:null});
}
function ppAnalysisDepartment(rows,department){
 // 项目跨部门协作，按未闭环风险台账关联部门；部门内项目去重，部门间不互斥。
 const facts=ppDepartmentFacts(rows,department),red=facts.redProjects,high=red.filter(ppHighRisk);
 const records=facts.records.filter(entry=>entry.project.status==='红灯');
 const groups=new Map();
 for(const entry of records){
  const root=String(entry.risk.rootCause||'').trim();if(!root)continue;
  const family=ppRootFamilies.find(item=>item.roots.includes(root))||{key:'source:'+root,title:root,summary:''};
  if(!groups.has(family.key))groups.set(family.key,{...family,records:[],projects:new Set()});
  const group=groups.get(family.key);group.records.push(entry);group.projects.add(entry.project.id);
 }
 const top=[...groups.values()].sort((a,b)=>b.records.length-a.records.length||b.projects.size-a.projects.size||a.key.localeCompare(b.key)).slice(0,3);
 return {department,red,high,records,top};
}
