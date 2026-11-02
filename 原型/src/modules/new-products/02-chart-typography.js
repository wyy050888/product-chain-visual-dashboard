// 平台图填满内容高度，坐标保持等比缩放，数字始终按13px显示。
function nspFitChannelTypography(svg){
 dashboardQueueLayout(svg,nspMeasureChannelTypography);
}
function nspMeasureChannelTypography(svg){
 const width=svg.viewBox.baseVal.width,scale=svg.clientWidth/width;
 if(!(scale>0&&svg.clientHeight>0))return;
 const height=svg.clientHeight/scale,size=(13/scale)+'px';
 if(Math.abs(svg.viewBox.baseVal.height-height)<.01&&svg.style.getPropertyValue('--nsp-svg-label-size')===size)return;
 return ()=>{
  svg.setAttribute('viewBox','0 0 '+width+' '+height);
  svg.style.setProperty('--nsp-svg-label-size',size);
  const baseline=height-8,available=Math.max(2,height-40);
  for(const group of svg.querySelectorAll('[data-nsp-chart-ratio]')){
   const bar=group.querySelector('rect:not(.nsp-channel-hit)'),text=group.querySelector('text');
   const barHeight=bar?Math.max(2,Number(group.dataset.nspChartRatio)*available):0;
   if(bar){bar.setAttribute('y',baseline-barHeight);bar.setAttribute('height',barHeight)}
   text?.setAttribute('y',baseline-10-barHeight);
   group.querySelector('.nsp-channel-hit')?.setAttribute('height',Math.max(0,height-12));
  }
 };
}
const nspChartTypographyObserver=new ResizeObserver(entries=>{
 for(const {target} of entries)nspFitChannelTypography(target);
});
function nspObserveChartTypography(host){
 nspChartTypographyObserver.disconnect();
 const svg=host.querySelector('.new-channel-chart');
 if(svg){nspFitChannelTypography(svg);nspChartTypographyObserver.observe(svg)}
}
