// 数字入口通过toast说明目标页面与筛选条件；不打开本地供应商列表。
function scpCountDestination(scope,metric,range){
 if(scope.kind==='resource'){
  const dateLabel={newReserved:'意向储备日期',newAdmitted:'准入日期',newCooperation:'合作日期'}[metric];
  if(!scope.quarter||!dateLabel)return null;
  return {path:'供应商管理-供应商资源池-全部',filters:[['供应商类型','一级供应商'],['统计指标',scpMetricLabels[metric]],[dateLabel,range.start+' — '+range.cutoff]],note:'按对应阶段日期筛选，包含已进入后续阶段的供应商。'};
 }
 const coreNew=scope.kind==='material'&&metric==='newAdmitted';
 if(!coreNew&&!['reserved','admitted','cooperated','newAdmitted','newCooperation'].includes(metric))return null;
 if(scope.kind==='project'){
  const project=scpProjectFacts().find(row=>String(row.project.id)===String(scope.id))?.project;
  return project?{path:'供应商管理-引入全流程管理-项目详情页',filters:[['项目',project.name]]}:null;
 }
 const status=scpMetricLabels[coreNew?'admitted':metric];
 if(scope.kind==='material')return {
  path:'供应商管理-供应商资源池-全部',
  filters:[['聚量合作品牌',scope.brand||'全部'],['三级类目',scpCategories.find(row=>row.id===scope.categoryId)?.path||'全部'],['供应商状态',coreNew?'全部':status],['供应商类型','二级供应商'],['物料分类',scope.material||'全部'],...(coreNew?[['准入日期',range.start+' — '+range.cutoff]]:[])],
  note:(coreNew?'按准入日期统计，包含后来已合作的供应商。':'')+'需新增“聚量合作品牌”筛选字段。'
 };
 const category=scpCategories.find(row=>row.id===scope.categoryId);
 return category?{path:'供应商管理-供应商资源池-全部',filters:[['三级类目',category.path],['供应商状态',metric==='newAdmitted'?'准入储备':metric==='newCooperation'?'已合作':status],...(['newAdmitted','newCooperation'].includes(metric)?[[metric==='newAdmitted'?'准入日期':'合作日期',range.start+' — '+range.cutoff]]:[])]}:null;
}
function scpCountDestinationText(destination){
 return ['跳转'+destination.path,...destination.filters.map(([label,value])=>label+'：'+value),...(destination.note?[destination.note]:[])].join('\n');
}
