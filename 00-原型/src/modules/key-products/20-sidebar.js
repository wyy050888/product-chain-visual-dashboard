// 矩阵与价格带并排，六卡放在图表下方、明细之前。
function kpmPriceDistributionRows(rows){
 // 卡片只筛选明细；价格带忽略等级、异动和自身价格条件。
 return kpmFilterRows(rows,false,false,{...kpmFilters,price:'all'});
}
// 价格带沿用近30天成交均价；经营指标取所选期间，利润率按汇总GSV加权。
function kpmPriceBandFacts(rows){
 if(!rows.length)return {count:0,gsv:null,margin:null};
 const sum=key=>rows.every(p=>Number.isFinite(p.facts[key]))?rows.reduce((total,p)=>total+p.facts[key],0):null;
 const gsv=sum('gsvCents'),profit=sum('profitCents');
 return {count:rows.length,gsv,margin:Number.isFinite(gsv)&&gsv!==0&&Number.isFinite(profit)?profit/gsv*100:null};
}
function kpmPriceBandMetrics(facts){
 return `<span class="kpm-band-gsv" data-kpm-price-gsv>${Number.isFinite(facts.gsv)?upMoney(facts.gsv):'—'}</span><span class="kpm-band-margin ${facts.margin<0?'negative':''}" data-kpm-price-margin>${Number.isFinite(facts.margin)?upPercent(facts.margin):'—'}</span>`;
}
function kpmPriceDistribution(rows){
 const scope=kpmPriceDistributionRows(rows),bands=kpmPriceBands.filter(b=>!['all','custom'].includes(b.key));
 const groups=bands.map(b=>kpmPriceBandFacts(scope.filter(p=>kpmPriceMatch(p,{price:b.key})))),max=Math.max(1,...groups.map(g=>g.count));
 const missing=kpmPriceBandFacts(scope.filter(p=>!Number.isFinite(p.priceCents)));
 return `<div class="kpm-price-heading"><h3>产品价格带分布</h3><span data-up-basic>GSV</span><span data-up-basic>利润率</span></div><div class="kpm-price-bands" role="list">${bands.map((band,i)=>`<div role="listitem" data-kpm-price-band="${band.key}" data-price-count="${groups[i].count}" aria-label="${band.label}，${groups[i].count?'共'+groups[i].count+'个':'暂无产品'}"><span class="kpm-band-label"><span>${band.label}</span>${groups[i].count?`<span class="kpm-price-track" aria-hidden="true"><i style="width:${groups[i].count/max*100}%"></i></span>`:'<span class="kpm-price-empty">暂无产品</span>'}</span><strong>${groups[i].count?groups[i].count+'<small>个</small>':'—'}</strong>${kpmPriceBandMetrics(groups[i])}</div>`).join('')}</div>${missing.count?`<div class="kpm-price-missing"><span>暂无价格</span><strong>${missing.count}<small>个</small></strong>${kpmPriceBandMetrics(missing)}</div>`:''}`;
}

function kpmRenderSidebar(rows,managementRows){
 const plot=$('#matrix .matrixplot');let sidebar=plot.closest('.kpm-sidebar');
 if(!sidebar){
  sidebar=document.createElement('aside');sidebar.className='kpm-sidebar';sidebar.setAttribute('aria-label','关键产品经营概览');plot.before(sidebar);
  sidebar.innerHTML=kpmManagementView(managementRows)+'<section class="kpm-price-distribution" aria-label="产品价格带分布"></section>';
  sidebar.querySelector('[data-kpm-plot-slot]').replaceWith(plot);
  plot.setAttribute('aria-label','产品经营矩阵');
 }
 const list=$('#matrix .matrixlist');let structure=$('#matrix-structure-summary');
 if(!structure){
  structure=document.createElement('section');structure.id='matrix-structure-summary';
  structure.className='kpm-grade-overview';structure.setAttribute('aria-label','产品分级经营');
 }
 if(structure.nextElementSibling!==list||structure.parentNode!==list.parentNode)list.before(structure);
 sidebar.querySelector('.kpm-price-distribution').innerHTML=kpmPriceDistribution(rows);
 kpmRenderManagementFacts(managementRows,kpmFilterRows(rows,false,false));
}

