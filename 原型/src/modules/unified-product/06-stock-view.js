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
function upStockDonut(model){
 const total=model.warehouse,first=total>0?model.warehouseClass1/total*100:0;
 const rows=[['一类我司库存',model.warehouseClass1,first],['二类我司库存',model.warehouseClass2,total>0?100-first:0]];
 const tip=rows.map(([label,num,share])=>`${label}：${fmt(num)}（${total>0?fmt(share,1)+'%':'—'}）`).join('\n');
 return `<div class="up-stock-donut" tabindex="0" role="img" aria-label="${esc(tip)}" data-metric-rule="${esc(tip)}">
  <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="29" fill="none" stroke="#e6ebf3" stroke-width="10"/>
  ${total>0?`<g transform="rotate(-90 40 40)" fill="none" stroke-width="10"><circle cx="40" cy="40" r="29" pathLength="100" stroke="#9271df"/><circle cx="40" cy="40" r="29" pathLength="100" stroke="#4389f5" stroke-dasharray="${first} ${100-first}"/></g>`:''}
  <text x="40" y="38" text-anchor="middle" class="up-stock-donut-value">${total>0?fmt(first,1)+'%':'—'}</text><text x="40" y="51" text-anchor="middle" class="up-stock-donut-label">一类</text></svg>
 </div>`;
}
function upStockCard(title,items,chart=''){
 return `<article class="up-stock-card ${chart?'up-stock-card-chart':''}">${chart}<h4>${title}</h4>${items.map(([label,value],i)=>`<div class="up-stock-card-value ${i===0?'primary':''}"><span>${label}</span><strong>${value}</strong></div>`).join('')}</article>`;
}
function upStockView(m,state){
 const model=upStockModel(m,state);if(!model)return '<div class="up-empty">暂无库存台账</div>';
 const value=key=>{const column=upStockColumns.find(c=>c[0]===key);return column[2](model[key])};
 return `<div class="up-stock-heading"><h3>库存指标</h3>${upStockBadges(model)}</div>
 <div class="up-stock-cards">${[
  upStockCard('总库存',[['总库存',value('totalUnits')],['总可售天数',Number.isFinite(model.totalCoverage15)?fmt(model.totalCoverage15,1)+'天':'—'],['货值（总库存）',value('goodsValueCents')]]),
  upStockCard('我司可售',[['可售库存',value('warehouse')],['可售天数',value('coverage15')]],upStockDonut(model)),
  upStockCard('工厂可售库存',[['工厂可售库存',value('factoryAvailable')],['工厂总库存',value('factory')]]),
  upStockCard('近15日均净销量',[['日均净销量',value('dailyNet15')]]),
  upStockCard('库存周转率',[['周转率',value('turn')]])].join('')}</div>
 <section class="up-stock-sku-section"><h3>SKU库存明细</h3><div id="up-stock-skus" class="up-table"></div></section>`;
}
function upMountStock(root,m,state){
 const host=root.querySelector('#up-stock-skus'),model=upStockModel(m,state);if(!host||!model)return;
 const sort=state.stockSort||(state.stockSort={key:'',direction:''});
 function render(){
  const rows=rpSortRows(model.rows,sort,(r,key)=>r[key]);
  const headers=['SKU名称','SKU码',...upStockColumns.map(([key,label])=>rpSortHeader(key,label,sort).replaceAll('榜单排序','默认顺序'))];
  host.innerHTML=table(headers,rows.map(row=>[esc(row.name),esc(row.code),...upStockColumns.map(([key,,format])=>format(row[key]))]),'up-stock-sku-table');
  for(const [index,row] of rows.entries())host.querySelectorAll('tbody tr')[index].dataset.skuCode=row.code;
  rpApplySortAria(host,sort);
 }
 host.onclick=e=>{const button=e.target.closest('[data-rp-sort]');if(!button)return;const key=button.dataset.rpSort;rpSortCycle(sort,key);render();host.querySelector(`[data-rp-sort="${key}"]`)?.focus({preventScroll:true})};render();
}
