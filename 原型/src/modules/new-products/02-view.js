// 季度展示成功季度；年度同时保留年度判定与成功季度。
const nspHeaders=['SPU信息','上线天数','GSV','去退后销量','利润率','判断成功率','总退','已收退','我司可售库存','销售状态','产品等级','上线日期','销售渠道','类目','季品','操作'];
const nspSalesChannelRule='销售渠道：展示截至统计截止日，系统已采集到该产品销售记录的全部渠道；当期无销量的历史销售渠道仍保留。\n识别局限：老品在新渠道上架时，若历史销售记录未被采集，仅凭现有订单仍可能将其识别为新品，此类情况无法完全避免。';
const nspPoolRule='新品判定：以系统全渠道采集到该产品首笔销售订单日期作为上线日期，仅展示已有销售业绩的新品。老品在新渠道上架且历史订单未被采集的情况无法完全避免。\n新品出池：销售首次达标的季度末＋30个自然日，从该日起不再展示在新品明细及在池分布中；未成功产品继续保留。例：2026年Q3首次成功，2026年10月30日起出池。\n季度考核：首次成功后的下一季度起不再计入季度成功率分子、分母；后续下滑不重新纳入。年度按年度标准独立核算，仍保留已出池产品的年度考核数据。\n历史回看：按所选统计截止日判断是否出池，保留历史成功季度。';
function nspTableHeaders(){
 const keys={'上线天数':'days','GSV':'gsv','去退后销量':'netSales','利润率':'profit','总退':'returns','已收退':'received','我司可售库存':'warehouse','上线日期':'launch'};
 const period=periodFor('new'),prefix=period.mode==='year'?String(period.year).slice(-2)+'年':'Q'+period.value;
 const headers=[...nspHeaders];if(period.mode==='year')headers.splice(6,0,'成功季度');else headers[5]='成功季度';
 return headers.map(name=>{
  const label=['GSV','去退后销量','利润率','判断成功率'].includes(name)?prefix+name:name;
  const key=keys[name];if(!key)return label+(name==='销售渠道'?nspKpiHelp('销售渠道',nspSalesChannelRule):'');
  const active=nspSort.key===key,direction=active?nspSort.direction:'',next=active?(direction==='asc'?'降序':'升序'):(key==='launch'?'升序':'降序');
  const help=key==='launch'?nspKpiHelp('上线日期','上线日期：该产品在所有销售渠道中，首笔销售订单对应的日期\n延期天数：该产品关联项目中记录的延期上线天数，仅延期时展示'):'';
  return `<button type="button" class="rp-sort-header" data-nsp-sort="${key}" data-direction="${direction}" aria-label="${label}：点击${next}">${label}<span class="rp-sort-arrows" aria-hidden="true"></span></button>${help}`;
 });
}
function nspSelect(key,label,values,current,multiple=false){
 return `<label class="unified-filter-field"><span>${label}</span><select data-nsp-filter="${key}" aria-label="新品${label}"${multiple?` multiple data-pf-multiple data-pf-label="${esc(label)}"`:''}><option value="all" ${pfOptionSelected(current,'all')?'selected':''}>全部</option>${values.map(v=>`<option value="${esc(v)}" ${pfOptionSelected(current,v)?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
}
function nspToolbar(){
 let host=$('#new-linked-filter');
 if(!host){host=document.createElement('div');host.id='new-linked-filter';$('#newtable').before(host)}
 host.className='nsp-filters ui-business-filters';
 // 控件只创建一次；联动更新内容时保留搜索焦点、多选菜单和日期面板。
 if(!host.querySelector('[data-nsp-search]')){
  host.innerHTML=`<label class="ui-search-field"><input type="search" data-nsp-search placeholder="搜索产品名称 / SPU码 / 型号" aria-label="新品搜索" value="${esc(nspFilters.query)}"></label>`
  +nspSelect('brand','品牌',[...new Set(sampleSpus.filter(p=>p.cohort==='new').map(p=>p.brand))],nspFilters.brand)
  +nspSelect('channel','销售渠道',qrPlatforms,nspFilters.channel)
  +nspSelect('status','销售状态',newSalesStatuses,nspFilters.status)
  +nspSelect('grade','产品等级',nspGrades,nspFilters.grade)
  +nspSelect('success','成功状态',['成功','不成功'],nspFilters.success)
  +nspSuccessPickerHTML()+nspLaunchPickerHTML()+kpmPriceMarkup(nspFilters,'new');
  for(const [id,label] of [['newchain','类目'],['newseason','季品']])attachFilterField(host,id,label);
  const field=select=>select.closest('.pf-multi,.unified-filter-field');
  const category=field($('#newchain')),season=field($('#newseason'));
  field(host.querySelector('[data-nsp-filter="brand"]')).after(category);category.after(season);
  host.querySelector('[data-nsp-search]').oninput=e=>{nspFilters.query=e.target.value;newProductSelection.page=1;nspRefreshResults()};
  host.querySelectorAll('[data-nsp-filter]').forEach(select=>select.onchange=e=>{nspFilters[e.target.dataset.nspFilter]=pfControlValue(e.target);newProductSelection.page=1;nspRefreshResults()});
  nspBindLaunchFilter(host);nspBindSuccessPicker(host);decorateFilterFields(host);
 }
 for(const select of host.querySelectorAll('[data-nsp-filter]'))pfControlSet(select,nspFilters[select.dataset.nspFilter]);
 pfControlSet($('#newseason'),nspFilters.season);pfMultiMount(host);
 const priceHost=host.querySelector('[data-kpm-price-host=new]');
 if(!priceHost.kpmPriceControl)kpmMountPriceFilter(priceHost,nspFilters,()=>{newProductSelection.page=1;nspRefreshResults()});
 priceHost.kpmPriceControl.sync();
}
function nspRenderOverview(rows){
 const scope=nspFilterRows(rows),poolRows=scope.filter(p=>p.inNewPool),{planned,ontime}=nspDeliverySummary();
 // 产品组件沿用产品筛选；项目及时率只映射品牌、类目，分布只展示在池产品。
 $('#newtop').innerHTML=nspSuccessKpi(nspSuccessSummary(scope))+nspKpi('ontime','新品上线及时率',ontime,planned)+nspDonut(poolRows)+nspPriceDistribution(rows)+nspChannelChart(poolRows);
}
function nspRefreshResults(){return withPeriod('new',()=>{
 const rows=nspCategoryRows();nspRenderOverview(rows);nspTable(rows);nspSyncGradeSelection();
});}
function nspKpiHelp(title,rule){
 const card=['新品销售成功率','新品上线及时率'].includes(title)?` data-nsp-kpi="${esc(title)}"`:'';
 return `<span class="metric-help nsp-kpi-help" role="button" tabindex="0" aria-label="查看${esc(title)}指标口径" data-metric-rule="${esc(rule)}"${card}></span>`;
}
// 标题提示直接复用规则原文，样式分组不另维护一份业务口径。
function nspRenderPoolTooltip(host,rule){
 const append=(parent,tag,text,className)=>{
  const node=document.createElement(tag);node.textContent=text;
  if(className)node.className=className;parent.append(node);return node;
 };
 const header=append(host,'div','','nsp-pool-tip-header');
 append(header,'h4','新品判定与出池');append(header,'span','统计口径');
 rule.split('\n').filter(Boolean).forEach((line,index)=>{
  const split=line.indexOf('：'),title=line.slice(0,split),body=line.slice(split+1);
  const section=append(host,'section','','nsp-pool-tip-section');
  const heading=append(section,'h5','');
  append(heading,'span',String(index+1).padStart(2,'0'),'nsp-pool-tip-step');
  append(heading,'span',title);
  const example=body.indexOf('例：');
  append(section,'p',example<0?body:body.slice(0,example));
  if(example>=0)append(section,'p',body.slice(example),'nsp-pool-tip-example');
 });
}
function nspKpi(key,title,n,total){
 const label=periodShortText(periodFor('new'))+title;
 return `<button type="button" class="newmetric new-linked-metric ${newProductSelection.metric===key?'selected':''}" data-nsp-metric="${key}" aria-pressed="${newProductSelection.metric===key}"><span>${label}${nspKpiHelp(title,metricDefinitions[title])}</span><strong class="num">${total?fmt(n/total*100,1)+'<span class="unit">%</span>':'—'}</strong><small>${key==='sold'?'按期上线且有销售':'按期完成'} ${n} / ${key==='sold'?'本期计划':'应上线项目'} ${total}</small></button>`;
}
function nspSuccessKpi(summary){
 const selected=newProductSelection.metric==='sold';
 const threshold=summary.annual?'年度标准：四季品累计GSV≥2000万元；夏季品、冬季品累计GSV≥750万元':'季度标准：四季品累计GSV≥500万元；夏季品、冬季品累计GSV≥750万元';
 const rule=metricDefinitions['新品销售成功率']+'\n'+threshold+'\n同时满足利润率≥12%、总退≤60%';
 return `<button type="button" class="newmetric new-linked-metric nsp-success-kpi ${selected?'selected':''}" data-nsp-metric="sold" aria-pressed="${selected}"><span>${summary.label}新品销售成功率${nspKpiHelp('新品销售成功率',rule)}</span><div class="nsp-success-value"><strong class="num">${summary.rate===null?'—':fmt(summary.rate,1)+'<span class="unit">%</span>'}</strong><span class="nsp-success-target">目标 ≥${summary.target}%</span></div><small>成功 <b>${summary.success}个</b> / 纳入统计 <b>${summary.total}个</b></small></button>`;
}
function nspDonut(rows){
 const colors=['#8275fa','#5fb6d4','#f6bd65','#ed8499'];let start=0;
 const counts=nspGrades.map(g=>rows.filter(p=>p.grade===g).length);
 const point=angle=>{const rad=(angle-90)*Math.PI/180;return `${76+66.5*Math.cos(rad)},${76+66.5*Math.sin(rad)}`};
 const arcs=counts.map((n,i)=>{
  if(!n)return '';
  const end=start+n/rows.length*360,mid=(start+end)/2;
  // 两段圆弧同时覆盖单等级占100%的情况，实际弧线就是点击区域。
  const path=`M ${point(start)} A 66.5 66.5 0 0 1 ${point(mid)} A 66.5 66.5 0 0 1 ${point(end)}`;start=end;
  return `<path d="${path}" stroke="${colors[i]}" data-nsp-grade="${nspGrades[i]}" tabindex="0" role="button" aria-label="筛选${nspGrades[i]}级，共${n}个" aria-pressed="false"/>`;
 }).join('');
 return `<div class="nsp-distribution"><h3>新品等级分布</h3><div class="dp-donut"><div class="dp-ring" role="group" aria-label="共${rows.length}个新品"><svg viewBox="0 0 152 152" class="nsp-grade-chart"><circle cx="76" cy="76" r="66.5" stroke="#edf0f6"/>${arcs}</svg><b>${rows.length}<small> 个</small></b></div><div class="dp-legend">${nspGrades.map((g,i)=>`<button type="button" data-nsp-grade="${g}" aria-pressed="false" aria-label="筛选${g}级，共${counts[i]}个"><i style="background:${colors[i]}"></i><span>${g}级</span><b>${counts[i]}个</b><em>${rows.length?fmt(counts[i]/rows.length*100,1):'0.0'}%</em></button>`).join('')}</div></div></div>`;
}
function nspSyncGradeSelection(){
 for(const item of $$('#newtop [data-nsp-grade]')){
  item.setAttribute('aria-pressed',String(item.dataset.nspGrade===nspFilters.grade));
  item.classList.toggle('is-muted',nspFilters.grade!=='all'&&item.dataset.nspGrade!==nspFilters.grade);
 }
}
function nspChannelChart(rows){
 const values=qrPlatforms.map(ch=>rows.reduce((sum,p)=>sum+p.channelFacts.find(f=>f.channel===ch).gsvCents,0)/1000000),max=Math.max(1,...values);
 return `<div class="nsp-channels"><h3>各渠道新品GSV <small>万元</small></h3><svg class="new-channel-chart" viewBox="0 0 360 150" role="group" aria-label="各渠道新品GSV，单位万元">${values.map((v,i)=>`<g tabindex="0" role="button" data-nsp-channel="${qrPlatforms[i]}" aria-label="${qrPlatforms[i]} ${fmt(v,1)}万元"><rect x="${i*60+2}" y="8" width="56" height="134" rx="4" fill="transparent"/><rect x="${i*60+14}" y="${110-v/max*78}" width="32" height="${Math.max(2,v/max*78)}" rx="3" fill="#9791fb"/><text x="${i*60+30}" y="${100-v/max*78}" text-anchor="middle">${fmt(v,1)}</text><text x="${i*60+30}" y="142" text-anchor="middle">${qrPlatforms[i]}</text><title>${qrPlatforms[i]} · GSV ${rpQualityMoney(v*10000)}</title></g>`).join('')}</svg></div>`;
}
function nspTable(rows){
 const visible=nspVisibleRows(rows),state=newProductSelection,headers=nspTableHeaders(),annual=periodFor('new').mode==='year';
 state.page=Math.max(1,Math.min(state.page,Math.max(1,Math.ceil(visible.length/NSP_PAGE_SIZE))));
 $('#newtable').classList.remove('ns-sales-success');
 $('#newtable').innerHTML=table(headers,visible.slice((state.page-1)*NSP_PAGE_SIZE,state.page*NSP_PAGE_SIZE).map(p=>{
  const metrics=nspMetrics(p);
  const successQuarters=p.successQuarters.length?esc(p.successQuarters.map(nspSuccessQuarterLabel).join('、')):'<span class="muted">未成功</span>';
  return [
  titleProduct(p,{showBrand:false}),`${p.days}天`,...metrics.slice(0,3),
  annual?`<span class="tag nsp-success-status ${p.salesSuccess?'green':'orange'}">${p.salesSuccess?'成功':'不成功'}</span>`:successQuarters,
  ...(annual?[successQuarters]:[]),...metrics.slice(3),
  rpListCell({value:Number.isFinite(p.sellableStock.warehouse)?fmt(p.sellableStock.warehouse):'—',tone:'',target:'我司可售货值 '+(Number.isFinite(p.sellableStock.warehouseValueCents)?upMoney(p.sellableStock.warehouseValueCents):'—')}),
  `<span class="tag nsp-sales-status" data-sales-status="${esc(p.state)}">${esc(p.state)}</span>`,`<span class="tag nsp-grade" data-grade="${p.grade}">${p.grade}</span>`,
  `${p.actualLaunch}${p.launchDelayDays>0?`<small class="nsp-launch-delay">延期${p.launchDelayDays}天</small>`:''}`,
  `<div class="nsp-channels-list" title="${esc(p.salesChannels.join('、')||'暂无已采集的销售渠道')}">${esc(p.salesChannels.join('、')||'—')}</div>`,esc(p.category),esc(p.season||'—'),
  `<button class="link" data-nsp-view="${esc(p.spuId)}">查看</button>`
 ]}));
 for(const button of $('#newtable').querySelectorAll('[data-nsp-sort]'))button.closest('th').setAttribute('aria-sort',button.dataset.nspSort!==nspSort.key?'none':nspSort.direction==='asc'?'ascending':'descending');
 if(!visible.length)$('#newtable tbody').innerHTML=`<tr><td colspan="${headers.length}" class="nsp-empty">暂无符合条件的新品</td></tr>`;
 $('#newcount').innerHTML=listPager(visible.length,state.page,NSP_PAGE_SIZE);
 bindListPager($('#newcount'),page=>{state.page=page;nspTable(rows)});
 $('#newtable').onclick=e=>{
  const sort=e.target.closest('[data-nsp-sort]');
  if(sort){
   const key=sort.dataset.nspSort;
   nspSort.direction=nspSort.key===key?(nspSort.direction==='asc'?'desc':'asc'):(key==='launch'?'asc':'desc');
   nspSort.key=key;state.page=1;nspTable(rows);
   $('#newtable').querySelector(`[data-nsp-sort="${key}"]`)?.focus({preventScroll:true});return;
  }
  const button=e.target.closest('[data-nsp-view]');if(!button)return;
  const p=visible.find(r=>r.spuId===button.dataset.nspView);if(!p)return;
  const period={...periodFor('new')},range=upWindow(period);
  upOpenDetail({spuId:p.spuId,...range,period,tab:'operating',platform:'all',module:'new'});
 };
}
function nspRender(){
 const heading=$('#new .titlegroup h2');
 if(heading&&!heading.querySelector('.nsp-pool-help'))heading.insertAdjacentHTML('beforeend','<span class="nsp-pool-help"> '+nspKpiHelp('新品判定及出池',nspPoolRule)+'</span>');
 const state=newProductSelection,key=periodKey()+':'+JSON.stringify(pfControlValue($('#newchain')))+':'+JSON.stringify(nspFilters.season);
 if(state.key!==key){state.key=key;state.page=1}
 const rows=nspCategoryRows();nspRenderOverview(rows);
 $('#newall').hidden=true;
 nspToolbar();nspTable(rows);
 nspSyncGradeSelection();
 $('#newtop').onclick=e=>{
  const metric=e.target.closest('[data-nsp-metric]'),channel=e.target.closest('[data-nsp-channel]'),grade=e.target.closest('[data-nsp-grade]'),price=e.target.closest('[data-nsp-price]');
  if(metric?.dataset.nspMetric==='ontime'){withPeriod('new',()=>nspOpenDeliveryProjects());return}
  if(metric)state.metric=state.metric===metric.dataset.nspMetric?'all':metric.dataset.nspMetric;
  else if(grade)nspFilters.grade=nspFilters.grade===grade.dataset.nspGrade?'all':grade.dataset.nspGrade;
  else if(channel)nspFilters.salesChannel=nspFilters.salesChannel===channel.dataset.nspChannel?'all':channel.dataset.nspChannel;
  else if(price)nspFilters.price=nspFilters.price===price.dataset.nspPrice?'all':price.dataset.nspPrice;
  else return;
  state.page=1;renderNew();
  if(grade)$('#newtop').querySelector(`${grade.tagName.toLowerCase()}[data-nsp-grade="${grade.dataset.nspGrade}"]`)?.focus({preventScroll:true});
  if(price)$('#newtop').querySelector(`[data-nsp-price="${price.dataset.nspPrice}"]`)?.focus({preventScroll:true});
 };
 $('#newtop').onkeydown=e=>{const item=e.target.closest('[data-nsp-channel],path[data-nsp-grade]');if(item&&['Enter',' '].includes(e.key)){e.preventDefault();item.dispatchEvent(new MouseEvent('click',{bubbles:true}))}};
}
$('#newchain').innerHTML='<option value="全部">全部类目</option>'+pfCategories.map(c=>`<option value="${c}">${c}</option>`).join('');
$('#newchain').onchange=()=>{newProductSelection.page=1;renderNew()};

$('#newseason').onchange=e=>{nspFilters.season=pfControlValue(e.target);newProductSelection.page=1;renderNew()};
for(const [id,label] of [['newchain','类目'],['newseason','季品']]){
 const select=$('#'+id);select.multiple=true;select.dataset.pfMultiple='';select.dataset.pfLabel=label;
}
