const kpmChartPoints=new Map();
let kpmChartContext={};
const kpmChartColors={S:'#009a29',A:'var(--orange)',B:'#7c8eec',C:'#e98191',unrated:'#98a5b6'};
function kpmChartLegend(){
 return Object.entries(kpmGrades).map(([g,name])=>'<span class="'+g+'"><i></i><i style="opacity:.28"></i>'+g+'级'+'</span>').join('')+'<span class="unrated"><i></i>未分级</span>';
}
// 图点和分区使用同周期、同规则；可定位的未分级产品保留灰点。
function kpmChartRow(p){
 const facts=p.assessment.current;
 return {...p,facts,sales:facts.gsvCents/1000000,profit:facts.profitRate};
}
// 重点区域及圆点深浅共用经营标签条件，等级色系保持一致。
function kpmChartOperatingRegions(mode){
 return kpmGradeOrder.flatMap(grade=>brcGradeSalesRanges(grade,null,mode).flatMap(sales=>
  brcRanges(brcConditions()[brcGradeKeys(grade).profit]).map(profit=>({grade,sales,profit}))));
}
function kpmChart(rows,scaleRows){
 const valid=p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.gsvCents)&&Number.isFinite(p.assessment.current.profitRate);
 const points=rows.filter(valid).map(kpmChartRow),scale=scaleRows.filter(valid).map(kpmChartRow);
 kpmChartPoints.clear();for(const p of points)kpmChartPoints.set(p.spuId,p);
 const range=upWindow();kpmChartContext={...range,label:periodShortText(periodFor('matrix'))};
 const gradeRules=brcGradeRules(periodFor('matrix').mode),rules=Object.values(gradeRules);
 const salesTicks=[...new Set(rules.flatMap(r=>r.salesRanges.flatMap(range=>[range.lo,range.hi])).filter(Number.isFinite))];
 const profitTicks=[...new Set([0,...kpmGradeOrder.flatMap(level=>brcRanges(brcConditions()[brcGradeKeys(level).profit]).flatMap(range=>[range.lo,range.hi])).filter(Number.isFinite)])];
 const left=62,right=738,top=42,bottom=438;
 const minX=Math.floor(Math.min(0,...scale.map(p=>p.sales*1.08))),maxX=Math.ceil(Math.max(Math.max(1,...salesTicks)*1.4,...scale.map(p=>p.sales*1.08)));
 // 正负利润率共用对称量程，0%固定居中；分区仍按真实业务阈值投影。
 const maxY=Math.ceil(Math.max(26,...profitTicks.map(v=>Math.abs(v)*1.5),...scale.map(p=>Math.abs(p.profit)*1.12))/5)*5,minY=-maxY;
 const x=v=>left+(v-minX)/(maxX-minX)*(right-left),y=v=>bottom-(v-minY)/(maxY-minY)*(bottom-top);
 const fills={S:'#f0f8f3',A:'#fffbf0',B:'#f1f4ff',C:'#fff3f5'};
 const operatingFills={S:'#cce8d6',A:'#fff0bd',B:'#dbe3ff',C:'#f8dce4'};
 // 以灰底表达未命中区，再覆盖有效等级区域，不把空档补进任一等级。
 const zones=kpmGradeOrder.flatMap(g=>gradeRules[g].regions.map(({sales,profit})=>{
  const a=x(Math.max(minX,sales.lo)),b=y(Math.min(maxY,profit.hi));
  return [g,a,b,x(Math.min(maxX,sales.hi))-a,y(Math.max(minY,profit.lo))-b];
 }).filter(([,a,b,w,h])=>w>0&&h>0));
 const operatingZones=kpmChartOperatingRegions(periodFor('matrix').mode).map(({grade,sales,profit})=>{
  const a=x(Math.max(minX,sales.lo)),b=y(Math.min(maxY,profit.hi));
  return [grade,a,b,x(Math.min(maxX,sales.hi))-a,y(Math.max(minY,profit.lo))-b];
 }).filter(([,a,b,w,h])=>w>0&&h>0);
 const xTicks=[...new Set([minX,0,...salesTicks,maxX])].sort((a,b)=>a-b),yTicks=[...new Set([minY,0,...profitTicks,maxY])].sort((a,b)=>a-b);
 return `<svg viewBox="0 0 760 490" role="group" aria-label="SABC产品经营矩阵，灰色为未分级" data-x-min="${minX}" data-x-max="${maxX}" data-y-min="${minY}" data-y-max="${maxY}">
  <text x="${left}" y="20" class="kpm-axis-title kpm-axis-profit">利润率（%）</text>
  <rect data-kpm-unmatched-area x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" rx="6" fill="#f1f4f8" stroke="#e3e9f1"/>
  ${zones.map(([g,a,b,w,h])=>`<rect data-quadrant="${g}" aria-label="${g}级产品" x="${a}" y="${b}" width="${w}" height="${h}" fill="${fills[g]}" stroke="${kpmChartColors[g]}" stroke-opacity=".2"/>`).join('')}
  ${operatingZones.map(([g,a,b,w,h])=>`<rect data-kpm-operating-area="${g}" aria-label="${g}级 · ${kpmGrades[g]}" x="${a}" y="${b}" width="${w}" height="${h}" fill="${operatingFills[g]}"/>`).join('')}
  ${xTicks.filter(v=>v!==0&&v>minX&&v<maxX).map(v=>`<line data-kpm-grid x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${bottom}" stroke="#dce3ed" stroke-dasharray="3 4"/>`).join('')}
  ${yTicks.filter(v=>v!==0&&v>minY&&v<maxY).map(v=>`<line data-kpm-grid data-kpm-profit-reference="${v}" x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}" stroke="#8194af" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>`).join('')}
  ${minX<0?`<line data-kpm-zero-axis="gsv" x1="${x(0)}" x2="${x(0)}" y1="${top}" y2="${bottom}"/>`:''}
  <line data-kpm-zero-axis="profit" x1="${left}" x2="${right}" y1="${y(0)}" y2="${y(0)}"/>
  ${zones.map(([g,a,b,w,h])=>h>=20?`<text data-kpm-zone-label="${g}" aria-label="${g}级" x="${w<32?a+w/2:a+8}" y="${b+22}" text-anchor="${w<32?'middle':'start'}" class="kpm-zone-label" style="fill:${kpmChartColors[g]}">${w<32?`<tspan>${g}</tspan><tspan x="${a+w/2}" dy="17">级</tspan>`:g+'级'}</text>`:'').join('')}
  ${xTicks.map(v=>`<text${v===0?' data-kpm-zero-tick="gsv"':''} x="${x(v)}" y="${bottom+22}" text-anchor="middle">${fmt(v)}</text>`).join('')}
  ${yTicks.map(v=>`<text${v===0?' data-kpm-zero-tick="profit"':''}${profitTicks.includes(v)&&v!==0?' data-kpm-profit-tick="'+v+'" style="fill:#526985;font-weight:600"':''} x="${left-10}" y="${y(v)+4}" text-anchor="end">${fmt(v,1)}%</text>`).join('')}
  ${[...points].sort((a,b)=>b.sales-a.sales).map(p=>{const tier=kpmBubbleTier(p.facts.gsvCents),operating=!!p.level&&brcProductOperatingMatch(p.level,p.profit),tone=!p.level?'unrated':operating?'matched':'unmatched';return `<circle data-kpm-point="${p.spuId}" data-kpm-bubble-tier="${tier}" data-kpm-point-tone="${tone}" data-kpm-grade-point="${p.level||'unrated'}" data-kpm-detail="${p.spuId}" tabindex="0" role="button" aria-label="查看${esc(p.name)}，${p.level?p.level+'级，'+(operating?'命中经营标签':'未命中经营标签'):'未分级'}，GSV ${fmt(p.sales,1)}w" cx="${x(p.sales)}" cy="${y(p.profit)}" r="${kpmBubbleRadius(tier)}" fill="${kpmChartColors[p.level||'unrated']}" fill-opacity="${tone==='unmatched'?'.28':'.95'}" stroke="${tone==='unmatched'?kpmChartColors[p.level]:'#fff'}" stroke-width="1.5"></circle>`}).join('')}
  <text x="${right}" y="482" text-anchor="end" class="kpm-axis-title kpm-axis-gsv">GSV（w）</text>
 </svg>${points.length?'':'<div class="kpm-chart-empty">当前筛选下暂无可绘制产品</div>'}`;
}
