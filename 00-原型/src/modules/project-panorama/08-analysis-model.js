// 汇报原型使用审阅过的归纳样例；真实数据只按明确的根因映射，不伪造在线 AI 调用。
const ppRootFamilies=[
 {key:'decision',title:'需求确认与决策滞后',summary:'需求确认与决策滞后，影响项目输入和推进安排。',roots:['关键需求尚未达成一致','需求确认节点滞后']},
 {key:'change',title:'变更影响评估不完整',summary:'需求变更的影响评估不完整，影响上线安排。',roots:['变更影响评估未完成']},
 {key:'handoff',title:'跨部门交接信息不完整',summary:'交接材料缺少关键验收信息，影响后续任务承接。',roots:['跨部门交接信息遗漏']},
 {key:'schedule',title:'测试资源与排期冲突',summary:'测试资源安排与项目验证计划存在冲突，影响验证进度。',roots:['测试资源排期冲突']},
 {key:'trial',title:'试产问题闭环不足',summary:'试产异常的整改验证不足，影响问题闭环。',roots:['试产问题闭环不足']},
 {key:'structure',title:'结构配合验证不足',summary:'样机装配暴露结构配合问题，涉及结构调整和复测。',roots:['结构尺寸配合需调整']},
 {key:'material',title:'备料计划确认滞后',summary:'关键物料备料计划确认滞后，影响试产准备。',roots:['备料计划确认滞后']},
 {key:'quotation',title:'供应商报价反馈滞后',summary:'首批订单报价确认滞后，影响采购成本确认和下单安排。',roots:['供应商报价反馈滞后']},
 {key:'delivery',title:'供应商交付计划不稳定',summary:'供应商交期未落实或反复调整，影响关键物料到料安排。',roots:['供应商交期未落实','交付时间反复变更']},
 {key:'standard',title:'检验标准验证不充分',summary:'关键检验标准验证不足，影响质量判定。',roots:['检验标准验证不充分']},
 {key:'correction',title:'整改效果验证不足',summary:'整改后复测存在异常，改善措施验证不足。',roots:['改善措施验证不充分']},
 {key:'evidence',title:'验证材料提交不完整',summary:'整改验证报告和相关记录提交不完整，影响复核与闭环。',roots:['验证材料提交不完整']}
];
const ppAnalysisRiskLights=['红灯','黄灯','绿灯'];
function ppAnalysisRows(){
 // 灯色筛选不隐藏部门风险分析；其他查询条件继续生效。
 return ppFiltered(ppScope(ppRows()),{...ppState,light:[],link:null,allowedRiskLights:ppAnalysisRiskLights,includeClosedRisks:true});
}
// 红灯风险按风险单计数，与项目灯色独立；一单多部门时，各部门分别关联，分母不重复。
function ppAnalysisRiskShare(rows,department){
 const seen=new Set();let total=0,count=0;
 for(const project of rows)for(const [index,risk] of project.ledger.entries()){
  if(risk.status==='已闭环'||risk.light!=='红灯')continue;
  const key=project.id+':'+(risk.id??index);if(seen.has(key))continue;seen.add(key);
  total++;if(ppDepartmentValues(risk.department).includes(filterCatalog.normalizeDepartment(department)))count++;
 }
 return {count,total,rate:total?(count/total*100).toFixed(1)+'%':'—'};
}
function ppAnalysisDepartment(rows,department){
 // 指标沿用未闭环风险口径；共性根因与全部台账使用部门全部风险。
 const seen=new Set(),normalized=filterCatalog.normalizeDepartment(department);
 const records=rows.flatMap(project=>(project.ledger||[]).flatMap((risk,index)=>{
  const key=project.id+':'+(risk.id??index);
  if(!ppDepartmentValues(risk.department).includes(normalized)||seen.has(key))return [];
  seen.add(key);return [{project,risk}];
 }));
 const activeRecords=records.filter(({risk})=>risk.status!=='已闭环'&&ppAnalysisRiskLights.includes(risk.light));
 const projects=[...new Map(activeRecords.map(({project})=>[project.id,project])).values()];
 const red=projects.filter(project=>project.status==='红灯'),yellow=projects.filter(project=>project.status==='黄灯');
 const groups=new Map();
 for(const entry of records){
  const root=String(entry.risk.rootCause||'').trim();if(!root)continue;
  const family=ppRootFamilies.find(item=>item.roots.includes(root))||{key:'source:'+root,title:root,summary:''};
  if(!groups.has(family.key))groups.set(family.key,{...family,records:[],projects:new Set()});
  const group=groups.get(family.key);group.records.push(entry);group.projects.add(entry.project.id);
 }
 const top=[...groups.values()].sort((a,b)=>b.records.length-a.records.length||b.projects.size-a.projects.size||a.key.localeCompare(b.key)).slice(0,3);
 return {department,red,yellow,records,activeRecords,groups:[...groups.values()],top,riskShare:ppAnalysisRiskShare(rows,department)};
}
