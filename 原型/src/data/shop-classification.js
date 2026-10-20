// 前台与数智罗盘共用的平台分类规则；旧值只做有依据的迁移，考核属性独立保留。
window.ShopClassification=(()=>{
 const platforms=filterCatalog.platformNames;
 const rules={京东:['自营','POP旗舰店','POP专卖店'],天猫:['旗舰店','专卖店'],拼多多:['旗舰店','专卖店'],抖音:['旗舰店','专卖店'],快手:['旗舰店','专卖店'],视频号:['旗舰店','专卖店']};
 const pending='无分类',order=['旗舰店','POP旗舰店','专卖店','POP专卖店','自营',pending];
 const name=platform=>Object.hasOwn(platforms,platform)?platforms[platform]:platform;
 const allowed=platform=>Object.hasOwn(rules,name(platform))?[...rules[name(platform)]]:[];
 function options(selection='all',includePending=true){
  const selected=(Array.isArray(selection)?selection:[selection]).filter(p=>p&&p!=='all');
  const values=new Set((selected.length?selected:Object.keys(rules)).flatMap(allowed));
  return order.filter(value=>values.has(value)||(includePending&&value===pending));
 }
 function normalize(platform,category){
  const current=String(category||'').trim();
  const migrated=name(platform)==='京东'?({'自营店':'自营','旗舰店':'POP旗舰店','专卖店':'POP专卖店'}[current]||current):current;
  return allowed(platform).includes(migrated)?migrated:pending;
 }
 function infer(platform,shopName=''){
  const category=/自营/.test(shopName)?'自营店':/旗舰店/.test(shopName)?'旗舰店':/专卖店/.test(shopName)?'专卖店':null;
  return normalize(platform,category);
 }
 function resolve(platform,shop,saved){
  const source=saved&&Object.hasOwn(saved,'shopCategory')?saved:shop;
  const shopCategory=source?.shopCategory?normalize(platform,source.shopCategory):infer(platform,shop.name);
  const legacy=shopCategory===pending?(source?.legacyShopCategory||source?.shopCategory):null;
  return {shopCategory,...(legacy&&legacy!==pending&&legacy!=='待确认'?{legacyShopCategory:legacy}:{}),assessed:typeof saved?.assessed==='boolean'?saved.assessed:!!shop.assessed};
 }
 function store(data){
  const shops={};
  if(data?.version===1&&data.shops&&typeof data.shops==='object'&&!Array.isArray(data.shops))for(const [key,value] of Object.entries(data.shops)){
   const parts=key.split('|');if(parts.length!==2||!Object.hasOwn(rules,parts[0])||!parts[1]||!value||typeof value!=='object')continue;
   const row={};
   if(typeof value.shopCategory==='string'){
    row.shopCategory=normalize(parts[0],value.shopCategory);
    if(row.shopCategory===pending){const legacy=value.legacyShopCategory||value.shopCategory;if(legacy!==pending&&legacy!=='待确认')row.legacyShopCategory=String(legacy)}
   }
   if(typeof value.assessed==='boolean')row.assessed=value.assessed;
   if(Object.keys(row).length)shops[key]=row;
  }
  return {version:1,shops};
 }
 const valid=(platform,category)=>allowed(platform).includes(category);
 const rank=category=>{const index=order.indexOf(category);return index<0?order.length:index};
 return {name,allowed,options,normalize,infer,resolve,store,valid,rank,pending};
})();
