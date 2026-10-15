// 单项名称和值纵向对齐；一张公司/链群卡只保留经营指标和品牌/平台列表。
function msMetric(label,value,tone=''){return '<div class="ms-metric"><small>'+esc(label)+'</small><strong class="'+tone+'">'+esc(value)+'</strong></div>'}
// 标签保持辅助文字色，红黄绿仅作用于数值。
function msDeltaContent(label,value,tone=''){
 return '<span class="ms-delta-label">'+esc(label)+'</span> <span class="'+tone+'">'+esc(value)+'</span>';
}
function msInlineDeviation(value){
 return '<span class="ms-inline-deviation">'+msDeltaContent('偏差',msDeviation(value),msTone(value))+'</span>';
}
function msMiniMetrics(r){
 return '<div class="ms-mini-metrics">'+[msMoney(r.sale),msPercent(r.actualMargin),msPercent(r.scaleRate)].map((v,i)=>'<strong class="'+(i===2?msTone(r.scaleDeviation):'')+'">'+esc(v)+'</strong>').join('')+'</div><div class="ms-mini-deltas"><span>'+msDeltaContent('差额',msMoney(r.gap,true),msTone(r.gsvDeviation))+'</span><span>'+msDeltaContent('差额',msDeviation(r.marginGap),msTone(r.marginGap))+'</span><span>'+msDeltaContent('偏差',msDeviation(r.scaleDeviation),msTone(r.scaleDeviation))+'</span></div>';
}
siTable=function(index,view){
 const ranked=msSort(msBreakdown(index,view)),visible=view==='brand'?ranked.slice(0,6):ranked;
 return '<section class="ms-breakdown" data-ms-breakdown-view="'+view+'" id="si-panel-'+index+'" role="tabpanel" aria-labelledby="si-tab-'+index+'-'+view+'"><div class="ms-breakdown-head"><span>'+(view==='brand'?'品牌':'渠道')+'</span><span>GSV</span><span>利润率</span><span>规模达成率</span></div>'+visible.map(r=>'<article class="ms-breakdown-row"><b>'+esc(r.name)+'</b>'+msMiniMetrics(r)+'</article>').join('')+'</section>';
};
siCardDetails=function(index){
 const view=siView,name=index<0?'公司整体':chains[index];
 return '<div class="si-switch-row"><div class="si-switch" role="tablist" aria-label="'+esc(name)+'销售明细维度">'+[['brand','分品牌Top6'],['platform','分渠道']].map(([key,label])=>'<button type="button" role="tab" id="si-tab-'+index+'-'+key+'" data-si-toggle="'+index+'" data-si-mode="'+key+'" aria-controls="si-panel-'+index+'" aria-selected="'+(view===key)+'" tabindex="'+(view===key?0:-1)+'">'+label+'</button>').join('')+'</div><button class="link" data-si-detail="'+index+'" data-si-view="'+(view==='brand'?'brand':'channel')+'">明细 ›</button></div>'+siTable(index,view);
};
function msPrimaryMetric(label,value,delta,tone=''){
 return '<div class="ms-metric"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><span class="ms-primary-delta">'+msDeltaContent('差额',delta,tone)+'</span></div>';
}
function msCardLine(label,value,highlight=false,deviation=undefined){
 return '<div class="ms-card-line '+(highlight?'ms-goal-line':'')+'"><span>'+esc(label)+'</span><span class="ms-line-values"><span>'+esc(value)+'</span>'+(deviation===undefined?'':msInlineDeviation(deviation))+'</span></div>';
}
function msCard(r,index){
 const prefix=msPeriodText(),rate=r.scaleRate,width=Number.isFinite(rate)?Math.max(0,Math.min(100,rate)):0;
 const progress=Math.max(0,Math.min(100,r.progress)),tone=msTone(r.scaleDeviation),progressHint='时间进度 '+msPercent(r.progress)+'；规模达成 '+msPercent(rate)+'；偏差 '+msDeviation(r.scaleDeviation);
 return '<article class="salescard ms-card '+(index<0?'company':'')+'"><h3>'+esc(r.name)+'<button class="link" data-sales="'+index+'" aria-label="查看'+esc(r.name)+'销售明细">↗</button></h3>'+
 '<div class="ms-primary">'+msPrimaryMetric(prefix+'GSV',msMoney(r.sale),msMoney(r.gap,true),msTone(r.gsvDeviation))+msPrimaryMetric(prefix+'利润率',msPercent(r.actualMargin),msDeviation(r.marginGap),msTone(r.marginGap))+'</div>'+
 msCardLine(prefix+'GSV目标',msMoney(r.target),true,r.gsvDeviation)+
 '<div class="ms-attainment-highlight"><div class="ms-attainment"><span>'+prefix+'规模达成率</span><span class="ms-line-values"><span class="'+msTone(r.scaleDeviation)+'">'+msPercent(rate)+'</span>'+msInlineDeviation(r.scaleDeviation)+'</span></div><div class="ms-progress" role="progressbar" aria-label="'+prefix+'规模达成率" '+(Number.isFinite(rate)?'aria-valuenow="'+width+'"':'')+' aria-valuemin="0" aria-valuemax="100" aria-valuetext="'+progressHint+'" title="'+progressHint+'"><i style="width:'+width+'%;background:var(--'+tone+')"></i><b class="ms-time-marker" style="left:'+progress+'%" aria-hidden="true"></b></div></div>'+
 '<div class="ms-card-facts">'+msCardLine('SKU总数',Number.isFinite(r.sku)?fmt(r.sku)+' 个':'--')+'</div>'+
 msTrend(index)+'<div class="si-card-details" data-si-card="'+index+'">'+siCardDetails(index)+'</div></article>';
}
const msLegacyRender=renderSales;
renderSales=function(){
 if(dpState.view==='department')return msLegacyRender();
 withPeriod('sales',()=>{
  salesDimension='chain';
  const cells=msSampleCells(),rows=[msSum(cells.flat(),'公司整体'),...cells.map((row,i)=>msSum(row,chains[i]))];
  const root=$('#sales');root.classList.add('ms-section');
  const title=root.querySelector('.sectionhead .titlegroup');
  title.querySelector('h2').textContent=msPeriodText()+'销售达成管控';
  let progressLabel=title.querySelector('.ms-time-progress');
  if(!progressLabel){progressLabel=document.createElement('span');progressLabel.className='ms-time-progress';title.append(progressLabel)}
  progressLabel.textContent='时间进度 '+msPercent(msProgress());
  $('#salescards').innerHTML=rows.map((r,i)=>msCard(msFacts(r),i-1)).join('');
  root.querySelector('.twocol').hidden=true;$('#sales-dimension-tabs').hidden=true;
  root.querySelector('.sectionhead .note')?.setAttribute('hidden','');
  root.querySelector('.sales-actions')?.setAttribute('hidden','');
  const head=root.querySelector('.sectionhead');for(const button of head.querySelectorAll('#sales-targets,[data-sales-targets],#sales-config'))button.hidden=true;
 });
};

