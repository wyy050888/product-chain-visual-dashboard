// 按首页榜单顺序定位，保留各榜筛选、数据与展开状态。
function rpNavigationBoards(){return $$('#riskrail [data-rp-board]')}
function rpGroupNavigationTop(){
 const header=$('#risk>.sectionhead'),toolbar=navigationToolbar.getBoundingClientRect();
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
 const boards=rpNavigationBoards(),top=rpGroupNavigationTop();
 const selected=nav.querySelector('[aria-current="location"]')?.dataset.rpGroupJump;
 let current=boards[0]?.dataset.rpBoard,currentTop=-Infinity;
 for(const board of boards){
  const boardTop=board.getBoundingClientRect().top,kind=board.dataset.rpBoard;
  if(boardTop>top+1)break;
  // 同排的库存榜共享纵向位置，保留用户点选的榜单。
  if(boardTop>currentTop+1||kind===selected){current=kind;currentTop=boardTop}
 }
 return ()=>rpSetCurrentBoard(nav,current);
}
function rpQueueGroupNavigation(){
 const nav=$('#rp-group-navigation');if(nav)dashboardQueueLayout(nav,rpUpdateGroupNavigation);
}
function rpMountGroupNavigation(){
 let nav=$('#rp-group-navigation');
 if(!nav){
  nav=document.createElement('nav');nav.id='rp-group-navigation';nav.className='rp-group-navigation';nav.setAttribute('aria-label','风险榜快速定位');
  nav.innerHTML=rpNavigationBoards().map(({dataset:{rpBoard:kind}})=>`<button type="button" data-rp-group-jump="${kind}">${esc(rpRankingTabLabel(kind))}</button>`).join('');
  $('#risk>.sectionhead .titlegroup').append(nav);
  nav.addEventListener('click',event=>{
   const button=event.target.closest('[data-rp-group-jump]');if(!button)return;
   const kind=button.dataset.rpGroupJump,target=rpNavigationBoards().find(board=>board.dataset.rpBoard===kind);if(!target)return;
   rpSetCurrentBoard(nav,kind);
   window.scrollTo({top:Math.max(0,scrollY+target.getBoundingClientRect().top-rpGroupNavigationTop()),behavior:'instant'});
   rpQueueGroupNavigation();
  });
  new ResizeObserver(rpQueueGroupNavigation).observe($('#risk>.sectionhead'));
 }
 rpQueueGroupNavigation();
}
window.addEventListener('scroll',rpQueueGroupNavigation,{passive:true});
window.addEventListener('resize',rpQueueGroupNavigation,{passive:true});
