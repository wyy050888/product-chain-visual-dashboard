import assert from 'node:assert/strict';
export function verifySupplierPlanningModel(a){
 assert.equal(a.companies.length,40);assert.equal(new Set(a.companies.map(s=>s.id)).size,40);assert.equal(new Set(a.companies.map(s=>s.name)).size,40);
 assert(a.companies.some(s=>s.name==='温州市联鑫机电有限公司'));assert(a.companies.some(s=>s.name==='山东豪事达智能家居有限公司'));
 assert.deepEqual([...new Set(a.categories.map(c=>c.category))],['个护类','环境类','清洁类','厨电类','健康类']);assert.equal(a.categories.length,67);
 assert(a.projects.length>40);assert(a.projects.every(p=>p.name&&p.links.every(r=>a.companies.some(s=>s.id===r.supplierId))));
 assert(a.projects.find(p=>p.name.includes('K3静音洗地机')).links.some(r=>a.companies.find(s=>s.id===r.supplierId).name.includes('优洁')),'已命名项目供方保留关联');
 for(const rows of [a.companies,a.capabilities])for(const row of rows){if(row.admitted)assert(row.admitted>=row.reserved);if(row.cooperation)assert(row.admitted&&row.cooperation>=row.admitted)}
 assert.equal(a.annual.target,10);assert.equal(a.annual.newCooperation,9);assert.equal(a.annual.rate,90);assert.deepEqual(a.quarters.map(row=>row.newCooperation),[2,3,3,1]);
 assert.equal(a.quarters.reduce((n,row)=>n+row.target,0),10);assert.equal(a.quarters.reduce((n,row)=>n+row.newCooperation,0),a.annual.newCooperation);
 for(const row of a.quarters){assert(row.reserved>=row.admitted&&row.admitted>=row.cooperated);assert.equal(row.rate,row.target?row.newCooperation/row.target*100:null)}
 assert(a.companies.some(s=>s.cooperation>'2026-10-10'),'样例包含未到生效日合作，不能提前计入');
 assert.deepEqual(a.materialPeriod,{year:2026,mode:'year',value:1});
 const materialTargets=[9,6,7,6,5],categoryTargets=[4,3,5,3,3];
 const active=new Set(a.companies.filter(s=>s.reserved<='2026-10-10'&&(!s.disabled||s.disabled>'2026-10-10')).map(s=>s.id));
 const annualNew=(brand,category)=>{
  const dates=new Map();for(const row of a.capabilities)if(row.kind==='material'&&row.brand===brand&&(!category||row.category===category)&&active.has(row.supplierId)&&row.cooperation&&row.cooperation<='2026-10-10'){
   const previous=dates.get(row.supplierId);if(!previous||row.cooperation<previous)dates.set(row.supplierId,row.cooperation);
  }
  return [...dates.values()].filter(date=>date>='2026-01-01').length;
 };
 for(const [index,brand] of a.materials.entries()){
  assert.equal(brand.stats.target,materialTargets[index]);assert.equal(brand.stats.newCooperation,annualNew(brand.brand));assert.equal(brand.stats.rate,brand.stats.newCooperation/brand.stats.target*100);
  for(const [categoryIndex,category] of brand.categories.entries()){assert.equal(category.stats.target,categoryTargets[(index+categoryIndex)%5]);assert.equal(category.stats.newCooperation,annualNew(brand.brand,category.category));}

  assert.equal(brand.categories.length,5);assert(brand.stats.cooperated<=brand.stats.admitted);
  for(const category of brand.categories)for(const metric of ['reserved','admitted','cooperated','newCooperation'])assert(brand.stats[metric]>=category.stats[metric]);
  assert(brand.categories.reduce((n,row)=>n+row.stats.admitted,0)>brand.stats.admitted,'父级按供应商去重，不能累加类目');
 }
}
