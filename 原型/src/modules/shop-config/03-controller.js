const shcRouteHash='#system-shop-config';
function shcOpenFromRanking(){
 const names={抖音:'douyin',快手:'kuaishou',视频号:'wechat',天猫:'tmall',京东:'jd',拼多多:'pdd'},platform=names[rfState.listPlatforms[1]]||'douyin';
 const url=new URL('数智罗盘/店铺配置.html',document.baseURI);url.searchParams.set('platform',platform);
 window.open(url.href,'_blank','noopener');
}

function shcUpdate(key,patch,kind){
 const result=shcSetShop(key,patch);shcState.error=result.ok?'':result.error;
 if(result.ok)renderRisks();shcRenderTable();
 const control=[...$('#shc-results').querySelectorAll(kind==='category'?'[data-shc-category]':'[data-shc-assessed]')].find(el=>(el.dataset.shcCategory||el.dataset.shcAssessed)===key);control?.focus({preventScroll:true});
}
document.addEventListener('input',e=>{
 if(!e.target.matches('#shc-filters [data-shc-search]'))return;
 shcState.query=e.target.value;shcState.page=1;shcRenderTable();
});
document.addEventListener('change',e=>{
 const target=e.target;
 if(target.matches('#shc-filters [data-shc-filter]')){shcState[target.dataset.shcFilter]=target.value;shcState.page=1;shcRenderTable()}
 else if(target.matches('#shc-results [data-shc-category]'))shcUpdate(target.dataset.shcCategory,{shopCategory:target.value},'category');
});
document.addEventListener('click',e=>{
 const button=e.target.closest('#shc-content button');if(!button)return;
 if(button.hasAttribute('data-shc-platform')){shcState.platform=button.dataset.shcPlatform;shcState.page=1;shcRenderPlatforms();shcRenderTable()}
 else if(button.hasAttribute('data-shc-reset')){Object.assign(shcState,shcDefaults(),{page:1,error:''});shcRenderPage()}
 else if(button.hasAttribute('data-shc-assessed'))shcUpdate(button.dataset.shcAssessed,{assessed:button.getAttribute('aria-checked')!=='true'},'assessed');
 else if(button.id==='shc-return'&&shcState.returnList){const context=shcState.returnList;shcState.returnList=null;smNavigate('#risk');rpOpenList(1,false,null,context)}
});
window.shopConfigAudit=()=>({pageOpen:smActiveRoute===shcRouteHash,state:{platform:shcState.platform,query:shcState.query,brand:shcState.brand,category:shcState.category,assessed:shcState.assessed,page:shcState.page},rows:shcRows().map(({id,shopId,channel,name,brand,shopCategory,assessed})=>({id,shopId,channel,name,brand,shopCategory,assessed})),filtered:shcFiltered().map(shop=>shcKey(shop)),saved:JSON.parse(JSON.stringify(shcStore))});

function shcRefreshExternal(){
 try{const saved=JSON.parse(localStorage.getItem(shcStorageKey)||'null');if(saved?.version!==1||!saved.shops||JSON.stringify(saved)===JSON.stringify(shcStore))return;shcStore=saved;renderRisks();
  if(!$('#overlay').hidden&&$('#rf-list-table.rp-shop-table'))rpOpenList(1,false);
 }catch(_){/* 配置页会报告写入失败，读取失败不覆盖当前数据。 */}
}
window.addEventListener('storage',e=>{if(e.key===shcStorageKey)shcRefreshExternal()});window.addEventListener('focus',shcRefreshExternal);
const shcExternalChannel=new BroadcastChannel('compass-shop-metadata');
shcExternalChannel.onmessage=event=>{if(event.data?.type==='metadata'){try{localStorage.setItem(shcStorageKey,JSON.stringify(event.data.store));shcRefreshExternal()}catch(_){}}};
