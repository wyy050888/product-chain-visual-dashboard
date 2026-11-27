const pcRiskLabels={delayed:'上品延期榜',unsold:'已提货未销售',materials:'上市资料预警',initiation:'立项规划预警'};
const pcRiskDate=value=>value?String(value).slice(2,10).replaceAll('-','/'):'—';
const pcRiskText=value=>esc(value||'—');
const pcRiskFilterBoards={launch:['delayed','unsold','materials'],initiation:['initiation']};
const pcRiskOtherBrand='其他品牌';
const pcRiskSources={demand:'运营提需池',wps:'立项云文档'};
const pcRiskSelections={launch:{projectType:[],category:[]},initiation:{projectType:[],category:[],brand:[]}};
const pcRiskScopes=[
 ['projectType','项目类型',[...pcProjectRiskTypes.keys()]],
 ['category','链群',pfCategories],
 ['brand','品牌',[...filterCatalog.dashboardBrands,pcRiskOtherBrand]]
];
function pcRiskGroupScopes(group){
 return pcRiskScopes.filter(([key])=>Object.hasOwn(pcRiskSelections[group],key)&&(key!=='category'||pcChain()===null));
}
function pcRiskFieldValues(value){
 return ppValues(value).flatMap(item=>String(item).split(/[\/、,，;；\n]+/)).map(item=>item.trim()).filter(Boolean);
}
function pcRiskScopeMatches(row,key,selected){
 if(!selected.length)return true;
 if(['channel','salesChannel'].includes(key))return pcRiskFieldValues(row[key]).some(value=>selected.includes(value));
 if(key!=='brand')return pfIncludes(selected,row[key]);
 return pcRiskFieldValues(row.brand).some(brand=>{
  if(/^(?:[-—–]+|未填写|待补充)$/.test(brand))return false;
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
 return pcRiskGroupScopes(group).map(([key,label,values])=>{
  const candidates=rows.filter(row=>pcRiskMatches(row,selection,key));
  const options=[{value:'all',label:'全部'},...values.map(value=>({value,label:value}))];
  const tags=options.map(option=>{
   const count=option.value==='all'?candidates.length:candidates.filter(row=>pcRiskScopeMatches(row,key,[option.value])).length;
   return rpSeasonTagMarkup(option,count,pfOptionSelected(selection[key],option.value),'data-pc-risk-option');
  }).join('');
  const ariaLabel=key==='category'?'项目链群筛选':label+'筛选';
  return `<div class="rp-season-tags" data-pc-risk-scope="${key}" role="group" aria-label="${ariaLabel}">${tags}</div>`;
 }).join('');
}
function pcRiskFilterBar(group,label){
 return `<div class="pc-risk-filters" data-pc-risk-filter="${group}" role="group" aria-label="${label}筛选">${pcRiskScopeGroups(group)}</div>`;
}
function pcRiskTaskField(label,value){
 return {label,markup:value?`<button type="button" class="pc-risk-blockers" data-metric-text-label="${label}">${esc(value)}</button>`:'—'};
}
function pcRiskInitiationNote(row){
 if(row.daysToTarget>0)return `距目标完成还有 ${row.remaining} 天`;
 if(row.daysToTarget===0)return '今日到期';
 return row.wait?`延期 ${row.wait}天`:'';
}
function pcRiskFields(key,row={},drawer=false){
 const field=(label,value,note='',tone='')=>({label,value,note,tone});
 const manager=drawer?[field('产品经理',row.manager)]:[];
 if(key==='unsold')return [
  field('我司可售库存',row.stock===undefined?'':fmt(row.stock)+' 件'),
  {label:nspUnsoldProductionDateLabel,value:pcRiskDate(row.actualProductionDate),help:nspUnsoldProjectHelp(nspUnsoldProductionDateLabel)},
  {...field('销售渠道',row.salesChannel),preserveTerms:true},...manager,
  ...(drawer?[field('首批请购单号',row.requisitionNo),{
   label:'首批单状态',markup:row.firstRequisitionStatus?nspRequisitionStatusTag(row.firstRequisitionStatus):'—'
  }]:[])
 ];
 if(key==='initiation')return [
  field('预计立项日期',pcRiskDate(row.date),pcRiskInitiationNote(row),row.source==='wps'&&row.daysToTarget>=0?'orange':'pc-risk-initiation-delay'),
  field('目标上市日期',pcRiskDate(row.targetLaunchDate)),
  {...field('销售渠道',row.channel),preserveTerms:true},
  field('提需人',row.requester),
  {...field('产品经理',row.manager),help:ppHelp('产品经理','来源于运营提需池的产品经理，如需修改，请前往【系统管理-用户管理-链群配置】中配置链群相关的产品中心人员')}
 ];
 if(key==='delayed'){
  const planned=field('计划上市日期',pcRiskDate(row.planned));
  const date=field('延期上市日期',pcRiskDate(row.revised));
  const delay={label:'延期天数',markup:ppDelayText(row)};
  return [
   ...(drawer?[planned,date,delay]:[delay,date]),
   {...field('销售渠道',row.channel),preserveTerms:true},...manager,
   pcRiskTaskField('当前任务',row.blockers)
  ];
 }
 const revisedDate=field('延期上市日期',drawer||row.revised?pcRiskDate(row.revised):'--');
 if(!drawer&&row.revised){
  revisedDate.markup=`${pcRiskText(revisedDate.value)}<small class="pc-risk-material-delay rp-quality-red">延期${esc(row.delay)}天</small>`;
 }
 return [
  field('计划上市日期',pcRiskDate(row.planned)),
  revisedDate,
  ...(drawer?[field('延期天数',row.delay>0?row.delay+' 天':'—')]:[]),
  {...field('销售渠道',row.channel),preserveTerms:true},...manager,
  ...(drawer?[pcRiskTaskField('当前任务',row.currentTask)]:[])
 ];
}
function pcRiskAction(key,row,preview=false){
 const target=key==='unsold'?'requisition':key==='initiation'?row.source:'project';
 if(!preview){
  const label={project:'查看详情',requisition:'查看请购单',demand:'查看提需详情',wps:'查看立项云文档'}[target];
  return `<button type="button" class="link" data-pc-risk-action="${esc(target)}">${label}</button>`;
 }
 const label=key==='unsold'?'请购单':'详情';
 return `<button type="button" class="link rp-detail-link ui-icon-label" data-pc-risk-action="${esc(target)}"><span>${label}</span><span class="ui-chevron-right" aria-hidden="true"></span></button>`;
}
function pcRiskIdentity(key,row,preview=false){
 const projectType=pcProjectRiskTypes.get(row.projectType)??row.type;
 let sub;
 if(key==='initiation'){
  const source=pcRiskSources[row.source];
  sub=[projectType,row.category,row.brand,'来源：'+source].filter(Boolean).join(' | ');
 }
 else sub=[projectType,row.category,preview?row.manager:null].filter(Boolean).join(' | ');
 return `<div class="rp-identity pc-risk-identity">${riskThumbnail(row.imageFrom||row.name)}<div><div class="rp-identity-title"><b title="${esc(row.name)}">${esc(row.name)}</b>${preview?pcRiskAction(key,row,true):''}</div>${sub?`<small class="rp-identity-subtitle" title="${esc(sub)}">${esc(sub)}</small>`:''}</div></div>`;
}
const pcRiskDelayThreshold='≥ 90 天';
function pcRiskCardNotice(key){
 const projectTypes=[...pcProjectRiskTypes.keys()].join('、');
 const rules={
  delayed:{
   pool:[`项目类型为${projectTypes}，截至统计日尚未完成。`,`延期量产日期 - 原计划量产日期 ${pcRiskDelayThreshold}`],
   sort:['延期天数从多到少。','延期天数相同时，延期上市日期从早到晚。']
  },
  unsold:{
   pool:['已下首批请购单，且截至统计日已完成部分或全部交付。','我司可售库存大于 0，且尚未检测到首个销售订单。'],
   sort:['我司可售库存从高到低。','库存相同时，项目上市日期从早到晚，无日期的排在最后。']
  },
  materials:{
   pool:[`项目类型为${projectTypes}，截至统计日尚未完成。`,'预计在 60 天内上市（含统计日当天），提醒产品经理向设计中心提交上市资料。','已有延期上市日期时按延期日期计算，其余按原计划日期计算。'],
   sort:['按距预计上市的天数从少到多。','距上市天数相同时，延期天数从多到少。']
  },
  initiation:{
   pool:[`运营提需池：最终审批通过后满 ${pcRiskInitiationDays} 天，且截至统计日仍为「待立项」。`,`立项云文档：距立项目标完成时间 ${pcRiskInitiationDays} 天起，立项 OA 单号为空即预警，填单号后解除。`],
   sort:['待立项及已到目标日期的记录优先，按等待或延期天数从多到少排列。','尚未到期的记录，按立项目标完成时间从早到晚排列。']
  }
 };
 const rule=rules[key];
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
 const columns=wide?`<div class="rp-quality-columns rp-loss-columns" role="row"><span class="rp-loss-product-label" role="columnheader">产品信息</span>${pcRiskFields(key).map(({label,help})=>`<span role="columnheader"${help?' data-risk-field-help':''}>${esc(label)}${help||''}</span>`).join('')}</div>`:'';
 const entry=wide?pcRiskTableEntry:pcRiskLaunchEntry;
 const preview=rows.slice(0,6).map((row,index)=>entry(key,row,index,pcRiskFields(key,row))).join('');
 return columns+(preview||'<div class="empty">暂无符合规则的预警</div>');
}
function pcRiskBoard(key,{rows}){
 const wide=key==='initiation';
 const heading=wide?pcRiskFilterBar('initiation',pcRiskLabels[key]):`<h3>${pcRiskLabels[key]}</h3>`;
 const previewRole=wide?'table':'region';
 const emphasis=key==='delayed'?` data-rp-rule-emphasis="${esc(pcRiskDelayThreshold)}"`:'';
 return `<article class="riskcard pc-risk-card${wide?' rp-wide-fields':''}" data-rp-board="pc-${key}"${emphasis}${wide?` style="--rp-loss-table-columns:minmax(260px,2fr) repeat(${pcRiskFields(key).length},minmax(120px,1fr))"`:''}>
  <div class="rhead rp-compact-header">${heading}<div class="rp-quality-actions"><button type="button" class="link ui-icon-label" data-pc-risk-all="${key}"><span>查看全部 ${rows.length}</span><span class="ui-chevron-right" aria-hidden="true"></span></button></div></div>
  <div class="rp-items" role="${previewRole}" aria-label="${pcRiskLabels[key]}${wide?'':'预览'}"${wide?' tabindex="0"':''}>${pcRiskPreview(key,rows,wide)}</div></article>`;
}
const pcRiskSearchFields={
 delayed:[['name','产品名称'],['blockers','当前任务']],
 unsold:[['name','产品名称'],['requisitionNo','首批请购单号']],
 materials:[['name','产品名称'],['currentTask','当前任务']],
 initiation:[['name','产品名称'],['requester','提需人']]
};
function pcRiskListFilters(key,rows,group){
 const channel=key==='unsold'?'salesChannel':'channel';
 const channels=[...new Set(rows.flatMap(row=>pcRiskFieldValues(row[channel])))];
 const filters=pcRiskGroupScopes(group);
 filters.push([channel,'销售渠道',channels]);
 if(key==='initiation'){
  const sources=Object.entries(pcRiskSources).map(([value,label])=>({value,label}));
  filters.push(['source','来源',sources]);
 }
 if(key==='unsold')filters.push(['firstRequisitionStatus','首批单状态',['交付中','交付完成']]);
 return filters;
}
function pcRiskOpenList(key){
 if($('#overlay').hidden){riskRankingPages.clear();rpResetListSession()}
 const kind='pc-'+key,{rows}=pcCurrentRiskData[key];
 const group=key==='initiation'?'initiation':'launch',homeFilters=pcRiskSelections[group];
 const state=riskRankingPages.get(kind)||{query:'',page:1,filters:{...homeFilters}};
 riskRankingPages.set(kind,state);
 const headings=[key==='initiation'?'产品信息':'产品名称',...pcRiskFields(key,{},true).map(f=>f.help?`${f.label} ${f.help}`:f.label),'操作'];
 const fields=[...pcRiskSearchFields[key],['manager','产品经理']],placeholder=fields.map(([,label])=>label).join(' / ');
 const controls=pcRiskListFilters(key,rows,group).map(([field,label,values])=>rpFilterSelect(field,label,values,state.filters)).join('');
 riskRankingOpenModal(riskRankingTitle(),`<div class="rp-list-tools pc-risk-list-tools"><label class="rp-search-label"><input type="search" aria-label="搜索${esc(placeholder)}" placeholder="${esc(placeholder)}" value="${esc(state.query)}"></label>${controls}<button type="button" class="link" data-rp-reset>重置筛选</button></div><div class="rp-list-table pc-risk-list" data-pc-risk-list="${key}"></div><div class="pc-risk-pager"></div>`,true);
 // 此处无日期控件，清除通用弹窗自动拼入的期间摘要。
 $('#dialogsub').replaceChildren();
 const root=$('#dialogbody'),search=root.querySelector('input'),host=root.querySelector('.rp-list-table'),pager=root.querySelector('.pc-risk-pager');
 const sizeKey='rp-list-'+kind;
 function paint(){
  const query=state.query.trim().toLocaleLowerCase();
  const filtered=rows.filter(row=>pcRiskMatches(row,state.filters)&&(!query||fields.some(([field])=>String(row[field]??'').toLocaleLowerCase().includes(query))));
  const size=listPageSize(sizeKey);
  state.page=Math.min(state.page,Math.max(1,Math.ceil(filtered.length/size)));
  const offset=(state.page-1)*size;
  const cells=field=>{
   const value=field.markup??pcRiskText(field.value);
   const content=field.preserveTerms?`<span data-preserve-terms>${value}</span>`:value;
   return content+pcRiskMetricNote(field);
  };
  host.innerHTML=filtered.length?table(headings,filtered.slice(offset,offset+size).map(row=>[pcRiskIdentity(key,row),...pcRiskFields(key,row,true).map(cells),pcRiskAction(key,row)]),'rp-data-table'):'<div class="empty">当前筛选下暂无风险记录</div>';
  host.querySelector('table')?.setAttribute('data-column-fill','');
  rpStickListHeader(host);
  mountListPager(pager,filtered.length,state.page,next=>{state.page=next;paint();root.scrollTop=0},sizeKey);
 }
 const refresh=()=>{state.page=1;paint()};
 const selects=root.querySelectorAll('select[data-rp-filter]');
 search.oninput=()=>{state.query=search.value;refresh()};
 for(const select of selects)select.onchange=()=>{
  state.filters[select.dataset.rpFilter]=pfSelected(pfControlValue(select));
  refresh();
 };
 root.querySelector('[data-rp-reset]').onclick=()=>{
  state.query=search.value='';state.filters={};
  for(const select of selects)pfControlSet(select,'all');
  refresh();
 };
 paint();riskRankingAttach(kind);uiArrangeBusinessFilters(root);
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
