// 三条序列保留各自缩放，仅展示GSV纵轴；悬浮读取各指标的原值和单位。
function upSalesTrend(points,options={}){
 const rows=options.rows||points.map(d=>({date:d.date,gsv:d.gsvCents/1000000,sales:d.sales,margin:d.gsvCents>0?d.profitCents/d.gsvCents*100:null}));
 if(!rows.length)return '<div class="up-empty">暂无销售趋势数据</div>';
 const series=options.series||[{key:'gsv',name:'GSV',unit:'万元',color:'#1677ff',axis:64,anchor:'end'},
  {key:'sales',name:'销量',unit:'件',color:'#e49b37'},
  {key:'margin',name:'利润率',unit:'%',color:'#8a6bd1'}].filter(s=>s.key!=='margin'||options.margin!==false);
 const left=76,right=1110,top=38,bottom=options.bottom||186,x=i=>left+i*(right-left)/Math.max(1,rows.length-1);
 const ticks=[...new Set(Array.from({length:5},(_,i)=>Math.round((rows.length-1)*i/4)))];
 const grid=[0,.5,1].map(t=>`<line x1="${left}" x2="${right}" y1="${bottom-t*(bottom-top)}" y2="${bottom-t*(bottom-top)}" stroke="#e8edf6"/>`).join('');
 let axis='';
 const lines=series.map(item=>{
  const values=rows.map(r=>r[item.key]).filter(Number.isFinite),low=Math.min(0,...values),high=Math.max(1,...values),y=v=>bottom-(v-low)/(high-low)*(bottom-top);
  let path='',connected=false;
  rows.forEach((row,i)=>{const value=row[item.key];if(!Number.isFinite(value)){connected=false;return}path+=(connected?'L':'M')+x(i)+','+y(value)+' ';connected=true});
  const marks=item.key==='gsv'?[0,.5,1].map(t=>{const value=low+t*(high-low);return `<text x="${item.axis}" y="${y(value)+4}" text-anchor="${item.anchor}">${fmt(value,item.key==='sales'?0:1)}</text>`}).join(''):'';
  if(item.key==='gsv')axis=`<g data-up-axis="gsv">${marks}</g>`;
  return `<g data-up-series="${item.key}" style="--series-color:${item.color}"><path d="${path}" fill="none" stroke="${item.color}" stroke-width="2"/>${rows.length===1&&values.length?`<circle cx="${left}" cy="${y(values[0])}" r="3" fill="${item.color}"/>`:''}</g>`;
 }).join('');
 const hitWidth=(right-left)/Math.max(1,rows.length-1);
 const hits=rows.map((row,i)=>`<rect x="${Math.max(left,x(i)-hitWidth/2)}" y="${top}" width="${rows.length===1?right-left:Math.min(right,x(i)+hitWidth/2)-Math.max(left,x(i)-hitWidth/2)}" height="${bottom-top}" fill="transparent" data-up-trend-point data-series-values="${esc(JSON.stringify(series.map(s=>({key:s.key,label:s.name,color:s.color,value:Number.isFinite(row[s.key])?fmt(row[s.key],s.unit==='件'?0:s.unit==='%'?1:2)+s.unit:'—'}))))}" data-date="${esc(row.date)}" data-gsv="${esc(fmt(row.gsv,2)+'万元')}" data-sales="${esc(fmt(row.sales)+'件')}" data-margin="${esc(upPercent(row.margin))}" tabindex="0" aria-label="${esc(row.date+'；'+series.map(s=>s.name+' '+(Number.isFinite(row[s.key])?fmt(row[s.key],s.unit==='件'?0:2)+s.unit:'—')).join('；'))}"></rect>`).join('');
 return `<section class="up-sales-trend up-operating-trend"><div class="up-trend-heading"><h3>${esc(options.title||'销售趋势')}</h3><div class="up-trend-legend" aria-label="销售趋势指标">${series.map(s=>`<button type="button" data-up-series-toggle="${s.key}" aria-pressed="true" style="--series-color:${s.color}"><i></i>${s.name}</button>`).join('')}</div></div>
 <div class="up-trend-scroll"><svg viewBox="0 0 1140 ${bottom+40}" role="img" aria-label="${series.map(s=>s.name).join('、')}销售趋势，悬浮查看原值">${grid}${axis}${lines}${hits}${ticks.map(i=>`<text x="${x(i)}" y="${bottom+27}" text-anchor="middle">${esc(options.tick?options.tick(rows[i]):rows[i].date.slice(5,10))}</text>`).join('')}</svg></div></section>`;
}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-up-series-toggle]');if(!button)return;
 const chart=button.closest('.up-sales-trend'),visible=button.getAttribute('aria-pressed')!=='true';
 if(!visible&&chart.querySelectorAll('[aria-pressed="true"]').length===1)return;
 button.setAttribute('aria-pressed',String(visible));chart.querySelector('[data-up-series="'+button.dataset.upSeriesToggle+'"]').style.display=visible?'':'none';
});

// 销售与退货趋势共用即时提示；取命中区域日期、数值，避免原生title延迟。
const upSalesTooltip=document.createElement('div');
upSalesTooltip.id='up-sales-tooltip';upSalesTooltip.className='metric-tooltip up-sales-tooltip';
upSalesTooltip.setAttribute('role','tooltip');upSalesTooltip.hidden=true;document.body.append(upSalesTooltip);
let upSalesActivePoint=null;
function upHideSalesTooltip(){
 upSalesActivePoint?.removeAttribute('aria-describedby');
 upSalesActivePoint?.classList.remove('up-trend-active');
 upSalesActivePoint=null;upSalesTooltip.hidden=true;
}
function upShowSalesTooltip(point,event){
 if(!point?.isConnected)return;
 if(upSalesActivePoint!==point||upSalesTooltip.hidden){
  upHideSalesTooltip();hideMetricTooltip();upSalesActivePoint=point;
  point.setAttribute('aria-describedby',upSalesTooltip.id);point.classList.add('up-trend-active');
  const chart=point.closest('.up-operating-trend'),d=point.dataset;
  const percent=value=>value===''?'—':upPercent(Number(value));
  const fields=chart?JSON.parse(d.seriesValues||'[]').filter(s=>chart.querySelector(`[data-up-series-toggle="${s.key}"]`)?.getAttribute('aria-pressed')==='true').map(s=>[s.label,s.value,s.color]):[
   ['总退',percent(d.rate),'#ed6178'],['已收退',percent(d.receivedRate),'#8a6bd1'],['销量',fmt(Number(d.sales))+'件','#1677ff'],
   ['总退目标',percent(d.returnTarget),'#ed6178',true],['已收退目标',percent(d.receivedTarget),'#8a6bd1',true]
  ];
  upSalesTooltip.innerHTML=`<strong class="up-sales-tooltip-date">${esc(d.date)}</strong>${fields.map(([label,value,color,dashed])=>`<div class="up-sales-tooltip-row"><span><i style="--point-color:${color}" class="${dashed?'up-tooltip-target':''}"></i>${label}</span><b>${esc(value)}</b></div>`).join('')}`;
  upSalesTooltip.hidden=false;
 }
 const anchor=point.getBoundingClientRect(),box=upSalesTooltip.getBoundingClientRect();
 const x=event?.clientX??anchor.right,y=event?.clientY??anchor.top;
 const left=x+16+box.width<=innerWidth-8?x+16:x-box.width-16;
 const top=y+12+box.height<=innerHeight-8?y+12:y-box.height-12;
 upSalesTooltip.style.left=Math.max(8,Math.min(innerWidth-box.width-8,left))+'px';
 upSalesTooltip.style.top=Math.max(8,top)+'px';
}
for(const type of ['pointerover','pointermove'])document.addEventListener(type,event=>{
 const point=event.target.closest?.('[data-up-trend-point],[data-up-return-point]');if(point)upShowSalesTooltip(point,event);
});
document.addEventListener('pointerout',event=>{if(event.target===upSalesActivePoint)upHideSalesTooltip()});
document.addEventListener('focusin',event=>{if(event.target.matches?.('[data-up-trend-point],[data-up-return-point]'))upShowSalesTooltip(event.target)});
document.addEventListener('focusout',event=>{if(event.target===upSalesActivePoint)upHideSalesTooltip()});
document.addEventListener('click',event=>{const point=event.target.closest?.('[data-up-trend-point],[data-up-return-point]');if(point)upShowSalesTooltip(point,event);else upHideSalesTooltip()},true);
document.addEventListener('scroll',upHideSalesTooltip,true);
document.addEventListener('change',upHideSalesTooltip,true);
window.addEventListener('resize',upHideSalesTooltip);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!upSalesTooltip.hidden){event.preventDefault();event.stopImmediatePropagation();upHideSalesTooltip()}},true);
new MutationObserver(()=>{if(upSalesActivePoint&&!upSalesActivePoint.isConnected)upHideSalesTooltip()}).observe($('#dialogbody'),{childList:true,subtree:true});
new MutationObserver(upHideSalesTooltip).observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
