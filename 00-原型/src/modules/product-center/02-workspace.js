// 相同模块移动原DOM，保留ID、监听器及所有当前版本的筛选/抽屉，不复制旧模板。
const pcSharedIds=['risk','ai','sales','new','projects','lifecycle','matrix','inventory'];
let pcRenderedRole='',pcDirectorNeedsRender=false;
const pcSharedNodes=new Map(pcSharedIds.map(id=>{
 const node=$('#'+id),home=document.createComment('product-center-home:'+id);node.before(home);return [id,{node,home}];
}));
const pcDepartmentRender=renderDepartment;
function pcRestoreModules(){
 for(const {node,home} of pcSharedNodes.values())home.after(node);
 pcMounted=false;dpView.classList.remove('product-center-view','page');
 $('#risk .sectionhead h2').firstChild.textContent='全局高危预警';$('#ai .sectionhead h2').textContent='全局 AI 总诊断';
 document.body.classList.remove('product-center-active','product-center-manager');pcSyncRoleControl();
}
function pcOwnSection(id,title,content){
 const section=document.createElement('section');section.id='dp-'+id;section.className='section pc-own-section';
 section.innerHTML=`<div class="sectionhead"><div class="titlegroup"><h2>${title}</h2></div><div class="module-header-time">${dpPeriodHTML(id)}</div></div><div class="dp-range">${bounds(dpP(id)).start} — ${bounds(dpP(id)).cutoff} · ${dpState.chain==='all'?'全部链群':chains[+dpState.chain]}</div>${content}`;
 return section;
}
function pcRenderWorkspace(){
 const refresh=!pcMounted||pcRenderedRole!==dpState.role;
 pcMounted=true;dpView.classList.add('page','product-center-view');document.body.classList.add('product-center-active');
 pcApplyFixedSelections(refresh);pcRenderedRole=dpState.role;
 const managementMarkup=dpWith('management',dpRenderManagement);
 // 在清空工作区前保留共用节点；原生监听器、输入状态及图表观察器均保留。
 const fragment=document.createDocumentFragment();for(const {node} of pcSharedNodes.values())fragment.append(node);
 dpView.replaceChildren();
 const navigation=document.createElement('div');navigation.className='navigation-toolbar pc-navigation-toolbar';
 navigation.innerHTML=`<nav class="jumpnav" aria-label="产品中心模块导航">${dxModuleOrder.map(id=>`<a href="#dp-${id}">${({risk:'风险预警',ai:'AI 总诊断',management:'人员管理',sales:'销售达成',new:'新品专项',projects:'项目进度',lifecycle:'产品生命周期',matrix:'关键产品',inventory:'库存管控'})[id]}</a>`).join('')}</nav>`;
 const actions=document.createElement('div');actions.className='navigation-actions';
 for(const original of navigationActions.children){
  if(getComputedStyle(original).display==='none')continue;
  const copy=original.cloneNode(true);copy.removeAttribute('id');copy.dataset.pcAction=original.id;copy.onclick=()=>original.click();actions.append(copy);
 }
 const rules=brcEntry.cloneNode(true);rules.removeAttribute('id');rules.onclick=()=>brcEntry.click();
 navigation.append(rules,actions);dpView.append(navigation);
 for(const id of dxModuleOrder){
  if(id==='management')dpView.append(pcOwnSection('management','产品中心人员管理',managementMarkup));
  else{
   const alias=document.createElement('span');alias.id='dp-'+id;alias.className='pc-module-anchor';alias.setAttribute('aria-hidden','true');
   const {node}=pcSharedNodes.get(id);node.hidden=false;dpView.append(alias,node);
  }
 }
 $('#ai .sectionhead h2').textContent='产品中心 AI 总诊断';
 $('#risk .sectionhead h2').firstChild.textContent='产品中心高危预警';
 if(refresh){pcDirectorNeedsRender=true;renderAll(moduleIds.filter(id=>pcSharedNodes.has(id)))}
 pcTrimScopedModules();pcSyncRoleControl();pcQueueNavigation();
}
renderDepartment=function(){
 if(dwActive!=='product'){if(pcMounted)pcRestoreModules();return pcDepartmentRender()}
 pcRenderWorkspace();dpView.dataset.department='product';dpView.setAttribute('aria-label','产品中心看板');
};
function pcTrimScopedModules(){
 const chain=pcChain();
 if(chain!==null){
  $('#salescards')?.querySelectorAll('.salescard').forEach((card,index)=>{card.hidden=index!==0&&index!==chain+1});
  const heading=$('#salescards .salescard.company h3');if(heading)(heading.querySelector('[data-ms-scope]')||heading).textContent=chains[chain]+'汇总';
  // 品牌/平台模式继续使用同一链群的事实，其他链群行不可穿透展示。
  $('#lifetable')?.querySelectorAll('tbody tr').forEach(row=>{
   const name=row.cells[0]?.textContent.trim();row.hidden=chains.includes(name)&&name!==chains[chain];
  });
 }
}
const pcSwitchView=dpSwitchView;
dpSwitchView=function(view,...args){
 if(view!=='department'&&pcMounted)pcRestoreModules();
 const result=pcSwitchView(view,...args);
 // 身份切回总看板后再补齐此前未渲染的模块。
 if(view==='director'&&pcDirectorNeedsRender){pcDirectorNeedsRender=false;renderAll()}
 return result;
};

// 共用模块日期使用原处理器；专属模块日期保留原部门状态。
const pcRenderLife=renderLife;
renderLife=function(...args){const result=pcRenderLife(...args);if(pcIsActive())pcTrimScopedModules();return result};
function pcMeasureNavigation(){
  if(!pcIsActive())return;
  const toolbar=dpView.querySelector('.pc-navigation-toolbar'),top=toolbar.getBoundingClientRect().bottom+20;
  const offset=(toolbar.offsetHeight+$('.head').offsetHeight+18)+'px';
  let current='risk';for(const id of dxModuleOrder){const node=pcSharedNodes.get(id)?.node||$('#dp-'+id);if(node.getBoundingClientRect().top<=top+1)current=id;else break}
  const nav=toolbar.querySelector('.jumpnav'),selected=nav.querySelector('a[href="#dp-'+current+'"]'),item=selected.getBoundingClientRect(),viewport=nav.getBoundingClientRect();
  const scroll=item.left<viewport.left?nav.scrollLeft+item.left-viewport.left-8:item.right>viewport.right?nav.scrollLeft+item.right-viewport.right+8:null;
  return ()=>{
  if(dpView.style.getPropertyValue('--dashboard-anchor-offset')!==offset)dpView.style.setProperty('--dashboard-anchor-offset',offset);
  for(const link of toolbar.querySelectorAll('.jumpnav a')){
   const active=link.hash==='#dp-'+current;
   if(link.classList.contains('is-current')!==active)link.classList.toggle('is-current',active);
   if(active){if(link.getAttribute('aria-current')!=='location')link.setAttribute('aria-current','location')}
   else if(link.hasAttribute('aria-current'))link.removeAttribute('aria-current');
  }
  if(scroll!==null)nav.scrollLeft=scroll;
  };
}
function pcQueueNavigation(){
 if(pcIsActive())dashboardQueueLayout(dpView,pcMeasureNavigation);
}
function pcScrollToModule(id){
 const node=pcSharedNodes.get(id)?.node||document.getElementById('dp-'+id),toolbar=dpView.querySelector('.pc-navigation-toolbar');
 if(!node||!toolbar)return;
 // 只扣一次导航高度，避免scroll-padding与scroll-margin叠加后仍高亮上一模块。
 window.scrollTo({top:Math.max(0,scrollY+node.getBoundingClientRect().top-toolbar.getBoundingClientRect().bottom-18),behavior:'instant'});
 pcQueueNavigation();
}
window.addEventListener('scroll',pcQueueNavigation,{passive:true});window.addEventListener('resize',pcQueueNavigation);
document.addEventListener('fullscreenchange',()=>{
 pcQueueNavigation();
 for(const copy of dpView.querySelectorAll('[data-pc-action]')){
  const original=document.getElementById(copy.dataset.pcAction);if(!original)continue;
  copy.innerHTML=original.innerHTML;for(const attr of ['aria-label','aria-pressed'])if(original.hasAttribute(attr))copy.setAttribute(attr,original.getAttribute(attr));
 }
});
document.addEventListener('click',event=>{
 const link=event.target.closest('.pc-navigation-toolbar .jumpnav a');if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 event.preventDefault();if(location.hash!==link.hash)history.pushState(null,'',link.hash);
 pcScrollToModule(link.hash.slice(4));
});
