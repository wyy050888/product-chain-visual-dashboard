// 店铺按唯一店铺ID隔离状态；日期继承来源榜单，返回时由抽屉栈恢复。
function sdOpenDetail(id){
 const period=$('#dialogbody').dataset.rankingPeriod?JSON.parse($('#dialogbody').dataset.rankingPeriod):copyPeriod(periodFor('risk'));
 const state={...upWindow(period),period:{...period},tab:'operating',todoTab:'execution'};
 const shop=drawerWithPeriod(period,()=>sbAllShops().find(s=>s.id===Number(id)));if(!shop){toast('未找到店铺');return}
 openModal('店铺详情',`<article class="up-detail sd-detail" data-sd-shop="${esc(shop.shopId)}" data-up-tab="operating">${sdHero(shop)}<section data-up-panel="operating"></section><section data-up-panel="violations"></section><section data-up-panel="handling"></section></article>`,true,'');
 const root=$('.sd-detail');
 const paint=()=>{
  drawerWithPeriod(state.period,()=>{
   const current=sbAllShops().find(s=>s.id===shop.id)||shop,host=root.querySelector('[data-sd-scores]');
   host.classList.toggle('sd-hero-link-counts',current.channel==='拼多多');
   host.innerHTML=rpShopScoreMarkup(current,rpShopFields(current));
  });
  const m=sdModel(shop,state);sdMountDiagnosis(root,m,state);root.querySelector('[data-up-panel="operating"]').innerHTML=sdOperating(m,state);sdMountProducts(root,m);sdMountViolations(root,m,state);
  upMountTodos(root,null,state,{list:()=>sdTodoList(m,state),create:()=>sdTaskBase(shop,state),departments:[...new Set(sdAssignees(shop).map(p=>p.department))]});
  root.dataset.start=state.start;root.dataset.end=state.end;drawerQueueRefresh();
 };
 drawerMountPeriod($('#dialogsub'),state.period,(period,range)=>{Object.assign(state,range,{period});paint()},'sd-date-trigger');paint();
}
const sdPreviousDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope > .sd-detail');if(!root)return sdPreviousDrawerProfile(body,title);
 return {root,tabs:sdTabs,entries:[...root.children].map(node=>({node,key:node.dataset.upPanel||'shared'})),activeKey:root.dataset.upTab,onSelect:(key,focus)=>{root.dataset.upTab=key;drawerView.key=key;drawerApply();body.scrollTop=0;if(focus)drawerNav.querySelector('[data-drawer-tab="'+key+'"]').focus({preventScroll:true})}};
};
