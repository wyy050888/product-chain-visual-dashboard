// 说明直接读取实际评级阈值，避免把旧ABCD文案或未实施的建议方案带入页面。
function kpmIsGradeHelp(help){return help.matches('#matrix.kpm-main>.sectionhead h2>.metric-help')}
function kpmGradeHelpRows(){
 const range=(above,below,suffix='')=>[Number.isFinite(above)?'＞'+fmt(above)+suffix:'',Number.isFinite(below)?'＜'+fmt(below)+suffix:''].filter(Boolean).join(' 且 ');
 return kpmGradeOrder.map(level=>{const rule=kpmGradeRules[level];return {level,gsv:range(rule.salesAbove,rule.salesBelow),profit:range(rule.profitAbove,rule.profitBelow,'%')}});
}
function kpmGradeHelpText(){
 return 'SABC分级标准\n按所选业务范围，截至所选统计日近30天GSV与利润率同时判定。\n'
  +kpmGradeHelpRows().map(row=>row.level+'：GSV '+row.gsv+'万元，利润率 '+row.profit).join('\n')
  +'\n未命中区间、无有效销量或关键数据缺失：待分级。';
}
function kpmRenderGradeHelp(host){
 const append=(parent,tag,text,className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.append(node);return node};
 const heading=append(host,'div','','kpm-rule-heading');
 append(heading,'h4','SABC分级标准');append(heading,'span','近30天','kpm-rule-period');
 const context=withPeriod('matrix',()=>{const end=upWindow().end;return kpmBusinessScopes[kpmBusinessScope].label+' · '+shiftDate(end,-29).slice(2).replaceAll('-','/')+' — '+end.slice(2).replaceAll('-','/')});
 append(host,'p',context,'kpm-rule-context');
 const table=append(host,'table','','kpm-rule-table');table.setAttribute('aria-label','SABC分级条件');
 const head=append(table,'thead',''),header=append(head,'tr','');
 for(const label of ['等级','GSV（万元）','利润率']){const th=append(header,'th',label);th.scope='col'}
 const body=append(table,'tbody','');
 for(const row of kpmGradeHelpRows()){
  const tr=append(body,'tr',''),grade=append(tr,'td','');
  append(grade,'span',row.level,'kpm-rule-grade '+row.level);append(tr,'td',row.gsv);append(tr,'td',row.profit);
 }
 const note=append(host,'div','','kpm-rule-note');
 append(note,'p','两项条件须同时满足；GSV为扣退后销售额，利润率按汇总利润÷GSV计算。');
 append(note,'p','未命中区间、无有效销量或关键数据缺失：待分级。');
}
