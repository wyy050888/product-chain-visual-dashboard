
// The hidden global picker no longer controls the visible experience.
for(const id of moduleIds.filter(id=>id!=='ai'))localPeriods[id]=copyPeriod(['matrix','new'].includes(id)?periodFor(id):globalPeriod);
// Sticky section navigation and scroll-aware selected state.
const navigationToolbar=document.createElement('div');navigationToolbar.className='navigation-toolbar';$('.jumpnav').before(navigationToolbar);navigationToolbar.append($('.jumpnav'));
const navigationActions=document.createElement('div');navigationActions.className='navigation-actions';navigationActions.append($('#rules'));navigationToolbar.append(navigationActions);





const jumpNavigation=$('.jumpnav'),jumpLinks=[...jumpNavigation.querySelectorAll('a')];
function measureNavigation(){
 const top=navigationToolbar.getBoundingClientRect().bottom+20;let current=moduleIds[0];
 for(const id of moduleIds){if($('#'+id).getBoundingClientRect().top<=top+1)current=id;else break}
 // 末模块不足一屏时，页面到底也无法把标题滚到导航下；此时仍应选中末模块。
 const last=$('#'+moduleIds.at(-1));
 if(!last.hidden&&scrollY+innerHeight>=document.documentElement.scrollHeight-1&&last.getBoundingClientRect().top<innerHeight)current=last.id;
 // 先完成几何读取，再修改选中样式，避免同次导航更新内强制重新布局。
 const selected=jumpLinks.find(link=>link.hash==='#'+current),a=selected?.getBoundingClientRect(),n=jumpNavigation.getBoundingClientRect();
 const nextScroll=a&&(a.left<n.left||a.right>n.right)?jumpNavigation.scrollLeft+a.left-n.left-12:null;
 return ()=>{for(const link of jumpLinks){
  const active=link===selected;
  if(link.classList.contains('is-current')!==active)link.classList.toggle('is-current',active);
  if(active){if(link.getAttribute('aria-current')!=='location')link.setAttribute('aria-current','location')}
  else if(link.hasAttribute('aria-current'))link.removeAttribute('aria-current');
 }
 if(nextScroll!==null)jumpNavigation.scrollLeft=nextScroll;};
}
function updateNavigation(){measureNavigation()()}
// 全局Tab直接到达目标模块；保留原生锚点历史及修饰键打开链接的行为。
jumpNavigation.addEventListener('click',event=>{
 const link=event.target.closest('a');
 if(!link||!jumpLinks.includes(link)||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const section=document.getElementById(link.hash.slice(1));if(!section)return;
 event.preventDefault();
 if(location.hash!==link.hash)location.hash=link.hash;
 section.scrollIntoView({block:'start',behavior:'instant'});updateNavigation();
});
function queueNavigation(){dashboardQueueLayout(jumpNavigation,measureNavigation)}
window.addEventListener('scroll',queueNavigation,{passive:true});
function measureNavigationOffset(){
 const offset=(navigationToolbar.offsetHeight+$('.head').offsetHeight+18)+'px';
 if(document.documentElement.style.getPropertyValue('--dashboard-anchor-offset')!==offset)return ()=>document.documentElement.style.setProperty('--dashboard-anchor-offset',offset);
}
const navigationLayoutObserver=new ResizeObserver(()=>{
 dashboardQueueLayout(navigationToolbar,measureNavigationOffset);queueNavigation();
});
for(const element of [navigationToolbar,$('.head')])navigationLayoutObserver.observe(element);
queueNavigation();
// 业务跳转说明统一点击展示toast，避免与指标说明浮层混淆。
document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-jump-toast]');if(!trigger)return;
 event.preventDefault();hideMetricTooltip();toast(trigger.dataset.jumpToast);
});
