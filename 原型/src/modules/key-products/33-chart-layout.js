// 只重排SVG坐标；保留原节点、数据、分级与点击事件，放大及返回共用。
const kpmChartGeometry=new WeakMap();
function kpmFitChart(host){
 dashboardQueueLayout(host,kpmMeasureChart);
}
function kpmMeasureChart(host){
 const svg=host.querySelector('svg');if(!svg)return;
 const width=Math.max(host.clientWidth,svg.clientWidth),height=host.clientHeight;
 if(width<200||height<100)return;
 let source=kpmChartGeometry.get(svg);
 if(!source){
  source={nodes:[...svg.querySelectorAll('rect,circle,text,line')].map(node=>({node,attrs:Object.fromEntries(['x','y','width','height','cx','cy','x1','x2','y1','y2'].filter(key=>node.hasAttribute(key)).map(key=>[key,+node.getAttribute(key)]))}))};
  kpmChartGeometry.set(svg,source);
 }
 const zoom=!!host.closest('.kpm-chart-zoom'),key=[width,height,zoom].join('|');
 if(source.key===key)return;
 const left=52,right=width-18,top=30,bottom=height-38,sx=(right-left)/676,sy=(bottom-top)/396;
 const x=value=>value<62?left+value-62:left+(value-62)*sx;
 const y=value=>top+(value-42)*sy;
 // 字宽先批量测量；隐藏策略和坐标统一写入，避免每个刻度触发一次全页布局。
 const ticks=source.nodes.filter(({node,attrs})=>node.tagName==='text'&&attrs.y===460);
 for(const tick of ticks)tick.half??=tick.node.getComputedTextLength()/2;
 const hidden=new Set();let previous=null;
 for(const [index,tick] of ticks.entries()){
  const center=x(tick.attrs.x),half=tick.half;
  if(previous&&center-half<previous.right+5){
   if(tick.node.hasAttribute('data-kpm-zero-tick'))hidden.add(previous.node);
   else{hidden.add(tick.node);continue}
  }
  previous={node:tick.node,index,right:center+half};
 }
 return ()=>{
 source.key=key;
 svg.setAttribute('viewBox','0 0 '+width+' '+height);
 for(const {node,attrs} of source.nodes){
  for(const [attr,value] of Object.entries(attrs)){
   let mapped=['x','cx','x1','x2'].includes(attr)?x(value):attr==='width'?value*sx:attr==='height'?value*sy:y(value);
   if(node.tagName==='text'&&attr==='y'&&value>438)mapped=bottom+20;
   node.setAttribute(attr,mapped);
  }
  if(node.classList.contains('kpm-axis-profit')){node.setAttribute('x',left);node.setAttribute('y',16)}
  if(node.classList.contains('kpm-axis-gsv')){node.setAttribute('x',right);node.setAttribute('y',height-3)}
  if(node.hasAttribute('data-kpm-point'))node.setAttribute('r',kpmBubbleRadius(Number(node.dataset.kpmBubbleTier),zoom));
 }
 // 刻度重叠时保留0；阈值线与真实分区仍完整显示。
 for(const {node} of ticks){if(hidden.has(node))node.style.display='none';else node.style.removeProperty('display')}
 };
}
let kpmObservedChart=null,kpmObservedSvg=null;
const kpmChartSizeObserver=new ResizeObserver(entries=>{for(const {target} of entries)kpmFitChart(target)});
function kpmObserveChartLayout(){
 const host=$('#matrix.kpm-main #matrixchart');
 if(host!==kpmObservedChart){kpmChartSizeObserver.disconnect();kpmObservedChart=host;if(host)kpmChartSizeObserver.observe(host)}
 const svg=host?.querySelector('svg');
 if(svg!==kpmObservedSvg){kpmObservedSvg=svg;if(svg)kpmFitChart(host)}
}
new MutationObserver(kpmObserveChartLayout).observe($('#matrix'),{childList:true,subtree:true});
