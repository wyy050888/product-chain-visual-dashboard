// 两组货值共用左轴，占比独立右轴；无快照的期次断开折线，不画成零库存。
function ipStaleAxisMaximum(value){
 if(!(value>0))return 1;
 const unit=10**Math.floor(Math.log10(value))/10;
 return Math.ceil(value/unit)*unit;
}
function ipStaleTrendSvg(rows,width,height=360){
 const w=Math.max(300,Math.round(width)),h=Math.max(360,Math.round(height)),left=54,right=w-43,top=32,bottom=h-38,plot=bottom-top,step=(right-left)/Math.max(1,rows.length);
 const valid=rows.filter(row=>row.date),maxValue=Math.max(0,...valid.map(row=>row.totalValueCents/1000000));
 // 两轴贴近各自峰值，仅向上取一档整刻度，保持零基线而不预留大段空轴。
 const valueMax=ipStaleAxisMaximum(maxValue),ratioMax=ipStaleAxisMaximum(Math.max(0,...valid.map(row=>row.ratio??0)));
 const ratioDigits=Number.isInteger(ratioMax/4)?0:ratioMax>=4?1:2,moneyY=value=>bottom-value/1000000/valueMax*plot,ratioY=value=>bottom-value/ratioMax*plot;
 let svg=`<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="呆滞货值、总库存货值和呆滞金额占比趋势"><text x="${left}" y="16" class="ip-stale-axis">万元</text><text x="${right}" y="16" text-anchor="end" class="ip-stale-axis">占比</text>`;
 for(let i=0;i<=4;i++){
  const y=bottom-i*plot/4;
  svg+=`<path d="M${left} ${y}H${right}" class="ip-stale-grid"/><text x="${left-8}" y="${y+4}" text-anchor="end" class="ip-stale-axis">${fmt(valueMax*i/4,valueMax<10?1:0)}</text><text x="${right+7}" y="${y+4}" class="ip-stale-axis">${fmt(ratioMax*i/4,ratioDigits)}%</text>`;
 }
 let path='',connected=false;
 rows.forEach((row,index)=>{
  const x=left+step*(index+.5),bar=Math.min(18,step*.25),showLabel=step>=48||index%2===0||index===rows.length-1;
  svg+=showLabel?`<text x="${x}" y="${bottom+22}" text-anchor="middle" class="ip-stale-axis">${esc(row.label)}</text>`:'';
  if(!row.date){connected=false;svg+=`<text x="${x}" y="${bottom-8}" text-anchor="middle" class="ip-stale-missing">—</text>`;return}
  const hint=`${row.label}\n快照日期：${row.date}\n呆滞货值：${fmt(row.staleValueCents/1000000,1)}万元\n总库存货值：${fmt(row.totalValueCents/1000000,1)}万元\n呆滞占比：${row.ratio===null?'—':fmt(row.ratio,1)+'%'}`;
  svg+=`<g class="ip-stale-mark" tabindex="0" role="img" aria-label="${esc(hint)}" data-metric-rule="${esc(hint)}" data-ip-trend-date="${row.date}" data-ip-trend-point="${esc(JSON.stringify({label:row.label,staleValueCents:row.staleValueCents,totalValueCents:row.totalValueCents,ratio:row.ratio}))}"><rect x="${x-bar-1}" y="${moneyY(row.staleValueCents)}" width="${bar}" height="${bottom-moneyY(row.staleValueCents)}" rx="2" fill="#4b88f5"/><rect x="${x+1}" y="${moneyY(row.totalValueCents)}" width="${bar}" height="${bottom-moneyY(row.totalValueCents)}" rx="2" fill="#c8d8f3"/><rect x="${x-step/2+1}" y="${top}" width="${step-2}" height="${plot}" fill="transparent"/></g>`;
  if(row.ratio!==null){path+=(connected?' L':' M')+x+' '+ratioY(row.ratio);connected=true}else connected=false;
 });
 svg+=`<path d="${path.trim()}" fill="none" stroke="#d39a15" stroke-width="2.5" pointer-events="none"/>`;
 rows.forEach((row,index)=>{
  if(row.ratio===null)return;
  const x=left+step*(index+.5),y=ratioY(row.ratio);
  svg+=`<circle cx="${x}" cy="${y}" r="3.5" fill="#fff" stroke="#d39a15" stroke-width="2" pointer-events="none"/>`;
  if(step>=48||index===rows.length-1)svg+=`<text x="${x}" y="${y-11}" text-anchor="middle" class="ip-stale-ratio-label">${fmt(row.ratio,1)}%</text>`;
 });
 return svg+'</svg>';
}
// 数据提示用独立字段排版，避免共享浮层把换行文案合并成段落。
function ipRenderStaleTrendTooltip(host,help){
 const row=JSON.parse(help.dataset.ipTrendPoint),append=(parent,tag,text)=>{const node=document.createElement(tag);node.textContent=text;parent.append(node);return node};
 const title=row.label.replace(/^(\d{2})\/(\d{2})$/,(_,year,month)=>'20'+year+'年'+Number(month)+'月').replace(/^(\d{2}) Q(\d)$/,(_,year,quarter)=>'20'+year+'年第'+quarter+'季度');
 const heading=append(host,'header','');append(heading,'h4',title);append(heading,'p','快照日期：'+help.dataset.ipTrendDate.replaceAll('-','/'));
 const list=append(host,'dl','');
 for(const [key,label,value,unit] of [
  ['stale','呆滞货值',fmt(row.staleValueCents/1000000,1),'万元'],
  ['total','总库存货值',fmt(row.totalValueCents/1000000,1),'万元'],
  ['ratio','呆滞占比',row.ratio===null?'—':fmt(row.ratio,1),row.ratio===null?'':'%']
 ]){
  append(list,'dt',label).dataset.trendKey=key;const cell=append(list,'dd','');cell.dataset.trendKey=key;
  append(cell,'strong',value);if(unit)append(cell,'small',unit);
 }
}
function ipStaleTrendPanel(model){
 const latest=model.trend.filter(row=>row.date).at(-1);
 const values=[['呆滞货值',latest?fmt(latest.staleValueCents/1000000,1):'—','万元'],['总库存货值',latest?fmt(latest.totalValueCents/1000000,1):'—','万元'],['呆滞占比',latest?.ratio!=null?fmt(latest.ratio,1):'—','%']];
 return `<article class="ip-stale-panel ip-stale-trend"><header><h3>呆滞货值占比趋势</h3></header><div class="ip-stale-trend-stats">${values.map(([label,value,unit])=>`<div><span${label==='呆滞货值'?' data-metric-help-disabled':''}>${label}</span><strong>${value}<small>${value==='—'?'':unit}</small></strong></div>`).join('')}</div><div class="ip-stale-chart-legend"><span data-metric-help-disabled><i style="background:#4b88f5"></i>呆滞货值</span><span><i style="background:#c8d8f3"></i>总库存货值</span><span><i class="is-line"></i>呆滞占比</span></div><div data-ip-stale-trend-plot></div></article>`;
}
