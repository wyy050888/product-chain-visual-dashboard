// 指标身份与名称分离：改名保留ID和月度金额，新指标不依赖源码枚举。
// 页面和下载模板共用部门目录及分类顺序，避免同一细项在两处归类不同。
function cecDepartmentCatalog(department){return ccCategoryGroups(ccItems.filter(item=>item.department===department))}
function cecMetricCatalog(store){
 const items=cecCopy(cecBase.items),byId=new Map(items.map(item=>[item.id,item]));
 for(const [id,value] of Object.entries(store.metrics||{})){
  const existing=byId.get(id);
  if(existing){if(typeof value.metric==='string'&&value.metric.trim())existing.metric=value.metric.trim();if(Object.hasOwn(value,'category'))existing.category=ccCategoryByValue(value.category)?.id||null;existing.name=existing.metric;existing.updatedAt=value.updatedAt||'';continue}
  if(!cecDepartment(value.department)||!Number.isInteger(value.metricIndex)||value.metricIndex<0||typeof value.metric!=='string'||!value.metric.trim())continue;
  const item={id,department:value.department,category:ccCategoryByValue(value.category)?.id||null,metricIndex:value.metricIndex,metric:value.metric.trim(),name:value.metric.trim(),owner:'',updatedAt:value.updatedAt||''};items.push(item);byId.set(id,item);
 }
 return items;
}
function cecMetricName(value){
 const name=String(value??'').trim();if(!name)throw Error('请输入降本指标');if(name.length>80)throw Error('降本指标不能超过80字');return name;
}
function cecMetricMetadata(item,stamp){return {department:item.department,category:item.category,metricIndex:item.metricIndex,metric:item.metric,updatedAt:stamp}}
function cecResolveMetric(store,department,value,id='',category=undefined){
 if(!cecDepartment(department))throw Error('请选择责任部门');
 const entered=cecMetricName(value),standard=ccStandardMetric(department,entered),metric=standard?.name||entered,items=cecMetricCatalog(store),existing=id?items.find(p=>p.id===id):items.find(p=>p.department===department&&p.metric===metric);
 if(['费用减免','商务谈判'].includes(entered))throw Error('请按实际事项填写明确的二级类目，不使用“费用减免”或“商务谈判”统称');
 if(id&&!existing)throw Error('降本指标不存在，请刷新后重试');
 if(id&&existing.department!==department)throw Error('不能变更已有指标的责任部门');
 if(items.some(p=>p.department===department&&p.metric===metric&&p.id!==existing?.id))throw Error('同一部门已存在该降本指标');
 if(category==='')throw Error('请选择降本分类');
 const resolved=ccCategoryByValue(category===undefined?existing?.category:category);
 if(!resolved)throw Error(category===undefined?'请填写降本分类；旧模板仅支持已有且已分类的指标':'降本分类须为：'+ccCategories.map(item=>item.name).join('、'));
 if(standard&&resolved.id!==standard.category)throw Error('“'+standard.name+'”的一级类目应为“'+ccCategoryName(standard.category)+'”');
 if(existing)return {...existing,metric,name:metric,category:resolved.id};
 const metricIndex=Math.max(-1,...items.filter(p=>p.department===department).map(p=>p.metricIndex))+1;
 return {id:department+'-'+metricIndex,department,category:resolved.id,metricIndex,metric,name:metric,owner:''};
}
