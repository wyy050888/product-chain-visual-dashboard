// 期间在打开时固定继承首页，切换类目和排序不回写首页。
function scpOpenMaterialCategory(category,{brand='all',material='all'}={}){
 const state={category,query:'',brand,material,period:{...scpState.materialPeriod},sort:scpDefaultSort('materials'),page:1},range=scpRange(state.period);
 openModal('核心物料供应商准入储备',`<article class="scp-drawer" data-scp-drawer="material-list"><div class="scp-material-tabs"></div><div class="scp-material-filters ui-business-filters"><label class="ui-search-field scp-material-search"><input type="search" data-scp-material-search aria-label="搜索三级类目" placeholder="搜索三级类目"></label><label class="unified-input-group"><span class="unified-field-name">品牌</span><select data-scp-material-brand aria-label="品牌" data-pf-multiple data-pf-label="品牌"><option value="all">全部</option>${scpBrands.map(([brand])=>`<option value="${esc(brand)}">${esc(brand)}</option>`).join('')}</select></label><label class="unified-input-group"><span class="unified-field-name">核心部件</span><select data-scp-material-component aria-label="核心部件" data-pf-multiple data-pf-label="核心部件"><option value="all">全部</option>${scpMaterials.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></label></div><div class="scp-member-results"></div><div class="scp-material-pages"></div></article>`,false,range.start+' — '+range.cutoff);
 const root=$('#dialogbody>.scp-drawer'),tabs=root.querySelector('.scp-material-tabs'),results=root.querySelector('.scp-member-results'),pages=root.querySelector('.scp-material-pages'),pageKey='scp-material-list';
 function paint(resetPage=true){
  if(resetPage)state.page=1;
  tabs.innerHTML=scpCategoryTabs(state.category,true);
  const groups=new Map(),query=state.query.trim().toLocaleLowerCase(),materials=scpMaterials.filter(name=>pfIncludes(state.material,name));
  for(const row of scpMaterialFlatRows(range))if((state.category==='all'||row.category.category===state.category)&&row.category.name.toLocaleLowerCase().includes(query)&&pfIncludes(state.brand,row.brand)){if(!groups.has(row.category.id))groups.set(row.category.id,[]);groups.get(row.category.id).push(row)}
  // 类目保持连续合并，物料表头仅调整每个类目下的品牌顺序。
  const allRows=[...groups.values()].flatMap(rows=>scpSort(rows,state.sort,(row,key)=>row.stats[key])),size=listPageSize(pageKey);
  state.page=Math.max(1,Math.min(state.page,Math.ceil(allRows.length/size)||1));
  // 分页后重新合并本页类目，跨页时也保留完整名称和品牌关系。
  const pageGroups=new Map();for(const row of allRows.slice((state.page-1)*size,state.page*size)){if(!pageGroups.has(row.category.id))pageGroups.set(row.category.id,[]);pageGroups.get(row.category.id).push(row)}
  const grouped=[...pageGroups.values()];
  const head='<tr><th data-up-basic>三级类目</th><th data-up-basic>品牌</th>'+materials.map(material=>scpSortHead(material,material,state.sort,scpDefaultSort('materials'))).join('')+'</tr>';
  const body=grouped.map(rows=>rows.map(({brand,category,stats},i)=>`<tr class="scp-material-row" data-scp-brand-row="${esc(brand)}" data-scp-category-row="${category.id}">${i?'':`<td class="scp-material-category-cell" rowspan="${rows.length}" title="${esc(category.path)}"><span class="scp-material-category">${esc(category.name)}</span><small>${esc(category.category+' / '+category.group)}</small></td>`}<td class="scp-material-brand-cell">${esc(brand)}</td>${scpMaterialCells({kind:'material',brand,categoryId:category.id},stats,range,materials)}</tr>`).join('')).join('');
  const empty=state.query.trim()||pfSelected(state.brand).length?'没有符合筛选条件的数据':'暂无核心物料供应商准入储备';
  results.innerHTML=scpTable(head,body||`<tr><td colspan="${materials.length+2}" class="empty">${empty}</td></tr>`,'scp-material-table scp-material-detail-table'+(materials.length<scpMaterials.length?' has-material-filter':''));
  results.querySelector('table').style.setProperty('--scp-detail-material-count',materials.length);rpApplySortAria(root,state.sort);
  mountListPager(pages,allRows.length,state.page,page=>{state.page=page;paint(false)},pageKey);
  $('#dialogbody').scrollTop=0;
 }
 root.oninput=event=>{if(event.target.hasAttribute('data-scp-material-search')){state.query=event.target.value;paint()}};
 root.onchange=event=>{
  if(event.target.hasAttribute('data-scp-material-brand')){state.brand=pfControlValue(event.target);paint()}
  if(event.target.hasAttribute('data-scp-material-component')){state.material=pfControlValue(event.target);if(state.sort.key&&!pfIncludes(state.material,state.sort.key))state.sort=scpDefaultSort('materials');paint()}
 };
 root.onclick=event=>{
  const tab=event.target.closest('[data-scp-category-tab]');if(tab){state.category=tab.dataset.scpCategoryTab;paint();tabs.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});return}
  const sort=event.target.closest('[data-rp-sort]');if(sort){rpSortCycle(state.sort,sort.dataset.rpSort,scpDefaultSort('materials'));paint();results.querySelector(`[data-rp-sort="${sort.dataset.rpSort}"]`)?.focus({preventScroll:true})}
 };
 pfMultiMount(root,{controlled:true});pfControlSet(root.querySelector('[data-scp-material-brand]'),state.brand);pfControlSet(root.querySelector('[data-scp-material-component]'),state.material);paint();
}
