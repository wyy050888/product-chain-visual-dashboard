// 所有业务弹窗共用右侧抽屉；日历、指标提示继续使用原轻量浮层。
const drawerNav=document.createElement('nav');
drawerNav.id='drawer-tabs';drawerNav.className='drawer-tabs';drawerNav.setAttribute('role','tablist');drawerNav.setAttribute('aria-label','详情内容');
$('#dialog .dialoghead').after(drawerNav);
let drawerView=null,drawerRefreshQueued=false,drawerSequence=0;
function drawerSelect(key,focus=false){
 if(!drawerView?.profile)return;
 const tab=drawerView.profile.tabs.find(t=>t.key===key);if(!tab)return;
 if(drawerView.profile.onSelect){drawerView.profile.onSelect(key,focus);return;}
 drawerView.key=key;
 const sequence=drawerView.sequence;
 if(tab.button&&!tab.button.classList.contains('active'))tab.button.click();
 if(!drawerView||drawerView.sequence!==sequence||!drawerView.profile){
  if(focus)queueMicrotask(()=>drawerNav.querySelector(`[data-drawer-tab="${key}"]`)?.focus({preventScroll:true}));
  return;
 }
 drawerApply();$('#dialogbody').scrollTop=0;
 if(focus)drawerNav.querySelector(`[data-drawer-tab="${key}"]`)?.focus({preventScroll:true});
}
function drawerApply(){
 if(!drawerView?.profile)return;
 const {profile,key}=drawerView;
 drawerSyncDetailPeriod(profile.root,key);
 for(const {node,key:group} of profile.entries){
  const visible=group==='shared'||group===key||(group==='native'&&!!profile.tabs.find(t=>t.key===key)?.button);
  node.classList.toggle('drawer-pane-off',!visible);
  if(visible&&node.matches('details.rd-fold,details.rf-return-evidence,details.br-rules,details.na-rules,details.cw-rulebox'))node.open=true;
 }
 for(const button of drawerNav.querySelectorAll('[data-drawer-tab]')){
  const selected=button.dataset.drawerTab===key;
  button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
 }
 $('#dialogbody').setAttribute('role','tabpanel');
 $('#dialogbody').setAttribute('aria-labelledby',`drawer-tab-${drawerView.sequence}-${key}`);
}
function drawerRefresh(){
 if(!drawerView||$('#overlay').hidden)return;
 const body=$('#dialogbody'),profile=drawerProfile(body,$('#dialogtitle').textContent);
 // 接收项目原有按钮、阶段卡及底部“指派处理”触发的业务切换。
 const hero=body.querySelector('.up-detail>.up-hero'),bar=hero?.parentElement.querySelector(':scope > .up-detail-tabs');
 if(bar){if(drawerNav.parentElement!==bar)bar.prepend(drawerNav)}
 else if(hero){if(hero.nextElementSibling!==drawerNav)hero.after(drawerNav)}
 else if($('#dialog .dialoghead').nextElementSibling!==drawerNav)$('#dialog .dialoghead').after(drawerNav);
 const nativeActive=profile.native?.find(t=>t.button.classList.contains('active'))?.key;
 if(drawerView.nativeKey===null){drawerView.nativeKey=nativeActive;if(nativeActive==='dispatch'||!profile.tabs.some(t=>t.key==='base'))drawerView.key=nativeActive||profile.tabs[0].key;}
 else if(nativeActive&&nativeActive!==drawerView.nativeKey){drawerView.key=nativeActive;drawerView.nativeKey=nativeActive;}
 if(profile.activeKey)drawerView.key=profile.activeKey;
 if(!profile.tabs.some(t=>t.key===drawerView.key))drawerView.key=profile.tabs[0].key;
 drawerView.profile=profile;
 const subtitle=$('#dialogsub'),seen=new Set();
 const cleaned=subtitle.textContent.split(/\s*[|｜]\s*/).filter(part=>{const dates=part.match(/\d{4}-\d{2}-\d{2}/g);if(!dates)return true;const key=dates.join('|');if(seen.has(key))return false;seen.add(key);return true}).join(' · ');
 if(!subtitle.querySelector('.period-picker')&&subtitle.textContent!==cleaned)subtitle.textContent=cleaned;
 const signature=profile.tabs.map(t=>t.key+':'+t.label).join('|');
 if(signature!==drawerView.signature){
  drawerView.signature=signature;
  drawerNav.replaceChildren(...profile.tabs.map(t=>{
   const b=document.createElement('button');b.type='button';b.id=`drawer-tab-${drawerView.sequence}-${t.key}`;b.dataset.drawerTab=t.key;b.textContent=t.label;
   b.setAttribute('role','tab');b.setAttribute('aria-controls','dialogbody');return b;
  }));
 }
 drawerApply();
}
function drawerQueueRefresh(){
 if(drawerRefreshQueued)return;drawerRefreshQueued=true;
 queueMicrotask(()=>{drawerRefreshQueued=false;drawerRefresh()});
}
const drawerPreviousOpen=openModal;
openModal=function(title,body,unusedDrawer=false,sub=''){
 const previous=!$('#overlay').hidden&&drawerView?.title===title?drawerView.key:null;
 $('#dialog .dialoghead').after(drawerNav);
 const result=drawerPreviousOpen(title,body,true,sub);
 const dialog=$('#dialog');dialog.classList.add('drawer','business-drawer');
 $('#close').setAttribute('aria-label','关闭抽屉');
 drawerView={title,key:previous||'base',profile:null,signature:null,sequence:++drawerSequence,nativeKey:null};
 // 延后组织内容，先完成业务函数同步填表、绑定事件和装饰。
 drawerNav.replaceChildren();drawerQueueRefresh();return result;
};
const drawerPreviousClose=closeModal;
closeModal=function(){drawerView=null;drawerPreviousClose()};
// 原入口已绑定旧关闭函数；隐藏状态监听仍会清理抽屉状态。
const drawerObserver=new MutationObserver(records=>{
 if($('#overlay').hidden)return;
 if(records.some(r=>r.type==='childList'||r.target.closest?.('#pc-tabs')))drawerQueueRefresh();
});
drawerObserver.observe($('#dialogbody'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
new MutationObserver(()=>{if($('#overlay').hidden)drawerView=null}).observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
drawerNav.addEventListener('click',e=>{const b=e.target.closest('[data-drawer-tab]');if(b)drawerSelect(b.dataset.drawerTab)});
drawerNav.addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
 const buttons=[...drawerNav.querySelectorAll('button')],current=buttons.indexOf(document.activeElement);if(current<0)return;
 e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+(e.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;
 drawerSelect(buttons[index].dataset.drawerTab,true);
});
// 底部保存按钮可能校验另一标签内的必填字段；先展示该字段再让浏览器定位。
$('#dialogbody').addEventListener('invalid',e=>{
 if(!drawerView?.profile)return;
 const entry=drawerView.profile.entries.find(x=>x.node===e.target||x.node.contains(e.target));
 if(entry&&entry.key!=='shared'&&entry.key!=='native')drawerSelect(entry.key);
},true);

// 在标题页点击保存 / 指派时，直接显示执行区域与保存反馈。
$('#dialogactions').addEventListener('click',e=>{
 if(!drawerView?.profile)return;
 const button=e.target.closest('button');if(!button)return;
 let target=button.getAttribute('form')?document.getElementById(button.getAttribute('form')):null;
 if(['risk-save-draft','qr-save'].includes(button.id))target=$('#risk-handle-form,#qr-handle-form');
 if(!target)return;
 const entry=drawerView.profile.entries.find(x=>x.node===target||x.node.contains(target)||target.contains(x.node));
 if(entry&&entry.key!=='shared'&&entry.key!=='native')drawerSelect(entry.key);
},true);
