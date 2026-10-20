// 放大图独立筛选；共享价格规则及交互，不回写外层。
function kpmMountZoomFilters(state){return withPeriod('matrix',()=>{
 const copy=value=>Array.isArray(value)?[...value]:value;
 const filters=Object.fromEntries(Object.entries(kpmFilters).map(([key,value])=>[key,copy(value)]));
 const rows=kpmRows().map(p=>({...p,zoomPriceCents:p.priceCents}));
 const host=document.createElement('div');host.className='kpm-zoom-filters';host.setAttribute('role','group');host.setAttribute('aria-label','矩阵放大筛选');state.filtersHost=host;
 const field=(key,label,options)=>`<label>${label}<select multiple data-pf-multiple data-pf-label="${label}" data-kpm-zoom-filter="${key}" aria-label="放大图${label}">${pfOptions(options,filters[key])}</select></label>`;
 host.innerHTML=field('brand','品牌',[...new Set(rows.map(p=>p.brand))])+field('category','类目',pfCategories)+kpmPriceMarkup(filters,'zoom')+field('season','季品',filterCatalog.seasons)+'<button type="button" class="link" data-kpm-zoom-reset>重置</button>';
 state.plot.querySelector('.kpm-chart-head').after(host);pfMultiMount(host,{controlled:true});
 const priceControl=kpmMountPriceFilter(host.querySelector('[data-kpm-price-host=zoom]'),filters,render);
 function render(){return withPeriod('matrix',()=>{
  kpmHidePointTooltip();const priceError=filters.price==='custom'?kpmPriceRange(filters).error||'':'';
  const visible=kpmFilterRows(rows,true,true,filters),base=kpmFilterRows(rows,false,true,filters);
  const chart=state.plot.querySelector('#matrixchart');chart.innerHTML=kpmChart(priceError?[]:visible,base);
  if(priceError)chart.querySelector('.kpm-chart-empty').textContent=priceError;
  state.zoomFilters={...filters};state.zoomRows=priceError?[]:visible;
 });}
 host.addEventListener('change',event=>{const input=event.target.closest('[data-kpm-zoom-filter]');if(!input||input.dataset.kpmZoomFilter==='price')return;filters[input.dataset.kpmZoomFilter]=pfControlValue(input);render()});
 host.querySelector('[data-kpm-zoom-reset]').onclick=()=>{
  Object.assign(filters,{brand:'all',category:'all',season:'all',price:'all',min:'',max:''});priceControl.sync();
  for(const select of host.querySelectorAll('[data-kpm-zoom-filter]'))pfControlSet(select,filters[select.dataset.kpmZoomFilter]);render();
 };
 render();
});}
window.dashboardKeyProductZoomSnapshot=()=>kpmZoomState?{filters:{...kpmZoomState.zoomFilters},rows:kpmZoomState.zoomRows.map(p=>({spuId:p.spuId,brand:p.brand,category:p.category,season:p.season,priceCents:p.zoomPriceCents,level:p.level})),points:[...kpmChartPoints.keys()]}:null;
