// 公共筛选字典：只集中已确认相同的枚举；各模块仍决定取值范围和单/多选方式。
const filterCatalog=(()=>{
 const platformNames=Object.freeze({douyin:'抖音',kuaishou:'快手',wechat:'视频号',tmall:'天猫',jd:'京东',pdd:'拼多多'});
 return Object.freeze({
  platformNames,platforms:Object.freeze(Object.values(platformNames)),
  platformColors:Object.freeze({抖音:'#f0a346',快手:'#4eb69c',视频号:'#cf73ad',天猫:'#7167ed',京东:'#35a9d4',拼多多:'#e77369'}),
  seasons:Object.freeze(['夏季品','冬季品','四季品']),
  productTypes:Object.freeze([{value:'new',label:'新品'},{value:'old',label:'老品'},{value:'clearance',label:'清仓品'}].map(Object.freeze)),
  supplierCoreBrands:Object.freeze([['美的','A'],['海尔','A'],['苏泊尔','A'],['康佳','B'],['创维','B']].map(Object.freeze)),
  supplierCoreMaterials:Object.freeze(['电机','电池','电源线','线路板'])
 });
})();
window.FilterCatalog=filterCatalog;
