// 六榜固定表头；业务筛选按Tab保存，分组明细使用独立副本，返回保留父层状态。
function rpOpenList(k,reset=false,scopeRows=null){
 const first=$('#overlay').hidden;
 if(first){rpListState.period={...periodFor('risk')};rpListState.sorts={};rpListState.filters={};rpSavedFilters(k)};
 if(first||reset){if(k===0){qrState.listPlatform=rpCardPlatform(0);qrState.listPage=1}else{rfState.kind=k;rfState.page=1;rfState.dimension='spu';rfState.listPlatforms[k]=rpCardPlatform(k)}}
 const filters=scopeRows?{...rpSavedFilters(k)}:rpSavedFilters(k);
 const sorts=scopeRows?{}:(rpListState.sorts[k]||(rpListState.sorts[k]={}));
 const quality=k===0,tableId=quality?'qr-list-table':'rf-list-table',platformId=quality?'qr-list-platform':k===1?'rf-list-platform':'rf-return-platform';
 return rpWithListPeriod(()=>{
  const selected=[3,4].includes(k)?'all':quality?qrState.listPlatform:(rfState.listPlatforms[k]||rpCardPlatformState.value);
  const platformTools=`${[0,1,2,6].includes(k)?`<label>平台<select aria-label="榜单平台" id="${platformId}">${rpPlatformOptions(selected,true)}</select></label>`:''}${quality?'<button class="btn small" id="qrb-list-config">配置总退货率目标</button>':k===1?'<button class="btn small" id="rp-shop-type-config">配置店铺类型</button>':''}`;
  openModal(rpTitles[k]+(scopeRows?' · 分组SPU明细':' · 完整榜单'),`${platformTools?`<div class="qr-list-tools rp-platform-tools">${platformTools}</div>`:''}<div class="rp-list-tools">${rpFilterTools(k,filters,selected)}</div>${[0,1].includes(k)?rpQualityListChecks(filters,quality):''}${scopeRows?'<div class="rp-group-context">当前分组的SPU明细</div>':''}<div id="${tableId}" class="rp-list-table${k===1?' rp-shop-table':k===2?' rp-loss-table':k===6?' rp-return-table':[3,4].includes(k)?' rp-stock-table':''}"></div><div id="rp-list-pagination"></div>`,false,riskRangeText());
  const host=$('#'+tableId),page=()=>quality?qrState.listPage:rfState.page,setPage=n=>{if(quality)qrState.listPage=n;else rfState.page=n};
  const sortState=()=>{const scope='spu';return sorts[scope]||(sorts[scope]={key:'',direction:''})};
  function fill(){return rpWithListPeriod(()=>{
   const rows=rpFilterRows(k,scopeRows?rpListRows(k).filter(r=>scopeRows.some(s=>s.id===r.id)):rpListRows(k),filters);
   const keys=rpColumnKeys(k),hasPlatform=false,hasTrend=![1,3,4].includes(k),hasRisk=false;
   const allowed=keys,state=sortState();
   if(state.key&&!allowed.includes(state.key)){state.key='';state.direction=''}
   const fieldsByRow=new Map(),fieldsFor=r=>{if(!fieldsByRow.has(r))fieldsByRow.set(r,rpFieldMap(k,r,filters.qualityOnly));return fieldsByRow.get(r)};
   const data=rpSortRows(rows,state,(r,key)=>fieldsFor(r).find(f=>f.key===key)?.sortValue,k===1&&state.key==='score'?r=>r.channel:undefined);
   setPage(Math.min(Math.max(1,page()),Math.max(1,Math.ceil(data.length/DRAWER_PAGE_SIZE))));
   const trend=rpListState.trends[k]||'gsv';
   const headers=['序号',k===1?'店铺信息':'SPU信息',...(hasPlatform?['平台']:[]),...keys.map(key=>rpSortHeader(key,rpColumnName(key,rows,k),state,k)),...(hasRisk?[[1,3,4].includes(k)?'命中风险':'命中风险 / 优先级']:[]),'操作'];
   if(hasTrend)headers.splice(headers.length-1,0,rpTrendHeader(trend,k));
   const offset=(page()-1)*DRAWER_PAGE_SIZE;
   host.innerHTML=data.length?table(headers,data.slice(offset,offset+DRAWER_PAGE_SIZE).map((r,i)=>{const fields=fieldsFor(r);return[offset+i+1,rpIdentityMarkup(k,r,true),...(hasPlatform?[rpPlatformMark(r.platform||r.channel)]:[]),...keys.map(key=>rpListCell(fields.find(f=>f.key===key),false)),...(hasRisk?[rpRiskCell(k,r)]:[]),...(hasTrend?[rpTrendChart(k,r,trend,filters.qualityOnly)]:[]),`<button type="button" class="link" ${rpDetailAttr(k,r)}>查看详情</button>`]}),'rp-data-table'):`<div class="empty">当前筛选下暂无风险记录</div>`;
   rpApplySortAria(host,state);
   if(k===2){for(const [key,rule] of [['margin',rpLossMarginHint],['loss',metricDefinition('亏损金额')]]){const header=host.querySelector('th:has([data-rp-sort="'+key+'"])');if(header)addMetricHelp(header,rule)}}
   mountListPager($('#rp-list-pagination'),data.length,page(),n=>{setPage(n);fill();$('#dialogbody').scrollTop=0});
   host.onclick=e=>{const sort=e.target.closest('[data-rp-sort]');if(sort){const key=sort.dataset.rpSort;rpSortCycle(sortState(),key);setPage(1);fill();host.querySelector('[data-rp-sort="'+key+'"]')?.focus({preventScroll:true});return}};
   host.onchange=e=>{if(!e.target.matches('[data-rp-trend]'))return;rpListState.trends[k]=e.target.value;fill();host.querySelector('[data-rp-trend]')?.focus({preventScroll:true})};
   rpStickListHeader(host);
   host.upRefresh=fill;host.dataset.upRevision=upRuleRevision;
  })}
  if([0,1,2,6].includes(k))$('#'+platformId).onchange=e=>{if(quality)qrState.listPlatform=rpPlatformValue(e.target);else rfState.listPlatforms[k]=rpPlatformValue(e.target);setPage(1);fill()};
  for(const input of $$('#dialogbody [data-rp-filter]'))input.addEventListener(input.type==='search'?'input':'change',()=>{filters[input.dataset.rpFilter]=input.type==='checkbox'?input.checked:pfControlValue(input);setPage(1);fill()});
  $('#dialogbody [data-rp-reset]').onclick=()=>{Object.assign(filters,rpDefaultFilters());for(const key of Object.keys(sorts))delete sorts[key];for(const input of $$('#dialogbody [data-rp-filter]')){if(input.type==='checkbox')input.checked=filters[input.dataset.rpFilter];else pfControlSet(input,filters[input.dataset.rpFilter])}const platform=$('#'+platformId);if(platform){pfControlSet(platform,quality?'抖音':'all');platform.dispatchEvent(new Event('change',{bubbles:true}))}for(const b of document.querySelectorAll('#dialogbody .pf-attribute [data-pf-attribute-choice]'))b.setAttribute('aria-checked',String(b.dataset.pfAttributeChoice==='all'));const v=document.querySelector('#dialogbody .pf-attribute-value');if(v)v.textContent='全部';setPage(1);fill()};
  if(quality)$('#qrb-list-config').onclick=()=>toast('开发说明：按钮跳转到数智罗盘配置目标退货率。');
  if(k===1)$('#rp-shop-type-config').onclick=()=>toast('配置店铺类型：待设计');
  fill();if(!scopeRows)riskRankingAttach(k);uiArrangeBusinessFilters($('#dialogbody'));pfMultiMount($('#dialogbody'));
  const setPeriod=()=>{$('#dialogbody').dataset.rankingPeriod=JSON.stringify(rpListState.period)};setPeriod();
  drawerMountPeriod($('#dialogsub'),rpListState.period,(period)=>{rpListState.period=period;setPeriod();setPage(1);fill()},'ranking-date-trigger');
 });
}
qrOpenList=function(){return rpOpenList(0)};
rfOpenList=function(k,reset=true){return rpOpenList(k,reset)};
