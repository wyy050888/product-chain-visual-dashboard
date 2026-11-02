// 规模与经营标签分开说明，与六卡使用同一份运行规则。
function kpmIsGradeHelp(help){return help.matches('#matrix.kpm-main>.sectionhead h2>.metric-help')}
function kpmGradeHelpRows(){
 return kpmGradeOrder.map(level=>({level,gsv:brcGradeDescription(level,periodFor('matrix').mode),label:kpmGrades[level],profit:brcDescribe(brcGradeKeys(level).profit)}));
}
function kpmGradeHelpText(){return 'SABC仅按GSV分级；利润率独立判定经营标签。\n'+kpmGradeHelpRows().map(row=>row.level+'：'+row.gsv+'；其中'+row.profit+'为'+row.label).join('\n')+'\n月度/近30天沿用月门槛，季度金额×3、年度金额×12；较上期分别比较等级总数和经营标签数量。'}
function kpmRenderGradeHelp(host){
 const add=(parent,tag,text,css='')=>{const node=document.createElement(tag);node.textContent=text;node.className=css;parent.append(node);return node};
 const heading=add(host,'div','','kpm-rule-heading');add(heading,'h4','规模等级与经营标签');add(heading,'span',periodShortText(periodFor('matrix')),'kpm-rule-period');
 const table=add(host,'table','','kpm-rule-table'),head=add(add(table,'thead',''),'tr','');
 for(const label of ['等级','GSV（万元）','经营标签 / 利润率'])add(head,'th',label);
 const body=add(table,'tbody','');
 for(const row of kpmGradeHelpRows()){const tr=add(body,'tr','');add(tr,'td',row.level);add(tr,'td',row.gsv);add(tr,'td',row.label+'：'+row.profit)}
 const note=add(host,'div','','kpm-rule-note');add(note,'p','等级仅由同范围GSV判定；利润缺失不影响等级，不计入经营标签。');add(note,'p','月度/近30天沿用月门槛，季度金额×3，年度金额×12。两组数量分别与上期比较。');
}
