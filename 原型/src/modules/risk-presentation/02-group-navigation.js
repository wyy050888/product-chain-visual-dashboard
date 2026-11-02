// 三个分区只滚动定位，保留各榜筛选、数据与展开状态。
const rpGroupDestinations=[
 ['quality','品质风险榜','#riskrail>.rp-board-group-quality'],
 ['inventory','库存风险榜','#riskrail>.rp-board-group-inventory'],
 ['loss','亏损产品榜','#riskrail>.rp-loss-wide']
];
let rpGroupNavigationFrame=0;
function rpGroupNavigationTop(){
 const header=$('#risk>.sectionhead'),toolbar=navigationToolbar.getBoundingClientRect();
 return Math.max(0,toolbar.bottom)+header.getBoundingClientRect().height+12;
}
function rpUpdateGroupNavigation(){
 const nav=$('#rp-group-navigation');if(!nav)return;
 const top=rpGroupNavigationTop();let current='quality';
 for(const [key,,selector] of rpGroupDestinations){
  const target=$(selector);if(target?.getBoundingClientRect().top<=top+1)current=key;else break;
 }
 for(const button of nav.querySelectorAll('button')){
  const active=button.dataset.rpGroupJump===current;button.classList.toggle('is-current',active);
  if(active)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');
 }
}
function rpQueueGroupNavigation(){
 if(rpGroupNavigationFrame)return;
 rpGroupNavigationFrame=requestAnimationFrame(()=>{rpGroupNavigationFrame=0;rpUpdateGroupNavigation()});
}
function rpMountGroupNavigation(){
 let nav=$('#rp-group-navigation');
 if(!nav){
  nav=document.createElement('nav');nav.id='rp-group-navigation';nav.className='rp-group-navigation';nav.setAttribute('aria-label','风险榜快速定位');
  nav.innerHTML=rpGroupDestinations.map(([key,label])=>`<button type="button" data-rp-group-jump="${key}">${label}</button>`).join('');
  $('#risk>.sectionhead .titlegroup').append(nav);
  nav.addEventListener('click',event=>{
   const button=event.target.closest('[data-rp-group-jump]');if(!button)return;
   const entry=rpGroupDestinations.find(([key])=>key===button.dataset.rpGroupJump),target=$(entry[2]);if(!target)return;
   window.scrollTo({top:Math.max(0,scrollY+target.getBoundingClientRect().top-rpGroupNavigationTop()),behavior:'instant'});
   rpQueueGroupNavigation();
  });
  new ResizeObserver(rpQueueGroupNavigation).observe($('#risk>.sectionhead'));
 }
 rpQueueGroupNavigation();
}
window.addEventListener('scroll',rpQueueGroupNavigation,{passive:true});
window.addEventListener('resize',rpQueueGroupNavigation,{passive:true});
