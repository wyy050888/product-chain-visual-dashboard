function scpRenderMaterialHelp(host,year){
 const append=(tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;host.append(node)};
 append('h4','核心物料准入覆盖');
 append('p','每个品牌、三级类目、核心零部件的年度新增准入目标为'+stMaterialAnnualTarget(year)+'，可在供应商目标中配置。','scp-sourcing-note');
 append('p','按全年首次准入日期统计，同一范围内按供应商身份去重；不按季度分配或累加目标。','scp-sourcing-note');
 append('p','单格显示达标三级类目数/全部三级类目数，全部达标显示绿色。','scp-sourcing-note');
}
