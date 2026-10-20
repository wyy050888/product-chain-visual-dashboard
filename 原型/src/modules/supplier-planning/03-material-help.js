// 文案读取当前年度配置，避免提示里的准入标准与实际预警脱节。
function scpRenderMaterialHelp(host,year){
 const minimum=stStandards(year).materialAdmitted,total=pfCategories.length;
 const append=(parent,tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node};
 append(host,'h4','物料供应商');
 const rule=append(host,'div','','scp-material-help-rule');
 append(rule,'span','核心零部件准入标准');append(rule,'strong','≥ '+minimum);append(rule,'small','每个品牌 × 一级类目 × 核心零部件');
 const list=append(host,'dl','','scp-material-help-definitions');
 for(const [label,text] of [
  ['准入覆盖',`达标一级类目数 / ${total}。如 2/${total}，表示该品牌该零部件在 ${total} 个一级类目中有 2 个达到准入标准。`],
  ['统计去重','已准入包含已合作供应商；按当前品牌、类目及零部件范围去重，品牌汇总不累加子类目数量。'],
  ['预警颜色','已准入未达标准显示红色；品牌汇总中，任一一级类目不足即标红。'],
  ['实际达成','所选期间新增合作 ÷ 同期目标合作 × 100%。']
 ]){append(list,'dt',label);append(list,'dd',text)}
}
