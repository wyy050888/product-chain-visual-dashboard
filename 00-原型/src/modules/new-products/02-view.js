// 明细统一展示是否成功；历史季度仍保留在模型中用于出池和考核。
const nspHeaders=['SPU系列','产品简称','指导价','GSV','销量','利润率','是否成功','总退','已收退','未收退','我司可售库存','销售状态','上线天数','上线日期','销售渠道','项目类型','操作'];
const nspSalesChannelRule='销售渠道：截至统计截止日已有销售记录的平台；当期无销量的历史平台仍保留。\n识别局限：历史销售记录缺失时，老品在新平台销售可能被识别为新品。';
let nspPoolRule='新品判定：按产品简称归集 SPU，上市日期取成员中最早的上市日期。\n季度考核：按产品简称合计当季业绩；未成功跨季度、跨年滚入，首次成功后不再重复考核。\n新品出池：首次成功季度末＋30个自然日；未成功继续保留。\n历史查询：按考核季度查看全部、成功、不成功，包含已出池产品。';
// 平台复用已有图标；内部大区保留真实渠道名称，不映射为平台。
function nspChannelIcon(name){return drawerPlatformLogos[name]?rpPlatformMark(name):esc(name)}
function nspSalesChannelIcons(names){
 return '<div class="nsp-channels-list" aria-label="'+esc(names.join('、')||'暂无已采集的销售渠道')+'">'+(names.length?names.map(nspChannelIcon).join(''):'—')+'</div>';
}
function nspTableHeaders(){
 const keys={'上线天数':'days','GSV':'gsv','销量':'netSales','利润率':'profit','总退':'returns','已收退':'received','未收退':'unreceived','我司可售库存':'warehouse','上线日期':'launch','指导价':'guidePrice'};
 const period=periodFor('new'),prefix=periodShortText(period);
 const headers=[...nspHeaders];if(period.mode==='year')headers.splice(headers.indexOf('是否成功')+1,0,'年度是否成功');
 return headers.map(name=>{
  const label=['GSV','销量','利润率'].includes(name)?prefix+name:name;
  const key=keys[name];if(!key)return label+(name==='销售渠道'?nspKpiHelp('销售渠道',nspSalesChannelRule):name==='是否成功'||name==='年度是否成功'?nspKpiHelp(name,nspStatusRule(name==='年度是否成功')):'');
  const active=nspSort.key===key,direction=active?nspSort.direction:'',next=active?(direction==='asc'?'降序':'升序'):(key==='launch'?'升序':'降序');
  const help=key==='guidePrice'?nspKpiHelp('指导价','此处为抖音渠道指导价'):key==='netSales'?netSalesHelp(key):key==='launch'?nspKpiHelp('上线日期','上线日期：该产品在所有销售渠道中，首笔销售订单对应的日期\n延期天数：该产品关联项目中记录的延期上线天数，仅延期时展示'):'';
  return `<button type="button" class="rp-sort-header" data-nsp-sort="${key}" data-direction="${direction}" aria-label="${label}：点击${next}">${label}<span class="rp-sort-arrows" aria-hidden="true"></span></button>${help}`;
 });
}
// 状态仅调整展示名称，保留已有筛选值及库存判定。
function nspSalesStatusLabel(state){return state==='滞销'?'呆滞':state}
function nspSelect(key,label,values,current,multiple=false){
 return `<label class="unified-filter-field"><span>${label}</span><select data-nsp-filter="${key}" aria-label="新品${label}"${multiple?` multiple data-pf-multiple data-pf-label="${esc(label)}"`:''}><option value="all" ${pfOptionSelected(current,'all')?'selected':''}>全部</option>${values.map(v=>`<option value="${esc(v)}" ${pfOptionSelected(current,v)?'selected':''}>${esc(key==='status'?nspSalesStatusLabel(v):v)}</option>`).join('')}</select></label>`;
}
// 成功状态直接展示枚举；原生单选保留键盘与互斥行为。
function nspSuccessEnums(current){
 const choices=[['all','全部'],['成功','成功'],['不成功','不成功']];
 return '<div class="nsp-success-enums" role="radiogroup" aria-label="新品成功状态"><span class="nsp-success-label">是否成功</span><div class="nsp-success-values">'+choices.map(([value,label])=>'<label><input type="radio" name="nsp-success" data-nsp-filter="success" value="'+value+'" '+(current===value?'checked':'')+'><span>'+label+'</span></label>').join('')+'</div></div>';
}
// 只折叠筛选控件，不清空条件；DOM保留以维持输入、菜单及日期状态。
function nspFilterCollapse(host){
 let button=host.querySelector('[data-nsp-filter-toggle]');
 if(!button){
  button=document.createElement('button');button.type='button';button.className='nsp-filter-toggle';
  button.dataset.nspFilterToggle='';button.setAttribute('aria-controls',host.id);host.append(button);
 }
 const sync=()=>{
  const expanded=host.dataset.expanded==='true';
  button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',expanded?'收起新品筛选':'展开新品筛选');
  button.innerHTML=`<span>${expanded?'收起':'展开'}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg>`;
 };
 button.onclick=()=>{
  const expanded=host.dataset.expanded!=='true';host.dataset.expanded=String(expanded);
  if(!expanded){host.querySelectorAll('[popover]:popover-open').forEach(panel=>panel.hidePopover());host.querySelectorAll('details[open]').forEach(menu=>menu.open=false)}
  sync();
 };
 sync();
}
function nspToolbar(){
 let host=$('#new-linked-filter');
 if(!host){host=document.createElement('div');host.id='new-linked-filter';$('#newtable').before(host)}
 host.className='nsp-filters ui-business-filters';
 // 控件只创建一次；联动更新内容时保留搜索焦点、多选菜单和日期面板。
 if(!host.querySelector('[data-nsp-search]')){
  host.innerHTML=`<label class="ui-search-field"><input type="search" data-nsp-search placeholder="搜索产品简称 / SPU名称 / 型号" aria-label="新品搜索" value="${esc(nspFilters.query)}"></label>`
  +nspSelect('brand','品牌',[...new Set(sampleSpus.filter(p=>p.cohort==='new').map(p=>p.brand))],nspFilters.brand)
  +nspSelect('channel','销售渠道',filterCatalog.platforms,nspFilters.channel)
  +nspSelect('status','销售状态',newSalesStatuses,nspFilters.status)
  +nspSuccessEnums(nspFilters.success)
  +nspLaunchPickerHTML()+kpmPriceMarkup(nspFilters,'new');
  host.querySelector('[data-nsp-search]').oninput=e=>{nspFilters.query=e.target.value;newProductSelection.page=1;nspRefreshResults()};
  host.querySelectorAll('[data-nsp-filter]').forEach(select=>select.onchange=e=>{nspFilters[e.target.dataset.nspFilter]=pfControlValue(e.target);newProductSelection.page=1;nspRefreshResults()});
  nspBindLaunchFilter(host);decorateFilterFields(host);
 }
 for(const control of host.querySelectorAll('[data-nsp-filter]')){if(control.type==='radio')control.checked=control.value===nspFilters[control.dataset.nspFilter];else pfControlSet(control,nspFilters[control.dataset.nspFilter])}
 pfMultiMount(host);
 const priceHost=host.querySelector('[data-kpm-price-host=new]');
 if(!priceHost.kpmPriceControl)kpmMountPriceFilter(priceHost,nspFilters,()=>{newProductSelection.page=1;nspRefreshResults()});
 priceHost.kpmPriceControl.sync();nspFilterCollapse(host);
}
function nspRenderOverview(rows){
 const scope=nspFilterRows(rows),poolRows=scope.filter(p=>p.inNewPool);
 const assessment=nspSuccessPeriod();
 const unsold=nspUnsoldSummary();
 // 卡片选中态与成功状态共用筛选值；metric仅保留兼容审计标记。
 newProductSelection.metric='all';
 // 产品组件沿用产品筛选；项目及时率只映射品牌、类目，分布只展示在池产品。
 const indicators=[
  nspSuccessKpi(nspSuccessSummary(nspSuccessScope(rows),assessment)),
  nspDeliveryKpi(nspDeliverySummary(assessment)),
  nspUnsoldKpi(unsold.rows.length)
 ].join('');
 const host=$('#newtop'),markup='<div class="nsp-kpis nsp-primary-kpis">'+indicators+'</div>'+nspOperatingKpis(poolRows)+nspPriceDistribution(rows)+nspPlatformChart(poolRows);
 if(dashboardRenderMarkup(host,markup))nspObserveChartTypography(host);
 host.querySelector('[data-nsp-unsold]').onclick=()=>nspOpenUnsold(unsold);
}
function nspRefreshResults(){return withPeriod('new',()=>{
 const rows=nspScopeRows();nspRenderOverview(rows);nspTable(rows);
});}
function nspKpiHelp(title,rule,annual=false){
 const card=['新品销售成功率','新品上线及时率'].includes(title)?` data-nsp-kpi="${esc(title)}"`:['是否成功','年度是否成功'].includes(title)?` data-nsp-status="${title==='年度是否成功'?'annual':'quarter'}"`:'';
 return `<span class="metric-help nsp-kpi-help" role="button" tabindex="0" aria-label="查看${esc(title.replace('上线及时率','上市及时率'))}指标口径" data-metric-rule="${esc(rule)}"${annual?' data-nsp-annual="true"':''}${card}></span>`;
}
// 标题提示直接复用规则原文，样式分组不另维护一份业务口径。
function nspRenderPoolTooltip(host,rule){
 const body=metricRuleCard(host,'新品判定与出池');
 metricRuleList(body,rule.split('\n').filter(Boolean).map(line=>{
  const split=line.indexOf('：');return {title:split<0?line:line.slice(0,split),description:split<0?'':line.slice(split+1)};
 }));
}
function nspDeliveryKpi({label,annual,rate,ontime,planned}){
 const title='新品上线及时率';
 return `<div class="newmetric nsp-static-kpi" data-nsp-static-metric="ontime">
  <span>${label}新品上市及时率${nspKpiHelp(title,metricDefinitions[title],annual)}</span>
  <strong class="num">${rate===null?'—':fmt(rate,1)+'<span class="unit">%</span>'}</strong>
  <small>按期完成 <b>${ontime}</b> / 应上市项目 <b>${planned}</b></small>
 </div>`;
}
function nspSuccessKpi(summary){
 const conditions=brcSuccessConditions(summary.annual,summary.start);
 const threshold=(summary.annual?'年度全年基准：四季品':'季度标准：四季品')+brcResultText(summary.annual?'success-year':'success-quarter',conditions)+'；夏季品、冬季品'+brcResultText('success-season',conditions);
 const rule=metricDefinitions['新品销售成功率']+'\n'+threshold+(summary.annual?'\n年度GSV门槛＝全年GSV门槛×当年上市日至12月31日的自然天数÷当年总天数；利润率、总退率门槛不折算。':'');
 return '<div class="newmetric nsp-success-kpi" data-nsp-metric="sold"><span class="nsp-success-heading"><span class="nsp-kpi-title">'+summary.label+'新品销售成功率'+nspKpiHelp('新品销售成功率',rule,summary.annual)+'</span><button type="button" class="nsp-assessment-entry" data-nsp-assessment-entry>查看'+(summary.annual?'年度':'季度')+'考核</button></span><div class="nsp-success-value"><strong class="num">'+(summary.rate===null?'—':fmt(summary.rate,1)+'<span class="unit">%</span>')+'</strong><span class="nsp-success-target">目标 ≥'+summary.target+'%</span></div><small><button type="button" data-nsp-assessment="success">成功 <b>'+summary.success+'个</b></button> / <button type="button" data-nsp-assessment="all">纳入统计 <b>'+summary.total+'个</b></button></small></div>';
}
function nspOperatingKpis(rows,period=periodFor('new')){
 const {gsvCents,profitRate}=nspOperatingTotals(rows);
 const short=periodShortText(period);
 const prefix=short==='近30天'?'近30日':period.mode==='day'?'所选期间':short;
 const metrics=[
  ['sales','新品总销售额',gsvCents,gsvCents===null?'—':upMoney(gsvCents)],
  ['margin','新品总利润率',profitRate,profitRate===null?'—':fmt(profitRate,1)+'%']
 ];
 return '<div class="nsp-kpis nsp-operating-kpis">'+metrics.map(([key,label,value,display])=>
  `<div class="newmetric" data-nsp-operating="${key}" data-value="${value??''}"><span>${esc(prefix+label)}</span><strong class="num">${esc(display)}</strong></div>`
 ).join('')+'</div>';
}
// 悬浮底色止于柱形基线下4个绘图单位，横坐标按钮保留独立点击区域。
function nspPlatformChart(rows){
 const names=filterCatalog.platforms,values=names.map(platform=>{const facts=rows.map(p=>p.platformFacts.find(f=>f.platform===platform)?.gsvCents).filter(Number.isFinite);return facts.length?facts.reduce((a,b)=>a+b,0)/1000000:null}),max=Math.max(1,...values.filter(Number.isFinite)),step=80,baseline=124;
 const bars=values.map((value,i)=>{
  const valid=Number.isFinite(value),v=valid?value:0,label=valid?fmt(v,1):'—',channel=names[i];
  return `<g tabindex="0" role="button" data-nsp-chart-ratio="${v/max}" data-nsp-channel="${esc(channel)}" aria-pressed="${nspFilters.channel===channel}" aria-label="${esc(channel+' '+label+(valid?'万元':'，暂无平台业绩'))}">
   <rect class="nsp-channel-hit" x="${i*step+2}" y="8" width="76" height="120" rx="4" fill="transparent"/>
   ${valid?`<rect x="${i*step+24}" y="${baseline-v/max*92}" width="32" height="${Math.max(2,v/max*92)}" rx="3" fill="#9791fb"/>`:''}
   <text x="${i*step+40}" y="${baseline-10-v/max*92}" text-anchor="middle">${label}</text>
  </g>`;
 }).join('');
 const labels=names.map(channel=>`<button type="button" data-nsp-channel="${esc(channel)}" aria-pressed="${nspFilters.channel===channel}" aria-label="筛选${esc(channel)}平台新品" title="${esc(channel)}">${nspChannelIcon(channel)}<span class="nsp-channel-name">${esc(channel)}</span></button>`).join('');
 return `<div class="nsp-channels"><h3>各平台新品GSV <small>万元</small></h3><div class="nsp-channel-scroll"><div class="nsp-channel-canvas" style="--nsp-channel-count:${names.length};--nsp-channel-step:${step}px"><svg class="new-channel-chart" preserveAspectRatio="xMidYMax meet" viewBox="0 0 ${names.length*step} 132" role="group" aria-label="各平台新品GSV，暂无平台业绩显示—">${bars}</svg><div class="nsp-channel-labels">${labels}</div></div></div></div>`;
}
function nspTable(rows){
 const visible=nspVisibleRows(rows),state=newProductSelection,headers=nspTableHeaders(),host=$('#newtable'),pager=$('#newcount');
 state.page=Math.max(1,Math.min(state.page,Math.max(1,Math.ceil(visible.length/nspPageSize()))));
 host.classList.remove('ns-sales-success');
 const markup=table(headers,visible.slice((state.page-1)*nspPageSize(),state.page*nspPageSize()).map(p=>{
  const metrics=nspMetrics(p);
  const successful=nspDisplaySuccess(p);
  return [
  nspSpuCell(p),esc(p.shortName),
  rpListCell({value:nspGuidePriceText(p),tone:''}),...metrics.slice(0,3),
  nspAssessmentBadge(successful,true,nspFirstQuarterSuccess(p,bounds().cutoff)?.approval),...(periodFor('new').mode==='year'?[nspAssessmentBadge(p.salesSuccess,p.successAssessment.included,p.successAssessment.approval)]:[]),...metrics.slice(3),
  rpListCell({value:stockQuantity(p.sellableStock.warehouse),tone:'',target:'货值 '+(Number.isFinite(p.sellableStock.warehouseValueCents)?upMoney(p.sellableStock.warehouseValueCents):'—')}),
  p.salesStates.map(status=>`<span class="tag nsp-sales-status" data-sales-status="${esc(status)}">${esc(nspSalesStatusLabel(status))}</span>`).join(' '),
  `${p.days}天`,
  `${p.actualLaunch}${p.launchDelayDays>0?`<small class="nsp-launch-delay">延期${p.launchDelayDays}天</small>`:''}`,

  nspSalesChannelIcons(p.salesChannels),esc(p.developmentType),
  nspSpuPicker(p)
 ]}));
 if(dashboardRenderMarkup(host,markup)){
  // 年度考核增加列时，按字段同步定位列宽和数字列。
  const columnWidths={'SPU系列':320,'产品简称':184,'指导价':156,'GSV':144,'销量':152,'利润率':156,'是否成功':120,'年度是否成功':160,'总退':112,'已收退':112,'未收退':112,'我司可售库存':164,'销售状态':144,'上线天数':120,'上线日期':152,'销售渠道':152,'项目类型':112,'操作':88};
  const columnNames=[...nspHeaders];
  if(periodFor('new').mode==='year')columnNames.splice(columnNames.indexOf('是否成功')+1,0,'年度是否成功');
  const columnWidthsJson=JSON.stringify(Object.fromEntries(columnNames.map((name,i)=>[i,columnWidths[name]])));
  const grid=host.querySelector('table'),body=grid.tBodies[0];
  grid.dataset.columnDefaults=columnWidthsJson;
  grid.dataset.columnMinimums=columnWidthsJson;
  const numericKeys=['days','gsv','netSales','profit','returns','received','unreceived','warehouse','guidePrice'];
  for(const button of grid.querySelectorAll('[data-nsp-sort]')){
   const header=button.closest('th');header.setAttribute('aria-sort',button.dataset.nspSort!==nspSort.key?'none':nspSort.direction==='asc'?'ascending':'descending');
   if(numericKeys.includes(button.dataset.nspSort)){
    header.classList.add('nsp-num');
    for(const row of body.rows)row.cells[header.cellIndex]?.classList.add('nsp-num');
   }
  }
  if(!visible.length)body.innerHTML=`<tr><td colspan="${headers.length}" class="nsp-empty">暂无符合条件的新品</td></tr>`;
  nspObserveTableViewport(host);
 }else dashboardQueueLayout(host,dashboardMeasureResetScroll);
 dashboardRenderMarkup(pager,listPager(visible.length,state.page,nspPageSize()));
 bindListPager(pager,page=>{state.page=page;nspTable(rows)});
 host.onclick=e=>{
  const sort=e.target.closest('[data-nsp-sort]');
  if(sort){
   const key=sort.dataset.nspSort;
   nspSort.direction=nspSort.key===key?(nspSort.direction==='asc'?'desc':'asc'):(key==='launch'?'asc':'desc');
   nspSort.key=key;state.page=1;nspTable(rows);
   $('#newtable').querySelector(`[data-nsp-sort="${key}"]`)?.focus({preventScroll:true});return;
  }
  nspHandleSpuPicker(e,spuId=>{
   const period={...periodFor('new')},range=upWindow(period);
   upOpenDetail({spuId,...range,period,tab:'operating',platform:'all',module:'new'});
  });
 };
}
function nspRender(){
 const heading=$('#new .titlegroup h2');
 if(heading&&!heading.querySelector('.nsp-pool-help'))heading.insertAdjacentHTML('beforeend','<span class="nsp-pool-help"> '+nspKpiHelp('新品判定及出池',nspPoolRule)+'</span>');
 const state=newProductSelection,key=periodKey()+':'+JSON.stringify(pfControlValue($('#newchain')))+':'+JSON.stringify(nspFilters.season);
 if(state.key!==key){state.key=key;state.page=1}
 const rows=nspScopeRows();nspRenderOverview(rows);
 $('#newall').hidden=true;
 nspToolbar();nspTable(rows);
 $('#newtop').onclick=e=>{
  if(e.target.closest('.metric-help'))return;
  const entry=e.target.closest('[data-nsp-assessment-entry]'),assessment=e.target.closest('[data-nsp-assessment]'),channel=e.target.closest('[data-nsp-channel]'),price=e.target.closest('[data-nsp-price]');
  if(entry){nspOpenAssessment(null,'all');return}
  if(assessment){nspOpenAssessment(null,assessment.dataset.nspAssessment);return}
  else if(channel)nspFilters.channel=nspFilters.channel===channel.dataset.nspChannel?'all':channel.dataset.nspChannel;
  else if(price){nspFilters.price=nspFilters.price===price.dataset.nspPrice?'all':price.dataset.nspPrice;$('#new-linked-filter').dataset.expanded='true'}
  else return;
  state.page=1;renderNew();
  if(price)$('#newtop').querySelector('[data-nsp-price="'+price.dataset.nspPrice+'"]')?.focus({preventScroll:true});
  if(channel)$('#newtop').querySelector(`${channel.tagName.toLowerCase()}[data-nsp-channel="${channel.dataset.nspChannel}"]`)?.focus({preventScroll:true});
 };
 $('#newtop').onkeydown=e=>{const item=e.target.closest('[data-nsp-channel]');if(item&&['Enter',' '].includes(e.key)){e.preventDefault();item.dispatchEvent(new MouseEvent('click',{bubbles:true}))}};
}
$('#newchain').innerHTML='<option value="全部">全部链群</option>'+pfCategories.map(c=>`<option value="${c}">${c}</option>`).join('');
$('#newchain').onchange=()=>{newProductSelection.page=1;renderNew()};

for(const [id,label] of [['newchain','链群']]){
 const select=$('#'+id);select.multiple=true;select.dataset.pfMultiple='';select.dataset.pfLabel=label;
}
