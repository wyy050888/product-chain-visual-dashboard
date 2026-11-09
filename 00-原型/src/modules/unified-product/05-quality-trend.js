// 以实际容器高度重算纵坐标，不拉伸文字或线条。
const upReturnLayouts=new WeakMap();
function upMountReturnLayout(root,model,state){
 upReturnLayouts.get(root)?.observer.disconnect();
 const host=root.querySelector('#up-return-chart');
 const measure=()=>{
  if(!root.isConnected)return ()=>observer.disconnect();
  const scroll=host.querySelector('[data-up-return-scroll]'),svg=scroll?.querySelector('svg');
  if(!svg?.clientWidth||!scroll.clientHeight)return;
  const height=innerWidth>900?Math.max(160,Math.round(scroll.clientHeight*svg.viewBox.baseVal.width/svg.clientWidth)):274;
  if(Math.abs(svg.viewBox.baseVal.height-height)<1)return;
  const left=scroll.scrollLeft;
  return ()=>{
   host.innerHTML=upReturnTrend(upReturnTrendPoints(model,state),state.returnPeriod||'day',upReturnTargets(model,state),height);
   host.querySelector('[data-up-return-scroll]').scrollLeft=left;
  };
 };
 const fit=()=>dashboardQueueLayout(host,measure),observer=new ResizeObserver(fit);
 upReturnLayouts.set(root,{observer,fit});observer.observe(host);fit();
}
// 周以周一为起点；部分周/月只累计所选区间，退货率按件数加权。
function upReturnBuckets(points,mode='day'){
 const buckets=new Map();
 for(const p of points){
  const key=mode==='month'?p.date.slice(0,7):mode==='week'?shiftDate(p.date,-((new Date(p.date+'T00:00:00Z').getUTCDay()+6)%7)):p.date;
  if(!buckets.has(key))buckets.set(key,{key,start:p.date,end:p.date,sales:0,returned:0,received:0});
  const b=buckets.get(key);b.end=p.date;for(const field of ['sales','returned','received'])b[field]+=p[field];
 }
 return [...buckets.values()].map(b=>({...b,returnRate:b.sales?b.returned/b.sales*100:null,receivedRate:b.sales?b.received/b.sales*100:null}));
}
// 周标签展示周一至周日，悬浮明细仍保留实际纳入统计的日期。
function upReturnTick(row,mode){
 if(mode==='week')return row.key.slice(5).replace('-','/')+'-'+shiftDate(row.key,6).slice(5).replace('-','/');
 return mode==='month'?row.key:row.key.slice(5);
}
// 长周期以筛选结束日所在周/月为最近一期，含当期，共24期；当期只统计到结束日。
function upReturnWindow(state){
 return recentTrendRange(state.start,state.end,state.returnPeriod||'day');
}
function upReturnTrendPoints(m,state){
 if(!state.returnPeriod||state.returnPeriod==='day')return m.current.points;
 const range=upReturnWindow(state);
 return upSummary(upIdentity(m.product),range.start,range.end,state.platform).points;
}
function upReturnTrend(points,mode,targets={},canvasHeight=274){
 const rows=upReturnBuckets(points,mode),series=[['returnRate','总退','#ed6178'],['receivedRate','已收退','#8a6bd1'],['sales','销量','#1677ff']];
 if(!rows.length)return '<div class="up-empty">暂无退货趋势数据</div>';
 const targetSeries=[['returnTarget','总退目标','#ed6178'],['receivedTarget','已收退目标','#8a6bd1']].filter(([key])=>Number.isFinite(targets[key]));
 const rateMax=Math.max(1,...rows.flatMap(r=>[r.returnRate||0,r.receivedRate||0]),...Object.values(targets).filter(Number.isFinite))*1.08;
 const salesMax=Math.max(1,...rows.map(r=>r.sales));
 const longPeriod=mode==='week'||mode==='month',plotWidth=longPeriod?Math.max(900,(rows.length-1)*(mode==='week'?120:96)):900,right=64+plotWidth,canvasWidth=right+76;
 const bottom=canvasHeight-40,plotHeight=canvasHeight-80;
 const x=i=>64+i*plotWidth/Math.max(1,rows.length-1),y=(v,max)=>bottom-v/max*plotHeight;
 const lines=series.map(([key,label,color])=>{
  let path='',linked=false;const max=key==='sales'?salesMax:rateMax;
  rows.forEach((r,i)=>{if(r[key]===null){linked=false;return}path+=(linked?'L':'M')+x(i)+','+y(r[key],max)+' ';linked=true});
  return `<g data-up-return-series="${key}"><path d="${path}" fill="none" stroke="${color}" stroke-width="2.4"/>${rows.length===1&&rows[0][key]!==null?`<circle cx="64" cy="${y(rows[0][key],max)}" r="3" fill="${color}"/>`:''}</g>`;
 }).join('');
 const targetLines=targetSeries.filter(([key])=>Number.isFinite(targets[key])).map(([key,label,color])=>`<line data-up-return-target="${key}" data-value="${targets[key]}" x1="64" x2="${right}" y1="${y(targets[key],rateMax)}" y2="${y(targets[key],rateMax)}" stroke="${color}" stroke-width="1.6" stroke-dasharray="6 5"/>`).join('');
 const ticks=longPeriod?rows.map((_,i)=>i):[...new Set(Array.from({length:5},(_,i)=>Math.round((rows.length-1)*i/4)))];
 const grid=[0,.5,1].map(t=>`<line x1="64" x2="${right}" y1="${bottom-t*plotHeight}" y2="${bottom-t*plotHeight}" stroke="#e8edf6"/><text x="52" y="${bottom+4-t*plotHeight}" text-anchor="end">${fmt(rateMax*t,1)}%</text><text x="${right+12}" y="${bottom+4-t*plotHeight}">${fmt(salesMax*t)}</text>`).join('');
 const width=plotWidth/Math.max(1,rows.length-1);
 const hits=rows.map((r,i)=>`<rect data-up-return-point data-date="${r.start===r.end?r.start:r.start+' — '+r.end}" data-sales="${r.sales}" data-returned="${r.returned}" data-received="${r.received}" data-rate="${r.returnRate??''}" data-received-rate="${r.receivedRate??''}" data-return-target="${targets.returnTarget??''}" data-received-target="${targets.receivedTarget??''}" tabindex="0" aria-label="${r.start} — ${r.end}；总退 ${upPercent(r.returnRate)}；已收退 ${upPercent(r.receivedRate)}；销量 ${fmt(r.sales)}件" x="${Math.max(64,x(i)-width/2)}" y="40" width="${rows.length===1?plotWidth:Math.min(right,x(i)+width/2)-Math.max(64,x(i)-width/2)}" height="${plotHeight}" fill="transparent"></rect>`).join('');
 return `<section class="up-sales-trend up-return-trend"><div class="up-trend-heading"><h3>退货率趋势</h3><div class="period-segment">${[['day','日'],['week','周'],['month','月']].map(([key,label])=>`<button type="button" data-up-return-period="${key}" class="${mode===key?'active':''}" aria-pressed="${mode===key}">${label}</button>`).join('')}</div></div><div class="up-trend-legend">${[...series,...targetSeries].map(([key,label,color])=>`<span data-up-basic="true" style="--series-color:${color}"><i class="${key.endsWith('Target')?'up-target-legend':''}"></i>${label}</span>`).join('')}</div><div class="up-trend-scroll" data-up-return-scroll="${longPeriod?'history':'day'}" tabindex="0" aria-label="退货趋势，可横向滚动"><svg data-up-return-canvas="${longPeriod?'history':'day'}" ${longPeriod?`style="min-width:${canvasWidth}px"`:""} viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-label="总退、已收退、销量趋势，按已配置的总退和已收退目标展示辅助线">${grid}${targetLines}${lines}${hits}${ticks.map(i=>`<text x="${x(i)}" y="${canvasHeight-13}" text-anchor="${mode==='week'?(i===0?'start':i===rows.length-1?'end':'middle'):'middle'}">${upReturnTick(rows[i],mode)}</text>`).join('')}</svg></div></section>`;
}
