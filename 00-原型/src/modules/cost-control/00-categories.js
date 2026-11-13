// 分类属于指标目录，不参与金额记录的唯一键；一个指标仅归一个分类。
const ccCategories=[
 {id:'product',name:'产品降本'},{id:'packaging',name:'包装降本'},
 {id:'logistics',name:'物流降本'},{id:'fine',name:'罚款收入'},
 {id:'risk',name:'风控收入'}
];
const ccCategoryByValue=value=>ccCategories.find(category=>category.id===value||category.name===value);
const ccCategoryName=id=>ccCategoryByValue(id)?.name||'未分类';
const ccProductCostTypes=['产品原料降本','研发降本','谈判降本','产品集采降本','品牌方促销返利'];
// 仅维护原型既有样例的归类；新增指标必须显式选择，不能根据名称猜分类。
function ccSampleCategory(department,metric){
 if(department==='risk')return 'risk';
 if(department==='user')return 'fine';
 if(['平台罚款','快递罚款','质量罚款'].includes(metric))return 'fine';
 if(metric==='包材降本')return 'packaging';
 if(['warehouse','shipping','planning'].includes(department))return 'logistics';
 return 'product';
}
function ccCategoryGroups(metrics=ccMetrics){
 const groups=ccCategories.map(category=>({...category,metrics:metrics.filter(metric=>metric.category===category.id)}));
 const missing=metrics.filter(metric=>!ccCategoryByValue(metric.category));
 // 兼容旧缓存的自定义指标：不猜分类、不丢金额，待后台补齐。
 if(missing.length)groups.push({id:'unclassified',name:'未分类',metrics:missing});
 return groups;
}
