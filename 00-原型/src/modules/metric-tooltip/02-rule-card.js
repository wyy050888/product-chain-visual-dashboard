// 规则提示共用卡片结构；业务阈值仍由各模块读取，不在组件内定义。
function metricRuleNode(parent,tag,text='',className=''){
 const node=document.createElement(tag);node.textContent=text;
 if(className)node.className=className;parent.append(node);return node;
}
function metricRuleCard(host,title,badge=''){
 host.classList.add('metric-rule-card');
 const heading=metricRuleNode(host,'header','','metric-rule-heading');
 metricRuleNode(heading,'h4',title);
 if(badge)metricRuleNode(heading,'span',badge,'metric-rule-badge');
 return metricRuleNode(host,'div','','metric-rule-body');
}
function metricRuleList(host,items){
 const list=metricRuleNode(host,'ul','','metric-rule-list');
 for(const item of items){
  const row=metricRuleNode(list,'li'),heading=metricRuleNode(row,'div','','metric-rule-line');
  metricRuleNode(heading,'h5',item.title);
  if(item.value)metricRuleNode(heading,'strong',item.value);
  if(item.description)metricRuleNode(row,'p',item.description,'metric-rule-note');
 }
 return list;
}
function metricRuleTable(host,headers,rows,className=''){
 const table=metricRuleNode(host,'table','','metric-rule-table '+className);
 const head=metricRuleNode(metricRuleNode(table,'thead'),'tr');
 for(const label of headers)metricRuleNode(head,'th',label).scope='col';
 const body=metricRuleNode(table,'tbody');
 for(const row of rows){const tr=metricRuleNode(body,'tr');for(const value of row)metricRuleNode(tr,'td',value)}
 return table;
}
// 已有专用渲染器的问号可直接触发，不依赖额外的文字占位字段。
function metricHasRuleCard(help){
 return kpmIsGradeHelp(help)||!!help.closest('.nsp-pool-help')||!!help.dataset.ipSummaryHelp||
  !!help.dataset.scpResourceHelp||!!help.dataset.scpMaterialHelp||!!help.dataset.scpCategoryHelp||!!help.dataset.scpSourcingHelp;
}
