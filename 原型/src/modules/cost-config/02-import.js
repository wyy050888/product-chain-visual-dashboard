// 保留旧逐月模板读取，归一到部门＋指标；旧名称、编号不再创建额外业务对象。
const cecLegacyHeaders=['项目编号','项目名称','责任部门','降本指标','责任人','年月','目标金额','实际降本金额','备注'];
function cecValidateLegacyImport(table){
 const errors=[],entries=[],next=cecCopy(cecStore),seen=new Set(),categories=new Map(),stamp=cecTime();
 if(table.length<2)return {errors:[{row:1,message:'文件没有数据行'}],entries:[],next};
 if(table.length>3001)return {errors:[{row:1,message:'单次最多导入3000条月度数据'}],entries:[],next};
 const headers=table[0].map(v=>String(v).trim());
 const classified=headers.includes('降本分类'),columns=classified?[...cecLegacyHeaders,'降本分类']:cecLegacyHeaders;
 if(headers.length!==columns.length||new Set(headers).size!==headers.length||columns.some(h=>!headers.includes(h)))return {errors:[{row:1,message:'表头不匹配，请下载最新模板'}],entries:[],next};
 for(let i=1;i<table.length;i++){
  const source=Object.fromEntries(columns.map(h=>[h,String(table[i][headers.indexOf(h)]??'').trim()])),row=table[i].sourceRow||i+1,start=errors.length,fail=message=>errors.push({row,message,source});
  const department=cecDepartmentByName(source['责任部门']),month=source['年月'];let item=null;
  if(!department)fail('责任部门不存在');else try{
   if(classified&&!source['降本分类'])throw Error('请填写降本分类');
   item=cecResolveMetric(next,department.id,source['降本指标'],'',classified?source['降本分类']:undefined);
   if(categories.has(item.id)&&categories.get(item.id)!==item.category)throw Error('同一部门、降本指标的分类不一致');
   categories.set(item.id,item.category);next.metrics[item.id]=cecMetricMetadata(item,stamp);
  }catch(error){fail(error.message)}
  if(table[i].length>headers.length)fail('数据列数多于表头');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!dashboardYears(4).includes(+month.slice(0,4)))fail('年月须为2025-01至'+dashboardYears(4).at(-1)+'-12，格式为YYYY-MM');
  if(source['备注'].length>200)fail('备注不能超过200字');
  if(source['目标金额'])fail('细项不维护目标，请在合并模板中使用部门目标行');
  let actualCents=null;try{actualCents=cecAmount(source['实际降本金额'])}catch(error){fail(error.message)}
  if(!source['实际降本金额']&&!source['备注'])fail('请至少填写实际降本金额或备注');
  const key=cecRecordKey(item?.id,month);if(seen.has(key))fail('文件内同一部门、降本指标及年月重复');seen.add(key);if(errors.length!==start)continue;
  const patch={...next.months[key],updatedAt:stamp};if(source['实际降本金额']!=='')patch.actualCents=actualCents;if(source['备注']!=='')patch.note=source['备注'];next.months[key]=patch;
  next.metrics[item.id]=cecMetricMetadata(item,stamp);
  const before=cecCell(item.id,month),exists=cecBase.ledger.some(r=>r.itemId===item.id&&r.month===month)||Object.hasOwn(cecStore.months,key);
  entries.push({id:item.id,name:item.metric,department:department.name,category:item.category,month,actualCents:source['实际降本金额']===''?before.actualCents:actualCents,kind:exists?'更新':'新增',row});
 }
 return {errors,entries,next};
}
