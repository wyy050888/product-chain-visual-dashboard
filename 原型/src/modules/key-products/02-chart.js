// 放大销售×利润四象限；选择等级不改变同一筛选范围的坐标比例。
function kpmChart(rows,scaleRows){
 const valid=p=>p.level&&Number.isFinite(p.sales)&&Number.isFinite(p.profit),points=rows.filter(valid),scale=scaleRows.filter(valid);
 const left=62,right=738,top=42,bottom=438,maxX=Math.ceil(Math.max(config.high*1.4,...scale.map(p=>p.sales*1.08))),
  minY=Math.floor(Math.min(0,...scale.map(p=>p.profit*1.12))),maxY=Math.ceil(Math.max(26,config.profit*1.5,...scale.map(p=>p.profit*1.12)));
 const x=v=>left+v/maxX*(right-left),y=v=>bottom-(v-minY)/(maxY-minY)*(bottom-top),split=x(config.high),mid=y(config.profit);
 const fills={A:'#edf8f4',B:'#fff8eb',C:'#f0f4ff',D:'#fff1f2'},colors={A:'#35ac8e',B:'#e7ad50',C:'#7c8eec',D:'#e98191'};
 const zones=[['C',left,top,split-left,mid-top],['A',split,top,right-split,mid-top],['D',left,mid,split-left,bottom-mid],['B',split,mid,right-split,bottom-mid]];
 return `<svg viewBox="0 0 760 490" role="img" aria-label="销售额与利润率四象限，销售额${config.high}万元、利润率${config.profit}%为分界">
  <text x="${left}" y="20" class="kpm-axis-title">单品利润率（%）</text>
  ${zones.map(([g,a,b,w,h])=>`<rect data-quadrant="${g}" x="${a}" y="${b}" width="${w}" height="${h}" fill="${fills[g]}"/><text x="${a+12}" y="${b+24}" class="kpm-zone-label" style="fill:${colors[g]}"><tspan>${g}</tspan>${w>=115?`<tspan x="${a+12}" dy="19">${kpmGrades[g]}</tspan>`:''}</text>`).join('')}
  <line x1="${split}" x2="${split}" y1="${top}" y2="${bottom}" stroke="#c6d1e4" stroke-dasharray="5 5"/>
  <line x1="${left}" x2="${right}" y1="${mid}" y2="${mid}" stroke="#c6d1e4" stroke-dasharray="5 5"/>
  ${[...new Set([0,config.high,maxX])].map(v=>`<text x="${x(v)}" y="${bottom+22}" text-anchor="middle">${fmt(v)}</text>`).join('')}
  ${[...new Set([minY,0,config.profit,maxY])].map(v=>`<text x="${left-10}" y="${y(v)+4}" text-anchor="end">${fmt(v,1)}%</text>`).join('')}
  ${points.map(p=>`<circle data-kpm-detail="${p.spuId}" tabindex="0" role="button" aria-label="查看${esc(p.name)}，${p.level}类${kpmGrades[p.level]}" cx="${x(p.sales)}" cy="${y(p.profit)}" r="6" fill="${colors[p.level]}" fill-opacity=".85"><title>${esc(p.name)}
${p.level} ${kpmGrades[p.level]}
销售额 ${pfMoneyYuan(p.facts.gmvCents/100)}
利润率 ${upPercent(p.profit)}</title></circle>`).join('')}
  <text x="400" y="482" text-anchor="middle" class="kpm-axis-title">${periodShortText()}销售额（万元）</text>
 </svg>${points.length?'':'<div class="kpm-chart-empty">当前筛选下暂无可分级的经营数据</div>'}`;
}
