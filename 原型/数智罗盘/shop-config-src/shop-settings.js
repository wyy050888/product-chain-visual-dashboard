// 分类/考核独立于负责计划和目标归属，跨平台使用平台＋店铺ID隔离。
const ShopSettings=(()=>{
 const categories=['旗舰店','专卖店','自营店','C店','其他'],key='shop-classification-config-v1';
 const platformNames={douyin:'抖音',kuaishou:'快手',wechat:'视频号',tmall:'天猫',jd:'京东',pdd:'拼多多'};
 const bus=new BroadcastChannel('compass-shop-metadata');
 const identity=shop=>platformNames[platformId]+'|'+shop.id;
 function load(){const data=JSON.parse(localStorage.getItem(key)||'null');return data?.version===1&&data.shops?data:{version:1,shops:{}}}
 function value(shop){
  let saved;try{saved=load().shops[identity(shop)]}catch(_){}
  const original=dashboardShopSeed.find(s=>s.channel===platformNames[platformId]&&s.shopId===shop.id);
  const category=original?.shopCategory||(/自营/.test(shop.name)?'自营店':/旗舰/.test(shop.name)?'旗舰店':/专卖/.test(shop.name)?'专卖店':'其他');
  return {shopCategory:categories.includes(saved?.shopCategory)?saved.shopCategory:category,assessed:typeof saved?.assessed==='boolean'?saved.assessed:!!original?.assessed};
 }
 function save(shop,patch){
  try{const data=load(),next={...value(shop),...patch};if(!categories.includes(next.shopCategory)||typeof next.assessed!=='boolean')throw Error();
   data.shops[identity(shop)]=next;localStorage.setItem(key,JSON.stringify(data));bus.postMessage({type:'metadata',store:data});return true;
  }catch(_){return false}
 }
 function cells(shop){const data=value(shop),esc=View.escape;return `<td><select data-shop-category="${esc(shop.id)}" aria-label="店铺分类：${esc(shop.name)}">${categories.map(name=>`<option ${name===data.shopCategory?'selected':''}>${name}</option>`).join('')}</select></td><td><button type="button" role="switch" class="ss-switch" aria-checked="${data.assessed}" aria-label="是否考核：${esc(shop.name)}" data-shop-assessed="${esc(shop.id)}"><i></i></button><span class="ss-switch-label">${data.assessed?'是':'否'}</span></td>`}
 function matches(shop,root){const data=value(shop),category=root.querySelector('#category-filter').value,assessed=root.querySelector('#assessed-filter').value;return (!category||data.shopCategory===category)&&(!assessed||data.assessed===(assessed==='yes'))}
 function extendSeed(original,name){return [...original,...dashboardShopSeed.filter(shop=>shop.channel===name&&!original.some(s=>s.id===shop.shopId)).map(shop=>({id:shop.shopId,name:shop.name,brand:shop.brand,configs:[],updatedAt:null}))]}
 function date(){return new URLSearchParams(location.search).get('date')||new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())}
 function derived(shop){return ShopAttribution.read(date()).rows.get(identity(shop))||{brand:[],region:[],strategy:[],promotion:[]}}
 function renderReadOnly(root,shops,pagination,notice){
  const $=selector=>root.querySelector(selector),esc=View.escape,source=ShopAttribution.read(date());
  const all=shops.map(shop=>({...shop,attribution:source.rows.get(identity(shop))||{brand:[],region:[],strategy:[],promotion:[]}}));
  for(const [selector,field] of [['#brand-filter','brand'],['#region-filter','region']]){
   const control=$(selector),selected=control.value,values=[...new Set(all.flatMap(s=>s.attribution[field]))];if(selected&&!values.includes(selected))values.push(selected);
   control.innerHTML=View.options(values,selected,selector==='#brand-filter'?'请选择品牌':'请选择运营大区');
  }
  const query=$('#shop-search').value.trim().toLowerCase(),brand=$('#brand-filter').value,region=$('#region-filter').value,strategy=$('#owner-filter').value.trim(),promotion=$('#promotion-filter').value.trim();
  const rows=all.filter(shop=>matches(shop,root)&&(!query||[shop.name,shop.id].some(s=>s.toLowerCase().includes(query)))&&(!brand||shop.attribution.brand.includes(brand))&&(!region||shop.attribution.region.includes(region))&&(!strategy||shop.attribution.strategy.some(s=>s.includes(strategy)))&&(!promotion||shop.attribution.promotion.some(s=>s.includes(promotion))));
  const field=(shop,key)=>`<td class="ss-readonly" title="${esc(source.period+'目标：'+(shop.attribution[key].join('、')||'未配置'))}">${shop.attribution[key].map(esc).join('<br>')||'<span class="ss-empty">未配置</span>'}</td>`;
  $('.shop-table thead').innerHTML='<tr><th>店铺名称</th><th>品牌</th><th>运营大区</th><th>店铺策略</th><th>店铺推广</th><th>店铺分类</th><th>是否考核店铺</th></tr>';
  $('#shop-rows').innerHTML=pagination.slice(rows).map(shop=>`<tr data-shop="${esc(shop.id)}"><td><div class="shop-name">${esc(shop.name)}</div><div class="shop-id">ID：${esc(shop.id)}</div></td>${['brand','region','strategy','promotion'].map(key=>field(shop,key)).join('')}${cells(shop)}</tr>`).join('')||'<tr><td colspan="7" class="empty">没有匹配的店铺</td></tr>';
  if(source.error)notice(source.error,'error');
 }
 function bind(root,{getShops,refresh,notice}){
  root.classList.toggle('ss-readonly-platform',!!activePlatform.readOnly);
  root.querySelector('#category-filter').innerHTML='<option value="">全部分类</option>'+categories.map(s=>'<option>'+s+'</option>').join('');
  root.addEventListener('change',event=>{const select=event.target.closest('[data-shop-category]');if(!select)return;const shop=getShops().find(s=>s.id===select.dataset.shopCategory);if(shop&&!save(shop,{shopCategory:select.value}))notice('保存失败，请稍后重试','error');refresh();root.querySelector('[data-shop-category="'+CSS.escape(shop.id)+'"]')?.focus({preventScroll:true})});
  root.addEventListener('click',event=>{const button=event.target.closest('[data-shop-assessed]');if(!button)return;const shop=getShops().find(s=>s.id===button.dataset.shopAssessed);if(shop&&!save(shop,{assessed:!value(shop).assessed}))notice('保存失败，请稍后重试','error');refresh();root.querySelector('[data-shop-assessed="'+CSS.escape(shop.id)+'"]')?.focus({preventScroll:true})});
  window.addEventListener('storage',event=>{if(event.key===key)refresh()});ShopAttribution.subscribe(refresh);
  bus.onmessage=event=>{if(event.data?.type==='metadata')refresh()};
  window.shopAdminAudit=()=>({platform:platformId,readonly:!!activePlatform.readOnly,shops:getShops().map(shop=>({...shop,metadata:value(shop),attribution:activePlatform.readOnly?derived(shop):null}))});
 }
 return {categories,cells,matches,extendSeed,renderReadOnly,bind};
})();
