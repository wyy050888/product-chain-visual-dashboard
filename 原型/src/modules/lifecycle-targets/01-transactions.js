// 目标和操作记录一次写入，保存失败不改变内存中的已生效数据。
function ltPersist(next){
 try{
  if(localStorage.getItem(ltStorageKey)!==ltStorageSnapshot)throw Error('目标已在其他页面更新，请刷新后重试');
  const serialized=JSON.stringify(next);localStorage.setItem(ltStorageKey,serialized);ltStorageSnapshot=serialized;ltStore=next;
 }catch(error){throw Error(error.message.includes('其他页面')?error.message:'自动保存失败，请检查浏览器存储后重试')}
}
function ltCommitTargetChanges(year,changes,metadata){
 const next=ltClone(ltStore),at=new Date().toISOString();
 if(changes.length){
  const values=ltClone(ltYearValues(year));
  for(const change of changes){
   const {category,plan,quarter,before,after}=change;
   if(!Number.isInteger(category)||category<0||category>=ltCategories.length||!Number.isInteger(plan)||plan<0||plan>=ltPlans.length||!Number.isInteger(quarter)||quarter<0||quarter>3||after!==null&&!ltValidCell(after,category))throw Error('目标字段无效，请重新校验');
   if(values[category][plan][quarter]!==before)throw Error('目标已更新，请重新选择文件校验');
   values[category][plan][quarter]=after;
  }
  next.years[year]={...next.years[year],values,revision:(next.years[year]?.revision||0)+1,updatedAt:at};
  for(const {category,plan,quarter} of changes)if(category===3&&next.years[year].mergedParts)next.years[year].mergedParts[plan][quarter]=null;
 }
 const entry={id:crypto.randomUUID(),at,actor:'管理员账户',year,...metadata,changes:ltClone(changes),errors:metadata.errors||[]};
 next.history.unshift(entry);ltPersist(next);return entry;
}
const ltImportHeaders=['年度','链群','计划','Q1','Q2','Q3','Q4'];
function ltDownloadTargets(year=ltEditor.year){
 const rows=ltCategories.flatMap((category,c)=>ltPlans.map((plan,p)=>{
  return [year,category,plan.name,...Array(4).fill('')];
 }));
 downloadImportTemplate(ltImportHeaders,rows,'生命周期目标导入模板',{required:['年度','链群','计划'],example:[year,ltCategories[0],ltPlans[0].name,10,12,13,15]});
}
// 导入空白保留原值，填写0保存零目标；禁止公式和重复身份。
function ltParseTargetImport(table,year){
 const errors=[],entries=[],changes=[],seen=new Set(),headers=(table[0]||[]).map(value=>String(value??'').replace(/^\uFEFF/,'').trim());
 const add=(row,field,message)=>errors.push({row,field,message});
 for(const name of ltImportHeaders)if(!headers.includes(name))add(1,name,'缺少必填列，请下载最新模板');
 headers.forEach((name,i)=>{if(![...ltImportHeaders,'年度目标'].includes(name)||headers.indexOf(name)!==i)add(1,name,'表头不匹配或重复')});
 if(table.length>37)add(1,'数据','同一年度最多36行（四个链群各九项计划）');
 if(!errors.length)table.slice(1).forEach((cells,index)=>{
  const row=cells.sourceRow||index+2,text=name=>String(cells[headers.indexOf(name)]??'').trim();
  if(cells.every(value=>!String(value??'').trim()))return;
  const start=errors.length,category=ltCategories.indexOf(text('链群')),plan=ltPlans.findIndex(value=>value.name===text('计划'));
  if(text('年度')!==String(year))add(row,'年度','仅允许导入当前所选年度 '+year+'，请先切换年度');
  if(category<0)add(row,'链群','请使用模板中的四个固定链群');
  if(plan<0)add(row,'计划','计划名称不匹配，请使用模板中的名称');
  if(cells.length>headers.length)add(row,'数据','数据列多于表头');
  if(cells.some(value=>String(value).startsWith('[公式：')))add(row,'数据','请将公式粘贴为值后导入');
  const key=category+':'+plan;if(seen.has(key))add(row,'计划','文件内同一链群、计划重复');seen.add(key);
  const values=Array.from({length:4},(_,quarter)=>text('Q'+(quarter+1)));
  if(values.every(value=>value===''))return;
  values.forEach((value,quarter)=>{if(value!==''&&(!/^\d+$/.test(value)||!ltValidCell(Number(value),category)))add(row,'Q'+(quarter+1),'须为0至'+(category===3?'199998':'99999')+'的整数')});
  if(errors.length!==start)return;
  entries.push({row,category,plan});
  values.forEach((value,quarter)=>{if(value==='')return;const before=ltYearValues(year)[category][plan][quarter],after=Number(value);if(before!==after)changes.push({row,category,plan,quarter,before,after})});
 });
 if(!entries.length&&!errors.length)add(2,'数据','文件没有可导入的目标');
 return {year,revision:ltStore.years[year]?.revision||0,rowCount:table.slice(1).filter(cells=>cells.some(value=>String(value??'').trim())).length,entries,changes,errors};
}
function ltCommitTargetImport(batch,file){
 if(!batch||batch.errors.length||!batch.entries.length)throw Error('请先选择并校验文件');
 if(batch.revision!==(ltStore.years[batch.year]?.revision||0))throw Error('目标已更新，请重新选择文件校验');
 return ltCommitTargetChanges(batch.year,batch.changes,{kind:'import',file,rows:batch.entries.length,status:batch.changes.length?'导入成功':'无变更'});
}
