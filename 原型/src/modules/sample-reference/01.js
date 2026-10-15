// Identity adapters are separate from metric calculations and UI renderers.
const sampleProjectSource = [...sampleProjects1,...sampleProjects2,...sampleProjects3,...sampleProjects4].sort((a,b)=>a.id-b.id);
for(const name of new Set(sampleProjectSource.flatMap(p=>[p.owner,p.productOwner]).filter(n=>n&&n!=='待指定')))if(!people.includes(name))people.push(name);
function sampleSpuFields(p){return {name:p.name,model:p.model,brand:p.brand,chain:p.chain,spuId:p.spuId,spuCode:p.spuCode,image:p.image,sourceRow:p.sourceRow}}
function sampleSpuIdentity(chain,index,isNew=false){
  const pool=sampleSpus.filter(p=>p.chain===chain),newRows=pool.filter(p=>p.cohort==='new');
  const rows=isNew&&newRows.length?newRows:pool;
  return sampleSpuFields(rows[((index%rows.length)+rows.length)%rows.length]);
}
function sampleSpuByName(name) { return sampleSpus.find(p=>p.name===name); }
function sampleProjectRows() {
  const cutoff=bounds().cutoff;
  return sampleProjectSource.map(p=>{
    const normal=n=>n.replace(/[\s\-（）()]/g,'');
    const spu=sampleSpus.find(s=>normal(s.name)===normal(p.name));
    // Source delay describes a schedule change; overdue is calculated separately.
    const completed=p.actual&&p.actual!=='—'&&p.actual<=cutoff;
    const delay=p.status==='绿灯'?0:Math.max(0,Math.round((Date.parse(completed?p.actual:cutoff)-Date.parse(p.plan))/86400000));
    const plannedDelay=p.revisedPlan?Math.round((Date.parse(p.revisedPlan)-Date.parse(p.plan))/86400000):null;
    return {...p,model:spu?.model||p.model,spuId:spu?.spuId,spuCode:spu?.spuCode,delay,plannedDelay,cause:p.report?p.report.replace(/\s+/g,' ').slice(0,160)+(p.report.length>160?'…':''):'项目日报待补录',actual:completed?p.actual:'—',sourceKey:'XM-'+String(p.id+1).padStart(3,'0')};
  });
}
function sampleShopRows() {
  // Platforms are interaction fixtures: only the JD store explicitly identifies its platform.
  const platforms=['抖音','京东','天猫','快手','抖音','视频号','拼多多','抖音','天猫','抖音'];
  return sampleShops.map((s,id)=>{
    const chain=s.chain,products=sampleSpus.filter(p=>p.chain===chain&&p.brand===s.brand);
    const score=s.referenceScore??4.65;
    // 店铺分类由名称演示映射；考核标记为独立交互样例，不等同于核心店铺。
    const shopCategory=/自营/.test(s.name)?'自营店':/旗舰店/.test(s.name)?'旗舰店':/专卖店/.test(s.name)?'专卖店':/C店/.test(s.name)?'C店':'其他';
    return {...s,id,shopCategory,assessed:id%3!==1,channel:platforms[id],owner:people[id%people.length],model:s.shopId,score,
      productScore:[4.3,4.8,4.9,4.4,4.2,3.1,3.3,3.2,4.9,3.5][id],logisticsScore:[4.4,4.8,4.9,4.2,4.3,3.4,3.6,3.5,4.9,3.6][id],
      serviceScore:[4.2,4.9,4.8,4.1,4.4,3.2,3.5,3.4,4.8,3.5][id],
      mainProducts:(products.length?products:sampleSpus.filter(p=>p.brand===s.brand)).slice(0,2).map(p=>p.name).join('、')||'—',
      value:fmt(score,2)+' 分',metric:score,risks:[],desc:''};
  });
}
window.referenceSampleAudit=()=>({spus:sampleSpus.map(p=>({...p})),shops:sampleShops.map(p=>({...p})),projects:sampleProjectRows(),products:withPeriod('matrix',()=>productRows(false)),newProducts:withPeriod('new',()=>productRows(true)),inventory:withPeriod('inventory',()=>inventoryProductLedger()),quality:withPeriod('risk',()=>qrCatalog()),returns:withPeriod('risk',()=>rrAll())});
