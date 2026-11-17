const pcRiskLabels={delayed:'上品延期榜',unsold:'已提货未销售',materials:'上市资料预警',initiation:'立项规划预警'};
const pcRiskDate=value=>value?String(value).slice(2,10).replaceAll('-','/'):'—';
const pcRiskText=value=>esc(value||'—');
const pcRiskFilterBoards={launch:['delayed','unsold','materials'],initiation:['initiation']};
const pcRiskOtherBrand='其他品牌';
const pcRiskSelections={launch:{projectType:[],category:[]},initiation:{projectType:[],category:[],brand:[]}};
const pcRiskScopes=[
 ['projectType','项目类型筛选',[...pcProjectRiskTypes.keys()]],
 ['category','项目链群筛选',pfCategories],
 ['brand','品牌筛选',[...filterCatalog.dashboardBrands,pcRiskOtherBrand]]
];
function pcRiskScopeMatches(row,key,selected){
 if(!selected.length)return true;
 if(key!=='brand')return pfIncludes(selected,row[key]);
 const brands=ppValues(row.brand).flatMap(value=>String(value).split(/[\/、,，;；\n]+/)).map(value=>value.trim());
 return brands.some(brand=>{
  if(!brand||/^(?:[-—–]+|未填写|待补充)$/.test(brand))return false;
  return selected.includes(filterCatalog.dashboardBrands.includes(brand)?brand:pcRiskOtherBrand);
 });
}
function pcRiskMatches(row,selection,except){
 return Object.entries(selection).every(([key,selected])=>
  key===except||key==='category'&&pcChain()!==null||pcRiskScopeMatches(row,key,selected));
}
function pcRiskBoardData(key){
 const data=pcCurrentRiskData[key],selection=pcRiskSelections[key==='initiation'?'initiation':'launch'];
 return {...data,rows:data.rows.filter(row=>pcRiskMatches(row,selection))};
}
function pcRiskScopeGroups(group){
 const rows=pcRiskFilterBoards[group].flatMap(key=>pcCurrentRiskData[key].rows),selection=pcRiskSelections[group];
 return pcRiskScopes.filter(([key])=>Object.hasOwn(selection,key)&&(key!=='category'||pcChain()===null)).map(([key,ariaLabel,values])=>{
  const candidates=rows.filter(row=>pcRiskMatches(row,selection,key));
  const options=[{value:'all',label:'全部'},...values.map(value=>({value,label:value}))];
  const tags=options.map(option=>{
   const count=option.value==='all'?candidates.length:candidates.filter(row=>pcRiskScopeMatches(row,key,[option.value])).length;
   return rpSeasonTagMarkup(option,count,pfOptionSelected(selection[key],option.value),'data-pc-risk-option');
  }).join('');
  return `<div class="rp-season-tags" data-pc-risk-scope="${key}" role="group" aria-label="${ariaLabel}">${tags}</div>`;
 }).join('');
}
function pcRiskFilterBar(group,label){
 return `<div class="pc-risk-filters" data-pc-risk-filter="${group}" role="group" aria-label="${label}筛选">${pcRiskScopeGroups(group)}</div>`;
}
function pcRiskFields(key,row={},drawer=false){
 const field=(label,value,note='',tone='')=>({label,value,note,tone});
 const manager=drawer?[field('产品经理',row.manager)]:[];
 if(key==='unsold')return [
  field('我司可售库存',row.stock===undefined?'':fmt(row.stock)+' 件'),
  {label:nspUnsoldProductionDateLabel,value:pcRiskDate(row.actualProductionDate),help:nspUnsoldProjectHelp(nspUnsoldProductionDateLabel)},
  {...field('销售渠道',row.salesChannel),preserveTerms:true},...manager,
  ...(drawer?[field('首批请购单号',row.requisitionNo),field('首批单状态',row.firstRequisitionStatus)]:[])
 ];
 if(key==='initiation')return [
  field('立项日期',pcRiskDate(row.date),row.wait?`延期 ${row.wait}天`:'','pc-risk-initiation-delay'),
  field('目标上市日期',pcRiskDate(row.targetLaunchDate)),
  {...field('销售渠道',row.channel),preserveTerms:true},
  field('提需人',row.requester),
  field('产品经理',row.manager)
 ];
 if(key==='delayed'){
  const date=field('延期上市日期',pcRiskDate(row.revised));
  const delay={label:'延期天数',markup:ppDelayText(row)};
  const blockers=pcRiskText(row.blockers);
  return [
   ...(drawer?[date,delay]:[delay,date]),
   {...field('销售渠道',row.channel),preserveTerms:true},...manager,
   {label:'卡点任务',markup:row.blockers?`<button type="button" class="pc-risk-blockers" data-metric-text-label="卡点任务">${blockers}</button>`:blockers}
  ];
 }
 return [
  field(drawer?'计划上市时间':'计划上市日期',pcRiskDate(row.planned)),
  drawer?field('延期天数',row.delay===undefined?'':row.delay+' 天'):field('延期上市日期',row.revised?pcRiskDate(row.revised):'--',row.revised?'延期'+row.delay+'天':'',row.revised?'rp-quality-red':''),
  {...field('销售渠道',row.channel),preserveTerms:true},...manager,
  ...(drawer?[field('卡点任务',row.blockers||'无卡点')]:[])
 ];
}
function pcRiskAction(key,row){
 const target=key==='unsold'?'requisition':key==='initiation'?row.source:'project';
 const label=key==='unsold'?'请购单':'详情';
 return `<button type="button" class="link rp-detail-link ui-icon-label" data-pc-risk-action="${esc(target)}"><span>${label}</span><span class="ui-chevron-right" aria-hidden="true"></span></button>`;
}
function pcRiskIdentity(key,row,preview=false){
 const projectType=pcProjectRiskTypes.get(row.projectType)??row.type;
 let sub=projectType;
 if(key==='initiation'){
  const source=row.source==='wps'?'立项云文档':'运营提需池';
  sub=[projectType,row.category,row.brand,'来源：'+source].filter(Boolean).join(' | ');
 }
 else if(preview)sub=[projectType,row.category,row.manager].filter(Boolean).join(' | ');
 return `<div class="rp-identity pc-risk-identity">${riskThumbnail(row.imageFrom||row.name)}<div><div class="rp-identity-title"><b title="${esc(row.name)}">${esc(row.name)}</b>${preview?pcRiskAction(key,row):''}</div>${sub?`<small class="rp-identity-subtitle" title="${esc(sub)}">${esc(sub)}</small>`:''}</div></div>`;
}
function pcRiskCardNotice(key){
 const projectTypes=[...pcProjectRiskTypes.keys()].join('、');
 const rules={
  delayed:{
   pool:[`项目类型为${projectTypes}，截至统计日尚未完成。`,'延期量产日期比原计划量产日期晚至少 90 天。'],
   sort:['延期天数从多到少。','延期天数相同时，延期上市日期从早到晚。']
  },
  unsold:{
   pool:['已下首批请购单，且截至统计日已完成部分或全部交付。','我司可售库存大于 0，且尚未检测到首个销售订单。'],
   sort:['我司可售库存从高到低。','库存相同时，项目上市日期从早到晚，无日期的排在最后。']
  },
  materials:{
   pool:[`项目类型为${projectTypes}，截至统计日尚未完成。`,'预计在 60 天内上市（含统计日当天），提醒产品经理向设计中心提交上市资料。','已有延期上市日期时按延期日期计算，其余按原计划日期计算。'],
   sort:['按距预计上市的天数从少到多。','距上市天数相同时，延期天数从多到少。']
  }
 };
 const rule=rules[key];
 if(!rule)return '演示数据 · 审批通过后仍待立项 / 立项后缺 OA 单号满 5 个工作日，等待越久越靠前。原型暂按周一至周五；运营提需池待接入，立项云文档：待定。';
 return ['入榜条件',...rule.pool.map(line=>'• '+line),'','排序规则',...rule.sort.map((line,index)=>`${index+1}. ${line}`)].join('\n');
}
function pcRiskMetricNote(field,keepSpace=false){
 if(!field.note&&!keepSpace)return '';
 return `<small class="${field.tone||''}">${field.note?esc(field.note):'&nbsp;'}</small>`;
}
function pcRiskMetricValue(field,wide){
 const value=field.markup??pcRiskText(field.value);
 const title=field.markup?'':` title="${value}"`;
 const preserve=field.preserveTerms?' data-preserve-terms':'';
 const note=pcRiskMetricNote(field,wide);
 const label=wide?'':`<span class="rp-quality-mobile-label">${esc(field.label)}${field.help||''}</span>`;
 return `<div class="rp-quality-metric"${wide?' role="cell"':''} aria-label="${esc(field.label)}">${label}<span class="rp-metric-text"${title}${preserve}>${value}</span>${note}</div>`;
}
function pcRiskLaunchEntry(key,row,index,fields){
 const values=fields.map(field=>pcRiskMetricValue(field,false)).join('');
 return `<article class="rp-entry rp-quality-entry pc-risk-entry"><div class="rp-entry-main"><header><span class="rank">${String(index+1).padStart(2,'0')}</span>${pcRiskIdentity(key,row,true)}</header><div class="rp-quality-values pc-risk-values">${values}</div></div></article>`;
}
function pcRiskTableEntry(key,row,index,fields){
 const identity=pcRiskIdentity(key,row,true),values=fields.map(field=>pcRiskMetricValue(field,true)).join('');
 return `<article class="rp-entry rp-quality-entry" role="row"><div class="rp-entry-main" role="presentation"><header role="cell"><span class="rank">${String(index+1).padStart(2,'0')}</span>${identity}</header><div class="rp-quality-values rp-loss-values" role="presentation">${values}</div></div></article>`;
}
function pcRiskPreview(key,rows,wide){
 const columns=wide?`<div class="rp-quality-columns rp-loss-columns" role="row"><span class="rp-loss-product-label" role="columnheader">产品信息</span>${pcRiskFields(key).map(f=>`<span role="columnheader">${f.label}</span>`).join('')}</div>`:'';
 const entry=wide?pcRiskTableEntry:pcRiskLaunchEntry;
 const preview=rows.slice(0,6).map((row,index)=>entry(key,row,index,pcRiskFields(key,row))).join('');
 return columns+(preview||'<div class="empty">暂无符合规则的预警</div>');
}
function pcRiskBoard(key,{asOf,rows}){
 const wide=key==='initiation';
 const cutoff=`截至 ${pcRiskDate(asOf)}`;
 const heading=wide?pcRiskFilterBar('initiation',pcRiskLabels[key]):`<div class="pc-risk-heading"><h3>${pcRiskLabels[key]}</h3><small class="period-range">${cutoff}</small></div>`;
 const date=wide?`<div class="rp-quality-date"><small>${cutoff} · 演示数据</small></div>`:'';
 const previewRole=wide?'table':'region';
 return `<article class="riskcard pc-risk-card${wide?' rp-wide-fields':''}" data-rp-board="pc-${key}"${wide?` style="--rp-loss-table-columns:minmax(260px,2fr) repeat(${pcRiskFields(key).length},minmax(120px,1fr))"`:''}>
  <div class="rhead rp-compact-header">${heading}<div class="rp-quality-actions"><button type="button" class="link ui-icon-label" data-pc-risk-all="${key}"><span>查看全部 ${rows.length}</span><span class="ui-chevron-right" aria-hidden="true"></span></button></div></div>
  ${date}
  <div class="rp-items" role="${previewRole}" aria-label="${pcRiskLabels[key]}${wide?'':'预览'}"${wide?' tabindex="0"':''}>${pcRiskPreview(key,rows,wide)}</div></article>`;
}
function pcRiskOpenList(key){
 if($('#overlay').hidden){riskRankingPages.clear();rpResetListSession()}
 const kind='pc-'+key,{rows}=pcRiskBoardData(key);
 const state=riskRankingPages.get(kind)||{query:'',page:1};
 riskRankingPages.set(kind,state);
 const headings=[key==='initiation'?'产品信息':'产品名称',...pcRiskFields(key,{},true).map(f=>f.help?`${f.label} ${f.help}`:f.label),'操作'];
 openModal(riskRankingTitle(),`<div class="rp-list-tools"><label class="ui-search-field"><input type="search" aria-label="搜索产品" placeholder="搜索产品名称"></label></div><div class="rp-list-table"></div><div class="pc-risk-pager"></div>`,true);
 // 此处无日期控件，清除通用弹窗自动拼入的期间摘要。
 $('#dialogsub').replaceChildren();
 const root=$('#dialogbody'),search=root.querySelector('input'),host=root.querySelector('.rp-list-table'),pager=root.querySelector('.pc-risk-pager');
 const sizeKey='rp-list-'+kind;
 search.value=state.query;
 function paint(){
  const query=state.query.trim().toLocaleLowerCase(),filtered=rows.filter(row=>row.name.toLocaleLowerCase().includes(query));
  const size=listPageSize(sizeKey);
  state.page=Math.min(state.page,Math.max(1,Math.ceil(filtered.length/size)));
  const offset=(state.page-1)*size;
  const cells=field=>{
   const value=field.markup??pcRiskText(field.value);
   const content=field.preserveTerms?`<span data-preserve-terms>${value}</span>`:value;
   return content+pcRiskMetricNote(field);
  };
  host.innerHTML=filtered.length?table(headings,filtered.slice(offset,offset+size).map(row=>[pcRiskIdentity(key,row),...pcRiskFields(key,row,true).map(cells),pcRiskAction(key,row)]),'rp-data-table'):'<div class="empty">暂无符合规则的预警</div>';
  rpStickListHeader(host);
  mountListPager(pager,filtered.length,state.page,next=>{state.page=next;paint()},sizeKey);
 }
 search.oninput=()=>{state.query=search.value;state.page=1;paint()};
 paint();riskRankingAttach(kind);
}
function pcApplyRiskOption(button){
 const scope=button.closest('[data-pc-risk-scope]'),bar=scope.closest('.pc-risk-filters');
 const key=scope.dataset.pcRiskScope,value=button.dataset.pcRiskOption,group=bar.dataset.pcRiskFilter;
 const selection=pcRiskSelections[group];
 selection[key]=pfSelected(pfToggleChoice(selection[key],value));
 bar.innerHTML=pcRiskScopeGroups(group);
 for(const boardKey of pcRiskFilterBoards[group]){
  const board=$(`#riskrail [data-rp-board="pc-${boardKey}"]`),{rows}=pcRiskBoardData(boardKey);
  board.querySelector('.rp-items').innerHTML=pcRiskPreview(boardKey,rows,boardKey==='initiation');
  board.querySelector('[data-pc-risk-all]>span').textContent='查看全部 '+rows.length;
 }
 rpFocusSeasonTag(bar.querySelector(`[data-pc-risk-scope="${key}"] [data-pc-risk-option="${CSS.escape(value)}"]`));
 rpQueueGroupNavigation();
}
$('#riskrail').addEventListener('keydown',event=>{
 const option=event.target.closest('[data-pc-risk-option]');
 const next=option&&rpSeasonTagInDirection(option,event.key);if(!next)return;
 event.preventDefault();
 rpFocusSeasonTag(next);
});
document.addEventListener('click',event=>{
 if(!pcIsActive())return;
 const option=event.target.closest('#riskrail [data-pc-risk-option]');
 if(option){pcApplyRiskOption(option);return}
 const more=event.target.closest('#riskrail [data-pc-risk-all]'),action=event.target.closest('[data-pc-risk-action]');
 if(more&&pcCurrentRiskData)pcRiskOpenList(more.dataset.pcRiskAll);
 if(action)toast(({project:'跳转项目详情页-风险管理tab',requisition:'跳转请购单详情页',demand:'跳转提需详情抽屉',wps:'打开立项云文档在线地址：'+pcInitiationDocumentUrl})[action.dataset.pcRiskAction]);
});
