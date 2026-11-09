// 只读类目关联：按稳定产品/项目标识查主数据，不由标题、人员或历史材料推断。
function gdCategoryIndex(sources){
 const index=new Map();
 const add=(key,record)=>{const category=pfCategory(record);if(pfCategories.includes(category))index.set(key,category)};
 for(const [id,product] of upSpus)add('product|'+id,product);
 for(const project of sampleProjectSource)add('project|'+project.id,project);
 for(const source of sources){
  if(source.id==='projects')for(const project of source.rows)add('project|'+project.id,project);
  if(source.id==='suppliers')for(const row of source.rows)if(row.project)add('admission|'+row.project.id,row.project);
 }
 return index;
}
function gdObjectCategories(object,index){
 if(!object)return [];
 const keys=[object.key,object.objectKey];
 const productId=object.spuId??(object.type==='product'?object.id:null);
 const projectId=object.projectId??object.gdProjectId??(object.type==='project'?object.id:null);
 if(productId!=null)keys.push('product|'+productId);
 if(projectId!=null)keys.push((object.source==='suppliers'||object.gdSource==='suppliers'?'admission|':'project|')+projectId);
 const known=[...new Set(keys.map(key=>index.get(key)).filter(Boolean))];
 const category=filterCatalog.normalizeChain(object.category);return known.length?known:category?[category]:[];
}
function gdRowCategories(row,index){
 const objects=[row.object,...(row.businessObjects||row.task?.businessObjects||[])].filter(Boolean);
 const associated=[...new Set(objects.flatMap(object=>gdObjectCategories(object,index)))];
 if(associated.length)return associated;
 const direct=[...new Set([row,row.task].filter(Boolean).flatMap(object=>gdObjectCategories(object,index)))];
 if(direct.length)return direct;
 const category=filterCatalog.normalizeChain(row.task?.gdCategory);return category?[category]:[];
}
function gdCategorizeRows(rows,index){return rows.map(row=>({...row,categories:gdRowCategories(row,index)}))}
