const upStockRiskBadges={
 shortage:{label:'缺货',path:'<path d="m3 8 8-4 8 4v11l-8 4-8-4Z"/><path d="m3 8 8 4 8-4M11 12v5"/><path d="M11 20h.01"/>'},
 transfer:{label:'调货',path:'<path d="M4 8h16l-4-4M20 16H4l4 4"/><path d="M20 8v3M4 16v-3"/>'},
 stagnant:{label:'滞销',path:'<path d="m3 7 7-3 7 3-7 3-7-3Zm0 0v10l5 2M10 10v4"/><circle cx="17" cy="17" r="6"/><path d="M17 14v3l2 1"/>'}
};
function upStockBadges(model){
 const tags=upStockRiskTags(model);
 if(!tags.length)return '';
 return `<div class="up-stock-risk" aria-label="库存风险">${tags.map(key=>{const badge=upStockRiskBadges[key];return `<span class="up-stock-risk-tag ${key}" data-stock-risk="${key}"><span class="up-stock-risk-icon"><svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${badge.path}</svg></span><span>${badge.label}</span></span>`}).join('')}</div>`;
}
function upStockView(m,state){
 const model=upStockModel(m,state);if(!model)return '<div class="up-empty">暂无库存台账</div>';
 return `<div class="up-stock-heading"><h3>库存指标</h3>${upStockBadges(model)}<button type="button" class="link up-stock-more" data-stock-more data-metric-rule="跳转spu库存详情页">查看更多</button></div>
 ${upStockBalanceCards(model,true)}
 <section class="up-stock-sku-section"><h3>SKU库存明细</h3><div id="up-stock-skus" class="up-table"></div></section>`;
}
function upMountStock(root,m,state){
 const host=root.querySelector('#up-stock-skus'),model=upStockModel(m,state);if(!host||!model)return;
 const sort=state.stockSort||(state.stockSort={key:'',direction:''});
 function render(){
  const rows=rpSortRows(model.rows,sort,(r,key)=>r[key]);
  const headers=['SKU名称','SKU码',...upStockColumns.map(([key,label])=>rpSortHeader(key,label,sort).replaceAll('榜单排序','默认顺序'))];
  host.innerHTML=table(headers,rows.map(row=>[esc(row.name),esc(row.code),...upStockColumns.map(([key,,format])=>format(row[key]))]),'up-stock-sku-table');
  for(const [index,row] of rows.entries()){
   const tr=host.querySelectorAll('tbody tr')[index];tr.dataset.skuCode=row.code;
   for(const [columnIndex,[key]] of upStockColumns.entries()){const cell=tr.cells[2+columnIndex];cell.dataset.stockMetric=key;cell.dataset.stockRaw=row[key]}
  }
  rpApplySortAria(host,sort);
 }
 host.onclick=e=>{const button=e.target.closest('[data-rp-sort]');if(!button)return;const key=button.dataset.rpSort;rpSortCycle(sort,key);render();host.querySelector(`[data-rp-sort="${key}"]`)?.focus({preventScroll:true})};render();
}
