// 共用后台菜单与路由；业务页面只登记内容和进入时的渲染，不互相覆盖导航。
const smPages=new Map(),smHost=document.createElement('main');
smHost.id='lt-system';smHost.hidden=true;smHost.setAttribute('aria-label','系统管理');
smHost.innerHTML='<aside class="lt-sidebar" aria-label="系统管理菜单"></aside><section class="lt-content" id="sm-content"></section>';
$('main.page').after(smHost);
let smActiveRoute='',smNavigationBypass=false;
function smRenderMenu(){
 const groups=[...new Set([...smPages.values()].map(page=>page.group))];
 smHost.querySelector('.lt-sidebar').innerHTML=groups.map(group=>{const pages=[...smPages.values()].filter(page=>page.group===group).sort((a,b)=>(a.menuOrder??100)-(b.menuOrder??100));if(pages.length===1&&pages[0].menuRoot){const page=pages[0];return `<a class="lt-menu-root" href="${page.route}" data-system-route="${page.route}" ${smActiveRoute===page.route?'aria-current="page"':''}>${esc(page.title)}</a>`}return `<details class="lt-menu-group" open><summary>${esc(group)}<span aria-hidden="true">⌃</span></summary>${pages.map(page=>`<a href="${page.external||page.route}" ${page.external?'target="_blank" rel="noopener"':`data-system-route="${page.route}"`} ${smActiveRoute===page.route?'aria-current="page"':''}>${esc(page.title)}</a>`).join('')}</details>`}).join('');
}
function smRegisterPage(page){
 const pane=document.createElement('section');pane.id=page.id;pane.hidden=true;pane.innerHTML=page.markup;
 smPages.set(page.route,{...page,pane});$('#sm-content').append(pane);smRenderMenu();return pane;
}
function smShowPage(route){
 const page=smPages.get(route);if(!page)return;
 while(!$('#overlay').hidden)closeModal();closeChainMenu();
 smActiveRoute=route;document.body.classList.add('lt-system-active');smHost.hidden=false;
 for(const entry of smPages.values())entry.pane.hidden=entry.route!==route;
 $('#lt-system-nav').setAttribute('aria-current','page');smRenderMenu();page.onShow();window.scrollTo({top:0,behavior:'instant'});
}
function smHidePage(){smActiveRoute='';smHost.hidden=true;document.body.classList.remove('lt-system-active');$('#lt-system-nav').removeAttribute('aria-current')}
function smRestoreView(destination){
 if(destination==='#procurement'||destination.startsWith('#pb-'))pbSwitchView(false);
 else if(destination==='#department'||destination.startsWith('#dp-'))dpSwitchView('department',false);
 else{
  const key=['project','research'].find(k=>destination==='#'+dwProfiles[k].route||destination.startsWith('#'+dwProfiles[k].route+'-'));
  if(key){const module=destination.slice(dwProfiles[key].route.length+2);dwOpen(key,false,dxModuleOrder.includes(module)?module:null)}
  else{dpSwitchView('director',false);renderLife()}
 }
 requestAnimationFrame(()=>document.getElementById(destination.slice(1))?.scrollIntoView({block:'start',behavior:'instant'}));
}
function smSyncRoute(){
 if(smPages.has(location.hash)){if(smActiveRoute!==location.hash)smShowPage(location.hash);return}
 if(!smActiveRoute)return;
 const destination=location.hash||'#dashboard';smHidePage();smRestoreView(destination);
}
function smNavigate(route){history.pushState(null,'',route);smSyncRoute()}
$('#lt-system-nav').onclick=()=>{if(!smActiveRoute)smNavigate(smPages.keys().next().value)};
window.addEventListener('hashchange',smSyncRoute);window.addEventListener('popstate',smSyncRoute);
document.addEventListener('click',e=>{
 const link=e.target.closest('#lt-system [data-system-route]');if(link){e.preventDefault();smNavigate(link.dataset.systemRoute);return}
 const target=e.target.closest('.head .brand,.head .chain-menu button[role="menuitem"]');
 if(!smActiveRoute||smNavigationBypass||!target||target.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();smHidePage();smNavigationBypass=true;try{target.click()}finally{smNavigationBypass=false}
},true);
requestAnimationFrame(smSyncRoute);
