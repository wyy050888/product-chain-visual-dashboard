const ssiBaseCompanies=scpCompanies.map(row=>({...row,kinds:[...row.kinds]})),ssiBaseCapabilities=scpCapabilities.map(row=>({...row}));
// 一行对应一条明确关系，准入与合作分别取各自字段，不对不同列做笛卡尔组合。
function ssiApply(){
 const primaryCovered=date=>ssiYearCovered('primary',ssiDateYear(date)),secondaryCovered=date=>ssiYearCovered('secondary',ssiDateYear(date));
 // 一级仅覆盖合作事实；独立的意向、准入台账及供应商主体继续保留。
 const companies=ssiBaseCompanies.map(row=>({...row,kinds:[...row.kinds],...(primaryCovered(row.cooperation)?{cooperation:null}:{})}));
 const capabilities=ssiBaseCapabilities.filter(row=>!(row.kind==='material'&&secondaryCovered(row.admitted))&&!(ssiStore.removed||[]).includes(ssiCapabilityKey(row))).map(row=>({...row,...(row.kind==='machine'&&primaryCovered(row.cooperation)?{cooperation:null,cooperationRating:''}:{})}));
 for(const entry of ssiStore.legacyRows.filter(row=>!primaryCovered(row.cooperation))){const old=companies.find(row=>row.code===entry.code);if(old)Object.assign(old,entry);else companies.push({...entry,id:'STR-'+entry.code,kinds:['machine'],stars:null})}
 for(const row of ssiStore.rows){
  const kind=row.tier==='secondary'?'material':'machine';let supplier=companies.find(s=>s.name===row.name);
  if(!supplier){supplier={id:row.supplierId,code:row.supplierId,name:row.name,kinds:[kind],owner:'',registered:null,reserved:null,admitted:null,cooperation:null,disabled:null,stars:null};companies.push(supplier)}
  else supplier.kinds=[...new Set([...supplier.kinds,kind])];
  for(const key of row.tier==='secondary'?[]:['admitted','cooperation'])if(row[key]&&(!supplier[key]||row[key]<supplier[key]))supplier[key]=row[key];
  const add=(categoryPath,brand,material,admitted,cooperation)=>{
   const category=ssiCategoryFor(categoryPath);if(!category||!brand)return;
   const capability={supplierId:supplier.id,kind,categoryId:category.id,category:category.category,group:category.group,name:category.name,brand,material:material||undefined,productName:row.productName,productCode:row.productCode||'',reserved:null,admitted:admitted||null,cooperation:cooperation||null,introductionRating:row.introductionRating||'',cooperationRating:row.cooperationRating||''};
   const existing=capabilities.find(item=>item.supplierId===supplier.id&&item.kind===kind&&item.categoryId===category.id&&item.brand===brand&&item.material===capability.material&&item.productCode===capability.productCode);
   if(existing){
    const dates=Object.fromEntries(['reserved','admitted','cooperation'].map(key=>[key,[existing[key],capability[key]].filter(Boolean).sort()[0]||null]));
    Object.assign(existing,capability,dates);
   }else capabilities.push(capability);
  };
  if(row.tier==='secondary'){
   add(row.admissionCategory,row.availableBrand,row.admissionMaterial,row.admitted,null);
   if(row.cooperation&&row.categoryPath&&row.cooperationMaterial&&row.brand)add(row.categoryPath,row.brand,row.cooperationMaterial,row.admitted,row.cooperation);
  }else add(row.categoryPath,row.brand,null,row.admitted||null,row.cooperation);
 }
 scpCompanies.splice(0,scpCompanies.length,...companies);scpCompanyMap.clear();for(const row of companies)scpCompanyMap.set(row.id,row);
 scpCapabilities.splice(0,scpCapabilities.length,...capabilities);scpProjectCache=null;
}
ssiApply();
