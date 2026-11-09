// 销售明细共用字段格式；公司与链群按分区纵向展示，兼容原部门入口。
function msDeltaContent(label,value,tone=''){
 return '<span class="ms-delta-label">'+esc(label)+'</span> <span class="'+tone+'">'+esc(value)+'</span>';
}
function msInlineDeviation(value){
 return '<span class="ms-inline-deviation">'+msDeltaContent('偏差',msDeviation(value),msTone(value))+'</span>';
}
function msScaleProgress(r){
 const width=Number.isFinite(r.scaleRate)?Math.max(0,Math.min(100,r.scaleRate)):0;
 const hint='时间进度 '+msPercent(r.progress)+'；规模达成 '+msPercent(r.scaleRate)+'；偏差 '+msDeviation(r.scaleDeviation);
 return '<div class="ms-progress" role="progressbar" aria-label="规模达成率" '+(Number.isFinite(r.scaleRate)?'aria-valuenow="'+width+'"':'')+' aria-valuemin="0" aria-valuemax="100" aria-valuetext="'+hint+'"><i style="width:'+width+'%;background:var(--'+msTone(r.scaleDeviation)+')"></i><b class="ms-time-marker" style="left:'+Math.max(0,Math.min(100,r.progress))+'%" aria-hidden="true"></b></div>';
}
function msScaleCell(r){
 return '<td class="ms-scale-cell"><div class="ms-scale-main"><strong class="'+msTone(r.scaleDeviation)+'">'+msPercent(r.scaleRate)+'</strong>'+msScaleProgress(r)+'</div><small>'+msDeltaContent('偏差',msDeviation(r.scaleDeviation),msTone(r.scaleDeviation))+'</small></td>';
}
function msGsvCell(r){
 return '<td class="ms-gsv-cell"><div class="ms-gsv-pair"><strong class="ms-gsv-actual">'+esc(msMoney(r.sale))+'</strong><span class="ms-value-divider" aria-hidden="true"> / </span><strong class="ms-gsv-target">'+esc(msMoney(r.target))+'</strong></div><small>'+msDeltaContent('差额',msMoney(r.gap,true),msTone(r.gsvDeviation))+'</small></td>';
}
function msMarginCell(r){
 return '<td class="ms-margin-cell"><div class="ms-margin-pair"><strong class="ms-margin-actual">'+esc(msPercent(r.actualMargin))+'</strong><span class="ms-value-divider" aria-hidden="true"> / </span><strong class="ms-margin-target">'+esc(msPercent(r.targetMargin))+'</strong></div><small>'+msDeltaContent('差额',msDeviation(r.marginGap),msTone(r.marginGap))+'</small></td>';
}
function msTable(head,body,label,kind){
 return '<div class="ms-table-scroll" tabindex="0" aria-label="'+label+'，窄屏可横向滚动"><table class="ms-data-table '+kind+'" aria-label="'+label+'"><thead><tr>'+head.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
}
// 方形品牌素材保持原比例；来源见assets/brand-logos/sources.json，仅用于销售明细身份列。
const msBrandLogos={苏泊尔:'supor-square.png',美的:'midea-square.jpg',创维:'skyworth-square.png',海尔:'haier-square.png',康佳:'konka-square.png'};
function msBrandLabel(name){
 const logo=msBrandLogos[name];
 return logo?'<span class="ms-brand-label" data-ms-brand="'+esc(name)+'"><img src="assets/brand-logos/'+logo+'?v=20261027-square" width="32" height="32" alt="" aria-hidden="true" decoding="async"><span>'+esc(name)+'</span></span>':esc(name);
}
function msPlatformLabel(name){
 const logo=drawerPlatformLogos[name];
 return logo?'<span class="ms-platform-label"><img src="assets/platform-logos/'+logo+'.png" width="32" height="32" alt="" aria-hidden="true" decoding="async"><span>'+esc(name)+'</span></span>':esc(name);
}
function msBreakdownTable(data,view,name){
 const facts=new Map(data.map(row=>[row.name,row]));
 const names=view==='brand'?msVisibleBrands:msChannels;
 const rows=names.map(name=>{
  const r=facts.get(name);
  if(!r)return '<tr><th scope="row">'+(view==='platform'?msPlatformLabel(name):msBrandLabel(name))+'</th><td colspan="3" class="muted">暂无数据</td></tr>';
  return '<tr><th scope="row">'+(view==='platform'?msPlatformLabel(name):msBrandLabel(name))+'</th>'+msGsvCell(r)+msMarginCell(r)+msScaleCell(r)+'</tr>';
 }).join('');
 const period=msPeriodText();
 return msTable([view==='brand'?'品牌':'平台',period+'实际 / 目标GSV',period+'实际 / 目标利润率','规模达成'],rows,name+' · '+(view==='brand'?'品牌':'平台')+'明细','ms-detail-table');
}
siTable=function(index,view){return '<section class="ms-detail-panel" data-ms-breakdown-view="'+view+'" id="si-panel-'+index+'" role="tabpanel" aria-labelledby="si-tab-'+index+'-'+view+'">'+msBreakdownTable(msBreakdown(index,view).map(row=>msFacts(row)),view,index<0?'公司整体':chains[index])+'</section>'};
siCardDetails=function(index){
 const view=siView,name=index<0?'公司整体':chains[index];
 return '<div class="ms-detail-header"><h3>'+esc(name)+' · 经营明细</h3><div class="si-switch" role="tablist" aria-label="销售明细维度">'+[['brand','分品牌'],['platform','分平台']].map(([key,label])=>'<button type="button" role="tab" id="si-tab-'+index+'-'+key+'" data-si-toggle="'+index+'" data-si-mode="'+key+'" aria-controls="si-panel-'+index+'" aria-selected="'+(view===key)+'" tabindex="'+(view===key?0:-1)+'">'+label+'</button>').join('')+'</div></div>'+siTable(index,view);
};
const msLegacyRender=renderSales;
renderSales=function(){
 if(dpState.view==='department'&&!pcIsActive())return msLegacyRender();
 withPeriod('sales',()=>{
  salesDimension='chain';
  const chain=pcChain();if(chain!==null)msScope=chain;
  const sections=msSalesSections();
  const root=$('#sales');root.classList.add('ms-section');
  const title=root.querySelector('.sectionhead .titlegroup');
  title.querySelector('h2').textContent=msPeriodText()+'销售达成管控';
  let progressLabel=title.querySelector('.ms-time-progress');
  if(!progressLabel){progressLabel=document.createElement('span');progressLabel.className='ms-time-progress';title.append(progressLabel)}
  progressLabel.textContent='时间进度 '+msPercent(msProgress());
  msRenderSections(sections);
  root.querySelector('.twocol').hidden=true;$('#sales-dimension-tabs').hidden=true;
  root.querySelector('.sectionhead .note')?.setAttribute('hidden','');
  root.querySelector('.sales-actions')?.setAttribute('hidden','');
  for(const button of root.querySelectorAll('.sectionhead #sales-targets,.sectionhead [data-sales-targets],.sectionhead #sales-config'))button.hidden=true;
 });
};
