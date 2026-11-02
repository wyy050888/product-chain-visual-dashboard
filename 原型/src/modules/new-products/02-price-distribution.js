// 价格分布忽略自身筛选保留各档数量；条形与下方价格控件共用price状态。
function nspPriceDistributionRows(rows){
 return nspFilterRows(rows,{...nspFilters,price:'all'}).filter(p=>p.inNewPool);
}
function nspPriceDistribution(rows){
 const scope=nspPriceDistributionRows(rows),bands=kpmPriceBands.filter(b=>!['all','custom'].includes(b.key));
 const counts=bands.map(b=>scope.filter(p=>kpmPriceMatch(p,{price:b.key})).length),max=Math.max(1,...counts);
 const missing=scope.filter(p=>!Number.isFinite(p.priceCents)).length;
 return `<section class="nsp-price-distribution"><h3>新品价格带分布</h3><div class="nsp-price-bands" role="group" aria-label="新品价格带筛选">${bands.map((band,i)=>`<button type="button" aria-pressed="${nspFilters.price===band.key}" data-nsp-price="${band.key}" data-price-count="${counts[i]}" aria-label="${band.label}，${counts[i]?'共'+counts[i]+'个':'暂无产品'}"><span>${band.label}</span>${counts[i]?`<span class="nsp-price-track" aria-hidden="true"><i style="width:${counts[i]/max*100}%"></i></span>`:'<span class="nsp-price-empty">暂无产品</span>'}<strong>${counts[i]?counts[i]+'<small>个</small>':'—'}</strong></button>`).join('')}</div>${missing?`<div class="nsp-price-missing">暂无价格<span>${missing}个</span></div>`:''}</section>`;
}
