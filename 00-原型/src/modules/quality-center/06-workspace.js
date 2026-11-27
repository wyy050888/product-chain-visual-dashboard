const qcModules=[
 ['risk','风险预警'],['ai','AI 总诊断'],['management','人员管理'],['new','新品专项'],['projects','项目进度'],
 ['cost-benefit','成本收益'],['lifecycle','产品生命周期'],['matrix','关键产品'],['cost','降本增效']
];
const qcSharedIds=qcModules.map(([key])=>key).filter(key=>pcSharedNodes.has(key));
let qcMounted=false,qcDiagnosisState;

function qcIsActive(){return dpState.view==='quality'&&qcMounted}

function qcTabKeys(event,activate=true){
 const tab=event.target.closest('[role="tab"]');
 if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const tabs=[...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
 const index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 event.preventDefault();
 const id=tabs[next].id;if(activate)tabs[next].click();document.getElementById(id)?.focus({preventScroll:true});
}

function qcMountWorkspace(){
 const access=qcResolveAccess();
 if(qcMounted&&JSON.stringify(access)!==JSON.stringify(qcAccess)){
  while(!$('#overlay').hidden)closeModal();
  document.querySelector('.pc-weekly-dialog[open]')?.close();
  qcRestoreWorkspace();
 }
 if(!qcMounted){
  if(pcMounted)pcRestoreModules();
  qcDiagnosisState={filters:gdState.filters,pages:gdState.pages,part:gdState.part};gdState.filters={};gdState.pages={};
  qcAccess=access;
  const visible=qcModules.filter(([key])=>qcModulePermissions[key].some(id=>access.modules.includes(id)));
  const root=document.createElement('div');root.id='quality-department';root.className='qc-workspace';
  root.setAttribute('aria-label','品质中心看板');
  const roles=qcRoles.filter(([key])=>access.modules.includes('board-'+key));
  const primary=visible.length?['director','总监']:roles[0];
  const directorSelected=primary?.[0]==='director';
  const roleButton=([key,label])=>`<button type="button" role="tab" id="qc-board-tab-${key}" data-qc-board="${key}" aria-controls="qc-board-${key}" aria-selected="${key===primary?.[0]}" tabindex="${key===primary?.[0]?0:-1}">${esc(label)}</button>`;
  root.innerHTML=`<div class="navigation-toolbar qc-navigation-toolbar">
   <div class="navigation-actions qc-board-selector" ${primary?'':'hidden'}><button type="button" class="btn navigation-action ui-icon-label" data-qc-board-switch aria-label="切换品质中心看板，当前${esc(primary?.[1]||'')}" aria-haspopup="dialog" aria-expanded="false" aria-controls="qc-board-picker" popovertarget="qc-board-picker"><span>${esc(primary?.[1]||'')}</span><i class="ui-dropdown-icon" aria-hidden="true"></i></button>
   <div id="qc-board-picker" class="pc-weekly-menu qc-board-menu" role="dialog" aria-label="切换品质中心看板" popover="auto"><div role="tablist" aria-label="品质中心看板">${directorSelected?roleButton(primary):''}${roles.length?`<div class="qc-role-group" role="group" aria-label="岗位看板"><span>岗位看板</span>${roles.map(roleButton).join('')}</div>`:''}</div></div></div>
   <nav class="jumpnav" aria-label="品质中心模块导航" ${directorSelected?'':'hidden'}>${visible.map(([key,label])=>`<a href="#qc-${key}">${label}</a>`).join('')}</nav></div>
   <div id="qc-board-director" class="page qc-director-panel" role="tabpanel" aria-labelledby="qc-board-tab-director" ${directorSelected?'':'hidden'}></div>
   ${roles.map(([key])=>`<div class="qc-empty-board" id="qc-board-${key}" role="tabpanel" aria-labelledby="qc-board-tab-${key}" ${key===primary?.[0]?'':'hidden'}></div>`).join('')}
   ${primary?'':'<div class="empty">暂无品质中心看板权限</div>'}`;
  qualityEntryView=root;qcMounted=true;dpState.view='quality';
  const director=root.querySelector('#qc-board-director');
  const enabled=new Set(visible.map(([key])=>key));
  const people=enabled.has('management')?qcCreatePeopleSection():null,cost=enabled.has('cost-benefit')?qcCreateCostSection():null;
  const sections=new Map();
  for(const [key] of qcModules){
   const section=key==='management'?people?.section:key==='cost-benefit'?cost:pcSharedNodes.get(key).node;
   if(!section)continue;
   section.hidden=!enabled.has(key);director.append(section);
   if(section.hidden)continue;
   if(section.id!=='qc-'+key){const anchor=document.createElement('span');anchor.id='qc-'+key;anchor.setAttribute('aria-hidden','true');director.append(anchor)}
   sections.set(key,section);director.append(section);
  }
  dpMain.append(root);
  const toolbar=root.querySelector('.qc-navigation-toolbar');
  toolbar.append(brcEntry,navigationActions);
  dpState.view='quality';
  $('#ai .sectionhead h2').textContent='品质中心 AI 总诊断';
  $('#risk .sectionhead h2').firstChild.textContent='品质部高危预警榜单';
  const roleTrigger=root.querySelector('[data-qc-board-switch]'),roleMenu=root.querySelector('#qc-board-picker'),navigation=root.querySelector('.jumpnav');
  roleMenu.addEventListener('toggle',()=>{
   const open=roleMenu.matches(':popover-open');roleTrigger.setAttribute('aria-expanded',String(open));
   if(open){pcWeeklyPlaceMenu(roleMenu,roleTrigger,'start');roleMenu.querySelector('[aria-selected="true"]').focus({preventScroll:true})}
  });
  root.addEventListener('click',event=>{
   const tab=event.target.closest('[data-qc-board]');
   if(tab){
    for(const button of roleMenu.querySelectorAll('[data-qc-board]')){
     pcSetPersonnelTab(button,button===tab);
     document.getElementById(button.getAttribute('aria-controls')).hidden=button!==tab;
    }
    navigation.hidden=tab.dataset.qcBoard!=='director';
    const label=tab.textContent.trim();roleTrigger.firstElementChild.textContent=label;
    roleTrigger.setAttribute('aria-label','切换品质中心看板，当前'+label);
    roleMenu.hidePopover();roleTrigger.focus({preventScroll:true});
    return;
   }
   const link=event.target.closest('.qc-navigation-toolbar a');
   if(link){
    event.preventDefault();
    const section=sections.get(link.hash.slice(4)),toolbar=link.closest('.qc-navigation-toolbar');
    window.scrollTo({top:Math.max(0,scrollY+section.getBoundingClientRect().top-sectionStickyOffset(toolbar)-16),behavior:'instant'});
    qcMarkModule(root,link.hash);
   }
  });
  roleMenu.addEventListener('keydown',event=>{if(event.target.closest('[data-qc-board]'))qcTabKeys(event,false)});
  qcNavigationObserver.disconnect();qcNavigationObserver.observe(toolbar);if(people)qcNavigationObserver.observe(people.section);
  root.qcSections=sections;
  qcMarkModule(root,'#qc-'+visible[0]?.[0]);
  people?.paint();
  if(visible.length)renderAll(qcSharedIds.filter(key=>enabled.has(key)));
 }
 for(const node of dpMain.children)node.hidden=node!==qualityEntryView;
 dpState.view='quality';
 dpNavButtons.forEach((button,index)=>{
  button.classList.toggle('active',index===3);
  if(index===3)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 });
}

function qcRestoreWorkspace(){
 if(!qcMounted)return false;
 qcNavigationObserver.disconnect();
 navigationToolbar.append(brcEntry,navigationActions);
 for(const key of qcSharedIds){
  const {node,home}=pcSharedNodes.get(key);node.hidden=false;home.after(node);
 }
 $('#ai .sectionhead h2').textContent='全局 AI 总诊断';
 $('#risk .sectionhead h2').firstChild.textContent='全局高危预警';
 Object.assign(gdState,qcDiagnosisState);
 qualityEntryView.remove();qualityEntryView=null;qcMounted=false;
 return true;
}

function qcMarkModule(root,hash){
 for(const link of root.querySelectorAll('.qc-navigation-toolbar a')){
  const active=link.hash===hash;
  link.classList.toggle('is-current',active);
  if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
 }
}

function qcQueueNavigation(){
 const root=qualityEntryView,toolbar=qcIsActive()?root.querySelector('.qc-navigation-toolbar'):null;
 if(!toolbar?.checkVisibility())return;
 dashboardQueueLayout(toolbar,()=>{
  const offset=sectionStickyOffset(toolbar),stickyTop=offset+'px';
  const people=root.qcSections.get('management');
  const updateMetricHeader=people&&qcMeasureMetricHeader(people,offset);
  const bottom=toolbar.getBoundingClientRect().bottom+36;
  let current=root.qcSections.keys().next().value;for(const [key,section] of root.qcSections){
   if(section.getBoundingClientRect().top<=bottom)current=key;
  }
  return ()=>{
   if(root.style.getPropertyValue('--module-sticky-top')!==stickyTop)root.style.setProperty('--module-sticky-top',stickyTop);
   updateMetricHeader?.();
   if(!toolbar.querySelector('.jumpnav').hidden)qcMarkModule(root,'#qc-'+current);
   const menu=root.querySelector('#qc-board-picker:popover-open');
   if(menu)pcWeeklyPlaceMenu(menu,root.querySelector('[data-qc-board-switch]'),'start');
  };
 });
}
const qcNavigationObserver=new ResizeObserver(qcQueueNavigation);
window.addEventListener('scroll',qcQueueNavigation,{passive:true});
window.addEventListener('resize',qcQueueNavigation);
document.addEventListener('fullscreenchange',qcQueueNavigation);
window.addEventListener('storage',event=>{
 if(qcIsActive()&&!smActiveRoute&&[rmStorageKey,smChainMembershipKey].includes(event.key))qcMountWorkspace();
});
