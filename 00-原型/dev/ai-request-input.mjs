// 规则入选与AI分析分开；仅key_work_items交给模型补充三项内容，未提交名单不交给模型。
const ruleModules=new Set(['project_blocks','project_block','new_high_risks','new_high_risk','unsubmitted','项目卡点','新增高危','未提交']);
const excluded=['candidates','rule_lists','rule_results','rule_snapshots','rule_analysis_requests','project_blocks','new_high_risks','unsubmitted','unsubmitted_ledger','submission_ledger','expected_submitters','expected_reports','submission_records','missing_reports','attention_units','topics','match_records'];
export function isRuleOwnedFinding(finding){
 const item=finding.original_item||finding;
 return finding.rule_owned===true||!!item.candidate_id||[finding.module,finding.source_module,finding.kind,item.kind].some(k=>ruleModules.has(k))||item.kind==='key-work'||item.kind==='report-analysis'&&item.missing===true;
}
export function prepareAiInput(kind,input){
 if(kind==='root'){
  const prepared={...input};
  for(const key of ['prior_findings','previous_groups','group_history','previous_result','result_versions'])delete prepared[key];
  return prepared;
 }
 if(kind!=='total')return input;
 const prepared={...input};
 for(const key of excluded)delete prepared[key];
 prepared.key_work_items=(input.key_work_items||[]).map(({rule_item_id,kind,subject,evidence_ids,native_facts,previous_analysis})=>({rule_item_id,kind,subject,evidence_ids,native_facts,previous_analysis}));
 prepared.module_gates={...input.module_gates};
 for(const key of ['project_blocks','new_high_risks','unsubmitted'])delete prepared.module_gates[key];
 prepared.prior_findings=(input.prior_findings||[]).filter(f=>!isRuleOwnedFinding(f)&&f.manual_task!==true&&f.source!=='manual'&&f.source_module!=='task_ledger');
 return prepared;
}
export function assertNoRuleListsInDraft(kind,draft){
 if(kind==='total'&&draft&&['project_blocks','new_high_risks','unsubmitted','rule_analyses'].some(k=>k in draft))throw new Error('旧版清单输出须按新版重新生成，不能将规则清单送入AI修正');
}
