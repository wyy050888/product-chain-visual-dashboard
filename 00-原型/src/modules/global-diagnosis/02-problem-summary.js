// 按事实组织原因、已有尝试（若有）和影响，不要求固定句首，也不补写未经证实的尝试。
function gdCausalProblem(origin,task){
 const original=String(upTodoProblemSummary(task)||origin.problem||'问题待核实').trim();
 const unknown=()=>original;
 if(task.source==='manual')return original;
 if(origin.kind==='report'){
  if(origin.missing)return '截至抓取时间未匹配到该日志，本期工作进展与后续安排无法核实；是否未提交或尚未同步仍待核实。';
  const fields=[['progress','工作进展','工作进展无法核对'],['reportProblem','当前问题','问题与风险记录不完整'],['next','下一步安排','后续执行安排不明确']];
  const missing=origin.incomplete?fields.filter(([key])=>!String(origin[key]||'').trim()):[];
  const causes=missing.map(([,label])=>'日志“'+label+'”未填写'),effects=missing.map(([, ,effect])=>effect);
  if(origin.late){causes.push('日志晚于应交时间提交');effects.push('工作信息未按约定时间回传')}
  return causes.length?causes.join('、')+'，'+effects.join('、')+'。':unknown();
 }
 if(origin.kind==='focus'){
  const descriptions={
   'focus-direction':'本期抓取日志未记录会议明确的验收工作，重点任务的执行进展无法核实；实际执行情况待核实。',
   'focus-risk-response':'相关业务预警仍存在，本期抓取日志未见风险复核或整改验证记录，风险处置进展和整改效果无法核实。',
   'focus-interruption':'供应商准入工作已有明确安排，后续却未见推进记录，准入进展与评审安排无法核实；是否实际中断仍待核实。'
  };
  if(origin.issueType==='focus-risk-response'&&!origin.focusEvidence?.risk?.active)return '本期抓取日志未见相关复核或整改验证记录，处置进展和验证结果无法核实。';
  return descriptions[origin.issueType]||unknown();
 }
 const decisions={
  'decision-launch-batch':'新品首发节奏尚未确定，备货与渠道上线安排无法统一。',
  'decision-test-route':'内部排期与外部检测方案尚未完成比较，项目验证节点和交付安排无法锁定。',
  'decision-backup-supplier':'现有供方保障与备选供方导入方式尚未确定，寻源投入和样品验证资源无法统一安排。'
 };
 if(decisions[origin.id])return decisions[origin.id];
 const key=gdTaskKey(origin);
 if(key.startsWith('project-delivery|'))return '样机交付与检测排期尚未统一，采购、品质无法协同安排，验证与交付存在延期风险。';
 if(key.startsWith('product-margin|'))return '议价与结构调整的改善路径尚未确定，验证及后续推进安排不明确，利润改善可能延后。';
 if(key.startsWith('supplier-admission|')){
  const admission=origin.admission;
  if(Number.isFinite(admission?.actual)&&Number.isFinite(admission.required)&&admission.actual<admission.required)return `已准入供应商仅${admission.actual}家，低于至少${admission.required}家的要求，供方储备不足，存在项目供货及交付受影响的风险。`;
  return '供方资料及样品检测排期尚未确认，准入评审无法统一安排，供应准备可能延期。';
 }
 if(origin.id==='resource-s-core')return '现款供应与下一代产品储备同时需要人员、产能及验证资源，投入可能相互占用，影响保供或迭代节点。';
 return unknown();
}
