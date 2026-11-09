// 所有分区自然展开，滚动由页面负责；期间更新仍重算全部指标和双表。
function msRenderSections(sections){
 $('#salescards').innerHTML=msSectionsMarkup(sections);
}
