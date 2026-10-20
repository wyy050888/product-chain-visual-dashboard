// 完整三级类目列表与预警卡片共用统计口径；抽屉期间和筛选独立保存。
function scpOpenCategories(){
 const state={period:{...scpState.categoryPeriod},query:'',category:'all',status:'all',page:1,sort:{key:'',direction:''}};
 openModal('三级类目列表','<article class="scp-drawer" data-scp-drawer="categories"><div class="scp-category-list-controls"></div><div class="scp-member-results"></div><div class="scp-member-pages"></div></article>',false,'');
 const root=$('#dialogbody>.scp-drawer'),controls=root.querySelector('.scp-category-list-controls'),result=root.querySelector('.scp-member-results');
 const periodHost=document.createElement('span');periodHost.className='scp-category-period-host';periodHost.innerHTML=scpPeriodControl('category-list',state.period);$('#dialogsub').replaceChildren(periodHost);
 function changePeriod(field,value){
  scpUpdatePeriod(state.period,field,value);state.page=1;periodHost.innerHTML=scpPeriodControl('category-list',state.period);paint();
  periodHost.querySelector(field==='mode'?`[data-scp-mode="${value}"]`:field==='quarter'?'[data-scp-quarter]':'[data-scp-year]')?.focus({preventScroll:true});
 }
 periodHost.onchange=event=>{if(event.target.matches('[data-scp-year],[data-scp-quarter]'))changePeriod(event.target.hasAttribute('data-scp-quarter')?'quarter':'year',event.target.value)};
 periodHost.onclick=event=>{const button=event.target.closest('[data-scp-mode]');if(button)changePeriod('mode',button.dataset.scpMode)};

 function paintControls(){
  const select=(key,label,options)=>`<label>${label}<select data-scp-category-filter="${key}" aria-label="${label}">${options.map(([value,text])=>`<option value="${value}" ${state[key]===value?'selected':''}>${text}</option>`).join('')}</select></label>`;
  controls.innerHTML=`<div class="scp-member-filters ui-business-filters"><label class="ui-search-field"><input type="search" data-scp-category-search aria-label="搜索三级类目列表" placeholder="搜索类目名称" value="${esc(state.query)}"></label>${select('category','一级类目',[['all','全部'],...pfCategories.map(name=>[name,name])])}${select('status','准入状态',[['all','全部'],['warning','预警'],['met','已达标']])}<button type="button" class="link" data-scp-category-reset>重置</button></div>`;
  for(const field of controls.querySelectorAll('label'))groupFilterField(field);
 }
 function paint(){
  const range=scpRange(state.period),minimum=stStandards(state.period.year).categoryAdmitted,q=state.query.trim().toLocaleLowerCase();
  let rows=scpCategories.filter(c=>(state.category==='all'||c.category===state.category)&&c.path.toLocaleLowerCase().includes(q)).map(category=>({category,stats:scpStats({kind:'machine',categoryId:category.id},range)}));
  if(state.status!=='all')rows=rows.filter(row=>!range.future&&(state.status==='warning'?row.stats.admitted<minimum:row.stats.admitted>=minimum));
  rows=scpSort(rows,state.sort,(row,key)=>row.stats[key]);
  state.page=Math.min(state.page,Math.max(1,Math.ceil(rows.length/DRAWER_PAGE_SIZE)));
  const body=rows.slice((state.page-1)*DRAWER_PAGE_SIZE,state.page*DRAWER_PAGE_SIZE).map(({category:c,stats})=>`<tr data-scp-category-list-row="${c.id}"><td>${esc(c.name)}</td><td>${esc(c.category)}</td><td>${esc(c.group)}</td>${['reserved','admitted','newAdmitted'].map(metric=>`<td>${scpCount({kind:'machine',categoryId:c.id},metric,stats[metric],range,{threshold:metric==='admitted'?minimum:null})}</td>`).join('')}</tr>`).join('');
  result.innerHTML=scpTable(`<tr><th data-up-basic>三级类目</th><th data-up-basic>一级类目</th><th data-up-basic>二级类目</th>${[['reserved','已储备'],['admitted','已准入'],['newAdmitted','新增准入']].map(([key,label])=>scpSortHead(key,label,state.sort)).join('')}</tr>`,body,'scp-category-list-table');
  rpApplySortAria(root,state.sort);result.scrollTop=0;
  mountListPager(root.querySelector('.scp-member-pages'),rows.length,state.page,next=>{state.page=next;paint()});
 }
 root.oninput=event=>{if(event.target.matches('[data-scp-category-search]')){state.query=event.target.value;state.page=1;paint()}};
 root.onchange=event=>{
  const field=event.target;
  if(field.dataset.scpCategoryFilter){state[field.dataset.scpCategoryFilter]=field.value;state.page=1;paint()}
 };
 root.onclick=event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-scp-category-reset')){Object.assign(state,{query:'',category:'all',status:'all',page:1});paintControls();paint()}
  else if(button.dataset.rpSort){rpSortCycle(state.sort,button.dataset.rpSort);state.page=1;paint();result.querySelector(`[data-rp-sort="${button.dataset.rpSort}"]`)?.focus({preventScroll:true})}
 };
 paintControls();paint();
}
