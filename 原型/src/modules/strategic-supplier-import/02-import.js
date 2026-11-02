function ssiHeader(value){return ssiNormalize(value).replace(/^[*＊]\s*/,'').replace(/\((?:YYYY\/MM\/DD|多个换行|多个用[、,，]隔开|有合作日期时必填)\)/g,'').trim()}
function ssiNormalizeTable(table){
 const at=table.findIndex(row=>row.some(value=>ssiHeader(value)==='供应商名称'));
 return table.slice(Math.max(0,at)).filter((row,index)=>!index||!String(row[0]||'').startsWith('【示例】'));
}
async function ssiReadFile(file,tier){
 if(!/\.xlsx$/i.test(file.name))return ssiNormalizeTable(await cwReadFile(file));
 const sheets=await cwReadXlsx(await file.arrayBuffer(),{allSheets:true}),sheet=sheets.find(row=>row.name===ssiTierLabels[tier]+'导入模板')||(sheets.length===1?sheets[0]:null);
 if(!sheet)throw Error('未找到“'+ssiTierLabels[tier]+'导入模板”Sheet，请下载当前Tab模板');
 return ssiNormalizeTable(sheet.rows);
}
function ssiParseImport(table,tier=ssiState.tier){
 table=ssiNormalizeTable(table);const schema=ssiSchemas[tier],errors=[],entries=[],headers=(table[0]||[]).map(ssiHeader),names=schema.fields.map(([,label])=>ssiHeader(label)),seen=new Set(),existingRows=new Map(ssiStore.rows.map(row=>[ssiKey(row),row]));
 const add=(row,message)=>errors.push({row,message});
 if(headers.length!==names.length||new Set(headers).size!==headers.length||names.some(label=>!headers.includes(label)))add(table[0]?.sourceRow||1,'表头不匹配，请使用“'+ssiTierLabels[tier]+'”模板');
 if(table.length>5001)add(1,'单次最多导入5000条');if(errors.length)return {errors,entries,tier,revision:ssiStore.revision};
 table.slice(1).forEach((cells,index)=>{
  const row=cells.sourceRow||index+2;if(cells.every(value=>!String(value??'').trim()))return;const before=errors.length;
  const record={tier,...Object.fromEntries(schema.fields.map(([key,label])=>[key,String(cells[headers.indexOf(ssiHeader(label))]??'').trim()]))};
  const known=scpCompanies.find(supplier=>ssiNormalize(supplier.name)===ssiNormalize(record.name));record.name=known?.name||ssiNormalize(record.name);if(record.productCode)record.productCode=ssiNormalize(record.productCode);
  for(const key of schema.required)if(!record[key])add(row,schema.fields.find(([field])=>field===key)[1]+'必填');
  if(record.cooperation)for(const key of schema.cooperationRequired||[])if(!record[key])add(row,'填写合作日期时，'+schema.fields.find(([field])=>field===key)[1]+'必填');
  if(cells.some(value=>String(value).startsWith('[公式：')))add(row,'请将公式粘贴为值后导入');if(cells.length>headers.length)add(row,'数据列多于表头');
  for(const key of ['admitted','cooperation'])if(record[key])try{record[key]=uiImportDate(ssiNormalize(record[key]),key==='admitted'?'准入日期':'合作日期')}catch(error){add(row,error.message)}
  for(const key of ['categoryPath','admissionCategory'])if(record[key]){const category=ssiCategoryFor(record[key]);if(category)record[key]=category.path}
  for(const key of ['admissionMaterial','cooperationMaterial','availableBrand','brand'])if(record[key])record[key]=ssiNormalize(record[key]);
  if(record.productCode)try{const product=uiImportSpu(record.productCode);if(record.productName&&ssiNormalize(record.productName)!==ssiNormalize(product.name))throw Error('合作产品名称与SPU码对应档案不一致');if(record.brand&&record.brand!==product.brand)throw Error('合作品牌与SPU码对应档案不一致');record.productName=product.name}catch(error){add(row,error.message)}
  const key=ssiKey(record),existing=existingRows.get(key);if(seen.has(key))add(row,'文件内同一年度供应商关系重复，请合并后导入');seen.add(key);
  try{ssiValidateRow(record)}catch(error){add(row,error.message)}
  if(errors.length===before)entries.push({row,record,kind:existing?'更新':'新增'});
 });
 if(!entries.length&&!errors.length)add(2,'文件没有数据行');return {errors,entries,tier,years:[...new Set(entries.map(({record})=>ssiYear(record)).filter(Boolean))].sort(),revision:ssiStore.revision};
}
function ssiTemplateConfig(tier=ssiState.tier){
 const schema=ssiSchemas[tier],product=sampleSpus.find(row=>row.name.includes('吸尘'))||sampleSpus[0],category=scpCategories.find(row=>row.name==='吸尘器'),date=dashboardToday().replaceAll('-','/');
 const record={name:'示例供应商',cooperation:date,categoryPath:category.path,productCode:product.spuCode,productName:product.name,brand:product.brand,introductionRating:'一星',cooperationRating:'二星',admitted:date,admissionCategory:category.path,admissionMaterial:'电机',availableBrand:product.brand,cooperationMaterial:'电机'};
 const guide=[
  '1. '+ssiImportCoverageText(tier),
  '2. 红色*表示必填；有条件标注的按条件填写。每行一条关系，同一供应商涉及多个类目、物料、品牌或产品时拆成多行；【示例】行不导入。',
  tier==='primary'?'3. 一级只登记合作信息，合作日期必填，格式YYYY/MM/DD；不填写意向或准入储备。':'3. 供应商名称、准入日期、准入产品类目、准入核心零部件、可合作品牌必填；合作信息选填。日期为YYYY/MM/DD。',
  '4. 类目填写完整三级路径；合作产品SPU码须已建档，名称及品牌与该SPU一致。每个单元格只填一个值。',
  tier==='primary'?'5. 引入评级必填、合作评级选填；评级为一星、二星、三星。':'5. 有合作日期时，合作类目、合作核心零部件、合作SPU码、产品名称、合作品牌必填，合作评级选填；合作日期不得早于准入日期。'
 ];
 return {headers:schema.fields.map(([,label])=>label),rows:[],name:ssiTierLabels[tier]+'导入模板',required:schema.fields.filter(([key])=>schema.required.includes(key)).map(([,label])=>label),conditional:Object.fromEntries(schema.fields.filter(([key])=>schema.cooperationRequired?.includes(key)).map(([,label])=>[label,'有合作日期时必填'])),example:schema.fields.map(([key])=>record[key]||''),guide,layout:{widths:schema.fields.map(([key])=>key==='name'?30:key.toLowerCase().includes('category')?46:key==='productName'?48:key==='productCode'?35:24),rowHeight:48,headerHeight:tier==='secondary'?64:42}};
}
function ssiTemplate(tier=ssiState.tier){const config=ssiTemplateConfig(tier);downloadImportTemplate(config.headers,[],config.name,{...config,sheets:[{...config,name:config.name}]})}
