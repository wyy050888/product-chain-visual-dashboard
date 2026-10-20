// 价格分布按其他筛选后的在池新品统计；点击区间与上方价格筛选同步。
function nspPriceDistributionRows(rows){
 return nspFilterRows(rows,{...nspFilters,price:'all'}).filter(p=>p.inNewPool);
}
function nspPriceDistribution(rows){
 const scope=nspPriceDistributionRows(rows),bands=kpmPriceBands.filter(b=>!['all','custom'].includes(b.key));
 const counts=bands.map(b=>scope.filter(p=>kpmPriceMatch(p,{price:b.key})).length),max=Math.max(1,...counts);
 const missing=scope.filter(p=>!Number.isFinite(p.priceCents)).length;
 return `<section class="nsp-price-distribution"><h3>新品价格带分布</h3><div class="nsp-price-bands">${bands.map((band,i)=>`<button type="button" data-nsp-price="${band.key}" aria-pressed="${nspFilters.price===band.key}" aria-label="筛选${band.label}，共${counts[i]}个"><span>${band.label}</span><span class="nsp-price-track" aria-hidden="true"><i style="width:${counts[i]/max*100}%"></i></span><strong>${counts[i]}<small>个</small></strong></button>`).join('')}</div>${missing?`<div class="nsp-price-missing">暂无价格<span>${missing}个</span></div>`:''}</section>`;
}
