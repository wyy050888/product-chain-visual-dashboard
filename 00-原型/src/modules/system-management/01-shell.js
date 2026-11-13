// 共用后台菜单与路由；业务页面只登记内容和进入时的渲染，不互相覆盖导航。
const smPages=new Map(),smHost=document.createElement('main');
smHost.id='lt-system';smHost.hidden=true;smHost.setAttribute('aria-label','系统管理');
smHost.innerHTML='<aside class="lt-sidebar" aria-label="系统管理菜单"></aside><section class="lt-content" id="sm-content"></section>';
$('main.page').after(smHost);
let smActiveRoute='',smNavigationBypass=false;
// 后台数据操作共用图标按钮，业务通过原有属性绑定事件。
function smDataAction(kind,label,attributes=''){
 const path=kind==='import'?'M8 11V2m-3 3 3-3 3 3':'M8 2v9m-3-3 3 3 3-3';
 return `<button type="button" class="sm-data-action sm-data-${kind}" ${attributes}><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${path}M2 10v4h12v-4"/></svg><span>${esc(label)}</span></button>`;
}
// 固定菜单结构与页面注册分离；无本地页面的原有菜单仅置灰展示。
const smMenuGroups=[
 ['业务配置',[
  ['规则配置','business-rule-page'],['供应商导入','ssi-page'],['核心链接导入','klc-page'],['产品分类']
 ]],
 ['目标管理',[
  ['生命周期目标','lt-target-page'],['降本增效','cec-page'],['供应商目标','st-target-page']
 ]],
 ['权限管理',[['用户管理'],['角色管理'],['人员配置'],['白名单']]],
 ['系统配置',[['菜单管理'],['字典管理']]],
 ['系统运维',[['用户操作日志'],['登录日志'],['定时任务']]]
];
function smRenderMenu(){
 const pagesById=new Map([...smPages.values()].map(page=>[page.id,page]));
 const itemMarkup=([label,id])=>{
  const page=pagesById.get(id);
  if(!page)return `<span class="lt-menu-disabled" role="link" aria-disabled="true">${esc(label)}</span>`;
  const action=page.external?'target="_blank" rel="noopener"':`data-system-route="${page.route}"`;
  const current=smActiveRoute===page.route?'aria-current="page"':'';
  return `<a href="${page.external||page.route}" ${action} ${current}>${esc(label)}</a>`;
 };
 smHost.querySelector('.lt-sidebar').innerHTML=smMenuGroups.map(([group,items])=>
  `<details class="lt-menu-group" ${['业务配置','目标管理'].includes(group)?'open':''}><summary>${esc(group)}<span aria-hidden="true">⌃</span></summary>${items.map(itemMarkup).join('')}</details>`
 ).join('');
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
 $('#lt-system-nav').setAttribute('aria-current','page');smRenderMenu();page.onShow();$('#sm-content').scrollTo({top:0,left:0,behavior:'instant'});window.scrollTo({top:0,behavior:'instant'});
}
function smHidePage(){smActiveRoute='';smHost.hidden=true;document.body.classList.remove('lt-system-active');$('#lt-system-nav').removeAttribute('aria-current')}
function smRestoreView(destination,refreshLifecycle=true){
 if(qualityEntryView)qualityEntryView.hidden=true;
 if(destination==='#quality-department')showQualityEntry();
 else if(destination==='#procurement'||destination.startsWith('#pb-'))pbSwitchView(false);
 else if(destination==='#department'||destination.startsWith('#dp-'))dpSwitchView('department',false);
 else{
  const key=['project','research'].find(k=>destination==='#'+dwProfiles[k].route||destination.startsWith('#'+dwProfiles[k].route+'-'));
  if(key){const module=destination.slice(dwProfiles[key].route.length+2);dwOpen(key,false,dxModuleOrder.includes(module)?module:null)}
  else{dpSwitchView('director',false);if(refreshLifecycle)renderLife()}
 }
 requestAnimationFrame(()=>{
  if(pcIsActive()&&destination.startsWith('#dp-'))pcScrollToModule(destination.slice(4));
  else document.getElementById(destination.slice(1))?.scrollIntoView({block:'start',behavior:'instant'});
 });
}
function smSyncRoute(){
 if(smPages.has(location.hash)){if(smActiveRoute!==location.hash)smShowPage(location.hash);return}
 if(!smActiveRoute)return;
 const destination=location.hash||dashboardEntryRoutes[dashboardEntryView];smHidePage();smRestoreView(destination);
}
function smNavigate(route){history.pushState(null,'',route);smSyncRoute()}
$('#lt-system-nav').onclick=()=>{if(smActiveRoute!=='#system-business-rules')smNavigate('#system-business-rules')};
window.addEventListener('hashchange',smSyncRoute);window.addEventListener('popstate',smSyncRoute);
document.addEventListener('click',e=>{
 const link=e.target.closest('#lt-system [data-system-route]');if(link){e.preventDefault();smNavigate(link.dataset.systemRoute);return}
 const target=e.target.closest('.head .brand,.head .chain-menu button[role="menuitem"]');
 if(!smActiveRoute||smNavigationBypass||!target||target.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();smHidePage();smNavigationBypass=true;try{target.click()}finally{smNavigationBypass=false}
},true);
requestAnimationFrame(smSyncRoute);
