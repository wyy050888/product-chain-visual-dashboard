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
  const yearData=next.years[year]??={values:ltEmptyGrid()};
  for(const change of changes){
   const {category,plan,quarter,before,after,brand=''}=change;
   const validIdentity=Number.isInteger(category)&&ltCategories[category]&&Number.isInteger(plan)&&ltPlans[plan]&&Number.isInteger(quarter)&&quarter>=0&&quarter<4;
   if(!validIdentity||brand&&!ltSupportsBrand(category,brand,plan)||after!==null&&!ltValidCell(after,category,brand))throw Error('目标字段无效，请重新校验');
   let rows=yearData.values[category];
   if(brand){
    const categoryTargets=((yearData.brandValues??={})[category]??={});
    if(!Object.hasOwn(categoryTargets,brand)){
     Object.defineProperty(categoryTargets,brand,{value:ltClone(ltTargetRows(year,category,brand)),enumerable:true});
    }
    rows=categoryTargets[brand];
   }
   if(rows[plan][quarter]!==before)throw Error('目标已更新，请重新选择文件校验');
   rows[plan][quarter]=after;
   if(!brand&&category===3&&yearData.mergedParts)yearData.mergedParts[plan][quarter]=null;
  }
  yearData.revision=(yearData.revision||0)+1;yearData.updatedAt=at;
 }
 const entry={id:crypto.randomUUID(),at,actor:'管理员账户',year,...metadata,changes:ltClone(changes),errors:metadata.errors||[]};
 next.history.unshift(entry);ltPersist(next);return entry;
}
const ltImportHeaders=['年度','链群','计划','Q1','Q2','Q3','Q4'];
function ltDownloadTargets(year=ltEditor.year){
 const headers=['年度','链群','计划','品牌',...ltImportHeaders.slice(3)];
 const rows=ltCategories.flatMap(name=>ltPlans.flatMap(({name:plan,stage})=>{
  const brands=stage===ltInnovationStage?['']:['',...ltDefaultBrands];
  return brands.map(brand=>[year,name,plan,brand,'','','','']);
 }));
 downloadImportTemplate(headers,rows,'生命周期目标导入模板',{
  required:['年度','链群','计划'],
  guide:[
   '1. 品牌行默认展开，可点左侧「−」收起。品牌列为空的行填写链群目标。',
   '2. 只填写需要更新的 Q1–Q4，留空保留原值，填 0 代表零目标。',
   '3. 若有新增品牌，可自行新增行填写。请填好年度、链群、计划、品牌和对应的季度目标。',
   '4. 研发创新规划只支持设置链群目标，品牌列请留空。'
  ],
  example:[year,ltCategories[0],ltPlans[0].name,ltDefaultBrands[0],10,12,13,15],
  layout:{widths:[12,16,25,16,12,12,12,12],rowStyles:rows.map(row=>row[3]?0:1),groupedDetailRows:rows.map(row=>Boolean(row[3]))}
 });
}
// 导入空白保留原值，填写0保存零目标；禁止公式和重复身份。
function ltParseTargetImport(table,year){
 const errors=[],entries=[],changes=[],activeRows=[],seen=new Set(),headers=(table[0]||[]).map(value=>String(value??'').replace(/^\uFEFF/,'').trim());
 const add=(row,field,message)=>errors.push({row,field,message});
 for(const name of ltImportHeaders)if(!headers.includes(name))add(1,name,'缺少必填列，请下载最新模板');
 headers.forEach((name,i)=>{if(![...ltImportHeaders,'年度目标','品牌'].includes(name)||headers.indexOf(name)!==i)add(1,name,'表头不匹配或重复')});
 const chainRows=ltCategories.length*ltPlans.length;
 if(!headers.includes('品牌')&&table.length>chainRows+1)add(1,'数据','同一年度最多'+chainRows+'行链群目标');
 if(!errors.length)table.slice(1).forEach((cells,index)=>{
  const row=cells.sourceRow||index+2,text=name=>String(cells[headers.indexOf(name)]??'').trim();
  if(cells.every(value=>!String(value??'').trim()))return;
  const start=errors.length,category=ltCategories.indexOf(text('链群')),plan=ltPlans.findIndex(value=>value.name===text('计划')),brand=text('品牌');
  if(text('年度')!==String(year))add(row,'年度','仅允许导入当前所选年度 '+year+'，请先切换年度');
  if(category<0)add(row,'链群','请使用模板中的四个固定链群');
  if(plan<0)add(row,'计划','计划名称不匹配，请使用模板中的名称');
  if(brand&&ltPlans[plan]?.stage===ltInnovationStage)add(row,'品牌','研发创新规划不配置品牌目标');
  if(cells.length>headers.length)add(row,'数据','数据列多于表头');
  if(cells.some(value=>String(value).startsWith('[公式：')))add(row,'数据','请将公式粘贴为值后导入');
  const key=JSON.stringify([category,plan,brand]);if(seen.has(key))add(row,'计划','文件内同一链群、品牌和计划重复');seen.add(key);
  const values=Array.from({length:4},(_,quarter)=>text('Q'+(quarter+1)));
  if(values.every(value=>value===''))return;
  values.forEach((value,quarter)=>{if(value!==''&&(!/^\d+$/.test(value)||!ltValidCell(Number(value),category,brand)))add(row,'Q'+(quarter+1),'须为0至'+ltTargetLimit(category,brand)+'的整数')});
  if(errors.length!==start)return;
  const identity={row,category,plan,...(brand?{brand}:{})},current=ltTargetRows(year,category,brand)[plan];
  entries.push(identity);
  activeRows.push(cells);
  values.forEach((value,quarter)=>{if(value==='')return;const before=current[quarter],after=Number(value);if(before!==after)changes.push({...identity,quarter,before,after})});
 });
 if(!entries.length&&!errors.length)add(2,'数据','文件没有可导入的目标');
 const sourceTable=errors.length?table:Object.assign([table[0],...activeRows],{sheetName:table.sheetName});
 return {year,revision:ltStore.years[year]?.revision||0,rowCount:table.slice(1).filter(cells=>cells.some(value=>String(value??'').trim())).length,entries,changes,errors,sourceTable};
}
function ltCommitTargetImport(batch,file){
 if(!batch||batch.errors.length||!batch.entries.length)throw Error('请先选择并校验文件');
 if(batch.revision!==(ltStore.years[batch.year]?.revision||0))throw Error('目标已更新，请重新选择文件校验');
 return ltCommitTargetChanges(batch.year,batch.changes,{kind:'import',file,rows:batch.entries.length,status:batch.changes.length?'导入成功':'无变更'});
}
