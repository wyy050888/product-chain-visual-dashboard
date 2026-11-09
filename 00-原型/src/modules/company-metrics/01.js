

// Director cards expose the existing brand and platform ledger inline.
const siDirectorSales=$('#sales'),siPreviousRender=renderSales;
// 五张销售卡片共享维度，日期重绘后仍保留当前选择。
let siView='brand';
function siBreakdown(index,view){const cells=salesCrossData(),parent=index<0?totalSales():sales()[index];return view==='platform'?salesChannelData(parent):brands.map((name,b)=>index<0?sumSalesCells(cells.map(row=>row[b]),name):{...cells[index][b],name})}
function siTable(index,view){const rows=siBreakdown(index,view);return `<section class="si-breakdown" id="si-panel-${index}" role="tabpanel" aria-labelledby="si-tab-${index}-${view}"><table><thead><tr><th>${view==='brand'?'品牌':'渠道'}</th><th>销售额（万元）</th><th>达成率</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${fmt(r.sale,2)}</td><td class="${r.target?status(salesRate(r)):'muted'}">${salesRateLabel(r)}</td></tr>`).join('')}</tbody></table></section>`}
function siCardDetails(index){const view=siView,name=index<0?'公司整体':chains[index];return `<div class="si-switch-row"><div class="si-switch" role="tablist" aria-label="${esc(name)}销售明细维度">${[['brand','分品牌'],['platform','分渠道']].map(([key,label])=>`<button type="button" role="tab" id="si-tab-${index}-${key}" data-si-toggle="${index}" data-si-mode="${key}" aria-controls="si-panel-${index}" aria-selected="${view===key}" tabindex="${view===key?0:-1}">${label}</button>`).join('')}</div></div>${siTable(index,view)}`}
function siSelect(index,view){
 if(!['brand','platform'].includes(view))return;
 siView=view;
 withPeriod('sales',()=>{
  for(const root of $$('#salescards [data-si-card]'))root.innerHTML=siCardDetails(Number(root.dataset.siCard));
 });
 $(`#salescards [data-si-card="${index}"] [data-si-mode="${view}"]`)?.focus({preventScroll:true});
}
renderSales=function(){const director=$('#sales')===siDirectorSales&&dpState.view==='director';if(director)salesDimension='chain';siPreviousRender();if(!director)return;withPeriod('sales',()=>{$$('#salescards .salescard').forEach((card,i)=>{card.insertAdjacentHTML('beforeend',`<div class="si-card-details" data-si-card="${i-1}">${siCardDetails(i-1)}</div>`)});});};
document.addEventListener('click',e=>{const b=e.target.closest('[data-si-toggle]');if(b)siSelect(+b.dataset.siToggle,b.dataset.siMode)});
document.addEventListener('keydown',e=>{const b=e.target.closest('[data-si-toggle]');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();siSelect(+b.dataset.siToggle,e.key==='Home'?'brand':e.key==='End'?'platform':b.dataset.siMode==='brand'?'platform':'brand')});