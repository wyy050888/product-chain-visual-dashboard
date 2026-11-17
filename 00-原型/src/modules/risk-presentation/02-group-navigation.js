// 按首页榜单顺序定位，保留各榜筛选、数据与展开状态。
function rpNavigationBoards(){return $$('#riskrail [data-rp-board]')}
function rpGroupNavigationTop(){
 const header=$('#risk>.sectionhead'),toolbar=$('#rp-group-navigation')?.rpToolbar?.getBoundingClientRect()||navigationToolbar.getBoundingClientRect();
 return Math.max(0,toolbar.bottom)+header.getBoundingClientRect().height+12;
}
function rpSetCurrentBoard(nav,kind){
 for(const button of nav.querySelectorAll('button')){
  const active=button.dataset.rpGroupJump===kind;
  if(button.classList.contains('is-current')!==active)button.classList.toggle('is-current',active);
  if(active){if(button.getAttribute('aria-current')!=='location')button.setAttribute('aria-current','location')}
  else if(button.hasAttribute('aria-current'))button.removeAttribute('aria-current');
 }
}
function rpUpdateGroupNavigation(){
 const nav=$('#rp-group-navigation');if(!nav)return;
 const boards=nav.rpTargets(),top=rpGroupNavigationTop();
 const selected=nav.querySelector('[aria-current="location"]')?.dataset.rpGroupJump;
 let current=boards[0]?.key,currentTop=-Infinity;
 for(const board of boards){
  const boardTop=board.node.getBoundingClientRect().top,kind=board.key;
  if(boardTop>top+1)break;
  // 同排的库存榜共享纵向位置，保留用户点选的榜单。
  if(boardTop>currentTop+1||kind===selected){current=kind;currentTop=boardTop}
 }
 return ()=>rpSetCurrentBoard(nav,current);
}
function rpQueueGroupNavigation(){
 const nav=$('#rp-group-navigation');if(nav)dashboardQueueLayout(nav,rpUpdateGroupNavigation);
}
function rpMountGroupNavigation(targets=()=>rpNavigationBoards().map(node=>({node,key:node.dataset.rpBoard,label:rpRankingTabLabel(node.dataset.rpBoard)})),toolbar=navigationToolbar){
 let nav=$('#rp-group-navigation');
 if(!nav){
  nav=document.createElement('nav');nav.id='rp-group-navigation';nav.className='rp-group-navigation';nav.setAttribute('aria-label','风险榜快速定位');
  $('#risk>.sectionhead .titlegroup').append(nav);
  nav.addEventListener('click',event=>{
   const button=event.target.closest('[data-rp-group-jump]');if(!button)return;
   const kind=button.dataset.rpGroupJump,target=nav.rpTargets().find(board=>board.key===kind)?.node;if(!target)return;
   rpSetCurrentBoard(nav,kind);
   window.scrollTo({top:Math.max(0,scrollY+target.getBoundingClientRect().top-rpGroupNavigationTop()),behavior:'instant'});
   rpQueueGroupNavigation();
  });
  new ResizeObserver(rpQueueGroupNavigation).observe($('#risk>.sectionhead'));
 }
 nav.rpTargets=targets;nav.rpToolbar=toolbar;
 const items=targets().map(({key,label})=>[key,label]),signature=JSON.stringify(items);
 if(nav.rpSignature!==signature){
  nav.rpSignature=signature;
  nav.innerHTML=items.map(([key,label])=>`<button type="button" data-rp-group-jump="${esc(key)}">${esc(label)}</button>`).join('');
 }
 rpQueueGroupNavigation();
}
window.addEventListener('scroll',rpQueueGroupNavigation,{passive:true});
window.addEventListener('resize',rpQueueGroupNavigation,{passive:true});
