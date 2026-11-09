// 放大图独立筛选，不继承外层等级及异动条件；共享价格规则及交互，不回写外层。
function kpmMountZoomFilters(state){return withPeriod('matrix',()=>{
 const copy=value=>Array.isArray(value)?[...value]:value;
 const filters=Object.fromEntries(Object.entries(kpmFilters).map(([key,value])=>[key,copy(value)]));
 const rows=kpmRows().map(p=>({...p,zoomPriceCents:p.priceCents}));
 const host=document.createElement('div');host.className='kpm-zoom-filters';host.setAttribute('role','group');host.setAttribute('aria-label','矩阵放大筛选');state.filtersHost=host;
 const field=(key,label,options)=>`<label>${label}<select multiple data-pf-multiple data-pf-label="${label}" data-kpm-zoom-filter="${key}" aria-label="放大图${label}">${pfOptions(options,filters[key])}</select></label>`;
 host.innerHTML='<div class="kpm-scope-tabs kpm-zoom-scope-tabs" role="group" aria-label="放大图季品与链群筛选"></div>'+field('brand','品牌',[...new Set(rows.map(p=>p.brand))])+kpmPriceMarkup(filters,'zoom')+'<button type="button" class="link" data-kpm-zoom-reset>重置</button>';
 state.plot.querySelector('.kpm-chart-head').after(host);pfMultiMount(host,{controlled:true});
 const priceControl=kpmMountPriceFilter(host.querySelector('[data-kpm-price-host=zoom]'),filters,render);
 function render(){return withPeriod('matrix',()=>{
  host.querySelector('.kpm-zoom-scope-tabs').innerHTML=kpmScopeGroup(rows,'season','季品',filterCatalog.seasons,filters,'zoom')+kpmScopeGroup(rows,'category','链群',pfCategories,filters,'zoom');
  kpmHidePointTooltip();const priceError=filters.price==='custom'?kpmPriceRange(filters).error||'':'';
  const base=kpmFilterRows(rows,false,false,filters);
  const chart=state.plot.querySelector('#matrixchart');chart.innerHTML=kpmChart(priceError?[]:base,base);
  if(priceError)chart.querySelector('.kpm-chart-empty').textContent=priceError;
  state.zoomFilters={...filters};state.zoomRows=priceError?[]:base;
 });}
 host.addEventListener('click',event=>{
  const button=event.target.closest('[data-kpm-zoom-scope-filter]');if(!button)return;
  const key=button.dataset.kpmZoomScopeFilter,value=button.dataset.kpmScopeValue;
  const selected=pfSelected(pfToggleChoice(filters[key],value));filters[key]=selected.length?selected:'all';render();
  host.querySelector('[data-kpm-zoom-scope-filter="'+key+'"][data-kpm-scope-value="'+CSS.escape(value)+'"]')?.focus({preventScroll:true});
 });
 host.addEventListener('change',event=>{const input=event.target.closest('[data-kpm-zoom-filter]');if(!input||input.dataset.kpmZoomFilter==='price')return;filters[input.dataset.kpmZoomFilter]=pfControlValue(input);render()});
 host.querySelector('[data-kpm-zoom-reset]').onclick=()=>{
  Object.assign(filters,{brand:'all',category:'all',season:'all',price:'all',min:'',max:''});priceControl.sync();
  for(const select of host.querySelectorAll('[data-kpm-zoom-filter]'))pfControlSet(select,filters[select.dataset.kpmZoomFilter]);render();
 };
 render();
});}
window.dashboardKeyProductZoomSnapshot=()=>kpmZoomState?{filters:{...kpmZoomState.zoomFilters},rows:kpmZoomState.zoomRows.map(p=>({spuId:p.spuId,brand:p.brand,category:p.category,season:p.season,priceCents:p.zoomPriceCents,level:p.level})),points:[...kpmChartPoints.keys()]}:null;
