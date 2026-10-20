const kpmChartPoints=new Map();
let kpmChartContext={};
// 图点与分区均取评级的近30天数据，避免累计经营值把产品画进其他等级区域。
function kpmChartRow(p){
 const facts=p.assessment.current;
 return {...p,facts,sales:facts.gsvCents/1000000,profit:facts.profitRate};
}
function kpmChart(rows,scaleRows){
 const valid=p=>Object.hasOwn(kpmGrades,p.level)&&p.assessment.current.sales>0;
 const points=rows.filter(valid).map(kpmChartRow),scale=scaleRows.filter(valid).map(kpmChartRow);
 kpmChartPoints.clear();for(const p of points)kpmChartPoints.set(p.spuId,p);
 const end=upWindow().end;kpmChartContext={start:shiftDate(end,-29),end,label:'近30天'};
 const rules=Object.values(kpmGradeRules),salesTicks=[...new Set(rules.flatMap(r=>[r.salesAbove,r.salesBelow]).filter(Number.isFinite))],
  profitTicks=[...new Set(rules.flatMap(r=>[r.profitAbove,r.profitBelow]).filter(Number.isFinite))];
 const left=62,right=738,top=42,bottom=438,
  minX=Math.floor(Math.min(0,...scale.map(p=>p.sales*1.08))),maxX=Math.ceil(Math.max(Math.max(...salesTicks)*1.4,...scale.map(p=>p.sales*1.08))),
  minY=Math.floor(Math.min(-5,...scale.map(p=>p.profit*1.12))),maxY=Math.ceil(Math.max(26,...profitTicks.map(v=>v*1.5),...scale.map(p=>p.profit*1.12)));
 const x=v=>left+(v-minX)/(maxX-minX)*(right-left),y=v=>bottom-(v-minY)/(maxY-minY)*(bottom-top);
 const fills={S:'#edf8f4',A:'#fff8eb',B:'#f0f4ff',C:'#fff1f2'},colors={S:'#35ac8e',A:'#e7ad50',B:'#7c8eec',C:'#e98191'};
 // 按原有严格区间画四个SABC区域；规则空档留白，不另画第五类或沿用旧60万/10%分界。
 const zones=kpmGradeOrder.map(g=>{
  const r=kpmGradeRules[g],a=x(r.salesAbove??minX),b=y(r.profitBelow??maxY);
  return [g,a,b,x(r.salesBelow??maxX)-a,y(r.profitAbove??minY)-b];
 });
 return `<svg viewBox="0 0 760 490" role="group" aria-label="SABC产品分级，近30天GSV与利润率">
  <text x="${left}" y="20" class="kpm-axis-title kpm-axis-profit">利润率（%）</text>
  ${zones.map(([g,a,b,w,h])=>`<rect data-quadrant="${g}" aria-label="${g} ${kpmGrades[g]}" x="${a}" y="${b}" width="${w}" height="${h}" fill="${fills[g]}" stroke="${colors[g]}" stroke-opacity=".25" stroke-dasharray="5 5"/><text x="${a+8}" y="${kpmGradeRules[g].profitBelow!==undefined?b+h-12:b+23}" class="kpm-zone-label" style="fill:${colors[g]}">${g}${w>=125?' '+kpmGrades[g]:''}</text>`).join('')}
  ${[...new Set([minX,0,...salesTicks,maxX])].sort((a,b)=>a-b).map(v=>`<text x="${x(v)}" y="${bottom+22}" text-anchor="middle">${fmt(v)}</text>`).join('')}
  ${[...new Set([minY,0,...profitTicks,maxY])].sort((a,b)=>a-b).map(v=>`<text x="${left-10}" y="${y(v)+4}" text-anchor="end">${fmt(v,1)}%</text>`).join('')}
  ${points.map(p=>`<circle data-kpm-point="${p.spuId}" data-kpm-grade-point="${p.level}" data-kpm-detail="${p.spuId}" tabindex="0" role="button" aria-label="查看${esc(p.name)}，${p.level}级" cx="${x(p.sales)}" cy="${y(p.profit)}" r="6" fill="${colors[p.level]}" fill-opacity=".85"></circle>`).join('')}
  <text x="${right}" y="482" text-anchor="end" class="kpm-axis-title kpm-axis-gsv">GSV（w）</text>
 </svg>${points.length?'':'<div class="kpm-chart-empty">当前筛选下暂无 SABC 产品</div>'}`;
}
