

// Dates are derived from the same module period as the displayed metrics.
function chartDateLabel(date,start,end){return start.slice(0,4)===end.slice(0,4)?date.slice(5):date}
function chartPeriodDates(count=3,monthly=false){
 const p=periodFor(),b=bounds(p),span=monthly?1:p.mode==='year'?12:p.mode==='quarter'?3:1;
 return Array.from({length:count},(_,i)=>{
  if(i===count-1)return monthly?b.cutoff.slice(0,7):b.cutoff;
  const month=monthly?+b.cutoff.slice(5,7):b.last;
  const d=new Date(Date.UTC(p.year,month-(count-1-i)*span,0));
  return monthly?iso(d).slice(0,7):iso(d);
 });
}
spark=function(i=0){
 const b=bounds(),start=b.start,end=b.cutoff;
 if(start>end)return '<small class="muted">当前周期暂无趋势数据</small>';
 const days=Math.round((Date.parse(end)-Date.parse(start))/86400000),points=Array.from({length:22},(_,k)=>({x:k*10,y:25-Math.sin(k*.8+i)*5-k*.5,date:shiftDate(start,Math.round(k/21*days))}));
 const path=points.map(p=>`${p.x},${p.y}`).join(' ');
 return `<svg class="spark" viewBox="0 0 210 32" preserveAspectRatio="none" role="img" aria-label="${start} 至 ${end}趋势"><polyline points="${path} 210,32 0,32" fill="#eef1ff" stroke="none"/><polyline points="${path}" fill="none" stroke="#8594ff" stroke-width="1.5"/>${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="transparent"><title>${p.date}</title></circle>`).join('')}</svg><span class="spark-dates" style="display:flex;justify-content:space-between;color:var(--muted,#8591ad);font-size:11px;line-height:18px"><span>${start}</span><span>${end}</span></span>`;
};
trend=function(total,range=bounds()){
 const start=range.start,end=range.cutoff||range.end;
 if(start>end)return '<div class="muted">当前周期暂无趋势数据</div>';
 const days=Math.round((Date.parse(end)-Date.parse(start))/86400000)+1,count=Math.min(9,days),weights=[.07,.095,.085,.12,.105,.13,.145,.15,.1].slice(0,count),sum=weights.reduce((a,b)=>a+b,0);
 const vals=weights.map(w=>w/sum*total),max=Math.max(1,...vals)*1.2;
 const rows=vals.map((v,i)=>({v,x:count===1?302:50+i*504/(count-1),y:155-v/max*120,start:shiftDate(start,Math.floor(i*days/count)),end:shiftDate(start,Math.floor((i+1)*days/count)-1)}));
 const pts=rows.map(r=>`${r.x},${r.y}`).join(' ');
 return `<svg class="dated-trend" viewBox="0 0 590 195" role="img" aria-label="${start} 至 ${end}销售额趋势，单位万元"><line x1="50" y1="155" x2="554" y2="155" stroke="#e8ecf5"/><text x="40" y="155" text-anchor="end">0</text><text x="40" y="35" text-anchor="end">${fmt(max,0)}</text><polyline points="${pts} ${rows.at(-1).x},155 ${rows[0].x},155" fill="#f0f3ff"/><polyline points="${pts}" fill="none" stroke="#7182fb" stroke-width="2.5"/>${rows.map((r,i)=>`<circle cx="${r.x}" cy="${r.y}" r="3" fill="#7182fb"><title>${r.start} — ${r.end}：${pfMoneyYuan((r.v)*10000)}</title></circle>${i%2===0||i===count-1?`<text class="date-tick" x="${r.x}" y="180" text-anchor="${i===0?'start':i===count-1?'end':'middle'}">${chartDateLabel(i===0?start:r.end,start,end)}</text>`:''}`).join('')}</svg>`;
};