// 工作要求与已验证结果分开；没有证据时列出待核实项，不虚构方案投入、收益或生效时间。
function kpmDecisionEvidence(item){
 if(item.strategyCategory)return kpmStrategyDecisionEvidence(item);
 const r=item.record,t=item.task,issue=item.advice.issue;
 const feedback=t?.responsibilities?.filter(x=>x.feedback).map(x=>(x.assignee||x.department)+'：'+x.feedback)||[];
 const evidence=[];if(r?.note)evidence.push({source:r.source,text:r.note});
 if(feedback.length)evidence.push({source:'负责人反馈',text:feedback.join('；')});
 else if(t?.evidence&&!r?.note)evidence.push({source:'处理记录',text:t.evidence});
 if(!evidence.length)evidence.push({source:'验证记录',text:'尚未关联措施执行与效果验证记录。'});
 const pending={profit:'降价是否传导至渠道成本、何时生效，生效后的利润是否改善。',cost:'报价是否兑现、成本变化是否验证，是否增加品质与交付风险。',quality:'主要退货原因是否复现，整改后的总退是否下降。',supply:'实际可交数量、交期与可售缺口是否核实。',rescue:'挽救措施是否执行，验证结果是否支持继续经营。',growth:'需求验证是否完成，放量后的利润与退货是否稳定。',position:'成本及供价口径是否核对，产品定位是否明确。'};
 const advice={profit:'先验证现有提利措施，再评估是否调整产品方案。',cost:'先验证现款降本效果，再评估物料切换或改版投入。',quality:'先确认原因并验证整改效果，再决定是否投入整机改版。',supply:'先协调现有供给，再按实际缺口决定追加采购。',rescue:'沿用本次挽救安排验证效果，不重新启动挽救周期。',growth:'先小量验证需求及收益，再评估扩量。',position:'先核定经营口径与定位，再评估投入。'};
 if(r?.review==='未通过')return {evidence,pending:'退出成本、库存去化与售后责任是否核定。',advice:'核定退出与善后安排，不重新启动挽救周期。'};
 if(r?.kind==='bom'&&r.actual>=5)return {evidence,pending:'降本后的品质、退货与供给是否保持稳定。',advice:'保留已验证的降本措施，持续观察品质与供给。'};
 return {evidence,pending:pending[issue]||pending.position,advice:advice[issue]||advice.position};
}
