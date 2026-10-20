// 首页两维度下钻；父抽屉的查询、排序、分页由DOM闭包保留，返回时不重建。
function ipOpenStockDrawer(dimension,index){return withPeriod('inventory',()=>{
 const base=ipStockRecords(inventoryProductLedger()),category=dimension==='category'?pfCategories[index]:null;
 if(dimension==='category'&&!category)return;
 const state={period:{...ipMetricPeriods[dimension]},tab:'spus',brands:{query:'',page:1,sort:{key:'warehouseValueCents',direction:'desc'}},
  spus:{query:'',page:1,brand:dimension==='brand'?String(index):'all',category:category||'all',sort:{key:'warehouseValueCents',direction:'desc'}}};
 openModal(dimension==='category'?'类目库存':'品牌库存',`<article class="ip-stock-detail" data-ip-drawer="${dimension}" data-ip-tab="spus"><div class="ip-stock-content"></div></article>`);
 const root=$('.ip-stock-detail'),content=root.querySelector('.ip-stock-content');
 function render(){return ipWithMetricPeriod(state.period,()=>{
  const scope=ipMetricRecords(base,state.period);
  root.dataset.ipPeriod=periodKey(state.period);
  const isBrand=state.tab==='brands',current=state[isBrand?'brands':'spus'];root.dataset.ipTab=state.tab;
  const choices=brands.map((name,i)=>`<option value="${i}" ${pfOptionSelected(current.brand,i)?'selected':''}>${esc(name)}</option>`).join('');
  const periodHost=document.createElement('span');periodHost.dataset.ipPeriodHost='';
  periodHost.innerHTML=ipMetricPeriodMarkup(state.period);$('#dialogsub').replaceChildren(periodHost);
  content.innerHTML=`<div class="ip-stock-tools ui-business-filters"><label class="ui-search-field"><input type="search" data-ip-query aria-label="${isBrand?'搜索品牌':'搜索库存产品'}" placeholder="${isBrand?'搜索品牌':'产品名称 / SPU码 / 型号'}" value="${esc(current.query)}"></label>${isBrand?'':`<label>品牌<select data-ip-brand aria-label="品牌"><option value="all">全部</option>${choices}</select></label><label>类目<select data-ip-category aria-label="类目"><option value="all">全部</option>${pfCategories.map(name=>`<option ${pfOptionSelected(current.category,name)?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`}<button type="button" class="link" data-ip-reset>重置</button></div><div class="ip-stock-results"></div><div class="ip-stock-pages"></div>`;
  const tools=content.querySelector('.ip-stock-tools');decorateFilterFields(tools);
  // 入口条件仅作为默认筛选；清除单项时保留其他筛选及当前统计期间。
  for(const key of ['brand','category']){
   const select=tools.querySelector('[data-ip-'+key+']');if(!select||!pfSelected(current[key]).length)continue;
   const clear=document.createElement('button');clear.type='button';clear.className='ip-stock-filter-clear';clear.dataset.ipClear=key;clear.setAttribute('aria-label','清除'+(key==='brand'?'品牌':'类目')+'筛选');clear.textContent='×';select.closest('.pf-multi').querySelector('summary').append(clear);
  }
  function results(){return ipWithMetricPeriod(state.period,()=>{
   let rows=isBrand?ipStockGroups(scope,'brand'):scope;
   rows=rows.filter(row=>isBrand?row.name.toLowerCase().includes(current.query.toLowerCase()):
    pfIncludes(current.brand,row.brand)&&pfIncludes(current.category,row.category)&&uiProductSearchMatch(row,current.query));
   const total=rows.length,summary=isBrand?ipStockSum(scope.filter(row=>rows.some(brand=>brand.index===row.brand))):ipStockSum(rows);
   rows=rpSortRows(rows,current.sort,(row,key)=>row[key]);current.page=Math.min(current.page,Math.max(1,Math.ceil(total/DRAWER_PAGE_SIZE)));
   const host=content.querySelector('.ip-stock-results');
   host.innerHTML=ipStockTable(rows.slice((current.page-1)*DRAWER_PAGE_SIZE,current.page*DRAWER_PAGE_SIZE),{dimension:isBrand?'brand':'spu',sort:current.sort,summary});
   rpApplySortAria(host,current.sort);mountListPager(content.querySelector('.ip-stock-pages'),total,current.page,page=>{current.page=page;results()});
  })}
  content.oninput=event=>{if(event.target.matches('[data-ip-query]')){current.query=event.target.value.trim();current.page=1;results()}};
  content.onchange=event=>{if(event.target.matches('[data-ip-brand],[data-ip-category]')){current[event.target.hasAttribute('data-ip-brand')?'brand':'category']=pfControlValue(event.target);current.page=1;render()}};
  content.onclick=event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.dataset.ipClear){const key=button.dataset.ipClear;event.preventDefault();current[key]='all';current.page=1;render();content.querySelector('[data-ip-'+key+']')?.closest('.pf-multi')?.querySelector('summary').focus({preventScroll:true})}
   else if(button.hasAttribute('data-rp-sort')){rpSortCycle(current.sort,button.dataset.rpSort);current.page=1;results();content.querySelector(`[data-rp-sort="${button.dataset.rpSort}"]`)?.focus({preventScroll:true})}
   else if(button.hasAttribute('data-ip-reset')){Object.assign(current,{query:'',page:1,brand:'all',category:'all'});render()}
   else if(button.hasAttribute('data-ip-stock')){state.spus.brand=button.dataset.ipStock;state.spus.page=1;state.tab='spus';render();drawerQueueRefresh()}
   else if(button.hasAttribute('data-ip-spu'))upOpenDetail({spuId:button.dataset.ipSpu,...upWindow(state.period),period:{...state.period},module:'inventory',platform:'all',tab:'stock'});
  };
  ipMountMetricPeriod(periodHost,state.period,next=>{state.period=next;state.brands.page=1;state.spus.page=1;render();drawerQueueRefresh()});
  results();
 })}
 root.ipSelect=key=>{state.tab=key;render();drawerQueueRefresh();$('#dialogbody').scrollTop=0};render();
})}
const ipPreviousDrawerProfile=drawerProfile;
drawerProfile=function(body,title){
 const root=body.querySelector(':scope > .ip-stock-detail');if(!root)return ipPreviousDrawerProfile(body,title);
 return {root,entries:[...root.children].map(node=>({node,key:'shared'})),
  tabs:root.dataset.ipDrawer==='brand'?[{key:'brands',label:'全部品牌'},{key:'spus',label:'spu明细'}]:[{key:'spus',label:'spu明细'}],
  activeKey:root.dataset.ipTab,onSelect:(key,focus)=>{root.ipSelect(key);if(focus)queueMicrotask(()=>drawerNav.querySelector(`[data-drawer-tab="${key}"]`)?.focus({preventScroll:true}))}};
};
