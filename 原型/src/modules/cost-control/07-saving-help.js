function ccSavingHelp(){
 return '<button type="button" class="metric-help cc-saving-help" data-cc-saving-help="true" data-metric-rule="预计单台降本空间：同口径工厂报价差，按报价适用数量加权" aria-label="查看预计单台降本空间计算口径"></button>';
}
function ccRenderSavingHelp(host){
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 const heading=append(host,'header','','cc-saving-tip-heading');append(heading,'h4','预计单台降本空间');append(heading,'span','元/台');
 const formula=append(host,'section','','cc-saving-tip-formula');append(formula,'span','按报价适用数量加权');append(formula,'strong','Σ[(现行单价 − 方案单价) × 适用数量]');append(formula,'div','÷ Σ适用数量');
 const list=append(host,'dl','','cc-saving-tip-fields');
 for(const [label,value] of [['现行单价','成本档案中的现行工厂供价'],['方案单价','当前降本方案的工厂报价'],['适用数量','对应SKU在该报价下可适用的数量'],['比较口径','同SKU、同税费、同费用范围；仅覆盖当前关联报价SKU']]){append(list,'dt',label);append(list,'dd',value)}
 const note=append(host,'div','','cc-saving-tip-note');append(note,'p','预计单台降本空间最低为0');append(note,'p','报价生效、追加采购条件及模具、验证等一次性费用需另行评审，预计空间不计入实际降本');
}
