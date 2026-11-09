// 稳定的日期事实和供应能力关系；同一主体跨项目/类目不会复制供应商身份
const scpCategories=Object.entries(scpCategoryReference).flatMap(([category,groups],ci)=>Object.entries(groups).flatMap(([group,names],gi)=>names.map((name,li)=>({id:`C${ci}-${gi}-${li}`,category,group,name,path:[category,group,name].join(' / ')}))));
// 注册日期与一至三星为固定演示字段；供应商名称仍引用用户截图。
const scpCompanies=scpReferenceNames.map((name,i)=>{
 const reserved=i===26?'2026-09-05':i===28?'2026-09-02':i<12?`2024-${String(i%9+1).padStart(2,'0')}-12`:i<24?`2025-${String(i%10+1).padStart(2,'0')}-08`:`2026-${String(Math.min(9,i-23)).padStart(2,'0')}-05`;
 const admitted=i===26?'2026-10-05':i===28?'2026-10-08':i<28||i%2===0?shiftDate(reserved,25+i%18):null;
 const newCooperation=['2026-01-15','2026-02-20','2026-04-08','2026-05-18','2026-06-16','2026-07-07','2026-08-12','2026-09-23','2026-10-06'];
 const cooperation=i<9?`2025-${String(i+1).padStart(2,'0')}-20`:i>=12&&i<=20?newCooperation[i-12]:i===21?'2026-11-18':null;
 return {id:'SUP'+String(i+1).padStart(4,'0'),name,code:'GY-'+String(i+1).padStart(4,'0'),kinds:i===38?['machine','material']:i<24?['machine','material']:i<30?['machine']:['material'],owner:pbPeople[i%pbPeople.length],registered:shiftDate(reserved,-14-i%17),stars:1+i%3,reserved,admitted,cooperation,disabled:i===3?'2026-05-31':null};
});
const scpCompanyMap=new Map(scpCompanies.map(row=>[row.id,row]));
const scpDateMax=(...dates)=>dates.filter(Boolean).sort().at(-1)||null;
function scpCapability(s,extra,index){
 const reserved=scpDateMax(s.reserved,index%7===0?'2026-01-05':null),admitted=s.admitted&&index%5!==4?scpDateMax(s.admitted,shiftDate(reserved,10)):null;
 return {supplierId:s.id,reserved,admitted,cooperation:admitted&&s.cooperation?scpDateMax(s.cooperation,shiftDate(admitted,7)):null,...extra};
}
const scpCapabilities=(()=>{
 const rows=[],machine=scpCompanies.filter(s=>s.kinds.includes('machine')),material=scpCompanies.filter(s=>s.kinds.includes('material'));
 for(const [ci,category] of scpCategories.entries()){
  const count=['剃须刀','可视挖耳勺','水杯'].includes(category.name)?0:3+ci%6;
  for(let j=0;j<count;j++){const s=machine[(ci*7+j*11)%machine.length];rows.push(scpCapability(s,{kind:'machine',categoryId:category.id,category:category.category,group:category.group,name:category.name},ci+j))}
 }
 // 保留五类能力事实及生成索引，汇总继续由scpMembers按供应商ID去重。
 scpSourceBrands.forEach((brand,bi)=>Object.keys(scpCategoryReference).forEach((sourceCategory,ci)=>scpMaterials.forEach((materialName,mi)=>{
  const category=sourceCategory;
  const count=2+(bi*3+ci*2+mi)%7;
  for(let j=0;j<count;j++){const s=material[(bi*7+ci*3+mi*5+j*11)%material.length],leaves=scpCategories.filter(c=>c.id.startsWith('C'+ci+'-')),leaf=leaves[(bi+mi+j)%leaves.length];rows.push(scpCapability(s,{kind:'material',brand,category,categoryId:leaf.id,group:leaf.group,name:leaf.name,material:materialName},bi+ci+mi+j))}
 })));
 // 保留既有补充合作关系的归属，不因核心枚举扩展而重分配旧样例。
 const legacyMaterials=['电机','电池','电源线','线路板'],supplementalMaterials=['塑料件','硅胶件','五金件','其他'];
 const materialBase=rows.filter(row=>row.kind==='material'&&legacyMaterials.includes(row.material));
 material.forEach((supplier,i)=>{const base=materialBase.find(row=>row.supplierId===supplier.id);if(base)rows.push({...base,material:supplementalMaterials[i%supplementalMaterials.length]})});
 // 项目名称已标明的供方纳入同一类目能力关系，避免寻源明细遗漏该供方
 for(const project of projects().filter(p=>/^(自研|自选)/.test(p.type))){
  const alias=scpProjectSupplierAliases.find(name=>project.name.includes(name)),supplier=alias&&machine.find(s=>s.name.includes(alias)),category=scpProjectCategory(project);
  if(supplier&&!rows.some(row=>row.kind==='machine'&&row.categoryId===category.id&&row.supplierId===supplier.id))rows.push(scpCapability(supplier,{kind:'machine',categoryId:category.id,category:category.category,group:category.group,name:category.name},1));
 }
 return rows;
})();
function scpProjectCategory(p){
 const patterns=[[/果蔬/,'果蔬机'],[/蒸汽清洁/,'蒸汽清洁机'],[/布艺/,'布艺清洗机'],[/水暖毯/,'水暖毯'],[/烘干/,'烘干机'],[/挂烫/,'挂烫机'],[/毛球/,'毛球修剪器'],[/面条/,'面条机'],[/封口/,'保鲜真空机'],[/水壶/,'电热水壶'],[/电炒|电煮/,'电火/蒸/炒锅'],[/暴力吹/,'卷/直/烫/吹发器'],[/眼部按摩|润眼/,'眼部按摩器/润眼仪'],[/腰部按摩/,'腰部按摩仪'],[/剃须|刮胡/,'剃须刀'],[/吹风|卷发|直发/,'卷/直/烫/吹发器'],[/牙刷/,'牙刷'],[/冲牙/,'冲牙器'],[/修剪|修毛/,'鼻毛修剪器'],[/吸尘/,'吸尘器'],[/洗地/,'洗地机'],[/除螨/,'除螨仪'],[/扫地|擦窗/,'扫地机/擦窗机'],[/取暖|暖风/,'取暖器'],[/风扇|循环扇/,'电风扇'],[/净化/,'空气净化器'],[/破壁|豆浆/,'破壁/豆浆机'],[/绞肉/,'绞肉/和面机'],[/榨汁/,'榨汁杯'],[/按摩|筋膜/,'按摩枪'],[/足浴/,'足浴桶']];
 const name=patterns.find(([re])=>re.test(p.name))?.[1];return scpCategories.find(row=>row.name===name)||scpCategories.find(row=>row.category===['清洁类','厨电类','环境类','个护类'][p.chain]);
}
let scpProjectCache=null;
function scpProjectFacts(){
 if(scpProjectCache)return scpProjectCache;
 scpProjectCache=projects().filter(p=>/^(自研|自选)/.test(p.type)).map((project,i)=>{
  const category=scpProjectCategory(project),alias=scpProjectSupplierAliases.find(name=>project.name.includes(name)),pool=scpCapabilities.filter(row=>row.kind==='machine'&&row.categoryId===category.id).sort((a,b)=>Number(!!alias&&scpCompanyMap.get(b.supplierId).name.includes(alias))-Number(!!alias&&scpCompanyMap.get(a.supplierId).name.includes(alias))),links=pool.filter((_,j)=>j<3+i%5).map(row=>({...row,projectId:project.id}));
  // 沿用采购工作台的品类采购映射，不以项目经理或产品链主代替。
  return {project,category,links,procurementLead:pbOwner(project.chain)||null};
 });return scpProjectCache;
}
