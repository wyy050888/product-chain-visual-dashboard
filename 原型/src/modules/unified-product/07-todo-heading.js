// 标题复用已关联的业务对象；不以任务名称或执行内容推断关联。
function upTodoHeadingObjects(task,provided){
 const product=upSpus.get(task.spuId),shop=task.scope==='shop'||task.shopId||task.gdShopId||String(task.spuId||'').startsWith('shop:');
 const fallback={name:String(task.objectName||'').trim()||product?.name||'未关联',type:shop?'shop':product?'product':task.gdProjectId!=null?'project':''};
 const supplied=(provided?.length?provided:task.businessObjects)?.filter(object=>String(object?.name||'').trim());
 const objects=supplied?.length?supplied:[fallback],seen=new Set();
 return objects.filter(object=>String(object?.name||'').trim()).map(object=>({name:String(object.name).trim(),type:diagnosisObjectType(Object.hasOwn(object,'type')?object.type:object.name===fallback.name?fallback.type:'')})).filter(object=>{
  const key=object.type+'|'+object.name;if(seen.has(key))return false;seen.add(key);return true;
 });
}
function upTodoDetailHeading(task,provided){
 if(task.gdManualEntry)return '<span class="up-todo-heading-prefix">任务详情 -</span><span class="up-todo-heading-task-title">'+esc(task.title)+'</span>';
 const objects=upTodoHeadingObjects(task,provided);
 return '<span class="up-todo-heading-prefix">任务详情 -</span>'+objects.map(object=>'<span class="up-todo-heading-object"><span data-todo-business-object>'+esc(object.name)+'</span>'+diagnosisObjectTag(object.type,true)+'</span>').join('');
}
