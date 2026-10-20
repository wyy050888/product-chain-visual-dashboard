// 左侧三张独立卡片；放大仅移动矩阵图，价格分布和经营预警保留原位。
function kpmPriceDistributionRows(rows){
 return kpmFilterRows(rows,true,true,{...kpmFilters,price:'all'});
}
// 价格带沿用近30天成交均价；经营指标取所选期间，利润率按汇总GSV加权。
function kpmPriceBandFacts(rows){
 const gsv=rows.reduce((sum,p)=>sum+p.facts.gsvCents,0),profit=rows.reduce((sum,p)=>sum+p.facts.profitCents,0);
 return {count:rows.length,gsv,margin:gsv!==0?profit/gsv*100:null};
}
function kpmPriceBandMetrics(facts){
 return `<span class="kpm-band-gsv" data-kpm-price-gsv>${upMoney(facts.gsv)}</span><span class="kpm-band-margin ${facts.margin<0?'negative':''}" data-kpm-price-margin>${upPercent(facts.margin)}</span>`;
}
function kpmPriceDistribution(rows){
 const scope=kpmPriceDistributionRows(rows),bands=kpmPriceBands.filter(b=>!['all','custom'].includes(b.key));
 const groups=bands.map(b=>kpmPriceBandFacts(scope.filter(p=>kpmPriceMatch(p,{price:b.key})))),max=Math.max(1,...groups.map(g=>g.count));
 const missing=kpmPriceBandFacts(scope.filter(p=>!Number.isFinite(p.priceCents)));
 return `<div class="kpm-price-heading"><h3>产品价格带分布</h3><span data-up-basic>GSV</span><span data-up-basic>利润率</span></div><div class="kpm-price-bands">${bands.map((band,i)=>`<button type="button" data-kpm-price-band="${band.key}" aria-pressed="${kpmFilters.price===band.key}" aria-label="筛选${band.label}，共${groups[i].count}个"><span class="kpm-band-label"><span>${band.label}</span><span class="kpm-price-track" aria-hidden="true"><i style="width:${groups[i].count/max*100}%"></i></span></span><strong>${groups[i].count}<small>个</small></strong>${kpmPriceBandMetrics(groups[i])}</button>`).join('')}</div>${missing.count?`<div class="kpm-price-missing"><span>暂无价格</span><strong>${missing.count}<small>个</small></strong>${kpmPriceBandMetrics(missing)}</div>`:''}`;
}

function kpmRenderSidebar(rows,managementRows){
 const plot=$('#matrix .matrixplot');let sidebar=plot.closest('.kpm-sidebar');
 if(!sidebar){sidebar=document.createElement('aside');sidebar.className='kpm-sidebar';sidebar.setAttribute('aria-label','关键产品经营概览');plot.before(sidebar);sidebar.append(plot);sidebar.insertAdjacentHTML('beforeend','<section class="kpm-price-distribution" aria-label="产品价格带分布"></section><div id="matrix-ai-summary" class="matrix-ai-summary"></div>')}
 sidebar.querySelector('.kpm-price-distribution').innerHTML=kpmPriceDistribution(rows);
 sidebar.querySelector('#matrix-ai-summary').innerHTML=kpmManagementView(managementRows);
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#matrix.kpm-main [data-kpm-price-band]');if(!button)return;
 const key=button.dataset.kpmPriceBand;kpmFilters.price=kpmFilters.price===key?'all':key;kpmPage.value=1;kpmRender();
 $('#matrix [data-kpm-price-band="'+key+'"]').focus({preventScroll:true});
});
