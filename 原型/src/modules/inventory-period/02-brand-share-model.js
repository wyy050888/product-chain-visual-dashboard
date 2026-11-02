// 品牌构成覆盖全量库存，固定五品牌以外合并为其他；金额单位始终为分。
const ipBrandShareColors=Object.freeze(['#f1a36a','#8a7be7','#4b88f5','#55b4d8','#41aa95','#c2cad8']);
function ipBrandShareModel(records,key){
 const names=[...filterCatalog.dashboardBrands,'其他品牌'],values=new Map(names.map(name=>[name,0]));
 for(const record of records){
  const name=values.has(record.brandName)?record.brandName:'其他品牌',value=record[key];
  if(!Number.isFinite(value))values.set(name,null);else if(values.get(name)!==null)values.set(name,values.get(name)+value);
 }
 const total=[...values.values()].every(Number.isFinite)?targetSum([...values.values()]):null;
 // 同图占比共用分母，按未格式化货值降序等价于占比降序；先绑定品牌色，避免排序后换色。
 const rows=names.map((name,index)=>({name,value:values.get(name),share:total>0?values.get(name)/total*100:null,color:ipBrandShareColors[index]}));
 return {key,total,rows:rows.sort((a,b)=>b.value-a.value)};
}
