// 标准约束交付内容，不把任务完成等同于经营风险解除。
function gdCompletionCriteria(row,role){
 if(role.completionCriteria)return role.completionCriteria;
 const key=gdTaskKey(row),department=role.department;
 const rules=key.startsWith('project-delivery|')?{
  '项目部':'交样机、做检测的日期和负责人已写清楚，采购和品质都已确认。',
  '采购部':'样机和物料的备齐时间已确认，缺料也都有到货安排。',
  '品质中心':'检测时间、验收标准和出结果的日期都已确认。'
 }:key.startsWith('product-margin|')?{
  '采购部':'报价已拿到，适用型号、采购条件、生效时间和每台省多少钱都写清楚了。',
  '研发中心':'方案已写清怎么改、要测多久、成本怎么变，以及会不会影响交货。',
  '产品中心':'已确定采用哪种办法，参与人员和下一步的完成时间也已写清楚。'
 }:key.startsWith('supplier-admission|')?{
  '采购部':'资料、样品和报价都已提交；还没补齐的内容已列成清单。',
  '品质中心':'样品检测时间和合格标准已确认，供应商能否通过准入也有明确记录。'
 }:row.id==='resource-s-core'?{
  '产品中心':'下一代产品先做什么、做哪些版本、什么时候做都已确定。',
  '采购部':'缺多少货、供应商能供多少、后续怎么供货都已确认。',
  '研发中心':'要做哪些测试、由谁来做、什么时候做都已确认。'
 }:null;
 if(rules)return rules[department]||'—';
 if(row.kind==='report')return row.missing?'已确认日志是否提交；没交的已补交，待办里的日志链接可以打开。':row.incomplete?'日志已写清下一步做什么、谁负责、什么时候完成，更新后的链接可以打开。':'晚交的原因、影响和补交情况都已说明。';
 if(row.kind==='focus')return {'focus-direction':'已补上样机验收记录，并说明验收标准和评审时间。','focus-risk-response':'产品问题已重新检查，结果、整改验证安排和相关记录都已反馈。','focus-interruption':'资料查到哪一步、还缺什么、什么时候评审都已说明。'}[row.issueType]||'已反馈核实结果，并附上相关工作记录。';
 if(row.id==='meeting-delivery')return '已写清交什么、什么时候交、由谁验收。';
 if(row.id==='meeting-quality')return '已说明问题能否重现、复测结果如何，以及后续要跟踪哪些指标。';
 return row.completionCriteria||'—';
}
function gdActionImpact(row){
 let text=String(row.impact||'').trim();
 if(row.objectName&&text.startsWith(row.objectName))text=text.slice(row.objectName.length).replace(/^\s*[·：:]\s*/,'');
 return text;
}
