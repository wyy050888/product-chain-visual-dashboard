// 退货与违规共用既有台账、等长上期及红黄绿规则。
function upViolationRows(m,qualityOnly=false,platform='all'){
 return m.quality.flatMap(r=>rpPlatformViolationEvents(rpQualitySelectEvents(r.monthly,qualityOnly),platform,r.platform).map((e,i)=>({...e,platform:r.platform,id:r.platform+'-'+e.date+'-'+e.type+'-'+i}))).sort((a,b)=>b.date.localeCompare(a.date)||a.platform.localeCompare(b.platform));
}
function upQualityMetric(f){
 return `<div class="up-quality-metric" data-up-quality-metric="${f.key}"><small data-up-basic="true">${esc(f.name)}</small><div><strong class="${f.tone||''}">${esc(f.value)}</strong><span class="up-quality-comparison ${f.targetTone||''}">${rpTargetText(f)}</span></div>${f.detailMarkup||''}</div>`;
}
function upViolationMetrics(m,qualityOnly=false,platform='all'){
 const events=upViolationRows(m,qualityOnly,platform),before=m.quality.flatMap(r=>rpPlatformViolationEvents(rpQualitySelectEvents(qrObservation(m.product,r.platform,m.previousStart,m.previousEnd).monthly,qualityOnly),platform,r.platform));
 const count=(rows,type)=>rows.filter(e=>!type||e.type===type).length;
 const frequency=(key,name,type)=>{const now=count(events,type),previous=count(before,type);return {key,name,value:now+'次',target:rpQualityChange(now,previous),targetTone:rpQualityChangeTone(now,previous)}};
 const money=(key,name,type)=>{const rows=events.filter(e=>e.type===type),sum=rows.reduce((n,e)=>n+(Number(e.amount)||0),0);return {key,name,value:pfMoneyYuan(sum),tone:rpQualityAmountTone(sum),target:rows.length+'次',targetTone:'rp-quality-gray'}};
 return [frequency('violations','违规次数'),money('fine','平台罚款','罚款'),money('frozen','资金冻结','资金冻结'),frequency('offShelf','链接下架','下架'),frequency('drop','链接掉权','掉权')].filter(f=>rpViolationMetricAllowed(f.key,platform));
}
const upViolationTypes=[['all','全部'],['罚款','平台罚款'],['资金冻结','资金冻结'],['下架','链接下架'],['掉权','链接掉权']];
// 违规、进线与差评共用同一指标栏，切换统计口径时完整重绘。
function upViolationStatsMarkup(m,state){
 return upViolationMetrics(m,state.violationQualityOnly!==false,state.platform).map(upQualityMetric).join('')+upContactEvaluationView(m);
}
function upQualityView(m,state){
 if(!rpViolationMetricAllowed(state.violationType,state.platform))state.violationType='all';
 const operating=upOperatingMetrics(m,state),returns=['sales','returned','received'].map(key=>operating.find(f=>f.key===key));
 return `<section class="up-quality-region"><h3>退货率数据</h3><div class="up-quality-overview"><div class="up-return-metrics">${returns.map(upQualityMetric).join('')}</div><div id="up-return-chart">${upReturnTrend(upReturnTrendPoints(m,state),state.returnPeriod||'day',upReturnTargets(m,state))}</div></div></section>
  <section class="up-quality-region up-quality-violations"><h3>产品违规</h3><div class="up-violation-stats-scroll"><div class="up-violation-stats">${upViolationStatsMarkup(m,state)}</div></div>
  <div class="up-violation-filters"><input type="search" data-up-violation-search aria-label="搜索产品违规" placeholder="搜索违规对象 / 编号 / 原因" value="${esc(state.violationQuery||'')}" ${state.platform==='all'?'hidden':''}><div class="up-violation-tags" ${state.platform==='all'?'hidden':''} role="group" aria-label="风险类型">${upViolationTypes.filter(([key])=>rpViolationMetricAllowed(key,state.platform)).map(([key,label])=>`<button type="button" data-up-violation-type="${key}" aria-pressed="${(state.violationType||'all')===key}">${label}</button>`).join('')}</div><label class="up-violation-quality-check"><input type="checkbox" data-up-violation-quality ${state.violationQualityOnly!==false?'checked':''}>展示品质违规统计</label></div><div id="up-violation-table"></div></section>`;
}
function upMountQuality(root,m,state){
 const render=()=>{
  const rows=upViolationRows(m,state.violationQualityOnly!==false,state.platform).filter(e=>!state.violationType||state.violationType==='all'||e.type===state.violationType);
  const platforms=state.platform==='all'?[]:upChannels(state.platform),host=root.querySelector('#up-violation-table');
  host.hidden=state.platform==='all';
  host.innerHTML=platforms.map((platform,i)=>`<section class="up-violation-platform" data-up-violation-platform="${platform}"><div class="up-table" data-up-violation-grid="${i}"></div><div data-up-violation-pages="${i}"></div></section>`).join('');
  platforms.forEach((platform,i)=>{const columns=upViolationColumns[platform],events=rows.filter(e=>{if(e.platform!==platform)return false;const q=(state.violationQuery||'').trim().toLowerCase(),d=upViolationDetail(m.product,e);return !q||[d.object,d.number,d.reason,d.shop,d.shopId].join(' ').toLowerCase().includes(q)});
   upMountTable(host.querySelector(`[data-up-violation-grid="${i}"]`),host.querySelector(`[data-up-violation-pages="${i}"]`),columns.map(([label])=>label),events.map(e=>{const row=upViolationDetail(m.product,e);return columns.map(([,key])=>key==='shop'?upViolationShopCell(row):esc(row[key]??'—'))}),'当前筛选下暂无违规条目');
  });
  for(const button of root.querySelectorAll('[data-up-violation-type]'))button.setAttribute('aria-pressed',String(button.dataset.upViolationType===(state.violationType||'all')));
 };
 root.querySelector('[data-up-violation-search]').oninput=e=>{state.violationQuery=e.target.value;render()};
 root.querySelector('[data-up-violation-quality]').onchange=e=>{
  state.violationQualityOnly=e.target.checked;
  root.querySelector('.up-violation-stats').innerHTML=upViolationStatsMarkup(m,state);
  render();
 };
 root.querySelector('.up-violation-tags').onclick=e=>{const b=e.target.closest('[data-up-violation-type]');if(!b)return;state.violationType=b.dataset.upViolationType;render()};render();
 root.querySelector('#up-return-chart').onclick=e=>{const b=e.target.closest('[data-up-return-period]');if(!b)return;state.returnPeriod=b.dataset.upReturnPeriod;root.querySelector('#up-return-chart').innerHTML=upReturnTrend(upReturnTrendPoints(m,state),state.returnPeriod,upReturnTargets(m,state));upPositionReturnTrend(root)};
 upPositionReturnTrend(root);
}

// 先完成布局再定位最近一期；在其他标签页隐藏时，切回品质退货后补定位。
function upPositionReturnTrend(root){
 requestAnimationFrame(()=>{
  const scroll=root.querySelector('[data-up-return-scroll]');
  if(scroll?.isConnected&&scroll.clientWidth)scroll.scrollLeft=scroll.dataset.upReturnScroll==='history'?scroll.scrollWidth-scroll.clientWidth:0;
 });
}
