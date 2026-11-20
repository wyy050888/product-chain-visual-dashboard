const ipStagnantSort={key:'staleValue',direction:'desc'};
function ipStagnantRule(){
 return ['入榜条件','• 存在库龄≥'+ipStagnantMinAgeDays+'天的库存','','排序规则','1. 呆滞货值降序','2. 呆滞最高库龄降序','3. 呆滞库存占比降序'].join('\n');
}
// 已发生呆滞按库龄入榜；数量、金额和可售天数使用普通数值色。
function ipStagnantFields(row){
 return rpFields(4,row,rpStockCardKeys[4]).map(field=>{
  if(['staleUnits','staleValue'].includes(field.key)){
   return {...field,tone:Number.isFinite(field.sortValue)?'rp-quality-normal':'rp-quality-gray',targetTone:'rp-quality-gray',cardTargetTone:'rp-quality-gray'};
  }
  return field.key==='sellableCoverage15'?{...field,tone:Number.isFinite(field.sortValue)?'rp-quality-normal':'rp-quality-gray'}:field;
 });
}
function ipStagnantTable(model){
 if(!model.rows.length)return '<div class="empty">当前筛选下暂无符合条件的呆滞产品</div>';
 const keys=rpStockCardKeys[4];
 const fields=new Map(model.rows.map(row=>[row,ipStagnantFields(row)]));
 const ranked=new Map(model.rows.map((row,index)=>[row.skuId,index+1]));
 const rows=rpSortRows(model.rows,ipStagnantSort,(row,key)=>fields.get(row).find(field=>field.key===key)?.sortValue);
 const metricHeader=key=>{
  const name=rpStagnantMetricLabels[key]?.[0]??fields.get(model.rows[0]).find(field=>field.key===key).name;
  const label=key==='responsibleChannel'?'<span data-preserve-terms>'+esc(name)+'</span>':
   rpSortHeader(key,name,ipStagnantSort,4,{key:'staleValue',direction:'desc'});
  const rule=key==='responsibleChannel'?'用我司可售库存判定责任渠道，当出现产品呆滞时，判断当前我司可售天数最高的虚拟仓':undefined;
  return label+rpStagnantMetricHelp(key,rule);
 };
 const headers=['序号','SKU信息',...keys.map(metricHeader),'操作'];
 return table(headers,rows.map(row=>[ranked.get(row.skuId),rpIdentityMarkup(4,row,true),...keys.map(key=>rpListCell(fields.get(row).find(field=>field.key===key),false)),`<button type="button" class="link" data-ip-stagnant-detail="${esc(row.skuId)}" aria-label="查看${esc(row.name)}详情">查看</button>`]),'ip-stagnant-table');
}
function ipDecorateStagnantTable(host){
 // 只使用预警榜的表头说明，可售天数不套用通用的我司可售天数说明。
 for(const header of host.querySelectorAll('.ip-stagnant-table th'))header.setAttribute('data-up-basic','');
 rpApplySortAria(host,ipStagnantSort);
}
function ipMountStagnantTop(){
 const host=$('#inventory-stagnant-top'),model=ipStagnantTopModel();
 const tags=['all',...pfCategories].map(value=>rpSeasonTagMarkup({value,label:value==='all'?'全部':value},model.counts[value],ipStagnantChain===value,'data-ip-stagnant-chain',true)).join('');
 const filter=`<div class="rp-season-tags" role="radiogroup" aria-label="链群">${tags}</div>`;
 host.innerHTML=`<div class="ip-stagnant-heading"><h3 data-up-basic>呆滞产品 Top10<span class="metric-help card-metric-help" role="button" tabindex="0" aria-label="查看呆滞产品Top10入榜及排序规则" data-metric-rule="${esc(ipStagnantRule())}"></span></h3>${filter}<button type="button" class="link ui-icon-label" data-ip-stagnant-all data-count="${model.count}" aria-label="查看全部${model.count}条呆滞产品"><span>查看全部 ${model.count}</span><span class="ui-chevron-right" aria-hidden="true"></span></button></div><div class="ip-stagnant-scroll tablewrap">${ipStagnantTable(model)}</div>`;
 ipDecorateStagnantTable(host);
 host.onkeydown=event=>{
  const button=event.target.closest('[data-ip-stagnant-chain]'),next=button&&rpSeasonTagInDirection(button,event.key);if(!next)return;
  event.preventDefault();next.click();
 };
 host.onclick=event=>{
  const chain=event.target.closest('[data-ip-stagnant-chain]');
  if(chain){
   const value=chain.dataset.ipStagnantChain;
   if(ipStagnantChain!==value){
    ipStagnantChain=value;ipMountStagnantTop();
    rpFocusSeasonTag(host.querySelector(`[data-ip-stagnant-chain="${value}"]`));
   }
   return;
  }
  if(event.target.closest('[data-ip-stagnant-all]')){toast('跳转产品库存-滞销品');return}
  const detail=event.target.closest('[data-ip-stagnant-detail]');
  if(detail){toast('跳转现有产品库存详情页');return}
  const sort=event.target.closest('[data-rp-sort]');
  if(sort){const scroll=host.querySelector('.ip-stagnant-scroll'),left=scroll.scrollLeft,key=sort.dataset.rpSort;rpSortCycle(ipStagnantSort,key,{key:'staleValue',direction:'desc'});scroll.innerHTML=ipStagnantTable(model);ipDecorateStagnantTable(host);scroll.scrollLeft=left;scroll.querySelector(`[data-rp-sort="${key}"]`)?.focus({preventScroll:true});return}

 };
}
