// 导入先校验整批，再一次写入；预览与提交复用同一份标准任务。
const gdTaskImportFields=[['业务对象类型','objectType'],['业务对象ID','objectReference'],['业务对象名称','objectName'],['事项名称','title'],['优先级','priority'],['问题描述','description'],['执行事项','plan'],['负责人','assignee'],['计划完成日期','due'],['链群','category']];
const gdTaskImportHeaderHints={'业务对象ID':'业务对象','链群':'链群（店铺留空）'};
// 名称用于核对，产品/店铺仍按唯一编码关联；项目允许名称列，兼容旧模板。
function gdTaskImportObjectInput(input,catalog){
 const values={...input,objectType:String(input.objectType||'').trim(),objectReference:String(input.objectReference||'').trim(),objectName:String(input.objectName||'').trim()};
 if(values.objectName){
  if(!values.objectType||values.objectType==='未关联')throw Error('填写业务对象名称时，请选择产品、项目或店铺');
  if(diagnosisObjectType(values.objectType)==='project'&&!values.objectReference)values.objectReference=values.objectName;
  const object=gdTaskResolveObject(values.objectType,values.objectReference,catalog,true);
  if(gdTaskObjectKey(values.objectName)!==gdTaskObjectKey(object.name))throw Error('业务对象名称与匹配的档案名称不一致，请核对');
 }
 return values;
}
function gdParseTaskImport(table,file,catalog=gdTaskObjectCatalog()){
 // 新模板的说明区只在“填写说明”标记后识别，旧版首行表头仍直接校验。
 const hasGuide=String(table[0]?.[0]||'').trim()==='填写说明';
 const headerIndex=hasGuide?table.findIndex((row,index)=>index>0&&row.includes('事项名称')&&row.includes('负责人')):0;
 if(headerIndex<0)return {entries:[],errors:[{row:1,message:'未找到任务表头，请使用下载的模板'}]};
 const errors=[],entries=[],headerRow=table[headerIndex]?.sourceRow||headerIndex+1,headers=(table[headerIndex]||[]).map(value=>{const text=String(value).trim();return Object.entries(gdTaskImportHeaderHints).find(([,hint])=>hint===text)?.[0]||text}),names=gdTaskImportFields.map(([name])=>name),add=(row,message)=>errors.push({row,message});
 const records=table.slice(headerIndex+1).map((row,index)=>({row,sourceRow:row.sourceRow||headerIndex+index+2})).filter(({row})=>!String(row[0]||'').startsWith('【示例】')&&row.some(value=>String(value??'').trim()));
 if(!records.length)return {entries,errors:[{row:headerRow+1,message:'文件没有任务数据，请在表头下方填写任务'}]};
 if(records.length>1000)return {entries,errors:[{row:headerRow,message:'单次最多导入1000条任务'}]};
 for(const name of ['事项名称','问题描述','执行事项','负责人','计划完成日期'])if(!headers.includes(name))add(headerRow,'缺少必填列：'+name);
 headers.forEach((name,index)=>{if(!names.includes(name)||headers.indexOf(name)!==index)add(headerRow,'表头不匹配或重复：'+name)});
 if(errors.length)return {entries,errors};
 const seen=new Set(Object.values(upTodos).filter(task=>task.gdManualEntry&&!task.deletedAt).map(gdManualTaskSignature));
 records.forEach(({row,sourceRow})=>{
  try{
   if(row.length>headers.length&&row.slice(headers.length).some(value=>String(value??'').trim()))throw Error('数据超出模板列数');
   const input=Object.fromEntries(gdTaskImportFields.map(([name,key])=>[key,headers.includes(name)?row[headers.indexOf(name)]||'':'']));
   if(Object.values(input).some(value=>String(value).startsWith('[公式：')))throw Error('公式单元格请粘贴为值后导入');
   const task=gdPrepareManualTask(gdTaskImportObjectInput(input,catalog),catalog,{file,row:sourceRow}),key=gdManualTaskSignature(task);
   if(seen.has(key))throw Error('与已有任务或本文件其他行重复');seen.add(key);entries.push(task);
  }catch(error){add(sourceRow,error.message)}
 });
 return {entries,errors};
}
function gdTaskImportTemplate(){const link=document.createElement('a');link.href='assets/templates/任务导入模板.xlsx';link.download='任务导入模板.xlsx';document.body.append(link);link.click();link.remove()}
