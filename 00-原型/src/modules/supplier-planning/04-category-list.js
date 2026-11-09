// 完整三级类目列表与预警卡片共用统计口径；抽屉期间和筛选独立保存。
function scpOpenCategories(){
 const state={period:{...scpState.categoryPeriod},query:'',category:scpCategoryNames[0],status:'all',page:1,sort:scpDefaultSort('categoryList')};
 openModal('三级类目列表','<article class="scp-drawer" data-scp-drawer="categories"><div class="scp-category-list-tabs"></div><div class="scp-category-list-controls"></div><div class="scp-member-results"></div><div class="scp-member-pages"></div></article>',false,'');
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
  controls.innerHTML=`<div class="scp-member-filters ui-business-filters"><label class="ui-search-field"><input type="search" data-scp-category-search aria-label="搜索三级类目列表" placeholder="搜索类目名称" value="${esc(state.query)}"></label>${select('status','目标达成',[['all','全部'],['warning','预警'],['met','已达标']])}<button type="button" class="link" data-scp-category-reset>重置</button></div>`;
  for(const field of controls.querySelectorAll('label'))groupFilterField(field);
 }
 function paint(){
  root.querySelector('.scp-category-list-tabs').innerHTML=scpCategoryTabs(state.category);
  const range=scpRange(state.period),targets=stStandards(state.period.year),q=state.query.trim().toLocaleLowerCase();
  let rows=scpCategories.filter(c=>c.category===state.category&&c.path.toLocaleLowerCase().includes(q)).map(category=>({category,stats:scpStats({kind:'machine',categoryId:category.id},range)}));
  if(state.status!=='all')rows=rows.filter(row=>!range.future&&(state.status==='warning'?row.stats.newAdmitted<targets.categoryAdmitted||row.stats.newCooperation<targets.categoryCooperation:row.stats.newAdmitted>=targets.categoryAdmitted&&row.stats.newCooperation>=targets.categoryCooperation));
  rows=scpSort(rows,state.sort,(row,key)=>row.stats[key]);
  state.page=Math.min(state.page,Math.max(1,Math.ceil(rows.length/listPageSize(root.querySelector('.scp-member-pages')))));
  const body=rows.slice((state.page-1)*listPageSize(root.querySelector('.scp-member-pages')),state.page*listPageSize(root.querySelector('.scp-member-pages'))).map(({category:c,stats})=>`<tr data-scp-category-list-row="${c.id}"><td>${esc(c.name)}</td><td>${esc(c.category)}</td><td>${esc(c.group)}</td>${['reserved','admitted','cooperated','newAdmitted','newCooperation'].map(metric=>`<td>${metric.startsWith('new')?scpReadiness({kind:'machine',categoryId:c.id},metric,stats[metric],range,metric==='newAdmitted'?targets.categoryAdmitted:targets.categoryCooperation):scpCount({kind:'machine',categoryId:c.id},metric,stats[metric],range)}</td>`).join('')}</tr>`).join('');
  result.innerHTML=scpTable(`<tr><th data-up-basic>三级类目</th><th data-up-basic>一级类目</th><th data-up-basic>二级类目</th>${[['reserved','意向储备（总）'],['admitted','准入储备（总）'],['cooperated','已合作（总）'],['newAdmitted',String(state.period.year).slice(-2)+'年新增准入'],['newCooperation',String(state.period.year).slice(-2)+'年新增合作']].map(([key,label])=>scpSortHead(key,label,state.sort,scpDefaultSort('categoryList'))).join('')}</tr>`,body,'scp-category-list-table');
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
  if(button.dataset.scpCategoryTab){state.category=button.dataset.scpCategoryTab;state.page=1;paint();root.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});return}
  if(button.hasAttribute('data-scp-category-reset')){Object.assign(state,{query:'',status:'all',page:1,sort:scpDefaultSort('categoryList')});paintControls();paint()}
  else if(button.dataset.rpSort){rpSortCycle(state.sort,button.dataset.rpSort,scpDefaultSort('categoryList'));state.page=1;paint();result.querySelector(`[data-rp-sort="${button.dataset.rpSort}"]`)?.focus({preventScroll:true})}
 };
 paintControls();paint();
}
