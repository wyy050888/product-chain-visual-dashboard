const ltRouteHash='#system-lifecycle-targets';
const ltPage=document.createElement('main');ltPage.id='lt-system';ltPage.hidden=true;ltPage.setAttribute('aria-label','系统管理 · 生命周期目标配置');
ltPage.innerHTML=`<aside class="lt-sidebar"><h2>系统管理</h2><div class="lt-menu-group">目标管理</div><a href="${ltRouteHash}" aria-current="page">生命周期目标</a></aside>
 <section class="lt-content"><div class="lt-breadcrumb">系统管理 <span>/</span> 目标管理 <span>/</span> 生命周期目标</div>
 <div class="lt-page-head"><div><h1>生命周期目标配置</h1><span id="lt-updated"></span></div><div class="lt-actions"><span id="lt-dirty" role="status"></span><button type="button" class="btn" id="lt-return">返回看板</button><button type="button" class="btn" id="lt-discard" disabled>撤销更改</button><button type="button" class="btn primary" id="lt-save" disabled>保存目标</button></div></div>
 <section class="lt-panel"><div class="lt-toolbar"><label>年度 <select id="lt-year" aria-label="目标年度">${[2025,2026,2027].map(y=>`<option value="${y}">${y}年</option>`).join('')}</select></label><div id="lt-view" role="group" aria-label="目标视图">${[['quarter','季度配置'],['month','月度拆分'],['annual','年度汇总']].map(([key,name])=>`<button type="button" data-lt-view="${key}">${name}</button>`).join('')}</div><span class="lt-unit">单位：项</span></div>
 <div id="lt-categories" role="tablist" aria-label="目标类目"></div><div id="lt-error" role="alert"></div><div id="lt-table" tabindex="0" aria-label="生命周期目标表，可横向滚动"></div></section></section>`;
$('main.page').after(ltPage);
$('#lifecycle .titlegroup').insertAdjacentHTML('afterend','<button type="button" class="btn" id="lt-open-targets">配置目标</button>');
let ltPageOpen=false,ltNavigationBypass=false;
function ltShowPage(){
 closeModal();$('#chain-menu').hidden=true;$('#chain-menu-trigger').setAttribute('aria-expanded','false');
 ltPageOpen=true;document.body.classList.add('lt-system-active');ltPage.hidden=false;
 $('#lt-system-nav').setAttribute('aria-current','page');
 ltEditor.year=ltEditor.dirty.size?ltEditor.year:periodFor('lifecycle').year;
 ltRenderPage();window.scrollTo({top:0,behavior:'instant'});
}
function ltHidePage(){
 ltPageOpen=false;ltPage.hidden=true;document.body.classList.remove('lt-system-active');$('#lt-system-nav').removeAttribute('aria-current');
}
function ltNavigate(hash){history.pushState(null,'',hash);ltSyncRoute()}
function ltConfirmLeave(action){
 if(!ltEditor.dirty.size){action();return}
 openModal('未保存的目标','<p class="lt-leave-message">是否保存本次目标修改？</p>');
 $('#dialogactions').innerHTML='<button type="button" class="btn" id="lt-stay">继续编辑</button><button type="button" class="btn" id="lt-leave-discard">放弃并离开</button><button type="button" class="btn primary" id="lt-leave-save">保存并离开</button>';
 $('#lt-stay').onclick=closeModal;
 $('#lt-leave-discard').onclick=()=>{ltDiscard();closeModal();action()};
 $('#lt-leave-save').onclick=()=>{closeModal();if(ltSave())action()};
}
function ltBackToDashboard(){
 ltConfirmLeave(()=>{ltHidePage();dpSwitchView('director',false);renderLife();ltNavigate('#lifecycle');requestAnimationFrame(()=>$('#lifecycle').scrollIntoView({block:'start',behavior:'instant'}))});
}
function ltRestoreView(destination){
 if(destination==='#procurement'||destination.startsWith('#pb-'))pbSwitchView(false);
 else if(destination==='#department'||destination.startsWith('#dp-'))dpSwitchView('department',false);
 else{
  const key=['project','research'].find(k=>destination==='#'+dwProfiles[k].route||destination.startsWith('#'+dwProfiles[k].route+'-'));
  if(key){const module=destination.slice(dwProfiles[key].route.length+2);dwOpen(key,false,dxModuleOrder.includes(module)?module:null)}
  else{dpSwitchView('director',false);renderLife()}
 }
 requestAnimationFrame(()=>document.getElementById(destination.slice(1))?.scrollIntoView({block:'start',behavior:'instant'}));
}
function ltSyncRoute(){
 if(location.hash===ltRouteHash){if(!ltPageOpen)ltShowPage();return}
 if(!ltPageOpen)return;
 const destination=location.hash||'#dashboard';
 // 浏览器后退也保留未保存修改的处理入口。
 if(ltEditor.dirty.size){history.replaceState(null,'',ltRouteHash);ltConfirmLeave(()=>{ltHidePage();history.pushState(null,'',destination);ltRestoreView(destination)});return}
 ltHidePage();ltRestoreView(destination);
}
$('#lt-open-targets').onclick=$('#lt-system-nav').onclick=()=>{if(!ltPageOpen)ltNavigate(ltRouteHash)};
$('#lt-return').onclick=ltBackToDashboard;
$('#lt-save').onclick=ltSave;
$('#lt-discard').onclick=()=>{ltDiscard();ltRenderPage()};
window.addEventListener('hashchange',ltSyncRoute);window.addEventListener('popstate',ltSyncRoute);
window.addEventListener('beforeunload',e=>{if(ltEditor.dirty.size){e.preventDefault();e.returnValue=''}});
// 兼容现有看板菜单的replaceState导航，不重写其他工作台的路由。
document.addEventListener('click',e=>{
 const target=e.target.closest('.head .brand,.head .chain-menu button[role="menuitem"]');
 if(!ltPageOpen||ltNavigationBypass||!target||target.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();
 ltConfirmLeave(()=>{ltHidePage();ltNavigationBypass=true;try{target.click()}finally{ltNavigationBypass=false}});
},true);
window.lifecycleTargetsAudit=()=>({pageOpen:ltPageOpen,year:ltEditor.year,category:ltEditor.category,view:ltEditor.view,dirty:[...ltEditor.dirty],saved:ltClone(ltStore),drafts:ltClone(ltEditor.drafts),monthly:Array.from({length:12},(_,m)=>ltMonthValue(ltDraft()[ltEditor.category][0][Math.floor(m/3)],m+1)),legacyActuals:withPeriod('lifecycle',()=>Array.from({length:8},(_,stage)=>lifeSumRows(lifeChannelRows(stage))).map(d=>[d.actual,d.yearActual])),dashboard:withPeriod('lifecycle',()=>ltPlans.filter((p,i,a)=>a.findIndex(x=>x.stage===p.stage)===i).map(p=>ltDashboardTotals(p.stage)))});
requestAnimationFrame(ltSyncRoute);
