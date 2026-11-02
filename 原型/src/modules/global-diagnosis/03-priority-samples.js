// 补充紧急处置与常规维护的演示过程材料；不改写原产品经营指标。
function gdPrioritySamples(context,records){
 const day=n=>shiftDate(DATA_CUTOFF,n),core=[],routine=[];
 const source=(id,product,owner,topic,content)=>{
  const department=upTodoPersonDepartment(owner),date=DATA_CUTOFF;
  const entry={id,objectKey:'product|'+product.spuId,objectName:product.name,objectType:'product',owner,department,topic,date,type:'会议纪要',
   sourceType:'会议纪要',sourceName:product.name+' · '+topic+date.replaceAll('-','').slice(2),capturedDate:date,
   source:`会议纪要\n${product.name} · ${topic}\n${date}`,content};
  records.push(entry);return entry;
 };
 const archiveProduct=upSpus.get('SPU-SOURCE-010');
 if(archiveProduct){
  const evidence=source('priority-archive-meeting',archiveProduct,'许宁','产品资料周会',
   '本期规格及售后说明无变更，销售和交付均按原计划进行。安排许宁在下周补齐定版说明书的归档索引及版本登记，作为常规资料维护，不影响当前业务。');
  routine.push({id:'meeting-routine-archive',kind:'meeting',source:'matrix',sourceName:'关键产品',objectName:archiveProduct.name,spuId:archiveProduct.spuId,
   businessObjects:[{type:'product',id:archiveProduct.spuId,name:archiveProduct.name}],category:pfCategory(upProduct(archiveProduct)),department:'产品中心',owner:'许宁',date:day(0),due:day(7),priority:'P3',
   title:'补齐定版说明书归档索引',problem:'产品资料周会确认规格与售后说明均无变更，定版说明书的归档索引尚未补齐；不影响当前销售与交付，按常规资料维护排期完善。',
   action:'补齐定版说明书归档链接与版本登记，核对资料检索路径。',sources:[evidence]});
 }
 return {core,routine};
}
