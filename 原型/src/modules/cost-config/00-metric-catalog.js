// 指标身份与名称分离：改名保留ID和月度金额，新指标不依赖源码枚举。
function cecMetricCatalog(store){
 const items=cecCopy(cecBase.items),byId=new Map(items.map(item=>[item.id,item]));
 for(const [id,value] of Object.entries(store.metrics||{})){
  const existing=byId.get(id);
  if(existing){if(typeof value.metric==='string'&&value.metric.trim())existing.metric=value.metric.trim();existing.name=existing.metric;existing.updatedAt=value.updatedAt||'';continue}
  if(!cecDepartment(value.department)||!Number.isInteger(value.metricIndex)||value.metricIndex<0||typeof value.metric!=='string'||!value.metric.trim())continue;
  const item={id,department:value.department,metricIndex:value.metricIndex,metric:value.metric.trim(),name:value.metric.trim(),owner:'',updatedAt:value.updatedAt||''};items.push(item);byId.set(id,item);
 }
 return items;
}
function cecMetricName(value){
 const name=String(value??'').trim();if(!name)throw Error('请输入降本指标');if(name.length>80)throw Error('降本指标不能超过80字');return name;
}
function cecMetricMetadata(item,stamp){return {department:item.department,metricIndex:item.metricIndex,metric:item.metric,updatedAt:stamp}}
function cecResolveMetric(store,department,value,id=''){
 if(!cecDepartment(department))throw Error('请选择责任部门');
 const metric=cecMetricName(value),items=cecMetricCatalog(store),existing=id?items.find(p=>p.id===id):items.find(p=>p.department===department&&p.metric===metric);
 if(id&&!existing)throw Error('降本指标不存在，请刷新后重试');
 if(id&&existing.department!==department)throw Error('不能变更已有指标的责任部门');
 if(items.some(p=>p.department===department&&p.metric===metric&&p.id!==existing?.id))throw Error('同一部门已存在该降本指标');
 if(existing)return {...existing,metric,name:metric};
 const metricIndex=Math.max(-1,...items.filter(p=>p.department===department).map(p=>p.metricIndex))+1;
 return {id:department+'-'+metricIndex,department,metricIndex,metric,name:metric,owner:''};
}
