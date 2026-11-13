const riskRankingTabs=[
 {kind:0,label:'产品违规榜'}, {kind:6,label:'退货恶化榜'}, {kind:8,label:'退货偏差榜'},
 {kind:1,label:'店铺风险榜'}, {kind:4,label:'呆滞预警榜（实时）'},
 {kind:3,label:'缺货预警榜（实时）'}, {kind:2,label:'亏损产品榜'}
];
const riskRankingPages=new Map();
function riskRankingAttach(kind){
 const body=$('#dialogbody');
 if(!wfDirector()||!body.querySelector('#qr-list-table,#rf-list-table'))return;
 body.dataset.riskRankingKind=kind;
 const dialog=$('#dialog');dialog.dataset.rdKind=kind;
 dialog.classList.add('risk-ranking-drawer');
 $('#dialogtitle').textContent='全局高危预警 · 完整榜单';
 if(!$('#dialogsub .period-picker'))$('#dialogsub').textContent=withPeriod('risk',riskRangeText);
 drawerNav.setAttribute('aria-label','风险榜单');
 drawerQueueRefresh();
}
function riskRankingRemember(kind){
 if(kind===0)riskRankingPages.set(kind,{page:qrState.listPage});
 else riskRankingPages.set(kind,{page:rfState.page,dimension:rfState.dimension});
}
function riskRankingSwitch(kind,focus=false){
 if(!riskRankingTabs.some(t=>t.kind===kind))return;
 const current=Number($('#dialogbody').dataset.riskRankingKind);
 if(current!==kind){
  riskRankingRemember(current);
  const saved=riskRankingPages.get(kind);
  withPeriod('risk',()=>{
   if(kind===0){qrState.listPage=saved?.page||1;qrOpenList();}
   else{rfState.kind=kind;rfState.page=saved?.page||1;rfState.dimension=saved?.dimension||'spu';rfOpenList(kind,false);}
  });
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
 const kind=Number(body.dataset.riskRankingKind);
 if(!riskRankingTabs.some(t=>t.kind===kind))return profile;
 // 标签只切换榜单；各榜原内容整体展示，避免与详情分组标签混用。
 return {...profile,entries:profile.entries.map(entry=>({...entry,key:'shared'})),
  tabs:riskRankingTabs.map(t=>({key:'ranking-'+t.kind,label:t.label})),
  activeKey:'ranking-'+kind,
  onSelect:(key,focus)=>riskRankingSwitch(Number(key.replace('ranking-','')),focus)
 };
};
