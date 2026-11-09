// 各部门独立Sheet，目标和细项实际共同校验，全部通过才合并提交。
const cecHeaders=['责任部门','数据类型','降本分类','降本指标','年度',...Array.from({length:12},(_,i)=>(i+1)+'月'),'备注'];
const cecStructuredHeaders=['责任部门','一级类目','二级类目','数据类型','年度','年度目标（元）',...Array.from({length:12},(_,i)=>(i+1)+'月'),'备注'];
function cecTemplate(){
 const sheets=cecCombinedDepartments().map(department=>{
  const {values,total}=cecAnnualDepartmentTarget(department.id);
  const target=[department.name,'','','部门目标',cecState.year,cecInput(total),...values.map(cecInput),''];
  const actual=cecDepartmentCatalog(department.id).flatMap(group=>group.metrics.map(item=>[department.name,group.name,item.metric,'实际降本',cecState.year,'无须填写',...Array(12).fill(''),'']));
  const rows=[target,...actual];
  return {name:department.name,rows,guide:[
   '1. 每个Sheet对应一个部门；蓝底为部门目标，白底为实际降本；金额单位：元。',
   '2. 部门目标行填写年度目标及1—12月目标；年度目标须等于各月合计，不自动分摊。',
   '3. 按预填一级、二级类目填写各月实际；实际降本行的年度目标标注“无须填写”，请保留该提示或留空。空白金额保留原值，0表示零金额。',
   '4. 一次读取全部Sheet；责任部门须与Sheet名一致。'
  ],layout:{widths:[24,24,52,16,12,21,...Array(12).fill(15),28],frozenColumns:6,numericColumns:Array.from({length:13},(_,i)=>i+5),rowHeight:38,rowStyles:rows.map(row=>row[3]==='部门目标'?2:3)}};
 });
 downloadImportTemplate(cecStructuredHeaders,[],'降本目标与实际年度导入模板',{required:['责任部门','数据类型','年度'],conditional:{'一级类目':'实际降本必填','二级类目':'实际降本必填'},sheets});
}
// 新版只调整填写层次；目标仍属于部门，细项仍只维护实际金额。
function cecValidateStructuredImport(table){
 const headers=table[0].map(value=>String(value).trim()),errors=[];
 if(headers.length!==cecStructuredHeaders.length||new Set(headers).size!==headers.length||cecStructuredHeaders.some(h=>!headers.includes(h)))return {errors:[{row:1,message:'表头不匹配，请下载最新模板'}],entries:[],headers:cecStructuredHeaders};
 const sources=table.slice(1).map(cells=>Object.fromEntries(headers.map((h,i)=>[h,String(cells[i]??'').trim()])));
 const normalized=[cecHeaders,...sources.map((source,index)=>{const row=cecHeaders.map(h=>source[h==='降本分类'?'一级类目':h==='降本指标'?'二级类目':h]);row.sourceRow=table[index+1].sourceRow||index+2;return row})];
 const result=cecValidateImport(normalized);
 const sourcesByRow=new Map(table.slice(1).map((row,index)=>[row.sourceRow||index+2,sources[index]]));
 result.errors=result.errors.map(error=>({...error,source:sourcesByRow.get(error.row)||error.source}));
 sources.forEach((source,index)=>{
  const fail=message=>errors.push({row:table[index+1].sourceRow||index+2,message,source}),raw=source['年度目标（元）'];
  if(table[index+1].length>headers.length)fail('数据列数多于表头');
  if(!raw||source['数据类型']==='实际降本'&&raw==='无须填写')return;
  if(source['数据类型']!=='部门目标'){fail('年度目标仅填写在部门目标行');return}
  let annual;try{annual=cecAmount(raw,true)}catch(error){fail('年度目标：'+error.message);return}
  const department=cecDepartmentByName(source['责任部门']);if(!department||result.errors.length)return;
  const values=Array.from({length:12},(_,m)=>result.next?.departmentTargets[cecRecordKey(department.id,cecMonth(Number(source['年度']),m+1))]?.targetCents),known=values.filter(Number.isFinite);
  if(!known.length||known.reduce((sum,value)=>sum+value,0)!==annual)fail('年度目标须等于12个月目标合计，请调整各月目标；不会自动分摊');
 });
 return {...result,errors:[...result.errors,...errors],entries:result.errors.length||errors.length?[]:result.entries,headers:cecStructuredHeaders};
}
function cecTagImport(result,origins,type){
 const origin=row=>origins?.[row-2];
 return {...result,errors:result.errors.map(error=>({...error,...origin(error.row)})),entries:result.entries.map(entry=>({...entry,dataType:type,...(origin(entry.row)?{row:origin(entry.row).row}:{})}))};
}
function cecValidateImport(table){
 if(table.readErrors?.length)return {errors:table.readErrors,entries:[],headers:cecStructuredHeaders};
 const headers=table[0]?.map(value=>String(value).trim())||[];
 if(headers.includes('一级类目'))return cecValidateStructuredImport(table);
 // 旧的独立表仍可读取；下载入口始终给出合并模板。
 if(!headers.includes('数据类型')){
  const actual=headers.includes('降本指标')||headers.includes('年月');
  return cecTagImport(actual?cecValidateActualImport(table):cecValidateDepartmentTargetImport(table),null,actual?'实际降本':'部门目标');
 }
 const errors=[],targets=[cecDepartmentTargetHeaders],actuals=[cecActualHeaders],targetOrigins=[],actualOrigins=[];
 const fail=(row,message,source)=>errors.push({row,message,source});
 if(headers.length!==cecHeaders.length||new Set(headers).size!==headers.length||cecHeaders.some(h=>!headers.includes(h)))return {errors:[{row:1,message:'表头不匹配，请下载目标与实际合并模板'}],entries:[],headers:cecHeaders};
 if(table.length<2||table.length>3001)return {errors:[{row:1,message:table.length<2?'文件没有数据行':'单次最多导入3000行'}],entries:[],headers:cecHeaders};
 for(let i=1;i<table.length;i++){
  const source=Object.fromEntries(headers.map((h,index)=>[h,String(table[i][index]??'').trim()])),row=table[i].sourceRow||i+1;
  if(table[i].length>headers.length)fail(row,'数据列数多于表头',source);
  if(!Array.from({length:12},(_,m)=>source[(m+1)+'月']).some(value=>value!==''))continue;
  if(source['数据类型']==='部门目标'){
   if(source['降本分类']||source['降本指标']||source['备注']){fail(row,'部门目标行不填写分类、指标或备注',source);continue}
   targets.push(cecDepartmentTargetHeaders.map(h=>source[h]));targetOrigins.push({row,source});
  }else if(source['数据类型']==='实际降本'){
   actuals.push(cecActualHeaders.map(h=>source[h]));actualOrigins.push({row,source});
  }else fail(row,'数据类型须为部门目标或实际降本',source);
 }
 if(errors.length)return {errors,entries:[],headers:cecHeaders};
 const empty=()=>({errors:[],entries:[],next:cecCopy(cecStore)});
 const target=targets.length>1?cecTagImport(cecValidateDepartmentTargetImport(targets),targetOrigins,'部门目标'):empty();
 const actual=actuals.length>1?cecTagImport(cecValidateActualImport(actuals),actualOrigins,'实际降本'):empty();
 errors.push(...target.errors,...actual.errors);
 const entries=[...target.entries,...actual.entries].sort((a,b)=>a.row-b.row||a.month.localeCompare(b.month));
 if(!errors.length&&!entries.length)fail(2,'请至少填写一个月的目标或实际金额');
 return {errors,entries:errors.length?[]:entries,next:{...actual.next,departmentTargets:target.next.departmentTargets},headers:cecHeaders};
}
