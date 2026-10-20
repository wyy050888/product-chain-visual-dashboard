// 店铺主数据配置按“平台 + 店铺ID”关联，与风险指标、统计日期分离。
const shcRules=window.ShopClassification;
const shcPlatforms=filterCatalog.platforms;
const shcStorageKey='shop-classification-config-v1';
let shcStore=shcRules.store(null),shcRevision=0;
const shcKey=shop=>shop.channel+'|'+String(shop.shopId);
try{shcStore=shcRules.store(JSON.parse(localStorage.getItem(shcStorageKey)||'null'))}catch(_){/* 缓存损坏时使用现有主数据，不覆盖缓存。 */}
function shcApplyConfig(shop){return {...shop,...shcRules.resolve(shop.channel,shop,shcStore.shops[shcKey(shop)])}}
function shcRows(){return sampleShopRows().sort((a,b)=>shcPlatforms.indexOf(a.channel)-shcPlatforms.indexOf(b.channel)||String(a.shopId).localeCompare(String(b.shopId)))}
const shcDefaults=()=>({platform:'all',query:'',brand:'all',category:'all',assessed:'all'});
const shcState={...shcDefaults(),page:1,returnList:null,error:''};
function shcFiltered(){
 const query=shcState.query.trim().toLowerCase();
 return shcRows().filter(shop=>(shcState.platform==='all'||shop.channel===shcState.platform)&&(shcState.brand==='all'||shop.brand===shcState.brand)
  &&(shcState.category==='all'||shop.shopCategory===shcState.category)&&(shcState.assessed==='all'||shop.assessed===(shcState.assessed==='yes'))
  &&(!query||[shop.name,shop.shopId].some(value=>String(value).toLowerCase().includes(query))));
}
function shcSetShop(key,patch){
 const shop=shcRows().find(row=>shcKey(row)===key);if(!shop)return {ok:false,error:'未找到该店铺'};
 if(Object.hasOwn(patch,'shopCategory')&&!shcRules.valid(shop.channel,patch.shopCategory))return {ok:false,error:'请选择该平台适用的店铺分类'};
 const value={...shcRules.resolve(shop.channel,shop,shcStore.shops[key]),...patch};
 if(typeof value.assessed!=='boolean')return {ok:false,error:'店铺配置值无效'};
 if(value.shopCategory!==shcRules.pending)delete value.legacyShopCategory;
 const next={version:1,shops:{...shcStore.shops,[key]:value}};
 try{localStorage.setItem(shcStorageKey,JSON.stringify(next))}catch(_){return {ok:false,error:'自动保存失败，请重试'}}
 shcStore=next;shcRevision++;return {ok:true};
}
