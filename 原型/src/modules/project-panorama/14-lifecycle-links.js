// 生命周期完成事实仍按项目台账汇总；完成数字仅提示目标列表的筛选条件。
const ppLifecyclePlans=[
 {type:'自研开发',date:'actual'},
 {type:'自选开发',date:'actual'},
 {type:'自研开发',date:'started'},
 {type:'自选开发',date:'started'},
 {type:'产品迭代',date:'started'},
 {type:'品质整改',date:'started'},
 {type:'研发创新',date:'started'}
];
const ppLifecycleCategories=filterCatalog.chainByIndex.map(name=>[name]);
// 完成数共用同一计划映射、真实日期与截止日；不按目标补造完成项目。
function ppLifecycleRange(stage,scope,p=periodFor('lifecycle')){
 const plan=ppLifecyclePlans[stage];if(!plan||!['period','year'].includes(scope))return null;
 const range=bounds(p);return {...plan,start:scope==='year'?p.year+'-01-01':range.start,end:range.cutoff};
}
let ppLifecycleReadCache=null;
function ppLifecycleCompletedProjects(stage,scope,p=periodFor('lifecycle')){
 const range=ppLifecycleRange(stage,scope,p);if(!range)return [];
 const key=[p.year,p.mode,p.value,range.end].join('|');
 let rows=ppLifecycleReadCache?.get(key);
 if(!rows){rows=ppSourceRows(p).map(source=>({...source,type:ppProjectType(source.type),category:pfCategory(source)}));ppLifecycleReadCache?.set(key,rows)}
 return rows.filter(project=>!['已取消','已暂停','已暂停/取消'].includes(project.projectState)&&project.type===range.type&&ppDate(project[range.date])&&project[range.date]>=range.start&&project[range.date]<=range.end);
}
// 只替换项目类规划的实际完成数；目标及产品下市事实保留原来源。
const ppLifecycleBaseMonthFacts=lifeChainMonthFacts;
lifeChainMonthFacts=function(stage,month,p=periodFor()){
 const facts=ppLifecycleBaseMonthFacts(stage,month,p);if(!ppLifecyclePlans[stage])return facts;
 const records=ppLifecycleCompletedProjects(stage,'period',{year:p.year,mode:'month',value:month});
 return facts.map((fact,index)=>({...fact,actual:records.filter(project=>ppLifecycleCategories[index].includes(project.category)).length}));
};
// 缓存仅在单次生命周期重绘中复用，避免跨次查询沿用旧项目事实。
const ppLifecycleRender=renderLife;
renderLife=function(...args){const previous=ppLifecycleReadCache;ppLifecycleReadCache=new Map();try{return ppLifecycleRender(...args)}finally{ppLifecycleReadCache=previous}};
function ppLifecycleCompletionToast(scope,stage=lifeIndex,chain='all'){
 if(!['period','year'].includes(scope))return false;
 const p=periodFor('lifecycle'),annual=scope==='year'||p.mode==='year';
 const period=p.year+'年'+(annual?'':p.mode==='quarter'?'第'+p.value+'季度':p.value+'月');
 const chainCondition=chain!=='all'&&chains[Number(chain)]?'\n链群 = '+chains[Number(chain)]:'';
 if(stage===7){
  toast('点击跳转产品中心-预下市，筛选条件为：\n下市时间 = '+period+chainCondition);
 }else{
  const plan=ppLifecyclePlans[stage];if(!plan)return false;
  const type=['自研','自选','自研','自选','产品迭代','品质整改','研发创新'][stage];
  const date=stage<2?'计划量产/完成日期':'立项日期';
  toast('点击跳转项目列表，筛选条件为：\n项目类型 = '+type+'\n'+date+' = '+period+'\n项目状态 ≠ 已取消、已暂停'+chainCondition);
 }
 return true;
}
window.lifecycleProjectCompletionAudit=(stage=lifeIndex,scope='period')=>withPeriod('lifecycle',()=>({range:ppLifecycleRange(stage,scope),records:ppLifecycleCompletedProjects(stage,scope)}));
