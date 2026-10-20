// 只解释资源池已有的预警条件，不新增数量阈值或改变季度展示范围。
function scpRenderResourceHelp(host,year){
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 append(host,'h4','整机资源池预警');
 const rules=append(host,'div','','scp-sourcing-rules scp-category-rules'),rule=append(rules,'div','','scp-sourcing-rule');
 append(rule,'span',year+'年年度 / 季度合作实际达成');append(rule,'strong','＜100%');
 append(host,'p','年度与各季度分别判定：低于100%标红预警，达到或超过100%标绿。','scp-sourcing-note');
}
