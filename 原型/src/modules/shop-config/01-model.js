// 店铺主数据配置按“平台 + 店铺ID”关联，与风险指标、统计日期分离。
const shcCategories=['旗舰店','专卖店','自营店','C店','其他'];
const shcPlatforms=['抖音','快手','视频号','天猫','京东','拼多多'];
const shcStorageKey='shop-classification-config-v1';
let shcStore={version:1,shops:{}};
const shcKey=shop=>shop.channel+'|'+String(shop.shopId);
const shcValid=value=>value&&shcCategories.includes(value.shopCategory)&&typeof value.assessed==='boolean';
try{
 const saved=JSON.parse(localStorage.getItem(shcStorageKey)||'null');
 if(saved?.version===1&&saved.shops)shcStore.shops=Object.fromEntries(Object.entries(saved.shops).filter(([key,value])=>shcPlatforms.includes(key.split('|')[0])&&key.split('|').length===2&&!!key.split('|')[1]&&shcValid(value)).map(([key,value])=>[key,{shopCategory:value.shopCategory,assessed:value.assessed}]));
}catch(_){/* 缓存损坏时继续使用已有店铺默认分类。 */}
function shcApplyConfig(shop){return {...shop,...(shcStore.shops[shcKey(shop)]||{})}}
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
 const value={shopCategory:patch.shopCategory??shop.shopCategory,assessed:patch.assessed??shop.assessed};
 if(!shcValid(value))return {ok:false,error:'店铺配置值无效'};
 const next={version:1,shops:{...shcStore.shops,[key]:value}};
 try{localStorage.setItem(shcStorageKey,JSON.stringify(next))}catch(_){return {ok:false,error:'自动保存失败，请重试'}}
 shcStore=next;return {ok:true};
}
