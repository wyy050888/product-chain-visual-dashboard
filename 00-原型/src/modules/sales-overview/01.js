

// Two views of the same company. Brand actuals are explicitly demo allocations.
let salesDimension='chain';
const brandMix=[[32,18,15,23,12],[18,15,14,28,25],[25,24,21,20,10],[16,22,26,20,16]].map(row=>brands.map((_,i)=>row[i]||[4,3,5,3,4][(i-5)%5]));
function salesNames(d=salesDimension){return d==='brand'?brands:chains}
function sameCompanyTargets(chain,brand){return Array.from({length:12},(_,m)=>targetSum(chain.map(r=>r[m]))===targetSum(brand.map(r=>r[m]))).every(Boolean)}
function defaultBrandTargets(chain){const rows=brands.map(()=>Array(12).fill(0));for(let m=0;m<12;m++)chain.forEach((row,c)=>splitTarget(row[m],brandMix[c]).forEach((v,b)=>rows[b][m]+=v));return rows}
function syncOtherTargetDimension(indices){const e=targetEditor,grid=targetDraftYear(),other=e.drafts[e.year][e.dimension==='brand'?'chain':'brand'];for(const m of indices){const values=splitTarget(targetSum(grid.map(row=>row[m])),other.map(row=>row[m]));other.forEach((row,i)=>row[m]=values[i])}}
function targetCrossMatrix(year,m){const rowGoals=targetGrid(year,'chain').map(r=>r[m]),remaining=targetGrid(year,'brand').map(r=>r[m]);return rowGoals.map((total,c)=>{const parts=c===3?[...remaining]:splitTarget(total,remaining);parts.forEach((v,b)=>remaining[b]-=v);return parts})}
// 原始月度样例是整月量；未结束月份仅累计到数据截止日，不提前计入未来业绩。
function salesMonthActual(chain,month,year){
 const start=year+'-'+String(month).padStart(2,'0')+'-01',end=iso(new Date(Date.UTC(year,month,0)));
 if(start>DATA_CUTOFF)return 0;
 const last=end<DATA_CUTOFF?end:DATA_CUTOFF;
 return Math.round(salesMonth(chain,month,year)*(aiFlowDayDiff(start,last)+1)/(aiFlowDayDiff(start,end)+1)*100)/100;
}
function salesCrossData(){
 const p=periodFor(),periodMonths=new Set(months(p)),yearMonths=new Set(months(p,true)),targetMonths=new Set(targetIndexes(p.mode,p.value)),raw=salesBeforeTargets();
 const cells=chains.map((_,c)=>brands.map((_,b)=>({name:brands[b],sku:splitTarget(raw[c].sku,brandMix[c])[b],sale:0,gross:0,ytd:0,target:0,annual:0})));
 for(let m=1;m<=12;m++){
  const targets=targetCrossMatrix(p.year,m-1);
  for(let c=0;c<4;c++){
   const actual=salesMonthActual(c,m,p.year),amounts=splitTarget(actual*100,brandMix[c]),margin=baseSales[c].profit+(m-9)*.08,grossWeights=brandMix[c].map((v,b)=>v*([1.07,.94,.9,1.03,1.08][b]||1)),grossSum=targetSum(grossWeights);
   for(let b=0;b<brands.length;b++){const cell=cells[c][b];if(periodMonths.has(m)){cell.sale+=amounts[b]/100;cell.gross+=actual*margin/100*grossWeights[b]/grossSum}if(yearMonths.has(m))cell.ytd+=amounts[b]/100;if(targetMonths.has(m-1))cell.target+=targets[c][b]/100;cell.annual+=targets[c][b]/100}
  }
 }
 return cells.map(row=>row.map(c=>({...c,sale:+c.sale.toFixed(2),ytd:+c.ytd.toFixed(2),target:+c.target.toFixed(2),annual:+c.annual.toFixed(2),profit:c.sale?c.gross/c.sale*100:0})));
}
function sumSalesCells(cells,name){const sum=k=>targetSum(cells.map(c=>c[k]));return{name,sku:sum('sku'),sale:+sum('sale').toFixed(2),ytd:+sum('ytd').toFixed(2),target:+sum('target').toFixed(2),annual:+sum('annual').toFixed(2),gross:sum('gross'),profit:sum('sale')?sum('gross')/sum('sale')*100:0}}
function brandSales(){const cells=salesCrossData();return brands.map((name,b)=>sumSalesCells(cells.map(row=>row[b]),name))}
const salesRenderWithTargets=renderSales;
renderSales=function(){salesRenderWithTargets();withPeriod('sales',()=>{
 $('#sales').dataset.dimension=salesDimension;
 $$('#sales-dimension-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.salesDimension===salesDimension)));
 $('#sales .sectionhead .sub').textContent=salesDimension==='brand'?'多品牌经营数据，定位每个品牌的经营表现':'从公司大盘，定位每一条业务链';
 const list=sales(),max=Math.max(1000,Math.ceil(Math.max(...list.flatMap(r=>[r.sale,r.target]))/1000)*1000),step=510/list.length;
 $('#sales .twocol .charthead h3').textContent=salesDimension==='brand'?'五大品牌销售额':'四大品链销售额';
 $('#saleschart').innerHTML=`<svg viewBox="0 0 580 200" role="img" aria-label="${salesDimension==='brand'?'品牌':'品链'}${word()}销售额与目标比较">${[0,max/4,max/2,max*3/4,max].map(v=>`<line x1="48" y1="${165-v/max*140}" x2="568" y2="${165-v/max*140}" stroke="#edf0f6"/><text x="38" y="${169-v/max*140}" text-anchor="end">${fmt(v)}</text>`).join('')}${list.map((r,i)=>{const x=58+step*(i+.5);return `<g class="chartclick" data-sales="${i}"><rect x="${x-25}" y="${165-r.target/max*140}" width="20" height="${r.target/max*140}" rx="3" fill="#e3e7fb"/><rect x="${x+3}" y="${165-r.sale/max*140}" width="20" height="${r.sale/max*140}" rx="3" fill="#7381fb"/><text x="${x+13}" y="${158-r.sale/max*140}" text-anchor="middle" style="fill:#6370da">${fmt(r.sale,r.sale%1?2:0)}</text><text x="${x}" y="191" text-anchor="middle">${r.name}</text></g>`}).join('')}</svg>`;
 });};
// Details share the same cross-tab as the cards, including brand targets.
salesDetail=bindDetail('sales',function(index,view){
 const dimension=salesDimension,opposite=dimension==='brand'?'chain':'brand';view=view||opposite;if(!['chain','brand','channel'].includes(view))view=opposite;if(view===dimension)view=opposite;
 activeSales=index;salesView=view;const parent=index<0?totalSales():sales()[index],cells=salesCrossData();let records;
 if(view==='channel'){
  records=salesChannelData(parent);
 }else if(dimension==='chain')records=brands.map((name,b)=>index<0?sumSalesCells(cells.map(row=>row[b]),name):{...cells[index][b],name});
 else records=chains.map((name,c)=>index<0?sumSalesCells(cells[c],name):{...cells[c][index],name});
 const label=view==='brand'?'品牌':view==='chain'?'品链':'销售渠道',headers=[label,'SKU 总数',word()+'销售额',word()+'销售目标（万元）',word()+'规模达成率',word()+'利润率','年度销售额差额（万元）'];
 const rows=records.map(r=>[r.name,r.sku,fmt(r.sale,2),fmt(r.target,2),salesRateLabel(r),fmt(r.profit,1)+'%',fmt(r.annual-r.ytd,2)]);
 openModal(parent.name+' · 销售明细',`<div class="contextstrip"><div class="tabs"><button data-salesview="${opposite}" class="${view===opposite?'active':''}">分${opposite==='chain'?'品链':'品牌'}</button><button data-salesview="channel" class="${view==='channel'?'active':''}">分渠道</button></div><span class="note">${periodLabel()} · 金额单位：万元</span></div><div class="notice">${dimension==='brand'?'品牌':'品链'}维度 · 本期目标 ${pfMoneyYuan((parent.target)*10000)}。${view==='channel'?'渠道为演示分配。':'品链 × 品牌交叉明细为演示分配。'}各项合计与当前卡片一致，利润率按毛利加权计算。</div><div class="tablewrap">${table(headers,rows)}</div>`);
});
$('#salescards').insertAdjacentHTML('beforebegin','<div class="sales-dimension-bar"><div class="period-segment" id="sales-dimension-tabs" role="group" aria-label="销售统计维度"><button data-sales-dimension="chain" aria-pressed="true">品链维度</button><button data-sales-dimension="brand" aria-pressed="false">品牌维度</button></div></div>');
$('#sales-dimension-tabs').onclick=e=>{const b=e.target.closest('[data-sales-dimension]');if(!b)return;salesDimension=b.dataset.salesDimension;renderSales()};
// Keep the dimension switch beside the date picker, outside its replaceable contents.
const salesTimeControls=document.createElement('div');salesTimeControls.className='sales-time-controls';$('#time-sales').before(salesTimeControls);salesTimeControls.append($('#time-sales'),$('#sales-dimension-tabs'));
$('.sales-dimension-bar').remove();
const salesSnapshotBeforeBrands=window.dashboardSalesSnapshot;
window.dashboardSalesSnapshot=()=>({...salesSnapshotBeforeBrands(),companyTargets:{chain:targetClone(targetGrid(periodFor('sales').year,'chain')),brand:targetClone(targetGrid(periodFor('sales').year,'brand'))}});