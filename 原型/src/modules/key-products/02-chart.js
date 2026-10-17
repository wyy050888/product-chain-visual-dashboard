const kpmChartPoints=new Map();
let kpmChartContext={};
// 放大销售×利润四象限；选择等级不改变同一筛选范围的坐标比例。
function kpmChart(rows,scaleRows){
 const valid=p=>p.facts.sales>0&&Number.isFinite(p.sales)&&Number.isFinite(p.profit),points=rows.filter(valid),scale=scaleRows.filter(valid);
 kpmChartPoints.clear();for(const p of points)kpmChartPoints.set(p.spuId,p);
 kpmChartContext={...upWindow(),label:periodShortText()};
 const left=62,right=738,top=42,bottom=438,maxX=Math.ceil(Math.max(config.high*1.4,...scale.map(p=>p.sales*1.08))),
  minY=Math.floor(Math.min(0,...scale.map(p=>p.profit*1.12))),maxY=Math.ceil(Math.max(26,config.profit*1.5,...scale.map(p=>p.profit*1.12)));
 const x=v=>left+v/maxX*(right-left),y=v=>bottom-(v-minY)/(maxY-minY)*(bottom-top),split=x(config.high),mid=y(config.profit);
 const quadrantNames={A:'高销高利',B:'高销低利',C:'低销高利',D:'低销低利'},gradeColors={S:'#35ac8e',A:'#e7ad50',B:'#7c8eec',C:'#e98191'};
 const fills={A:'#edf8f4',B:'#fff8eb',C:'#f0f4ff',D:'#fff1f2'},colors={A:'#35ac8e',B:'#e7ad50',C:'#7c8eec',D:'#e98191'};
 const zones=[['C',left,top,split-left,mid-top],['A',split,top,right-split,mid-top],['D',left,mid,split-left,bottom-mid],['B',split,mid,right-split,bottom-mid]];
 return `<svg viewBox="0 0 760 490" role="group" aria-label="GSV与利润率四象限，GSV${config.high}万元、利润率${config.profit}%为分界">
  <text x="${left}" y="20" class="kpm-axis-title kpm-axis-profit">单品利润率（%）</text>
  ${zones.map(([g,a,b,w,h])=>`<rect data-quadrant="${g}" x="${a}" y="${b}" width="${w}" height="${h}" fill="${fills[g]}"/><text x="${a+12}" y="${b+24}" class="kpm-zone-label" style="fill:${colors[g]}">${w>=90?quadrantNames[g]:''}</text>`).join('')}
  <line x1="${split}" x2="${split}" y1="${top}" y2="${bottom}" stroke="#c6d1e4" stroke-dasharray="5 5"/>
  <line x1="${left}" x2="${right}" y1="${mid}" y2="${mid}" stroke="#c6d1e4" stroke-dasharray="5 5"/>
  ${[...new Set([0,config.high,maxX])].map(v=>`<text x="${x(v)}" y="${bottom+22}" text-anchor="middle">${fmt(v)}</text>`).join('')}
  ${[...new Set([minY,0,config.profit,maxY])].map(v=>`<text x="${left-10}" y="${y(v)+4}" text-anchor="end">${fmt(v,1)}%</text>`).join('')}
  ${points.map(p=>`<circle data-kpm-point="${p.spuId}" data-kpm-detail="${p.spuId}" tabindex="0" role="button" aria-label="查看${esc(p.name)}，${p.level?p.level+'级':'待分级'}" cx="${x(p.sales)}" cy="${y(p.profit)}" r="6" fill="${gradeColors[p.level]||'#9aabc0'}" fill-opacity=".85"></circle>`).join('')}
  <text x="400" y="482" text-anchor="middle" class="kpm-axis-title kpm-axis-gsv">${periodShortText()}GSV（万元）</text>
 </svg>${points.length?'':'<div class="kpm-chart-empty">当前筛选下暂无经营数据</div>'}`;
}
