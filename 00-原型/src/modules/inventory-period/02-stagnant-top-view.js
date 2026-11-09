const ipStagnantSort={key:'staleValue',direction:'desc'};
function ipStagnantRule(){
 return ['入榜条件','• 存在库龄≥'+ipStagnantMinAgeDays+'天的库存','','排序规则','1. 呆滞货值降序','2. 呆滞最高库龄降序','3. 呆滞库存占比降序'].join('\n');
}
// 已发生呆滞按库龄入榜；数量、金额和可售天数使用普通数值色。
function ipStagnantFields(row){
 return rpStagnantSkuFields(row).map(field=>{
  if(['staleUnits','staleValue'].includes(field.key)){
   return {...field,tone:Number.isFinite(field.sortValue)?'rp-quality-normal':'rp-quality-gray',targetTone:'rp-quality-gray',cardTargetTone:'rp-quality-gray'};
  }
  return field.key==='coverage15'?{...field,tone:Number.isFinite(field.sortValue)?'rp-quality-normal':'rp-quality-gray'}:field;
 });
}
function ipStagnantTable(model){
 const keys=rpColumnKeys(4).filter(key=>key!=='productType'),fields=new Map(model.rows.map(row=>[row,ipStagnantFields(row)]));
 const ranked=new Map(model.rows.map((row,index)=>[row.skuId,index+1]));
 const rows=rpSortRows(model.rows,ipStagnantSort,(row,key)=>fields.get(row).find(field=>field.key===key)?.sortValue);
 const headers=['序号','SKU信息',...keys.map(key=>rpSortHeader(key,rpColumnName(key,model.rows,4),ipStagnantSort,4,{key:'staleValue',direction:'desc'})),'操作'];
 return rows.length?table(headers,rows.map(row=>[ranked.get(row.skuId),rpIdentityMarkup(4,row,true),...keys.map(key=>rpListCell(fields.get(row).find(field=>field.key===key),false)),`<button type="button" class="link" data-ip-stagnant-detail="${esc(row.skuId)}" aria-label="查看${esc(row.name)}详情">查看</button>`]),'ip-stagnant-table'):'<div class="empty">当前季品下暂无符合条件的呆滞产品</div>';
}
function ipDecorateStagnantTable(host){
 // 显式标记普通表头，防止通用展示修饰器在排序或季品切换后补回金额问号。
 host.querySelector('[data-rp-sort="staleValue"]')?.closest('th').setAttribute('data-up-basic','');
 rpApplySortAria(host,ipStagnantSort);
}
function ipMountStagnantTop(){
 const host=$('#inventory-stagnant-top'),model=ipStagnantTopModel();
 host.innerHTML=`<div class="ip-stagnant-heading"><h3 data-up-basic>呆滞产品 Top10<span class="metric-help card-metric-help" role="button" tabindex="0" aria-label="查看呆滞产品Top10入榜及排序规则" data-metric-rule="${esc(ipStagnantRule())}"></span></h3><button type="button" class="link" data-ip-stagnant-all data-count="${model.count}" aria-label="查看全部${model.count}条呆滞产品">查看全部 ${model.count} ›</button></div><div class="ip-stagnant-scroll tablewrap">${ipStagnantTable(model)}</div>`;
 ipDecorateStagnantTable(host);
 host.onclick=event=>{
  if(event.target.closest('[data-ip-stagnant-all]')){toast('跳转产品库存-滞销品');return}
  const detail=event.target.closest('[data-ip-stagnant-detail]');
  if(detail){toast('跳转现有产品库存详情页');return}
  const sort=event.target.closest('[data-rp-sort]');
  if(sort){const scroll=host.querySelector('.ip-stagnant-scroll'),left=scroll.scrollLeft,key=sort.dataset.rpSort;rpSortCycle(ipStagnantSort,key,{key:'staleValue',direction:'desc'});scroll.innerHTML=ipStagnantTable(model);ipDecorateStagnantTable(host);scroll.scrollLeft=left;scroll.querySelector(`[data-rp-sort="${key}"]`)?.focus({preventScroll:true});return}

 };
}
