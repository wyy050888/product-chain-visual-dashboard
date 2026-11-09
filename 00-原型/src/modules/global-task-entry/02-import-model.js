// 同月整批替换，不用名称或编号匹配旧任务。
const gdTaskImportFields=gdLedgerColumns;
function gdParseTaskImport(table,file){
 const clean=v=>String(v??'').replace(/^\s*\*\s*/,'').trim(),names=gdLedgerColumns.map(([,label])=>label);
 const headerIndex=table.findIndex(row=>row.map(clean).includes('登记日期')&&row.map(clean).includes('任务'));
 if(headerIndex<0)return {entries:[],errors:[{row:'—',message:'未找到任务表头，请使用下载的模板'}],sourceTable:[]};
 const headers=table[headerIndex].map(clean),errors=[],entries=[],records=table.slice(headerIndex+1).map((row,i)=>({row,sourceRow:row.sourceRow||headerIndex+i+2})).filter(({row})=>row.some(v=>String(v??'').trim())&&!row.some(v=>String(v??'').startsWith('【示例】')));
 const sourceTable=[headers,...records.map(({row,sourceRow})=>Object.assign([...row],{sourceRow}))];
 const add=(row,field,message,value='')=>errors.push({row,field,message,value});
 names.forEach(label=>{if(!headers.includes(label))add('—',label,'缺少列')});headers.forEach((h,i)=>{if(!names.includes(h)||headers.indexOf(h)!==i)add('—',h,'表头不匹配或重复')});
 if(!records.length)add('—','','文件没有任务数据');if(records.length>1000)add('—','','单次最多导入1000条任务');
 if(errors.length)return {entries,errors,sourceTable};
 for(const {row,sourceRow}of records){
  const input=Object.fromEntries(gdLedgerColumns.map(([key,label])=>[key,String(row[headers.indexOf(label)]??'').trim()])),before=errors.length;
  const check=(key,fn)=>{try{input[key]=fn(input[key])}catch(e){add(sourceRow,names[gdLedgerColumns.findIndex(([k])=>k===key)],e.message,input[key])}};
  if(row.slice(headers.length).some(v=>String(v??'').trim()))add(sourceRow,'','数据超出模板列数');
  for(const [key,label]of gdLedgerColumns)if(String(input[key]).startsWith('[公式：'))add(sourceRow,label,'公式单元格请粘贴为值后导入',input[key]);
  for(const key of ['registrationDate','due','completedAt'])check(key,v=>gdLedgerDate(v,names[gdLedgerColumns.findIndex(([k])=>k===key)],key!=='completedAt'));
  for(const [key,label,required]of [['requestor','提需人',false],['primaryOwner','责任人',true],['secondaryOwner','第二负责人',false]])check(key,v=>gdLedgerOwners(v,label,required));
  check('department',v=>gdLedgerDepartment(v));
  check('gdCategory',v=>gdLedgerChain(v,true));
  check('priority',v=>{const key=Object.keys(upTodoPriorities).find(k=>upTodoPriorities[k]===v);if(!key)throw Error('仅支持一般、重要、紧急');return key});
  check('status',v=>{const key=Object.keys(gdLedgerStatus).find(k=>gdLedgerStatus[k]===v);if(!key)throw Error('仅支持未开始、跟进中、已暂停、已完成');return key});
  for(const [key,max]of [['title',120],['deliverable',3000],['latestProgress',3000],['ledgerTaskType',120],['department',120],['gdCategory',120]])check(key,v=>{if(key==='title'&&!v)throw Error('任务必填');if(v.length>max)throw Error('最多'+max+'字');return v});
  if(input.due&&input.registrationDate&&input.due<input.registrationDate)add(sourceRow,'计划完成日期','不能早于登记日期',input.due);
  if(input.status==='done'&&!input.completedAt)add(sourceRow,'实际完成日期','已完成任务必填');
  if(input.status!=='done'&&input.completedAt)add(sourceRow,'实际完成日期','未完成任务须留空',input.completedAt);
  if(input.completedAt&&(input.completedAt<input.registrationDate||input.completedAt>aiToday()))add(sourceRow,'实际完成日期','须在登记日期至今天之间',input.completedAt);
  if(errors.length===before)try{entries.push(gdLedgerPrepare(input,{file,row:sourceRow}))}catch(e){add(sourceRow,'',e.message)}
 }
 return {entries,errors,sourceTable,coverage:errors.length?[]:gdLedgerCoverage(entries)};
}
function gdTaskImportTemplate(){const link=document.createElement('a');link.href='assets/templates/任务导入模板.xlsx';link.download='任务导入模板.xlsx';document.body.append(link);link.click();link.remove()}
