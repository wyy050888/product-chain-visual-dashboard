// 两个Tab共用独立状态和抽屉栈；查看操作统一展示供应商详情页跳转提示。
function scpOpenMembers({scope,metric,period:range}){
 let kind=scope.kind==='material'?'material':'machine';
 const states={machine:scpMemberState('machine'),material:scpMemberState('material')};states[kind]=scpMemberState(kind,scope,metric,range);
 openModal('供应商列表',`<article class="scp-drawer" data-scp-drawer="members" data-scp-tab="${kind}"><div class="scp-member-filters ui-business-filters"></div><div class="scp-member-results"></div><div class="scp-member-pages"></div></article>`,false,'');
 const root=$('.scp-drawer'),filters=root.querySelector('.scp-member-filters'),result=root.querySelector('.scp-member-results');
 function paintControls(){upCalendarClose?.(false);filters.dataset.kind=kind;filters.innerHTML=scpSupplierFilters(states[kind]);for(const field of filters.querySelectorAll(':scope>label'))groupFilterField(field);pfMultiMount(filters)}
 function paint(){
  const state=states[kind],rows=scpMemberRows(state),total=rows.length;state.page=Math.min(state.page,Math.max(1,Math.ceil(total/DRAWER_PAGE_SIZE)));
  result.innerHTML=scpSupplierTable(rows.slice((state.page-1)*DRAWER_PAGE_SIZE,state.page*DRAWER_PAGE_SIZE),state);
  rpApplySortAria(root,state.sort);result.scrollTop=state.scrollTop;mountListPager(root.querySelector('.scp-member-pages'),total,state.page,next=>{state.page=next;state.scrollTop=0;paint()});
 }
 root.oninput=event=>{if(event.target.matches('[data-scp-member-search]')){const state=states[kind];state.query=event.target.value;state.project='all';state.page=1;state.scrollTop=0;paint()}};
 root.onchange=event=>{
  const radio=event.target.closest('[data-scp-category-level]');if(radio){scpCategoryApply(states[kind],+radio.dataset.scpCategoryLevel,radio.value);paintControls();paint();filters.querySelector('.scp-category-picker summary')?.focus({preventScroll:true});return}
  const select=event.target.closest('[data-scp-member-filter]');if(!select)return;
  const state=states[kind],key=select.dataset.scpMemberFilter;state[key]=pfControlValue(select);state.page=1;state.scrollTop=0;
  if(key==='category')state.leaf=state.group='all';paintControls();paint();filters.querySelector(`[data-scp-member-filter="${key}"]`)?.focus({preventScroll:true});
 };
 root.onclick=event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-scp-supplier-view')){event.preventDefault();event.stopPropagation();requestAnimationFrame(()=>requestAnimationFrame(()=>{if(button.isConnected)showMetricTooltip(button)}))}
  else if(button.hasAttribute('data-scp-date-open')){
   event.preventDefault();const state=states[kind];
   for(const menu of filters.querySelectorAll('details[open]'))menu.open=false;
   scpOpenMemberDate(button,state,(key,date)=>{state.dates[key]=date;state.page=1;state.scrollTop=0;paintControls();paint();filters.querySelector(`[data-scp-date-open="${key}"]`)?.focus({preventScroll:true})});
  }else if(button.hasAttribute('data-scp-date-clear')){
   event.preventDefault();const key=button.dataset.scpDateClear,state=states[kind];state.dates[key]={from:'',to:''};state.page=1;state.scrollTop=0;paintControls();paint();filters.querySelector(`[data-scp-date-open="${key}"]`)?.focus({preventScroll:true});
  }
  else if(button.hasAttribute('data-scp-category-clear')){event.preventDefault();Object.assign(states[kind],{category:'all',group:'all',leaf:'all',page:1,scrollTop:0,navCategory:'',navGroup:''});paintControls();paint();filters.querySelector('.scp-category-picker summary')?.focus({preventScroll:true})}
  else if(button.dataset.scpCategoryBranch){scpCategoryBrowse(states[kind],button)}
  else if(button.hasAttribute('data-scp-category-leaf')){scpCategoryApply(states[kind],3,button.dataset.value);paintControls();paint();filters.querySelector('.scp-category-picker summary')?.focus({preventScroll:true})}
  else if(button.hasAttribute('data-scp-member-reset')){states[kind]=scpMemberState(kind);paintControls();paint()}
  else if(button.dataset.rpSort){const state=states[kind];rpSortCycle(state.sort,button.dataset.rpSort);state.page=1;state.scrollTop=0;paint();result.querySelector(`[data-rp-sort="${button.dataset.rpSort}"]`)?.focus({preventScroll:true})}
 };
 root.addEventListener('toggle',event=>{
  const picker=event.target;if(!picker.matches('.scp-category-picker')||!picker.open)return;upCalendarClose?.(false);
  for(const other of filters.querySelectorAll('details[open]'))if(other!==picker)other.open=false;
  const menu=picker.querySelector('.scp-category-menu');menu.style.left='';if(innerWidth<=700)return;
  menu.style.left='0px';const box=menu.getBoundingClientRect();menu.style.left=Math.min(0,innerWidth-16-box.right)+'px';
 },true);
 root.onpointerover=event=>{const branch=event.target.closest('[data-scp-category-branch]');if(branch)scpCategoryBrowse(states[kind],branch)};
 root.scpSelect=key=>{if(!states[key])return;states[kind].scrollTop=result.scrollTop;kind=key;root.dataset.scpTab=key;paintControls();paint();$('#dialogbody').scrollTop=0;drawerQueueRefresh()};
 paintControls();paint();
}
