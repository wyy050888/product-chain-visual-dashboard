// 战略供应商条件集中维护；各项为“且”关系，不从缺失事实推定已达标。
const scpStrategicRules=[
 {label:'合作年限',condition:'已合作满 1 年',source:'从供应商储备完成日期起算（项目管理）'},
 {label:'年度采购额',condition:'≥ 1,000 万元',source:'计划部 · 下单金额，合并全部平台'},
 {label:'年度绩效评级',condition:'三星',source:'按年度绩效评级认定'},
 {label:'交付及时率',condition:'≥ 97%',source:'按供应商维度统计'},
 {label:'质量问题比例',condition:'< 0.5%',source:'按供应商维度统计'},
 {label:'综合协同能力',condition:'具备研发协同与产能弹性',source:''}
];
function scpStrategicRuleText(){return '以下条件必须同时满足：\n'+scpStrategicRules.map((rule,index)=>(index+1)+'、'+rule.label+'：'+rule.condition+(rule.source?'（'+rule.source+'）':'')).join('\n')+'\n已合作按截止日累计；年度及季度新增按首次合作日期统计；达成按同年度有效目标计算。'}
// 三处简短规则只展示适用范围和条件，避免重复所在区块的标题。
function scpRenderCompactRules(host,intro,rules){
 const append=(parent,tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.append(node);return node};
 const body=append(host,'div','','scp-compact-help');
 append(body,'p',intro,'scp-compact-help-intro');
 const list=append(body,'ul');
 for(const rule of rules){const row=append(list,'li');append(row,'b',rule.label);append(row,'span',rule.condition)}
}
function scpRenderResourceHelp(host,year){
 scpRenderCompactRules(host,'须同时满足以下条件',scpStrategicRules);
}
