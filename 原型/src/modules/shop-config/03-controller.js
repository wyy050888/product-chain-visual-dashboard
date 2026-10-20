const shcRouteHash='#system-shop-config';
function shcOpenFromRanking(){
 const names={抖音:'douyin',快手:'kuaishou',视频号:'wechat',天猫:'tmall',京东:'jd',拼多多:'pdd'},platform=names[rfState.listPlatforms[1]]||'douyin';
 const url=new URL('数智罗盘/店铺配置.html',document.baseURI);url.searchParams.set('platform',platform);
 window.open(url.href,'_blank','noopener');
}

function shcUpdate(key,patch,kind){
 const result=shcSetShop(key,patch);shcState.error=result.ok?'':result.error;
 if(result.ok){shcExternalChannel.postMessage({type:'metadata',store:shcStore});renderRisks()}shcRenderTable();
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
 if(button.hasAttribute('data-shc-platform')){shcState.platform=button.dataset.shcPlatform;if(!shcRules.options(shcState.platform).includes(shcState.category))shcState.category='all';shcState.page=1;shcRenderPage()}
 else if(button.hasAttribute('data-shc-reset')){Object.assign(shcState,shcDefaults(),{page:1,error:''});shcRenderPage()}
 else if(button.hasAttribute('data-shc-assessed'))shcUpdate(button.dataset.shcAssessed,{assessed:button.getAttribute('aria-checked')!=='true'},'assessed');
 else if(button.id==='shc-return'&&shcState.returnList){const context=shcState.returnList;shcState.returnList=null;smNavigate('#risk');rpOpenList(1,false,null,context)}
});
window.shopConfigAudit=()=>({pageOpen:smActiveRoute===shcRouteHash,state:{platform:shcState.platform,query:shcState.query,brand:shcState.brand,category:shcState.category,assessed:shcState.assessed,page:shcState.page},rows:shcRows().map(({id,shopId,channel,name,brand,shopCategory,assessed})=>({id,shopId,channel,name,brand,shopCategory,assessed})),filtered:shcFiltered().map(shop=>shcKey(shop)),saved:JSON.parse(JSON.stringify(shcStore))});

function shcRefreshExternal(){
 try{const saved=JSON.parse(localStorage.getItem(shcStorageKey)||'null');const next=shcRules.store(saved);if(JSON.stringify(next)===JSON.stringify(shcStore))return;shcStore=next;shcRevision++;renderRisks();
  if(smActiveRoute===shcRouteHash)shcRenderPage();
  shcRefreshDetail();
  if(!$('#overlay').hidden&&$('#rf-list-table.rp-shop-table'))rpOpenList(1,false);
 }catch(_){/* 配置页会报告写入失败，读取失败不覆盖当前数据。 */}
}
window.addEventListener('storage',e=>{if(e.key===shcStorageKey)shcRefreshExternal()});window.addEventListener('focus',shcRefreshExternal);
const shcExternalChannel=new BroadcastChannel('compass-shop-metadata');
shcExternalChannel.onmessage=event=>{if(event.data?.type==='metadata'){try{localStorage.setItem(shcStorageKey,JSON.stringify(event.data.store));shcRefreshExternal()}catch(_){}}};

// 下层榜单节点由抽屉栈保留；返回时按元数据版本补绘，不重置筛选或日期。
function shcRefreshDetail(){
 const detail=$('.sd-detail');if(!detail)return;
 const shop=shcRows().find(s=>String(s.shopId)===detail.dataset.sdShop&&s.channel===detail.dataset.sdPlatform),field=detail.querySelector('[data-sd-category]');
 if(shop&&field)field.textContent=shop.shopCategory;
}
$('#dialogbody').addEventListener('drawer:restored',()=>{
 const host=$('#rf-list-table.rp-shop-table');if(host?.upRefresh&&Number(host.dataset.shcRevision)!==shcRevision)host.upRefresh();
 shcRefreshDetail();
});
