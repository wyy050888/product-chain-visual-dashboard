const riskRankingKinds=[0,6,8,1,4,3,2];
const riskRankingPages=new Map();
let riskRankingSwitching=false;
function rpAvailableRankingTabs(){return riskRankingKinds.map(kind=>({kind,label:rpRankingTabLabel(kind)}))}
function riskRankingTitle(){return (pcIsActive()?'产品中心风险预警':'全局高危预警')+' · 完整榜单'}
function riskRankingAttach(kind){
 const body=$('#dialogbody');
 const tab=rpAvailableRankingTabs().find(t=>t.kind===kind);
 if(!rpUsesBoardPeriods()||!tab||(!tab.open&&!body.querySelector('#qr-list-table,#rf-list-table')))return;
 body.dataset.riskRankingKind=kind;
 const dialog=$('#dialog');dialog.dataset.rdKind=kind;
 dialog.classList.add('risk-ranking-drawer');
 $('#dialogtitle').textContent=riskRankingTitle();
 if(!tab.open&&!$('#dialogsub .period-picker'))$('#dialogsub').textContent=withPeriod('risk',riskRangeText);
 drawerNav.setAttribute('aria-label','风险榜单');
 if(pcIsActive()&&!riskRankingBackground.size)dashboardQueueLayout($('#risk'),riskRankingMeasureBackground);
 drawerQueueRefresh();
}
const riskRankingBackground=new Map();
function riskRankingMeasureBackground(risk){
 if(!pcIsActive()||$('#overlay').hidden||!$('#dialog').classList.contains('risk-ranking-drawer'))return;
 const sections=risk.parentElement.querySelectorAll(':scope > .section:not(#risk)');
 const boards=risk.querySelectorAll('#riskrail [data-rp-board]');
 return dashboardMeasureOffscreen([...sections,...boards],riskRankingBackground);
}
function riskRankingResumeBackground(){
 dashboardRestoreOffscreen(riskRankingBackground);
}
new MutationObserver(()=>{if($('#overlay').hidden)riskRankingResumeBackground()})
 .observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
window.addEventListener('resize',()=>{
 if(!riskRankingBackground.size)return;
 riskRankingResumeBackground();
 dashboardQueueLayout($('#risk'),riskRankingMeasureBackground);
});
function riskRankingRemember(kind){
 if(kind===0)riskRankingPages.set(kind,{page:qrState.listPage});
 else riskRankingPages.set(kind,{page:rfState.page,dimension:rfState.dimension});
}
function riskRankingOpenModal(title,markup,drawer=false,subtitle=''){
 if(!riskRankingSwitching)return openModal(title,markup,drawer,subtitle);
 // 同一层只换榜单内容，保留标签节点，并在下一次布局时重置滚动。
 const body=$('#dialogbody');
 delete body.dataset.rankingPeriod;
 $('#dialogsub').textContent=subtitle;
 body.innerHTML=markup;
 dashboardQueueLayout(body,dashboardMeasureResetScroll);
}
function riskRankingSwitch(kind,focus=false){
 const tab=rpAvailableRankingTabs().find(t=>t.kind===kind);
 if(!tab)return;
 const current=$('#dialogbody').dataset.riskRankingKind;
 if(current!==String(kind)){
  const native=Number(current);
  if(Number.isInteger(native))riskRankingRemember(native);
  riskRankingSwitching=pcIsActive();
  try{
   if(tab.open){
    if(Number.isInteger(native))rpListState.periods[native]={...rpListState.period};
    tab.open();
   }else{
    const saved=riskRankingPages.get(kind);
    withPeriod('risk',()=>{
     if(pcIsActive()&&!saved)return rpOpenList(kind,true);
     if(kind===0){qrState.listPage=saved?.page||1;qrOpenList();}
     else{rfState.kind=kind;rfState.page=saved?.page||1;rfState.dimension=saved?.dimension||'spu';rfOpenList(kind,false);}
    });
   }
  }finally{riskRankingSwitching=false}
 }
 if(focus)queueMicrotask(()=>drawerNav.querySelector(`[data-drawer-tab="ranking-${kind}"]`)?.focus({preventScroll:true}));
}
// 新弹窗先清理榜单标记，确保详情、目标配置等抽屉恢复自身标签。
const riskRankingPreviousModal=openModal;
openModal=function(...args){
 delete $('#dialogbody').dataset.riskRankingKind;
 delete $('#dialogbody').dataset.rankingPeriod;
 $('#dialog').classList.remove('risk-ranking-drawer');
 drawerNav.setAttribute('aria-label','详情内容');
 return riskRankingPreviousModal(...args);
};
const riskRankingQualityList=qrOpenList;
qrOpenList=function(...args){const result=riskRankingQualityList(...args);riskRankingAttach(0);return result;};
const riskRankingOtherList=rfOpenList;
rfOpenList=function(kind,...args){const result=riskRankingOtherList(kind,...args);riskRankingAttach(kind);return result;};
const riskRankingPreviousProfile=drawerProfile;
drawerProfile=function(body,title){
 const profile=riskRankingPreviousProfile(body,title);
 if(!body.hasAttribute('data-risk-ranking-kind'))return profile;
 const tabs=rpAvailableRankingTabs();
 const active=tabs.find(t=>String(t.kind)===body.dataset.riskRankingKind);
 if(!active)return profile;
 // 标签只切换榜单；各榜原内容整体展示，避免与详情分组标签混用。
 return {...profile,entries:profile.entries.map(entry=>({...entry,key:'shared'})),
  tabs:tabs.map(t=>({key:'ranking-'+t.kind,label:t.label})),
  activeKey:'ranking-'+active.kind,
  onSelect:(key,focus)=>{
   const tab=tabs.find(t=>'ranking-'+t.kind===key);
   if(tab)riskRankingSwitch(tab.kind,focus);
  }
 };
};
