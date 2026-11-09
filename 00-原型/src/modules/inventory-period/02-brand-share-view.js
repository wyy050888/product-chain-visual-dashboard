// 环形图与明细共用同一份品牌数据，零货值保留明细行、不绘制虚假扇区。
function ipBrandShareArcPath(start,share){
 const point=value=>{const angle=value/100*Math.PI*2;return (96+74*Math.cos(angle))+','+(96+74*Math.sin(angle))};
 // 两段半弧兼容100%单品牌；每个品牌拥有独立几何路径，悬浮不会被整圆遮挡。
 return `M${point(start)} A74,74 0 0,1 ${point(start+share/2)} A74,74 0 0,1 ${point(start+share)}`;
}
function ipBrandShareChart(model,title){
 let offset=0;
 const arcs=model.rows.filter(row=>row.share>0).map(row=>{
  const hint=[title,'品牌：'+row.name,'货值：'+fmt(row.value/1000000,2)+'万元','占比：'+fmt(row.share,1)+'%'].join('\n');
  const markup=`<path class="ip-brand-share-arc" d="${ipBrandShareArcPath(offset,row.share)}" stroke="${row.color}" tabindex="0" role="img" aria-label="${esc(hint.replaceAll('\n','，'))}" data-metric-rule="${esc(hint)}" data-ip-brand-arc="${esc(row.name)}" data-share="${row.share}"/>`;
  offset+=row.share;return markup;
 }).join('');
 const rows=model.rows.map(row=>`<div role="row" class="ip-brand-share-row ${row.value===0?'is-zero':''}" data-ip-share-brand="${esc(row.name)}" data-value="${row.value}" data-share="${row.share??''}"><span role="cell" class="ip-brand-share-name"><i style="background:${row.color}" aria-hidden="true"></i>${esc(row.name)}</span><span role="cell">${Number.isFinite(row.value)?fmt(row.value/1000000,2):'—'}</span><span role="cell">${row.share===null?'—':fmt(row.share,1)+'%'}</span></div>`).join('');
 return `<article class="ip-brand-share-card" data-ip-brand-chart="${model.key}" data-total="${model.total}"><h3>${title}</h3><div class="ip-brand-share-body"><div class="ip-brand-share-donut"><svg viewBox="0 0 192 192" role="group" aria-label="${esc(title)}"><circle class="ip-brand-share-track" cx="96" cy="96" r="74" aria-hidden="true"/><g transform="rotate(-90 96 96)">${arcs}</g></svg><div class="ip-brand-share-center"><span>总货值</span><strong>${Number.isFinite(model.total)?fmt(model.total/1000000,1):'—'}</strong><span>万元</span></div></div><div class="ip-brand-share-legend" role="table" aria-label="${title}明细"><div role="row" class="ip-brand-share-columns"><span role="columnheader">品牌</span><span role="columnheader">货值（万元）</span><span role="columnheader">占比</span></div>${rows}</div></div></article>`;
}
function ipBrandShareCharts(records){
 return [['goodsValueCents','总库存货值-品牌占比'],['warehouseValueCents','我司可售货值-品牌占比']].map(([key,title])=>ipBrandShareChart(ipBrandShareModel(records,key),title)).join('');
}
// 品牌浮层复用扇区与明细原值；用DOM节点排版，不解析格式化提示文案。
function ipRenderBrandShareTooltip(host,help){
 const card=help.closest('[data-ip-brand-chart]'),name=help.dataset.ipBrandArc;
 const row=[...card.querySelectorAll('[data-ip-share-brand]')].find(node=>node.dataset.ipShareBrand===name);
 if(!row)return;
 const append=(parent,tag,text,klass='')=>{const node=document.createElement(tag);if(text)node.textContent=text;if(klass)node.className=klass;parent.append(node);return node};
 const head=append(host,'div','','ip-share-tip-head');
 const brand=append(head,'div','','ip-share-tip-brand'),dot=append(brand,'i','');dot.style.background=help.getAttribute('stroke');dot.setAttribute('aria-hidden','true');
 append(brand,'strong',name);
 const metrics=append(host,'dl','','ip-share-tip-metrics');
 for(const [label,value,unit] of [['货值',fmt(Number(row.dataset.value)/1000000,2),'万元'],['占比',fmt(Number(row.dataset.share),1)+'%','']]){
  const line=append(metrics,'div','');append(line,'dt',label);
  const data=append(line,'dd','');append(data,'b',value);if(unit)append(data,'small',unit);
 }
}
