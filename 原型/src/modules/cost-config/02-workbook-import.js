// 多Sheet先合并为统一行集，再复用一次原子校验/保存；错误保留Sheet名和原始行号。
async function cecReadImportFile(file){
 if(!/\.xlsx$/i.test(file.name))return cwReadFile(file);
 if(file.size>5*1024*1024)throw Error('文件不能超过5MB');
 const sheets=await cwReadXlsx(await file.arrayBuffer(),{allSheets:true});
 if(sheets.length===1&&!cecDepartmentByName(sheets[0].name))return uiNormalizeImportHeaders(sheets[0].rows);
 const combined=[[...cecStructuredHeaders]],errors=[];
 for(const sheet of sheets){
  const table=uiNormalizeImportHeaders(sheet.rows),headers=table[0]||[],department=cecDepartmentByName(sheet.name);
  const fail=(row,message)=>errors.push({row:sheet.name+'!'+row,message});
  if(!department)fail(9,'Sheet名称须为责任部门名称');
  const valid=headers.length===cecStructuredHeaders.length&&new Set(headers).size===headers.length&&cecStructuredHeaders.every(name=>headers.includes(name));
  if(!valid)fail(table[0]?.sourceRow||9,'表头不匹配，请下载最新模板');
  for(const original of table.slice(1)){
   const row=valid?cecStructuredHeaders.map(name=>original[headers.indexOf(name)]??''):[...original];
   row.sourceRow=sheet.name+'!'+(original.sourceRow||table.indexOf(original)+1);
   if(row.some(value=>String(value??'').trim())&&department&&valid&&String(row[0]).trim()!==department.name)fail(original.sourceRow,'责任部门须与Sheet名称一致');
   if(original.length>headers.length)fail(original.sourceRow,'数据列数多于表头');
   combined.push(row);
  }
 }
 combined.readErrors=errors;return combined;
}
