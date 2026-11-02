// 左侧SABC为展示刻度；曲线高度取所选自然期间GSV，点位字母取实际分级。
function upGradeTrendView(product,state){
 const mode=upGradeTrendPeriod(state).mode,rows=upGradeTrendRows(upIdentity(product),state.end,mode);
 const levels=['S','A','B','C'],left=64,right=1110,top=28,bottom=174;
 const values=rows.map(row=>row.periodGsvCents).filter(Number.isFinite),low=Math.min(0,...values),high=Math.max(1,...values);
 const x=i=>rows.length<2?(left+right)/2:left+i*(right-left)/(rows.length-1),y=value=>bottom-(value-low)/(high-low)*(bottom-top);
 const segments=[];let previous=null,segment=null;
 for(const [i,row] of rows.entries()){
  if(!Number.isFinite(row.periodGsvCents)){previous=null;segment=null;continue}
  const point={x:x(i),y:y(row.periodGsvCents)};
  if(!segment){segment={first:point.x,last:point.x,path:`M${point.x},${point.y}`};segments.push(segment)}
  else segment.path+=`C${(previous.x+point.x)/2},${previous.y} ${(previous.x+point.x)/2},${point.y} ${point.x},${point.y}`;
  segment.last=point.x;previous=point;
 }
 const path=segments.map(part=>part.path).join(' '),area=segments.map(part=>`${part.path}L${part.last},${bottom}L${part.first},${bottom}Z`).join(' ');
 const hitWidth=(right-left)/Math.max(1,rows.length-1),latest=rows.at(-1);
 const chart=rows.length?`<div class="up-grade-scroll"><svg viewBox="0 0 1140 220" preserveAspectRatio="none" role="group" aria-label="产品分级趋势，曲线高度按GSV绘制">
  <defs><linearGradient id="up-grade-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1677ff" stop-opacity=".07"/><stop offset="100%" stop-color="#1677ff" stop-opacity=".015"/></linearGradient></defs>
  ${levels.map((level,i)=>{const lineY=top+i*(bottom-top)/3;return `<line x1="${left}" x2="${right}" y1="${lineY}" y2="${lineY}" stroke="#e8edf6" stroke-dasharray="4 4"/><text x="42" y="${lineY+4}" text-anchor="end">${level}</text>`}).join('')}
  ${rows.map((row,i)=>`<line x1="${x(i)}" x2="${x(i)}" y1="${top}" y2="${bottom}" stroke="#e8edf6" stroke-dasharray="4 4"/>`).join('')}
  ${area?`<path data-up-grade-area d="${area}" fill="url(#up-grade-area)"/>`:''}<path data-up-grade-line d="${path}" fill="none" stroke="#1677ff" stroke-width="2" vector-effect="non-scaling-stroke"/>
  ${rows.map((row,i)=>`${Number.isFinite(row.periodGsvCents)?`<circle data-up-grade-dot="${row.level||''}" data-grade-gsv-cents="${row.periodGsvCents}" cx="${x(i)}" cy="${y(row.periodGsvCents)}" r="4" fill="#1677ff" stroke="white" stroke-width="1.5"/><text class="up-grade-point-label" data-up-grade-label x="${x(i)}" y="${y(row.periodGsvCents)+(y(row.periodGsvCents)<top+24?20:-12)}" text-anchor="middle">${row.level||'—'}</text>`:''}<text data-up-grade-tick x="${x(i)}" y="207" text-anchor="middle">${esc(row.label)}</text>`).join('')}
  ${rows.map((row,i)=>{
   const fields=[{label:'GSV',value:Number.isFinite(row.periodGsvCents)?upMoney(row.periodGsvCents):'—',color:'#1677ff'},{label:'利润率',value:Number.isFinite(row.periodProfitRate)?upPercent(row.periodProfitRate):'—',color:'#8a6bd1'}];
   return `<rect data-up-grade-point data-grade="${row.level||''}" data-grade-end="${row.periodEnd}" data-date="${row.label} · ${row.periodStart} — ${row.periodEnd}" data-series-values="${esc(JSON.stringify(fields))}" x="${Math.max(left,x(i)-hitWidth/2)}" y="${top-12}" width="${rows.length===1?right-left:Math.min(right,x(i)+hitWidth/2)-Math.max(left,x(i)-hitWidth/2)}" height="${bottom-top+24}" fill="transparent" tabindex="0" aria-label="${esc(row.label+'，产品分级 '+(row.level||'无有效等级')+'，GSV '+(Number.isFinite(row.periodGsvCents)?upMoney(row.periodGsvCents):'—')+'，利润率 '+upPercent(row.periodProfitRate))}"/>`;
  }).join('')}</svg></div>`:'<div class="up-empty">该期间暂无分级数据</div>';
 return `<section class="up-grade-trend" data-grade-mode="${mode}" aria-label="产品分级趋势"><header><h3>产品分级趋势${latest?.level?upProductGradeBadge(latest.level):''}</h3></header>${chart}</section>`;
}
