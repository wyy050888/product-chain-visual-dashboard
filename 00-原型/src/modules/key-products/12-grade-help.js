// 规模与经营标签分开说明，与六卡使用同一份运行规则。
function kpmIsGradeHelp(help){return help.matches('#matrix.kpm-main>.sectionhead h2>.metric-help')}
function kpmGradeHelpRows(){
 return kpmGradeOrder.map(level=>({level,gsv:brcGradeDescription(level,periodFor('matrix').mode),label:kpmGrades[level],profit:brcDescribe(brcGradeKeys(level).profit)}));
}
const kpmPoolScopeText='统计范围以所选截止日为准，新品自出池日起纳入。';
function kpmGradeHelpText(){return kpmPoolScopeText+'\nSABC仅按GSV分级；利润率独立判定经营标签。\n'+kpmGradeHelpRows().map(row=>row.level+'：'+row.gsv+'；其中'+row.profit+'为'+row.label).join('\n')+'\n月度/近30天沿用月门槛，季度金额×3、年度金额×12；较上期分别比较等级总数和经营标签数量。'}
function kpmRenderGradeHelp(host){
 const body=metricRuleCard(host,'规模等级与经营标签','所选期间');
 metricRuleNode(body,'p',kpmPoolScopeText,'metric-rule-note');
 metricRuleTable(body,['等级','GSV（万元）','经营标签 / 利润率'],kpmGradeHelpRows().map(row=>[row.level,row.gsv,row.label+'：'+row.profit]),'metric-rule-grade-table');
}
