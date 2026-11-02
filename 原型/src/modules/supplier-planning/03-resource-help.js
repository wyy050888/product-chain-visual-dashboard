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
function scpRenderResourceHelp(host,year){
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 const heading=append(host,'header','','scp-strategic-help-heading');
 append(heading,'h4','核心战略合作供应商认定规则');append(heading,'span','全部满足','scp-strategic-help-badge');
 append(host,'p',year+'年度认定：以下 6 项条件为“且”关系，须同时满足。','scp-strategic-help-intro');
 const list=append(host,'ol','','scp-strategic-help-rules');
 for(const [index,rule] of scpStrategicRules.entries()){
  const item=append(list,'li',''),number=append(item,'span',String(index+1).padStart(2,'0'),'scp-strategic-help-index');
  number.setAttribute('aria-hidden','true');const body=append(item,'div','');
  const title=append(body,'div','','scp-strategic-help-rule');append(title,'b',rule.label);append(title,'strong',rule.condition);
  if(rule.source)append(body,'small',rule.source);
 }
}
