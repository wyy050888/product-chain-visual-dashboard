// 覆盖范围是文件涉及的月份，横跨所有部门；空白模板Sheet不会清除其他月份。
function cecReplaceActualMonths(entries){
 const next=cecCopy(cecStore),months=new Set(entries.map(row=>row.month));
 next.details=(next.details||[]).filter(row=>!months.has(row.month));
 for(const item of cecMetricCatalog(next))for(const month of months)next.months[cecRecordKey(item.id,month)]={actualCents:null,note:''};
 const totals=new Map();
 for(const row of entries){
  const item=cecResolveMetric(next,row.department,row.type,'',row.category);
  const existing=cecMetricCatalog(next).find(metric=>metric.id===item.id);
  if(existing?.category!==item.category)next.metrics[item.id]=cecMetricMetadata(item,'');
  const key=cecRecordKey(item.id,row.month);totals.set(key,(totals.get(key)||0)+row.amountCents);
  next.details.push({id:crypto.randomUUID(),itemId:item.id,month:row.month,amountCents:row.amountCents,productId:row.productId||'',sheet:row.sheet,sourceRow:row.sourceRow,values:row.values});
 }
 for(const [key,actualCents]of totals){if(!Number.isSafeInteger(actualCents))throw Error('月度实际合计超出可精确处理范围');next.months[key]={actualCents,note:''}}
 return {next,coverageMonths:[...months].sort()};
}
