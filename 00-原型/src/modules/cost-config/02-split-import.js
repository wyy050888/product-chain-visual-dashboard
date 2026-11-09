// 两个入口只接受各自的模板，全部校验完成后才构造待保存快照。
async function cecReadSplitFile(file,kind){
 if(/\.xlsx$/i.test(file.name))return {kind,sheets:await cwReadXlsx(await file.arrayBuffer(),{allSheets:true,formulaValues:true})};
 if(kind==='target'&&/\.csv$/i.test(file.name)){
  const buffer=await file.arrayBuffer();let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer)}catch(_){text=new TextDecoder('gb18030').decode(buffer)}
  return {kind,sheets:[{name:'部门目标',rows:cwParseCSV(text)}]};
 }
 throw Error(kind==='actual'?'实际值请上传按部门分Sheet的.xlsx文件':'请选择.xlsx或.csv文件');
}
function cecSplitSheet(sheet,expected,errors){
 const at=sheet.rows.findIndex(row=>expected.includes(cecFileHeader(row[0]))),original=sheet.rows[at>=0?at:0]||[],headers=original.map(cecFileHeader);
 const valid=headers.length===expected.length&&new Set(headers).size===headers.length&&expected.every(field=>headers.includes(field));
 if(!valid)errors.push({row:sheet.name+'!'+(original.sourceRow||1),field:'表头',message:'表头不匹配，请使用本Tab的最新模板；不要删改或重复列'});
 const rows=sheet.rows.slice(at>=0?at+1:1).filter(row=>!String(row[0]||'').startsWith('【示例】')).map((row,index)=>({sourceRow:row.sourceRow||index+(at>=0?at:0)+2,raw:row,values:valid?expected.map(field=>row[headers.indexOf(field)]??''):[...row]}));
 return {name:sheet.name,headers,valid,rows};
}
function cecSplitResult(kind,groups,errors,entries,extra={}){
 if(errors.length)for(const group of groups)for(const row of group.rows){const key=group.name+'!'+row.sourceRow;if(!errors.some(error=>String(error.row)===key))errors.push({row:key,message:'同批文件含错误，本行未导入'})}
 const sourceTable=[['所属Sheet','原始行号']];
 for(const group of groups)for(const row of group.rows){const source=[group.name,String(row.sourceRow)];source.sourceRow=group.name+'!'+row.sourceRow;sourceTable.push(source)}
 const failureSheets=[];
 for(const group of groups){
  const byRow=new Map();for(const error of errors)if(String(error.row).startsWith(group.name+'!')){const key=String(error.row).slice(group.name.length+1);if(!byRow.has(key))byRow.set(key,[]);byRow.get(key).push((error.field?error.field+'：':'')+error.message)}
  const rows=group.rows.filter(row=>byRow.has(String(row.sourceRow))).map(row=>({row:row.sourceRow,values:row.raw.map(cecRawCell),reason:[...new Set(byRow.get(String(row.sourceRow)))].join('；')}));
  for(const [row,reasons]of byRow)if(!group.rows.some(value=>String(value.sourceRow)===row)){const reason=[...new Set(reasons)].join('；');if(rows.length)for(const failed of rows)failed.reason=reason+'；'+failed.reason;else rows.push({row,values:[],reason})}
  if(rows.length)failureSheets.push({name:group.name,headers:group.headers,rows});
 }
 const general=errors.filter(error=>!groups.some(group=>String(error.row).startsWith(group.name+'!')));
 if(general.length)failureSheets.push({name:'文件校验',headers:[],rows:general.map(error=>({row:error.row||'—',values:[],reason:error.message}))});
 return {kind,groups,errors,entries,sourceTable,failureSheets,...extra};
}
function cecValidateSplitActual(input){
 const errors=[],groups=[],entries=[],seen=new Set();
 for(const sheet of input.sheets){
  const schema=cecDetailSchemas.find(row=>row.name===sheet.name),expected=schema?.headers||[];
  if(!schema){errors.push({row:sheet.name+'!1',field:'Sheet',message:'Sheet名称须为模板中的责任部门名称'});groups.push({name:sheet.name,headers:sheet.rows[0]||[],rows:[],valid:false});continue}
  if(seen.has(sheet.name))errors.push({row:sheet.name+'!1',message:'部门Sheet重复'});seen.add(sheet.name);
  const group=cecSplitSheet(sheet,expected,errors);groups.push(group);
  // 模板内预置的公式和空行不算业务记录，也不形成覆盖月份。
  group.rows=group.rows.filter(row=>row.values.some((value,i)=>!cecDerivedFields.has(group.valid?expected[i]:group.headers[i])&&cecRawCell(value).trim()));
  if(!group.valid)continue;
  for(const row of group.rows){
   const key=sheet.name+'!'+row.sourceRow,start=errors.length;
   if(row.raw.length>expected.length)errors.push({row:key,field:'数据列',message:'数据列数多于表头'});
   const validation=cecValidateDetail(schema,row.values);errors.push(...validation.errors.map(error=>({...error,row:key})));
   if(errors.length!==start)continue;
   const values=cecComputeDetail(schema,row.values),get=field=>values[expected.indexOf(field)];
   entries.push({department:cecDepartmentByName(sheet.name).id,type:validation.standard.name,category:validation.standard.category,month:cecText(get('月份')).replace('/','-'),amountCents:cecAmount(cecText(get(schema.amount))),productId:validation.product?.spuId||'',sheet:sheet.name,sourceRow:row.sourceRow,values});
  }
 }
 const count=groups.reduce((sum,group)=>sum+group.rows.length,0);
 if(count>3000)errors.push({row:'—',message:'单次最多导入3000条明细，请拆分文件'});
 if(!count&&!errors.length)errors.push({row:'—',message:'没有有效数据行，示例行、空行和预置公式行不导入'});
 return cecSplitResult('actual',groups,errors,entries,errors.length?{}:cecReplaceActualMonths(entries));
}
function cecValidateSplitTarget(input){
 const errors=[],entries=[],groups=[],seen=new Set(),next=cecCopy(cecStore);
 for(const sheet of input.sheets){
  const group=cecSplitSheet(sheet,cecTargetFileHeaders,errors);groups.push(group);
  if(sheet.name!=='部门目标')errors.push({row:sheet.name+'!1',message:'目标值文件只允许“部门目标”Sheet'});
  group.rows=group.rows.filter(row=>(group.valid?row.values.slice(2):row.values).some(value=>cecRawCell(value).trim()));
  if(!group.valid)continue;
  for(const row of group.rows){
   const key=sheet.name+'!'+row.sourceRow,start=errors.length,values=row.values.map(cecText),department=cecDepartmentByName(values[0]),year=values[1],amounts=[];
   const fail=(field,message)=>errors.push({row:key,field,message});
   if(!department)fail('责任部门','部门不存在或未填写');
   if(!/^\d{4}$/.test(year)||!dashboardYears(4).includes(+year))fail('年度','年度超出可配置范围');
   if(row.raw.length>cecTargetFileHeaders.length)fail('数据列','数据列数多于表头');
   for(let i=2;i<15;i++){try{const cents=cecAmount(values[i],true);if(cents===null)fail(cecTargetFileHeaders[i],'必填，明确为零请填0');amounts.push(cents)}catch(error){fail(cecTargetFileHeaders[i],error.message)}}
   if(errors.length!==start)continue;
   if(amounts[0]!==amounts.slice(1).reduce((sum,value)=>sum+value,0))fail('年度目标（元）','须等于12个月目标合计，不自动分摊');
   const identity=department.id+'|'+year;if(seen.has(identity))fail('责任部门','同一部门同一年度重复');seen.add(identity);
   if(errors.length!==start)continue;
   amounts.slice(1).forEach((targetCents,i)=>next.departmentTargets[cecRecordKey(department.id,cecMonth(year,i+1))]={targetCents});entries.push({department:department.id,year});
  }
 }
 const count=groups.reduce((sum,group)=>sum+group.rows.length,0);
 if(count>3000)errors.push({row:'—',message:'单次最多导入3000行'});
 if(!count&&!errors.length)errors.push({row:'—',message:'没有填写目标值，示例行和空白目标行不导入'});
 return cecSplitResult('target',groups,errors,entries,{next});
}
const cecSplitHistoryMeta=batch=>({module:cecImportModule(batch.kind),failureSheets:batch.failureSheets,coverageMonths:batch.coverageMonths});
