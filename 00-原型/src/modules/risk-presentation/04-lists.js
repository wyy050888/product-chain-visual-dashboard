// 已有明确数值口径的榜单显式显示默认列；复合风险榜仍保留原业务顺序。
function rpRankingDefaultSort(kind){return kind===2?{key:'loss',direction:'asc'}:kind===4?{key:'sellableCoverage15',direction:'desc'}:{key:'',direction:''}}
// 六榜固定表头；业务筛选按Tab保存，分组明细使用独立副本，返回保留父层状态。
function rpOpenList(k,reset=false,scopeRows=null,restore=null){
 const first=$('#overlay').hidden,priorKind=Number($('#dialogbody').dataset.riskRankingKind);
 if(!first&&!restore&&Number.isInteger(priorKind)&&priorKind!==k){rpListState.periods[priorKind]={...rpListState.period};rpListState.period={...(rpListState.periods[k]||rpBoardPeriod(k))}}
 rpListState.kind=k;
 // 退货榜支持全平台及六个平台，兼容旧的无效状态。
 if(k===1&&!qrPlatforms.includes(rfState.listPlatforms[k]))rfState.listPlatforms[k]=rpCardPlatform(k);
 if([6,8].includes(k)&&!pfSelected(rfState.listPlatforms[k]).every(platform=>qrPlatforms.includes(platform)))rfState.listPlatforms[k]=rpCardPlatform(k);
 if(first&&!restore){rpListState.period={...rpBoardPeriod(k)};rpListState.periods={};rpListState.sorts={};rpListState.filters={};rpSavedFilters(k)};
 if((first||reset)&&!restore){if(k===0){qrState.listPlatform=rpCardPlatform(0);qrState.listPage=1}else{rfState.kind=k;rfState.page=1;rfState.dimension='spu';rfState.listPlatforms[k]=rpCardPlatform(k)}}
 if(restore&&k===1){rfState.kind=1;rfState.dimension='spu';rpListState.period={...restore.period};rpListState.filters[1]=restore.filters;rpListState.sorts[1]=restore.sorts;rfState.listPlatforms[1]=restore.platform;rfState.page=restore.page}
 const filters=scopeRows?{...rpSavedFilters(k)}:rpSavedFilters(k);
 const sorts=scopeRows?{}:(rpListState.sorts[k]||(rpListState.sorts[k]={}));
 const quality=k===0,tableId=quality?'qr-list-table':'rf-list-table',platformId=quality?'qr-list-platform':k===1?'rf-list-platform':'rf-return-platform';
 const hasPlatformFilter=[0,1,2,6,8].includes(k);
 return rpWithListPeriod(()=>{
  const selected=[3,4].includes(k)?'all':quality?qrState.listPlatform:(rfState.listPlatforms[k]||rpCardPlatform(k));
  const platformTools=`${hasPlatformFilter?`<label>平台<select ${rpQualityPlatformKinds.includes(k)?'multiple data-drawer-platform-tabs':''} aria-label="榜单平台" id="${platformId}">${rpPlatformOptions(selected,k!==1)}</select></label>`:''}${quality?'<button class="btn small" id="qrb-list-config">配置总退货率目标</button>':k===1?'<div class="rp-shop-config-actions"><button class="btn small" id="rp-core-link-config">配置核心链接</button><button class="btn small" id="rp-shop-type-config">配置店铺类型</button></div>':''}`;
  openModal(rpTitles[k]+(scopeRows?' · 分组SPU明细':' · 完整榜单'),`${platformTools?`<div class="qr-list-tools rp-platform-tools">${platformTools}</div>`:''}<div class="rp-list-tools">${rpFilterTools(k,filters,selected)}</div>${[0,1].includes(k)?rpQualityListChecks(filters):''}${scopeRows?'<div class="rp-group-context">当前分组的SPU明细</div>':''}<div id="${tableId}" class="rp-list-table${k===1?' rp-shop-table':k===2?' rp-loss-table':k===6?' rp-return-table':[3,4].includes(k)?' rp-stock-table':''}"></div><div id="rp-list-pagination"></div>`,false,riskRangeText());
  const host=$('#'+tableId);host.dataset.rpKind=k;
  const page=()=>quality?qrState.listPage:rfState.page,setPage=n=>{if(quality)qrState.listPage=n;else rfState.page=n};
  const sortState=()=>{const scope='spu';return sorts[scope]||(sorts[scope]=rpRankingDefaultSort(k))};
  function fill(){return rpWithListPeriod(()=>{
   const rows=rpFilterRows(k,scopeRows?rpListRows(k).filter(r=>scopeRows.some(s=>s.id===r.id)):rpListRows(k),filters);
   const keys=rpColumnKeys(k),hasRisk=false;
   const allowed=keys,state=sortState();
   if(state.key&&!allowed.includes(state.key))Object.assign(state,rpRankingDefaultSort(k));
   const fieldsByRow=new Map(),fieldsFor=r=>{if(!fieldsByRow.has(r))fieldsByRow.set(r,rpFieldMap(k,r,filters.qualityOnly,k===0?r.platform:'all'));return fieldsByRow.get(r)};
   const data=rpSortRows(rows,state,(r,key)=>fieldsFor(r).find(f=>f.key===key)?.sortValue,k===1&&state.key==='score'?r=>r.channel:undefined);
   setPage(Math.min(Math.max(1,page()),Math.max(1,Math.ceil(data.length/listPageSize('rp-list-'+k,20)))));
   const metricHeader=key=>{
    const metric=k===4?rpStagnantMetricLabels[key]:null;
    const name=metric?.[0]??rpColumnName(key,rows,k);
    const label=key==='responsibleChannel'?`<span data-preserve-terms>${esc(name)}</span>`:rpSortHeader(key,name,state,k,rpRankingDefaultSort(k));
    return label+(metric?rpStagnantMetricHelp(key):'');
   };
   const headers=['序号',k===1?'店铺信息':[3,4].includes(k)?'SKU信息':'SPU信息',...keys.map(metricHeader),...(hasRisk?[[1,3,4].includes(k)?'命中风险':'命中风险 / 优先级']:[]),'操作'];
   const offset=(page()-1)*listPageSize('rp-list-'+k,20);
   host.innerHTML=data.length?table(headers,data.slice(offset,offset+listPageSize('rp-list-'+k,20)).map((r,i)=>{const fields=fieldsFor(r);return[offset+i+1,rpIdentityMarkup(k,r,true),...keys.map(key=>key==='category'?esc(pfIdentity(r).category||'—'):rpListCell(fields.find(f=>f.key===key),false)),...(hasRisk?[rpRiskCell(k,r)]:[]),`<button type="button" class="link" ${rpDetailAttr(k,r)}>查看详情</button>`]}),'rp-data-table'):`<div class="empty">当前筛选下暂无风险记录</div>`;
   const rankingTable=host.querySelector('table');
   if(rankingTable){
    const wideIdentity=[0,1,2,6,8].includes(k)&&matchMedia('(min-width: 1101px)').matches;
    rankingTable.dataset.columnFill='';
    rankingTable.dataset.columnDefaults=JSON.stringify({0:64,1:wideIdentity?380:280});
    rankingTable.dataset.columnMinimums=JSON.stringify(wideIdentity?{0:64,1:360}:{0:64});
   }
   rpApplySortAria(host,state);
   if(k===1){const header=host.querySelector('thead th:nth-child(3)');if(header){addMetricHelp(header,rpShopCoreRule);header.querySelector('.metric-help').dataset.rpCoreHelp='true'}}
   if(k===2){for(const [key,rule] of [['margin',rpLossMarginHint],['loss',rpLossAmountHint()]]){const header=host.querySelector('th:has([data-rp-sort="'+key+'"])');if(header)addMetricHelp(header,rule)}}
   mountListPager($('#rp-list-pagination'),data.length,page(),n=>{setPage(n);fill();$('#dialogbody').scrollTop=0},'rp-list-'+k);
   host.onclick=e=>{const sort=e.target.closest('[data-rp-sort]');if(sort){const key=sort.dataset.rpSort;rpSortCycle(sortState(),key,rpRankingDefaultSort(k).key?rpRankingDefaultSort(k):null);setPage(1);fill();host.querySelector('[data-rp-sort="'+key+'"]')?.focus({preventScroll:true});return}};
   rpStickListHeader(host);
   host.upRefresh=fill;host.dataset.upRevision=upRuleRevision;if(k===1)host.dataset.shcRevision=shcRevision;
  })}
  if(hasPlatformFilter)$('#'+platformId).onchange=e=>{if(quality)qrState.listPlatform=rpPlatformValue(e.target);else rfState.listPlatforms[k]=rpPlatformValue(e.target);if(k===1){
   const current=$('#dialogbody [data-rp-filter="shopCategory"]')?.closest('.pf-attribute');
   if(current){current.outerHTML=rpShopAttributeField(filters,rfState.listPlatforms[1]);for(const input of $$('#dialogbody .pf-attribute [data-rp-filter]'))input.addEventListener('change',()=>{filters[input.dataset.rpFilter]=pfControlValue(input);setPage(1);fill()});uiArrangeBusinessFilters($('#dialogbody'));pfMultiMount($('#dialogbody'))}
  }setPage(1);fill()};
  for(const input of $$('#dialogbody [data-rp-filter]'))input.addEventListener(input.type==='search'?'input':'change',()=>{filters[input.dataset.rpFilter]=input.type==='checkbox'?input.checked:pfControlValue(input);setPage(1);fill()});
  $('#dialogbody [data-rp-reset]').onclick=()=>{Object.assign(filters,rpDefaultFilters());for(const key of Object.keys(sorts))delete sorts[key];for(const input of $$('#dialogbody [data-rp-filter]')){if(input.type==='checkbox')input.checked=filters[input.dataset.rpFilter];else pfControlSet(input,filters[input.dataset.rpFilter])}const platform=$('#'+platformId);if(platform){pfControlSet(platform,rpQualityPlatformKinds.includes(k)?rpQualityDefaultPlatforms:k===1?'抖音':'all');platform.dispatchEvent(new Event('change',{bubbles:true}))}for(const b of document.querySelectorAll('#dialogbody .pf-attribute [data-pf-attribute-choice]'))b.setAttribute('aria-checked',String(b.dataset.pfAttributeChoice==='all'));const v=document.querySelector('#dialogbody .pf-attribute-value');if(v)v.textContent='全部';setPage(1);fill()};
  if(quality)$('#qrb-list-config').onclick=()=>toast('跳转数智罗盘配置目标退货率');
  if(k===1){$('#rp-shop-type-config').onclick=shcOpenFromRanking;$('#rp-core-link-config').onclick=()=>smNavigate(klcRoute)}
  fill();if(!scopeRows)riskRankingAttach(k);uiArrangeBusinessFilters($('#dialogbody'));pfMultiMount($('#dialogbody'));
  const setPeriod=()=>{$('#dialogbody').dataset.rankingPeriod=JSON.stringify(rpListState.period)};setPeriod();
  const changePeriod=period=>{rpListState.period=period;setPeriod();setPage(1);fill()};
  if([3,4].includes(k))$('#dialogsub').replaceChildren();
  else if([6,8].includes(k))rpMountReturnPeriod($('#dialogsub'),rpListState.period,changePeriod,k);
  else drawerMountPeriod($('#dialogsub'),rpListState.period,changePeriod,'ranking-date-trigger');
 });
}
qrOpenList=function(){return rpOpenList(0)};
rfOpenList=function(k,reset=true){return rpOpenList(k,reset)};
const rpOpenExistingRisk=openRisk;
openRisk=function(k){return k===8?rpOpenList(k,true):rpOpenExistingRisk(k)};
