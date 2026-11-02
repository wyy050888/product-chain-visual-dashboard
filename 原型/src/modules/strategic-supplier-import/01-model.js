const SSI_STORAGE='strategic-supplier-roster-v1',ssiRoute='#system-strategic-suppliers';
const ssiTierLabels={primary:'一级核心战略合作供应商',secondary:'二级核心物料供应商'};
const ssiSchemas={
 primary:{fields:[['name','供应商名称'],['cooperation','合作日期'],['categoryPath','合作产品类目（到三级）'],['productCode','合作产品SPU码'],['productName','合作产品名称'],['brand','合作品牌'],['introductionRating','引入评级'],['cooperationRating','合作评级']],required:['name','cooperation','categoryPath','productCode','productName','brand','introductionRating']},
 secondary:{fields:[['name','供应商名称'],['admitted','准入日期'],['admissionCategory','准入产品类目（到三级）'],['admissionMaterial','准入核心零部件'],['availableBrand','可合作品牌'],['cooperation','合作日期'],['categoryPath','合作产品类目（到三级）'],['cooperationMaterial','合作核心零部件'],['productCode','合作产品SPU码'],['productName','合作产品名称'],['brand','合作品牌'],['cooperationRating','合作评级']],required:['name','admitted','admissionCategory','admissionMaterial','availableBrand'],cooperationRequired:['categoryPath','cooperationMaterial','productCode','productName','brand']}
};
const ssiFields=ssiSchemas.primary.fields,ssiRatings=['一星','二星','三星'];
const ssiState={tier:'primary',views:{primary:{year:ssiCurrentYear(),query:'',status:'all',category:'all',brand:'all',page:1},secondary:{year:ssiCurrentYear(),query:'',status:'all',category:'all',material:'all',brand:'all',page:1}}};
const ssiViewState=()=>ssiState.views[ssiState.tier];
function ssiListFields(tier=ssiState.tier){return [...ssiSchemas[tier].fields,['actor','更新人'],['updatedAt','更新时间']]}
const ssiRelationshipKey=row=>JSON.stringify([row.tier||'primary',row.name,row.admissionCategory||'',row.admissionMaterial||'',row.availableBrand||'',row.categoryPath||'',row.productCode||row.productName||'',row.brand||'']);
const ssiKey=row=>JSON.stringify([ssiYear(row),ssiRelationshipKey(row)]);
// 原始能力关系身份用于移除样例关系后同步统计，避免刷新时回填。
const ssiCapabilityKey=row=>'source:'+JSON.stringify([row.supplierId,row.kind,row.categoryId,row.brand,row.material||'',row.productCode||'']);
const ssiNormalize=value=>String(value??'').normalize('NFKC').trim();
function ssiValidDate(value){const time=Date.parse(value+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value}
function ssiCategoryFor(value){
 const normalized=text=>ssiNormalize(text).replace(/\s*[\/／>]\s*/g,' / '),text=normalized(value);
 const matches=scpCategories.filter(row=>normalized(row.path)===text||ssiNormalize(row.name)===ssiNormalize(value));return matches.length===1?matches[0]:null;
}
function ssiValidateRow(row){
 const schema=ssiSchemas[row.tier||'primary'];if(!schema||schema.fields.some(([key])=>typeof row[key]!=='string'))throw Error('名单字段格式无效');
 if(!row.name||row.name.length>100)throw Error('供应商名称必填，最多100字');
 for(const [key,label]of schema.fields){
  const value=row[key];if(!value)continue;
  if(key!=='name'&&/[、,，;；\r\n]/.test(value))throw Error(label+'每格只填一个值，请拆成多行');
  if(['admitted','cooperation'].includes(key)&&!ssiValidDate(value))throw Error(label+'须为有效日期，如2026/10/01');
  if(['categoryPath','admissionCategory'].includes(key)&&!ssiCategoryFor(value))throw Error(label+'须匹配完整三级类目路径');
  if(['admissionMaterial','cooperationMaterial'].includes(key)&&!scpCooperationMaterials.includes(value))throw Error(label+'不在已有核心零部件目录中');
  if(['availableBrand','brand'].includes(key)&&![...scpSourceBrands,...scpBrands.map(row=>row[0])].includes(value))throw Error(label+'须选择已有品牌');
  if(key.endsWith('Rating')&&!ssiRatings.includes(value))throw Error(label+'仅支持一星、二星、三星');
 }
 if(row.admitted&&row.cooperation&&row.cooperation<row.admitted)throw Error('合作日期不得早于准入日期');
 if(row.productName.length>200)throw Error('合作产品名称最多200字');
}
function ssiLoad(){
 const empty=()=>({version:4,revision:0,rows:[],legacyRows:[],removed:[],replacedTiers:[],replacedYears:{primary:[],secondary:[]}});
 try{
  const saved=JSON.parse(localStorage.getItem(SSI_STORAGE));if(![1,2,3,4].includes(saved?.version)||!Number.isSafeInteger(saved.revision)||!Array.isArray(saved.rows))return empty();
  const legacyRows=saved.version===1?saved.rows:saved.legacyRows||[];
  const rows=saved.version===1?[]:saved.rows.map(row=>({...Object.fromEntries(ssiSchemas[row.tier||'primary'].fields.map(([key])=>[key,''])),...row,tier:row.tier||'primary'}));
  const seen=new Set();for(const row of rows){const fields=ssiSchemas[row.tier].fields;if(fields.some(([key])=>typeof row[key]!=='string')||!row.name||!row.supplierId||seen.has(ssiKey(row)))throw Error('合作关系无效或重复');seen.add(ssiKey(row))}
  const removed=saved.removed||[];if(!Array.isArray(removed)||removed.some(key=>typeof key!=='string'))throw Error('移除记录无效');
  const replacedTiers=saved.replacedTiers||[];if(!Array.isArray(replacedTiers)||replacedTiers.some(tier=>!ssiSchemas[tier]))throw Error('覆盖类型无效');
  const replacedYears=Object.fromEntries(['primary','secondary'].map(tier=>{const years=saved.replacedYears?.[tier]||[];if(!Array.isArray(years)||years.some(year=>!/^\d{4}$/.test(year)))throw Error('覆盖年份无效');return [tier,[...new Set(years)]]}));
  return {...saved,version:4,rows,legacyRows,removed,replacedTiers:[...new Set(replacedTiers)],replacedYears};
 }catch(_){return empty()}
}
let ssiStore=ssiLoad();
function ssiStatus(row){return row.cooperation&&row.cooperation<=DATA_CUTOFF?'合作中':row.admitted&&row.admitted<=DATA_CUTOFF?'准入储备':'待生效'}
function ssiSampleRows(tier){
 const rows=[],seen=new Set();
 for(const capability of scpCapabilities.filter(row=>row.kind===(tier==='primary'?'machine':'material'))){
  const supplier=scpCompanyMap.get(capability.supplierId);if(!supplier||seen.has(supplier.id)||tier==='primary'&&!capability.cooperation)continue;seen.add(supplier.id);
  const product=sampleSpus.find(p=>p.brand===(capability.brand||'康佳'))||sampleSpus[0],category=scpCategories.find(c=>c.id===capability.categoryId);
  rows.push({sourceKey:ssiCapabilityKey(capability),...Object.fromEntries(ssiSchemas[tier].fields.map(([key])=>[key,''])),tier,supplierId:supplier.id,name:supplier.name,admitted:capability.admitted||'',admissionCategory:category.path,admissionMaterial:capability.material||'',availableBrand:capability.brand||'',cooperation:capability.cooperation||'',categoryPath:capability.cooperation?category.path:'',cooperationMaterial:capability.cooperation?capability.material||'':'',productCode:capability.cooperation?product.spuCode:'',productName:capability.cooperation?product.name:'',brand:capability.cooperation?product.brand:'',introductionRating:'一星',cooperationRating:capability.cooperation?'二星':''});
 }
 return rows;
}
// 初始列表固定取原始关系，不因移除后统计重算而自动补回同一供应商的另一行。
const ssiSeedRows={primary:ssiSampleRows('primary'),secondary:ssiSampleRows('secondary')};
function ssiRows(){
 const tier=ssiState.tier,state=ssiViewState(),query=state.query.trim().toLowerCase();
 return ssiAllRows(tier).filter(row=>(state.year==='all'||ssiYear(row)===state.year)&&(!query||['name','productName','productCode'].some(key=>String(row[key]||'').toLowerCase().includes(query)))&&(state.status==='all'||ssiStatus(row)===state.status)&&ssiMatchesCatalog(row,state)).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')||ssiKey(a).localeCompare(ssiKey(b),'zh-CN'));
}
function ssiImportCoverageText(tier=ssiState.tier,years=[]){
 const date=tier==='secondary'?'准入':'合作',other=tier==='secondary'?'一级':'二级';
 const scope=years.length?'本次覆盖'+years.map(year=>year+'年').join('、')+'（按'+date+'年份）。':'按'+date+'年份覆盖，请上传对应年份的完整名单。';
 return [scope,'未列记录会删除，选填项留空会清空旧值。','其他年份和'+other+'名单保留；导入失败不改原数据。'].join('\n');
}
function ssiCommit(batch){
 if(!batch||batch.errors.length||!batch.entries.length||!ssiSchemas[batch.tier])throw Error('请先选择有效文件');
 if(batch.revision!==ssiStore.revision||ssiLoad().revision!==ssiStore.revision)throw Error('名单已更新，请重新选择文件');
 const tier=batch.tier,suppliers=new Map(scpCompanies.map(row=>[row.name,row.id])),included=new Set(),at=new Date().toISOString(),years=new Set();
 const rows=batch.entries.map(({record})=>{
  if(record.tier!==tier)throw Error('文件类型与当前导入类型不一致');ssiValidateRow(record);
  const year=ssiYear(record);if(!year)throw Error((tier==='secondary'?'准入日期':'合作日期')+'必填且须为有效日期');years.add(year);
  const key=ssiKey(record);if(included.has(key))throw Error('文件内同一年度供应商关系重复，请合并后导入');included.add(key);
  if(!suppliers.has(record.name))suppliers.set(record.name,'STR-'+crypto.randomUUID());
  return {...record,supplierId:suppliers.get(record.name),actor:'管理员',updatedAt:at};
 });
 // 只替换文件涉及的日期年份。保留其他年、无日期旧记录，以及旧整类覆盖标记。
 const kept=ssiStore.rows.filter(row=>row.tier!==tier||!years.has(ssiYear(row)));
 const legacyRows=tier==='primary'?ssiStore.legacyRows.filter(row=>!years.has(ssiDateYear(row.cooperation))):ssiStore.legacyRows;
 const replacedYears={...ssiStore.replacedYears,[tier]:[...new Set([...(ssiStore.replacedYears[tier]||[]),...years])].sort()};
 const next={...ssiStore,version:4,revision:ssiStore.revision+1,rows:[...kept,...rows],legacyRows,replacedYears,removed:ssiImportedRemovals(rows,years,tier)};
 try{localStorage.setItem(SSI_STORAGE,JSON.stringify(next))}catch(_){throw Error('保存失败，请重试')}
 ssiStore=next;ssiApply();scpRepaint();return rows.length;
}
window.strategicSupplierImportAudit=()=>JSON.parse(JSON.stringify({tier:ssiState.tier,store:ssiStore,year:ssiViewState().year,rows:ssiRows()}));
