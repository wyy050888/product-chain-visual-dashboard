// 贡献占比使用同期间全渠道带符号合计；零分母与缺失值不编造比例。
function upChannelContributionModel(rows){
 const fields=['gsvCents','profitCents'],totals={};
 for(const key of fields){const values=rows.map(r=>r[key]).filter(Number.isFinite);totals[key]=values.length?values.reduce((sum,value)=>sum+value,0):null}
 const result=rows.map(r=>({platform:r.platform,gsvCents:r.gsvCents??null,profitCents:r.profitCents??null,
  gsvShare:Number.isFinite(r.gsvCents)&&totals.gsvCents?r.gsvCents/totals.gsvCents*100:null,
  profitShare:Number.isFinite(r.profitCents)&&totals.profitCents?r.profitCents/totals.profitCents*100:null}));
 const scale=Math.max(1,...result.flatMap(r=>[r.gsvShare,r.profitShare]).filter(Number.isFinite).map(Math.abs));
 return {totals,rows:result,scale};
}
function upChannelContributionNote(rows){
 const model=upChannelContributionModel(rows);
 const notes=[];
 if(model.totals.profitCents<0)notes.push('利润合计为负，占比表示亏损构成，盈利渠道抵减。');
 if(model.rows.some(r=>r.gsvShare<0||r.profitShare<0))notes.push('负占比保留符号，条长按绝对值绘制。');
 return notes.length?`<p class="up-contribution-note">${notes.join(' ')}</p>`:'';
}
function upChannelContributionView(rows,state){
 const model=upChannelContributionModel(upSortedChannelRows(rows,state.channelSort||{key:'gsvCents',direction:'desc'}));
 const metric=(row,key,share,kind)=>{
  const value=row[key],percent=row[share],has=Number.isFinite(percent),width=has?Math.abs(percent)/model.scale*100:0;
  const label=kind==='gsv'?'GSV':'利润值';
  const detail=label+' '+(Number.isFinite(value)?fmt(value/100,2)+'元':'暂无数据')+'；全渠道合计 '+(Number.isFinite(model.totals[key])?fmt(model.totals[key]/100,2)+'元':'暂无数据')+'；贡献占比 '+upPercent(percent);
  return `<div class="up-contribution-half ${kind}${percent<0?' is-negative':''}" data-up-share="${kind}" data-share-value="${has?percent:''}" title="${esc(detail)}"><div class="up-contribution-track" style="--share-width:${width}%"><i aria-hidden="true"></i><span>${upPercent(percent)}</span></div></div>`;
 };
 const labelSpace=Math.max(48,...model.rows.flatMap(r=>[r.gsvShare,r.profitShare]).map(value=>upPercent(value).length*6+10));
 return `<section class="up-channel-contribution" style="--share-label-space:${labelSpace}px;--contribution-min-width:${Math.max(320,72+2*(labelSpace+60))}px" aria-label="各渠道业绩贡献占比" data-total-gsv="${model.totals.gsvCents??''}" data-total-profit="${model.totals.profitCents??''}"><div class="up-contribution-scroll"><div class="up-contribution-chart">
 <div class="up-contribution-heading"><span>渠道</span><span>GSV贡献占比</span><span>利润值贡献占比</span></div>
 <ul>${model.rows.map(row=>`<li data-up-contribution-channel="${esc(row.platform)}" data-gsv-cents="${row.gsvCents??''}" data-profit-cents="${row.profitCents??''}"><span class="up-contribution-name">${esc(row.platform)}</span>${metric(row,'gsvCents','gsvShare','gsv')}${metric(row,'profitCents','profitShare','profit')}</li>`).join('')}</ul>
 </div></div></section>`;
}
