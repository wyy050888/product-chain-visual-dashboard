// 公共筛选字典：只集中已确认相同的枚举；各模块仍决定取值范围和单/多选方式。
const filterCatalog=(()=>{
 const platformNames=Object.freeze({douyin:'抖音',kuaishou:'快手',wechat:'视频号',tmall:'天猫',jd:'京东',pdd:'拼多多'});
 const platforms=Object.freeze(Object.values(platformNames));
 const chainAliases=Object.freeze({环境:'环境',环境类:'环境',环境链:'环境',清洁:'清洁',清洁类:'清洁',清洁链:'清洁',厨电:'厨电',厨电类:'厨电',厨房类:'厨电',厨房链:'厨电','个护&健康':'个护&健康','个护 & 健康链':'个护&健康',个护类:'个护&健康',健康类:'个护&健康'});
 const departmentAliases=Object.freeze({产品部:'产品中心',品质部:'品质中心',研发部:'研发中心'});
 return Object.freeze({
  platformNames,platforms,
  // 项目风险与共用待办共享范围；降本等模块保留各自业务范围。
  primaryDepartments:Object.freeze(['产品中心','项目部','品质中心','研发中心','采购部']),
  normalizeDepartment(value){
   const name=String(value??'').trim();
   return Object.hasOwn(departmentAliases,name)?departmentAliases[name]:name;
  },
  // 展示枚举按业务顺序；数字索引保留历史身份，避免重排后串到其他链群。
  chains:Object.freeze(['环境','清洁','厨电','个护&健康']),
  chainByIndex:Object.freeze(['清洁','厨电','环境','个护&健康']),
  normalizeChain(value){
   const text=String(value??'').trim();
   return Object.hasOwn(chainAliases,text)?chainAliases[text]:null;
  },
  dashboardBrands:Object.freeze(['苏泊尔','美的','创维','海尔','康佳']),
  // 保留旧调用名，销售渠道字段和其他平台筛选共用六项枚举。
  salesChannels:platforms,
  platformColors:Object.freeze({抖音:'#fa803b',快手:'#009a29',视频号:'#cf73ad',天猫:'#7167ed',京东:'#35a9d4',拼多多:'#e77369'}),
  seasons:Object.freeze(['夏季品','冬季品','四季品']),
  developmentTypes:Object.freeze(['自研','自选']),
  productTypes:Object.freeze([{value:'new',label:'新品'},{value:'old',label:'老品'},{value:'clearance',label:'清仓品'}].map(Object.freeze)),
  supplierCoreBrands:Object.freeze([['美海'],['康创'],['苏泊尔']].map(Object.freeze)),
  supplierBrandMembers:Object.freeze({美海:Object.freeze(['美的','海尔']),康创:Object.freeze(['康佳','创维']),苏泊尔:Object.freeze(['苏泊尔'])}),
  // 原始供应关系及历史风险记录使用原品牌，不因展示分组而重建身份。
  supplierSourceBrands:Object.freeze(['美的','海尔','苏泊尔','康佳','创维']),
  supplierCoreMaterials:Object.freeze(['电机','电池','电源线','线路板','塑料件','包装'])
 });
})();
window.FilterCatalog=filterCatalog;
